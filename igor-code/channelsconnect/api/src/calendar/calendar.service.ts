import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BlockDateDto, BulkBlockDatesDto, BulkUnblockDatesDto } from './dto/block-date.dto';
import { UpdateRateDto, BulkUpdateRatesDto } from './dto/update-rate.dto';
import { ChannexSyncService } from '../channex/channex-sync.service';

@Injectable()
export class CalendarService {
  private readonly logger = new Logger(CalendarService.name);

  constructor(
    private prisma: PrismaService,
    private channexSync: ChannexSyncService,
  ) {}

  // Rate Management
  /**
   * Single-date rate + restriction update → Channex via applyChange().
   * Controller calls this as updateRateAndSync().
   */
  async updateRate(updateRateDto: UpdateRateDto) {
    return this.updateRateAndSync(updateRateDto);
  }

  async updateRateAndSync(updateRateDto: UpdateRateDto) {
    const { listingId, date, price, minStay, available,
            maxStay, stopSell, closedToArrival, closedToDeparture } = updateRateDto as any;
    const dateStr = new Date(date).toISOString().split('T')[0];
    this.logger.log(`[Calendar] updateRateAndSync listing=${listingId} date=${dateStr}`);

    await this.channexSync.applyChange({
      listingId,
      date: dateStr,
      ...(price     !== undefined ? { price: parseFloat(String(price)) } : {}),
      ...(minStay   !== undefined ? { minStay } : {}),
      ...(maxStay   !== undefined ? { maxStay } : {}),
      ...(available !== undefined ? { available } : {}),
      ...(stopSell          !== undefined ? { stopSell }          : {}),
      ...(closedToArrival   !== undefined ? { closedToArrival }   : {}),
      ...(closedToDeparture !== undefined ? { closedToDeparture } : {}),
    });

    return { success: true, message: 'Rate queued for Channex sync', listingId, date: dateStr };
  }

  /**
   * Bulk rate + restriction update over a date range → Channex via applyChange().
   * The 500 ms batch window collapses all per-date enqueues into a single call.
   * Controller calls this as bulkUpdateRatesAndSync().
   */
  async bulkUpdateRates(bulkUpdateRatesDto: BulkUpdateRatesDto) {
    return this.bulkUpdateRatesAndSync(bulkUpdateRatesDto);
  }

