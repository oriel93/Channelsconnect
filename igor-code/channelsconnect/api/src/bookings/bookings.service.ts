import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ChannexSyncService } from '../channex/channex-sync.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { CreateManualBookingDto } from './dto/create-manual-booking.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    private prisma: PrismaService,
    private readonly channexSync: ChannexSyncService,
  ) {}

  // ─── Private helpers ────────────────────────────────────────────────────────

  /**
   * Push availability changes to all connected channels for each stay night
   * in the given date range.
   *
   * available=false  → block the dates (booking occupies the room)
   * available=true   → open the dates (room released)
   *
   * Non-fatal: logs errors but never throws. Booking persistence is the
   * source of truth; the event emitter is best-effort delivery.
   */
  private async pushAvailabilityToChannex(
    listingId: number,
    checkIn: Date | string,
    checkOut: Date | string,
    available: boolean,
  ): Promise<void> {
    try {
      const start = new Date(checkIn as string);
      const end   = new Date(checkOut as string);
      const dates: string[] = [];

      const cur = new Date(start);
      while (cur < end) {
        dates.push(cur.toISOString().split('T')[0]);
        cur.setDate(cur.getDate() + 1);
      }

      this.logger.debug(
        `[BookingAvail] ${dates.length} nights available=${available} listing=${listingId}`,
      );

      for (const date of dates) {
        await this.channexSync.applyChange({ listingId, date, available });
      }
    } catch (err: any) {
      this.logger.error(
        `[BookingAvail] Failed for listing=${listingId}: ${err?.message}`,
      );
    }
  }

  private async deductInventory(
    listingId: number,
    checkIn: Date,
    checkOut: Date,
  ): Promise<void> {
    await this.pushAvailabilityToChannex(listingId, checkIn, checkOut, false);
  }

  private async restoreInventory(
    listingId: number,
    checkIn: Date,
    checkOut: Date,
  ): Promise<void> {
    await this.pushAvailabilityToChannex(listingId, checkIn, checkOut, true);
  }

  // ─── Public methods ──────────────────────────────────────────────────────────

  async create(userId: string, createBookingDto: CreateBookingDto) {
    // ── Defensive: normalise required fields before Prisma ──────────────────
    const price = parseFloat(String(createBookingDto.totalPrice ?? 0));
    const totalPriceStr = isNaN(price) ? '0.00' : price.toFixed(2);

    const createData: Prisma.BookingUncheckedCreateInput = {
      userId,
      listingId:     Number(createBookingDto.listingId),
      guestName:     String(createBookingDto.guestName ?? '').trim(),
      checkIn:       new Date(createBookingDto.checkIn),
      checkOut:      new Date(createBookingDto.checkOut),
      numGuests:     Number(createBookingDto.numGuests) || 1,
      totalPrice:    totalPriceStr,
      status:        String(createBookingDto.status ?? 'confirmed'),
      bookingSource: createBookingDto.bookingSource
                       ? String(createBookingDto.bookingSource)
                       : 'direct',
      ...(createBookingDto.guestEmail ? { guestEmail: createBookingDto.guestEmail.trim() } : {}),
      ...(createBookingDto.guestPhone ? { guestPhone: createBookingDto.guestPhone.trim() } : {}),
      ...(createBookingDto.externalId ? { externalId: createBookingDto.externalId } : {}),
      ...(createBookingDto.notes ? { notes: createBookingDto.notes.trim() } : {}),
    };

    const booking = await this.prisma.booking.create({ data: createData });

    if (booking.checkIn && booking.checkOut && booking.listingId) {
      const isBlocking = booking.status !== 'cancelled';
      setImmediate(() =>
        this.pushAvailabilityToChannex(
          booking.listingId,
          booking.checkIn,
          booking.checkOut,
          !isBlocking,
        ),
      );
    }

    return booking;
  }

  /**
   * TASK 2 — Manual Direct Booking
   *
   * 1. Validate inputs (listing exists, dates are real and logical).
   * 2. Insert the booking record into the local DB with safe defaults.
   * 3. Deduct inventory via applyChange() → event-driven push to all channels.
   * 4. Return the created booking so the UI can confirm success.
   */
  async createManual(userId: string, dto: CreateManualBookingDto) {
    // ── 1. Parse and validate dates ───────────────────────────────────────
    const checkIn  = new Date(dto.checkIn + 'T00:00:00.000Z');
    const checkOut = new Date(dto.checkOut + 'T00:00:00.000Z');

    if (isNaN(checkIn.getTime())) {
      throw new BadRequestException(
        `Invalid check-in date: '${dto.checkIn}'. Expected format: YYYY-MM-DD.`,
      );
    }
    if (isNaN(checkOut.getTime())) {
      throw new BadRequestException(
        `Invalid check-out date: '${dto.checkOut}'. Expected format: YYYY-MM-DD.`,
      );
    }
    if (checkOut <= checkIn) {
      throw new BadRequestException('Check-out date must be after check-in date.');
    }

    // ── 2. Verify the listing exists ──────────────────────────────────────
    const listing = await this.prisma.listing.findUnique({
      where: { id: dto.listingId },
      select: { id: true, title: true },
    });
    if (!listing) {
      throw new BadRequestException(`Listing with ID ${dto.listingId} not found.`);
    }

    // ── 3. Build the create payload ────────────────────────────────────────
    // Prisma Decimal fields accept strings or Prisma.Decimal instances.
    // We normalize price to 2 decimal places and store as string.
    const totalPriceVal = parseFloat(String(dto.totalPrice ?? 0));
    const totalPriceStr = isNaN(totalPriceVal) ? '0.00' : totalPriceVal.toFixed(2);

    const createData: Prisma.BookingUncheckedCreateInput = {
      userId,
      listingId:      dto.listingId,
      guestName:      dto.guestName?.trim() ?? '',
      // Only include optional fields when they have a value
      ...(dto.guestEmail ? { guestEmail: dto.guestEmail.trim() } : {}),
      ...(dto.guestPhone ? { guestPhone: dto.guestPhone.trim() } : {}),
      checkIn,
      checkOut,
      numGuests:      dto.numGuests ?? 1,
      totalPrice:     totalPriceStr, // Prisma Decimal accepts string — always present, defaults to 0.00
      status:         'confirmed',
      bookingSource:  dto.bookingSource ? String(dto.bookingSource) : 'Channels Connect Direct',
      ...(dto.notes    ? { notes:    dto.notes.trim()    } : {}),
    };

    // ── 4. Insert into DB ─────────────────────────────────────────────────
    let booking: Awaited<ReturnType<PrismaService['booking']['create']>>;

    try {
      booking = await this.prisma.booking.create({
        data: createData,
        include: { listing: { select: { id: true, title: true } } },
      });
    } catch (err: any) {
      this.logger.error(`[ManualBooking] DB insert failed: ${err?.message}`);
      const msg =
        err?.code === 'P2003'
          ? 'Referenced listing does not exist.'
          : err?.message ?? 'Database error while creating booking.';
      throw new BadRequestException(msg);
    }

    this.logger.log(
      `[ManualBooking] Created id=${booking.id} listing=${listing.title} ` +
        `${dto.checkIn} → ${dto.checkOut}`,
    );

    // ── 5. Deduct inventory → event-driven sync to all channels ───────────
    setImmediate(() =>
      this.deductInventory(booking.listingId, checkIn, checkOut),
    );

    return booking;
  }

  async findAll(userId?: string, listingId?: number) {
    const where: Prisma.BookingWhereInput = {};
    if (userId)    where.userId    = userId;
    if (listingId) where.listingId = listingId;

    return this.prisma.booking.findMany({
      where,
      include: { listing: true },
      orderBy: { checkIn: 'desc' },
    });
  }

  async findUpcoming(userId?: string) {
    const where: Prisma.BookingWhereInput = {
      checkIn: { gte: new Date() },
      status: 'confirmed',
    };
    if (userId) where.userId = userId;

    return this.prisma.booking.findMany({
      where,
      include: { listing: true },
      orderBy: { checkIn: 'asc' },
    });
  }

  async findOne(id: number) {
    return this.prisma.booking.findUnique({
      where: { id },
      include: { listing: true, user: true },
    });
  }

  /**
   * TASK 3 — Modify Booking Dates
   *
   * When dates change:
   *   1. Restore inventory for the old date range (room re-opens).
   *   2. Deduct inventory for the new date range (room blocks).
   *   3. Save the booking.
   *
   * The event emitter automatically pushes both deltas to all channels.
   */
  async update(id: number, updateBookingDto: UpdateBookingDto) {
    const old = await this.prisma.booking.findUnique({ where: { id } });
    if (!old) throw new Error(`Booking ${id} not found.`);

    const booking = await this.prisma.booking.update({
      where: { id },
      data: updateBookingDto,
    });

    const newCheckIn  = updateBookingDto.checkIn
      ? new Date(updateBookingDto.checkIn)
      : old.checkIn;
    const newCheckOut = updateBookingDto.checkOut
      ? new Date(updateBookingDto.checkOut)
      : old.checkOut;

    const datesChanged =
      (updateBookingDto.checkIn  !== undefined && old.checkIn.getTime()  !== newCheckIn.getTime()) ||
      (updateBookingDto.checkOut !== undefined && old.checkOut.getTime() !== newCheckOut.getTime());

    if (!datesChanged) return booking;

    const isStillBlocking = booking.status !== 'cancelled';

    setImmediate(async () => {
      if (old.checkIn && old.checkOut) {
        await this.restoreInventory(old.listingId, old.checkIn, old.checkOut);
      }
      if (isStillBlocking && newCheckIn && newCheckOut) {
        await this.deductInventory(booking.listingId, newCheckIn, newCheckOut);
      }
    });

    return booking;
  }

  /**
   * TASK 3 — Cancel Booking
   *
   * 1. Set status to 'cancelled'.
   * 2. Restore inventory for the booking's entire date range.
   * 3. applyChange() event emitter pushes restored availability to all channels.
   */
  async cancelBooking(id: number) {
    const old = await this.prisma.booking.findUnique({ where: { id } });
    if (!old) throw new Error(`Booking ${id} not found.`);

    const booking = await this.prisma.booking.update({
      where: { id },
      data: { status: 'cancelled' },
    });

    if (old.checkIn && old.checkOut && old.listingId) {
      setImmediate(() =>
        this.restoreInventory(old.listingId, old.checkIn, old.checkOut),
      );
    }

    this.logger.log(
      `[CancelBooking] Cancelled id=${id} — released ` +
        `${old.checkIn.toISOString().split('T')[0]} → ${old.checkOut.toISOString().split('T')[0]}`,
    );

    return booking;
  }

  async remove(id: number) {
    return this.prisma.booking.delete({ where: { id } });
  }

  async findByListingId(listingId: number) {
    return this.prisma.booking.findMany({
      where: { listingId },
      include: { listing: { select: { id: true, title: true } } },
      orderBy: { checkIn: 'desc' },
    });
  }
}