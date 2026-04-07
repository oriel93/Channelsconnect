import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BlockDateDto, BulkBlockDatesDto, BulkUnblockDatesDto } from './dto/block-date.dto';
import { UpdateRateDto, BulkUpdateRatesDto } from './dto/update-rate.dto';
import { Beds24Service } from '../beds24/beds24.service';

@Injectable()
export class CalendarService {
  private readonly logger = new Logger(CalendarService.name);

  constructor(
    private prisma: PrismaService,
    private beds24Service: Beds24Service,
  ) {}

  // Rate Management
  async updateRate(updateRateDto: UpdateRateDto) {
    const { listingId, date, price, minStay, available } = updateRateDto;
    
    return this.prisma.rate.upsert({
      where: {
        listingId_date: {
          listingId,
          date: new Date(date),
        },
      },
      update: {
        price,
        minStay,
        available,
      },
      create: {
        listingId,
        date: new Date(date),
        price,
        minStay,
        available,
      },
    });
  }

  async bulkUpdateRates(bulkUpdateRatesDto: BulkUpdateRatesDto) {
    const { listingId, startDate, endDate, price, minStay, available } = bulkUpdateRatesDto;
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const dates = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(new Date(d));
    }

    const operations = dates.map(date =>
      this.prisma.rate.upsert({
        where: {
          listingId_date: {
            listingId,
            date,
          },
        },
        update: {
          price,
          minStay,
          available,
        },
        create: {
          listingId,
          date,
          price,
          minStay,
          available,
        },
      }),
    );

    return this.prisma.$transaction(operations);
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
    
