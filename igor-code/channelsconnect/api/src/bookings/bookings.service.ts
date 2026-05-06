import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ChannexSyncService } from '../channex/channex-sync.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    private prisma: PrismaService,
    private readonly channexSync: ChannexSyncService,
  ) {}

  /**
   * Push availability changes to Channex for all nights in the booking range.
   * available=false means the dates are blocked (booked), available=true means open.
   * Non-fatal: logs errors but never throws — booking persistence is the source of truth.
   */
  private async pushAvailabilityToChannex(
    listingId: number,
    checkIn: Date | string,
    checkOut: Date | string,
    available: boolean,
  ): Promise<void> {
    try {
      const start = new Date(checkIn);
      const end = new Date(checkOut);
      const dates: string[] = [];

      // Build list of stay nights (checkIn inclusive, checkOut exclusive)
      const cur = new Date(start);
      while (cur < end) {
        dates.push(cur.toISOString().split('T')[0]);
        cur.setDate(cur.getDate() + 1);
      }

      this.logger.log(
        `[BookingAvail] Pushing ${dates.length} nights available=${available} for listing=${listingId}`,
      );

      // applyChange enqueues — 500ms batch window coalesces into 1 Channex call per property
      for (const date of dates) {
        await this.channexSync.applyChange({ listingId, date, available });
      }
    } catch (err: any) {
      this.logger.error(
        `[BookingAvail] Failed to push availability for listing=${listingId}: ${err?.message}`,
      );
    }
  }

  async create(userId: string, createBookingDto: CreateBookingDto) {
    const booking = await this.prisma.booking.create({
      data: {
        ...createBookingDto,
        userId,
      },
    });

    // Push blocked availability to Channex for the booked nights
    if (booking.checkIn && booking.checkOut && booking.listingId) {
      const isBlocking = booking.status !== 'cancelled';
      setImmediate(() =>
        this.pushAvailabilityToChannex(
          booking.listingId,
          booking.checkIn,
          booking.checkOut,
          !isBlocking, // available=false blocks the dates
        ),
      );
    }

    return booking;
  }

  async findAll(userId?: string, listingId?: number) {
    const where: any = {};
    if (userId) where.userId = userId;
    if (listingId) where.listingId = listingId;

    return this.prisma.booking.findMany({
      where,
      include: {
        listing: true,
      },
      orderBy: { checkIn: 'desc' },
    });
  }

  async findUpcoming(userId?: string) {
    const where: any = {
      checkIn: { gte: new Date() },
      status: 'confirmed',
    };
    if (userId) where.userId = userId;

    return this.prisma.booking.findMany({
      where,
      include: {
        listing: true,
      },
      orderBy: { checkIn: 'asc' },
    });
  }

  async findOne(id: number) {
    return this.prisma.booking.findUnique({
      where: { id },
      include: {
        listing: true,
        user: true,
      },
    });
  }

  async update(id: number, updateBookingDto: UpdateBookingDto) {
    // Fetch old booking first so we can free its old dates if they changed
    const old = await this.prisma.booking.findUnique({ where: { id } });

    const booking = await this.prisma.booking.update({
      where: { id },
      data: updateBookingDto,
    });

    // If dates changed: re-open old dates, block new dates
    const datesChanged =
      old &&
      (old.checkIn?.toISOString() !== new Date(updateBookingDto.checkIn ?? old.checkIn).toISOString() ||
        old.checkOut?.toISOString() !== new Date(updateBookingDto.checkOut ?? old.checkOut).toISOString());

    if (old && booking.listingId) {
      setImmediate(async () => {
        // Re-open old date range
        if (datesChanged && old.checkIn && old.checkOut) {
          await this.pushAvailabilityToChannex(old.listingId, old.checkIn, old.checkOut, true);
        }
        // Block new date range (unless cancelled)
        if (booking.checkIn && booking.checkOut && booking.status !== 'cancelled') {
          await this.pushAvailabilityToChannex(booking.listingId, booking.checkIn, booking.checkOut, false);
        }
      });
    }

    return booking;
  }

  async remove(id: number) {
    return this.prisma.booking.delete({
      where: { id },
    });
  }

  async cancelBooking(id: number) {
    const old = await this.prisma.booking.findUnique({ where: { id } });

    const booking = await this.prisma.booking.update({
      where: { id },
      data: { status: 'cancelled' },
    });

    // Re-open dates in Channex — cancellation frees the nights
    if (old?.checkIn && old?.checkOut && old?.listingId) {
      setImmediate(() =>
        this.pushAvailabilityToChannex(old.listingId, old.checkIn!, old.checkOut!, true),
      );
    }

    return booking;
  }

  /**
   * Get bookings for a specific listing from the database
   */
  async findByListingId(listingId: number) {
    return this.prisma.booking.findMany({
      where: {
        listingId,
      },
      include: {
        listing: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: { checkIn: 'desc' },
    });
  }
}