  async bulkUpdateRatesAndSync(bulkUpdateRatesDto: BulkUpdateRatesDto) {
    const { listingId, startDate, endDate, price, minStay, available,
            maxStay, stopSell, closedToArrival, closedToDeparture } = bulkUpdateRatesDto as any;
    const startDateStr = new Date(startDate).toISOString().split('T')[0];
    const endDateStr   = new Date(endDate).toISOString().split('T')[0];
    this.logger.log(`[Calendar] bulkUpdateRatesAndSync listing=${listingId} ${startDateStr}→${endDateStr}`);

    const cur = new Date(startDateStr + 'T00:00:00Z');
    const end = new Date(endDateStr   + 'T00:00:00Z');
    const pushes: Promise<void>[] = [];
    while (cur <= end) {
      const dateStr = cur.toISOString().split('T')[0];
      pushes.push(
        this.channexSync.applyChange({
          listingId,
          date: dateStr,
          ...(price     !== undefined ? { price: parseFloat(String(price)) } : {}),
          ...(minStay   !== undefined ? { minStay } : {}),
          ...(maxStay   !== undefined ? { maxStay } : {}),
          ...(available !== undefined ? { available } : {}),
          ...(stopSell          !== undefined ? { stopSell }          : {}),
          ...(closedToArrival   !== undefined ? { closedToArrival }   : {}),
          ...(closedToDeparture !== undefined ? { closedToDeparture } : {}),
        }),
      );
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
    await Promise.all(pushes);

    return {
      success: true,
      message: 'Rates queued for Channex sync',
      listingId,
      dateRange: { startDate: startDateStr, endDate: endDateStr },
    };
  }

  async getRates(listingId: number, startDate: Date, endDate: Date) {
    // First try to get from cache
    const cachedRates = await this.getCachedCalendar(listingId, startDate, endDate);
    
    if (cachedRates && cachedRates.length > 0) {
      this.logger.log(`Returning ${cachedRates.length} rates from cache for listing ${listingId}`);
      
      // Transform cached data to match Rate model format
      // Include numAvail and override so frontend can detect blocked dates
      return cachedRates.map(cache => ({
        id: cache.id,
        listingId: cache.listingId,
        date: cache.date,
        price: cache.price || 0,
        minStay: cache.minStay || null,
        maxStay: cache.maxStay || null,
        available: cache.numAvail ? cache.numAvail > 0 : true,
        numAvail: cache.numAvail ?? null,
        override: cache.override ?? null,
        createdAt: cache.createdAt,
        updatedAt: cache.updatedAt,
      }));
    }

    // Fallback to database rates if cache is empty
    this.logger.log(`No cache found, falling back to database rates for listing ${listingId}`);
    return this.prisma.rate.findMany({
      where: {
        listingId,
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
      orderBy: { date: 'asc' },
    });
  }

  // Blocked Dates Management
  async blockDate(blockDateDto: BlockDateDto) {
    const { listingId, date, reason } = blockDateDto;
    const dateStr = new Date(date).toISOString().split('T')[0];

    // Push availability=0 + stopSell to Channex via the real sync queue
    await this.channexSync.applyChange({
      listingId,
      date: dateStr,
      available: false,
      stopSell: true,
    }).catch(err => this.logger.warn(`[Calendar] blockDate Channex push failed (non-fatal): ${err.message}`));

    // Save to local blocked dates table
    return this.prisma.blockedDate.upsert({
      where: { listingId_date: { listingId, date: new Date(date) } },
      update: { reason },
      create: { listingId, date: new Date(date), reason },
    });
  }

  async bulkBlockDates(bulkBlockDatesDto: BulkBlockDatesDto) {
    const { listingId, dates, reason } = bulkBlockDatesDto;

    const operations = dates.map(date =>
      this.prisma.blockedDate.upsert({
        where: {
          listingId_date: {
            listingId,
            date: new Date(date),
          },
        },
        update: {
          reason,
        },
        create: {
          listingId,
          date: new Date(date),
          reason,
        },
      }),
    );

    return this.prisma.$transaction(operations);
  }

  async unblockDate(listingId: number, date: Date) {
    const dateStr = new Date(date).toISOString().split('T')[0];

    // Restore availability via real Channex sync queue
    await this.channexSync.applyChange({
      listingId,
      date: dateStr,
      available: true,
      stopSell: false,
    }).catch(err => this.logger.warn(`[Calendar] unblockDate Channex push failed (non-fatal): ${err.message}`));

    return this.prisma.blockedDate.deleteMany({
      where: { listingId, date: new Date(date) },
    });
  }

  async bulkUnblockDates(bulkUnblockDatesDto: BulkUnblockDatesDto) {
    const { listingId, dates } = bulkUnblockDatesDto;

    const operations = dates.map(date =>
      this.prisma.blockedDate.deleteMany({
        where: {
          listingId,
          date: new Date(date),
        },
      }),
    );

    return this.prisma.$transaction(operations);
  }

  async getBlockedDates(listingId: number, startDate: Date, endDate: Date) {
    return this.prisma.blockedDate.findMany({
      where: {
        listingId,
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
      orderBy: { date: 'asc' },
    });
  }

  // Calendar Data
  async getCalendarData(listingId: number, startDate: Date, endDate: Date) {
    const [rates, blockedDates, bookings] = await Promise.all([
      this.getRates(listingId, startDate, endDate),
      this.getBlockedDates(listingId, startDate, endDate),
      this.prisma.booking.findMany({
        where: {
          listingId,
          checkIn: { lte: new Date(endDate) },
          checkOut: { gte: new Date(startDate) },
          status: { not: 'cancelled' },
        },
      }),
    ]);

    return {
      rates,
      blockedDates,
      bookings,
    };
  }

  // Calendar Events
  async getCalendarEvents(listingId: number, startDate: Date, endDate: Date) {
    return this.prisma.calendarEvent.findMany({
      where: {
        listingId,
        startDate: { lte: new Date(endDate) },
        endDate: { gte: new Date(startDate) },
      },
      orderBy: { startDate: 'asc' },
    });
  }

  async createCalendarEvent(data: any) {
    return this.prisma.calendarEvent.create({
      data,
    });
  }

  async updateCalendarEntry(id: number, data: any) {
    return this.prisma.calendarEvent.update({
      where: { id },
      data,
    });
  }

  async deleteCalendarEntry(id: number) {
    return this.prisma.calendarEvent.delete({
      where: { id },
    });
  }


  // ============ Calendar Cache Methods ============

  /** Stub — Beds24 cache sync removed; Channex is the source of truth. */
  async syncCalendarFromBeds24(listingId: number): Promise<any> {
    return { success: false, message: 'Beds24 sync is decommissioned. Use Channex ARI sync.' };
  }

  async clearCalendarCache(listingId: number): Promise<number> {
    const result = await this.prisma.calendar.deleteMany({ where: { listingId } });
    return result.count;
  }

  async getCachedCalendar(listingId: number, startDate: Date, endDate: Date) {
    return this.prisma.calendar.findMany({
      where: {
        listingId,
        date: { gte: new Date(startDate), lte: new Date(endDate) },
      },
      orderBy: { date: 'asc' },
    });
  }
}