    // Get listing with beds24RoomId
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true, beds24RoomId: true },
    });

    // If listing has Beds24 roomId, sync with Beds24
    if (listing?.beds24RoomId) {
      const roomId = parseInt(listing.beds24RoomId, 10);
      const dateStr = new Date(date).toISOString().split('T')[0];

      // Update in Beds24 - block the date
      const calendarUpdate = {
        roomId,
        calendar: [
          {
            from: dateStr,
            to: dateStr,
            numAvail: 0,
            override: 'closed' as const,
          },
        ],
      };

      await this.beds24Service.updateCalendar([calendarUpdate]);

      // Update cache for this date
      await this.updateCacheForDateRange(listingId, roomId, dateStr, dateStr);
    }
    
    // Save to local blocked dates table
    return this.prisma.blockedDate.upsert({
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
    // Get listing with beds24RoomId
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true, beds24RoomId: true },
    });

    // If listing has Beds24 roomId, sync with Beds24
    if (listing?.beds24RoomId) {
      const roomId = parseInt(listing.beds24RoomId, 10);
      const dateStr = new Date(date).toISOString().split('T')[0];

      // Update in Beds24 - unblock the date
      const calendarUpdate = {
        roomId,
        calendar: [
          {
            from: dateStr,
            to: dateStr,
            numAvail: 1,
            override: 'none' as const,
          },
        ],
      };

      await this.beds24Service.updateCalendar([calendarUpdate]);

      // Update cache for this date
      await this.updateCacheForDateRange(listingId, roomId, dateStr, dateStr);
    }

    // Remove from local blocked dates table (if exists)
    // Use deleteMany so it doesn't fail if record doesn't exist
    return this.prisma.blockedDate.deleteMany({
      where: {
        listingId,
        date: new Date(date),
      },
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

  /**
   * Sync calendar data from Beds24 and cache it for the next year
   * @param listingId - The listing ID to sync
   * @returns Summary of cached data
   */
  async syncCalendarFromBeds24(listingId: number): Promise<any> {
    this.logger.log(`Syncing calendar from Beds24 for listing ${listingId}...`);

    // Get listing with beds24RoomId
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true, beds24RoomId: true, title: true },
    });

    if (!listing || !listing.beds24RoomId) {
      throw new Error(
        `Listing ${listingId} not found or does not have a Beds24 room ID`,
      );
    }

    const roomId = parseInt(listing.beds24RoomId, 10);

    // Calculate date range: today to 1 year from today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const oneYearFromNow = new Date(today);
    oneYearFromNow.setFullYear(today.getFullYear() + 1);

    const startDate = today.toISOString().split('T')[0];
    const endDate = oneYearFromNow.toISOString().split('T')[0];

    this.logger.log(
      `Fetching calendar for room ${roomId} from ${startDate} to ${endDate}`,
    );

    // Fetch calendar from Beds24
    const calendarResponse = await this.beds24Service.getCalendar({
      startDate,
      endDate,
      roomId: [roomId],
    });

    if (!calendarResponse.data || calendarResponse.data.length === 0) {
      this.logger.warn(`No calendar data returned from Beds24 for listing ${listingId}`);
      return {
        success: false,
        message: 'No calendar data found',
        listingId,
        roomId,
      };
    }

    const roomCalendar = calendarResponse.data[0];
    
    if (!roomCalendar.calendar || roomCalendar.calendar.length === 0) {
      this.logger.warn(`No calendar entries in response for listing ${listingId}`);
      return {
        success: false,
        message: 'No calendar entries found',
        listingId,
        roomId,
      };
    }

    this.logger.log(
      `Received ${roomCalendar.calendar.length} calendar entries from Beds24`,
    );

    // Clear existing cache for this listing
    await this.clearCalendarCache(listingId);

    // Process and cache calendar entries
    // Use a Map to track dates and handle overlapping ranges (last entry wins)
    const dateMap = new Map<string, any>();

    for (const entry of roomCalendar.calendar) {
      // Parse date range
      const fromDate = new Date(entry.from);
      const toDate = new Date(entry.to);

      // Generate all dates in range
      const currentDate = new Date(fromDate);
      while (currentDate <= toDate) {
        const dateStr = currentDate.toISOString().split('T')[0];
        
        // Store in map (overwrites if date already exists - last entry wins)
        dateMap.set(dateStr, {
          listingId,
          roomId,
          date: new Date(dateStr),
          price: entry.price1 ? parseFloat(String(entry.price1)) : null,
          numAvail: entry.numAvail ?? null,
          minStay: entry.minStay ?? null,
          maxStay: entry.maxStay ?? null,
          override: entry.override ?? null,
          rawData: entry as any,
        });
        
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    // Convert map to array and create upsert operations
    const cacheOperations = Array.from(dateMap.values()).map(data =>
      this.prisma.calendar.upsert({
        where: {
          listingId_date: {
            listingId: data.listingId,
            date: data.date,
          },
        },
        update: {
          roomId: data.roomId,
          price: data.price,
          numAvail: data.numAvail,
          minStay: data.minStay,
          maxStay: data.maxStay,
          override: data.override,
          rawData: data.rawData,
        },
        create: data,
      }),
    );

    // Execute all cache operations in transaction
    await this.prisma.$transaction(cacheOperations);
    
    const cachedCount = dateMap.size;

    this.logger.log(
      `Successfully cached ${cachedCount} calendar days for listing ${listingId}`,
    );

    return {
      success: true,
      message: `Cached ${cachedCount} calendar days`,
      listingId,
      roomId,
      cachedDays: cachedCount,
      dateRange: { startDate, endDate },
    };
  }

  /**
   * Clear calendar cache for a listing
   * @param listingId - The listing ID to clear cache for
   */
  async clearCalendarCache(listingId: number): Promise<number> {
    this.logger.log(`Clearing calendar cache for listing ${listingId}...`);
    
    const result = await this.prisma.calendar.deleteMany({
      where: { listingId },
    });

    this.logger.log(`Cleared ${result.count} cached calendar entries`);
    return result.count;
  }

  /**
   * Get cached calendar data for a listing
   * @param listingId - The listing ID
   * @param startDate - Start date
   * @param endDate - End date
   * @returns Cached calendar entries
   */
  async getCachedCalendar(
    listingId: number,
    startDate: Date,
    endDate: Date,
  ) {
    return this.prisma.calendar.findMany({
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

  /**
   * Update rates in Beds24 and update cache for affected dates only
   */
  async updateRateAndSync(updateRateDto: UpdateRateDto) {
    const { listingId, date, price, minStay, available } = updateRateDto;
    
    this.logger.log(`Updating rate for listing ${listingId} on ${date}`);

    // Get listing with beds24RoomId
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true, beds24RoomId: true },
    });

    if (!listing || !listing.beds24RoomId) {
      throw new Error(
        `Listing ${listingId} not found or does not have a Beds24 room ID`,
      );
    }

    const roomId = parseInt(listing.beds24RoomId, 10);
    const dateStr = new Date(date).toISOString().split('T')[0];

    // Update in Beds24
    const calendarUpdate = {
      roomId,
      calendar: [
        {
          from: dateStr,
          to: dateStr,
          price1: price ? parseFloat(String(price)) : undefined,
          minStay: minStay ?? undefined,
          numAvail: available !== undefined ? (available ? 1 : 0) : undefined,
        },
      ],
    };

    await this.beds24Service.updateCalendar([calendarUpdate]);

    this.logger.log(`Updated calendar in Beds24, now updating cache for date ${dateStr}...`);

    // Fetch only the updated date from Beds24 and update cache
    await this.updateCacheForDateRange(listingId, roomId, dateStr, dateStr);

    return {
      success: true,
      message: 'Rate updated in Beds24 and cache updated',
      listingId,
      date: dateStr,
    };
  }

  /**
   * Bulk update rates in Beds24 and update cache for affected dates only
   */
  async bulkUpdateRatesAndSync(bulkUpdateRatesDto: BulkUpdateRatesDto) {
    const { listingId, startDate, endDate, price, minStay, available } =
      bulkUpdateRatesDto;

    this.logger.log(
      `Bulk updating rates for listing ${listingId} from ${startDate} to ${endDate}`,
    );

    // Get listing with beds24RoomId
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true, beds24RoomId: true },
    });

    if (!listing || !listing.beds24RoomId) {
      throw new Error(
        `Listing ${listingId} not found or does not have a Beds24 room ID`,
      );
    }

    const roomId = parseInt(listing.beds24RoomId, 10);
    const startDateStr = new Date(startDate).toISOString().split('T')[0];
    const endDateStr = new Date(endDate).toISOString().split('T')[0];

    // Update in Beds24
    const calendarUpdate = {
      roomId,
      calendar: [
        {
          from: startDateStr,
          to: endDateStr,
          price1: price ? parseFloat(String(price)) : undefined,
          minStay: minStay ?? undefined,
          numAvail: available !== undefined ? (available ? 1 : 0) : undefined,
        },
      ],
    };

    await this.beds24Service.updateCalendar([calendarUpdate]);

    this.logger.log(`Updated calendar in Beds24, now updating cache for date range ${startDateStr} to ${endDateStr}...`);

    // Fetch only the updated date range from Beds24 and update cache
    await this.updateCacheForDateRange(listingId, roomId, startDateStr, endDateStr);

    return {
      success: true,
      message: 'Rates updated in Beds24 and cache updated',
      listingId,
      dateRange: { startDate: startDateStr, endDate: endDateStr },
    };
  }

  /**
   * Update cache for a specific date range from Beds24
   * This is more efficient than clearing and re-syncing everything
   */
  private async updateCacheForDateRange(
    listingId: number,
    roomId: number,
    startDate: string,
    endDate: string,
  ): Promise<void> {
    this.logger.log(`Fetching calendar from Beds24 for date range ${startDate} to ${endDate}`);

    // Fetch calendar from Beds24 for the specific date range
    const calendarResponse = await this.beds24Service.getCalendar({
      startDate,
      endDate,
      roomId: [roomId],
    });

    if (!calendarResponse.data || calendarResponse.data.length === 0) {
      this.logger.warn(`No calendar data returned for listing ${listingId}`);
      return;
    }

    const roomCalendar = calendarResponse.data[0];
    
    if (!roomCalendar.calendar || roomCalendar.calendar.length === 0) {
      this.logger.warn(`No calendar entries for listing ${listingId}`);
      return;
    }

    // Process and update cache entries
    // Use a Map to track dates and handle overlapping ranges (last entry wins)
    const dateMap = new Map<string, any>();

    for (const entry of roomCalendar.calendar) {
      // Parse date range
      const fromDate = new Date(entry.from);
      const toDate = new Date(entry.to);

      // Generate all dates in range
      const currentDate = new Date(fromDate);
      while (currentDate <= toDate) {
        const dateStr = currentDate.toISOString().split('T')[0];
        
        // Store in map (overwrites if date already exists - last entry wins)
        dateMap.set(dateStr, {
          listingId,
          roomId,
          date: new Date(dateStr),
          price: entry.price1 ? parseFloat(String(entry.price1)) : null,
          numAvail: entry.numAvail ?? null,
          minStay: entry.minStay ?? null,
          maxStay: entry.maxStay ?? null,
          override: entry.override ?? null,
          rawData: entry as any,
        });
        
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    // Convert map to array and create upsert operations
    const cacheOperations = Array.from(dateMap.values()).map(data =>
      this.prisma.calendar.upsert({
        where: {
          listingId_date: {
            listingId: data.listingId,
            date: data.date,
          },
        },
        update: {
          roomId: data.roomId,
          price: data.price,
          numAvail: data.numAvail,
          minStay: data.minStay,
          maxStay: data.maxStay,
          override: data.override,
          rawData: data.rawData,
        },
        create: data,
      }),
    );

    // Execute all cache operations in transaction
    if (cacheOperations.length > 0) {
      await this.prisma.$transaction(cacheOperations);
      this.logger.log(`Updated ${cacheOperations.length} calendar days in cache for listing ${listingId}`);
    }
  }
}

