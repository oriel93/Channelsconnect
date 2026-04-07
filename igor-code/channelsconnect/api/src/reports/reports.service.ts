import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface ReportFilters {
  userId: string;
  startDate?: Date;
  endDate?: Date;
  listingId?: number;
}

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get revenue statistics
   * Includes all bookings except cancelled ones
   */
  async getRevenueStats(filters: ReportFilters) {
    const { userId, startDate, endDate, listingId } = filters;

    const where: any = {
      userId,
      status: { notIn: ['cancelled'] }, // Include confirmed, pending, and any other status
    };

    if (startDate || endDate) {
      where.checkIn = {};
      if (startDate) where.checkIn.gte = startDate;
      if (endDate) where.checkIn.lte = endDate;
    }

    if (listingId) {
      where.listingId = listingId;
    }

    // Get all bookings in range
    const bookings = await this.prisma.booking.findMany({
      where,
      include: {
        listing: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: { checkIn: 'asc' },
    });

    // Calculate total revenue
    const totalRevenue = bookings.reduce((sum, b) => sum + Number(b.totalPrice || 0), 0);
    const totalBookings = bookings.length;
    const averageBookingValue = totalBookings > 0 ? totalRevenue / totalBookings : 0;

    // Calculate total nights booked
    const totalNightsBooked = bookings.reduce((sum, b) => {
      const nights = Math.max(1, Math.ceil((new Date(b.checkOut).getTime() - new Date(b.checkIn).getTime()) / (1000 * 60 * 60 * 24)));
      return sum + nights;
    }, 0);

    // Revenue by month
    const revenueByMonth: Record<string, { month: string; revenue: number; bookings: number; nights: number }> = {};
    bookings.forEach((b) => {
      const month = new Date(b.checkIn).toISOString().slice(0, 7);
      const nights = Math.max(1, Math.ceil((new Date(b.checkOut).getTime() - new Date(b.checkIn).getTime()) / (1000 * 60 * 60 * 24)));
      if (!revenueByMonth[month]) {
        revenueByMonth[month] = { month, revenue: 0, bookings: 0, nights: 0 };
      }
      revenueByMonth[month].revenue += Number(b.totalPrice || 0);
      revenueByMonth[month].bookings += 1;
      revenueByMonth[month].nights += nights;
    });

    // Revenue by listing
    const revenueByListing: Record<number, { listingId: number; listingName: string; revenue: number; bookings: number; nights: number }> = {};
    bookings.forEach((b) => {
      const nights = Math.max(1, Math.ceil((new Date(b.checkOut).getTime() - new Date(b.checkIn).getTime()) / (1000 * 60 * 60 * 24)));
      if (!revenueByListing[b.listingId]) {
        revenueByListing[b.listingId] = {
          listingId: b.listingId,
          listingName: b.listing?.title || `Property ${b.listingId}`,
          revenue: 0,
          bookings: 0,
          nights: 0,
        };
      }
      revenueByListing[b.listingId].revenue += Number(b.totalPrice || 0);
      revenueByListing[b.listingId].bookings += 1;
      revenueByListing[b.listingId].nights += nights;
    });

    // Revenue by source/channel
    const revenueBySource: Record<string, { source: string; revenue: number; bookings: number; nights: number }> = {};
    bookings.forEach((b) => {
      const source = b.bookingSource || 'Direct';
      const nights = Math.max(1, Math.ceil((new Date(b.checkOut).getTime() - new Date(b.checkIn).getTime()) / (1000 * 60 * 60 * 24)));
      if (!revenueBySource[source]) {
        revenueBySource[source] = { source, revenue: 0, bookings: 0, nights: 0 };
      }
      revenueBySource[source].revenue += Number(b.totalPrice || 0);
      revenueBySource[source].bookings += 1;
      revenueBySource[source].nights += nights;
    });

    // Calculate comparison with previous period
    let previousPeriodRevenue = 0;
    let previousPeriodBookings = 0;
    if (startDate && endDate) {
      const periodDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const previousStart = new Date(startDate.getTime() - periodDays * 24 * 60 * 60 * 1000);
      const previousEnd = new Date(startDate.getTime() - 1);

      const prevBookings = await this.prisma.booking.findMany({
        where: {
          userId,
          status: { notIn: ['cancelled'] },
          checkIn: {
            gte: previousStart,
            lte: previousEnd,
          },
          ...(listingId && { listingId }),
        },
      });

      previousPeriodRevenue = prevBookings.reduce((sum, b) => sum + Number(b.totalPrice || 0), 0);
      previousPeriodBookings = prevBookings.length;
    }

    const revenueChange = previousPeriodRevenue > 0
      ? ((totalRevenue - previousPeriodRevenue) / previousPeriodRevenue) * 100
      : totalRevenue > 0 ? 100 : 0;

    return {
      summary: {
        totalRevenue,
        totalBookings,
        totalNightsBooked,
        averageBookingValue,
        previousPeriodRevenue,
        previousPeriodBookings,
        revenueChange,
      },
      byMonth: Object.values(revenueByMonth).sort((a, b) => a.month.localeCompare(b.month)),
      byListing: Object.values(revenueByListing).sort((a, b) => b.revenue - a.revenue),
      bySource: Object.values(revenueBySource).sort((a, b) => b.revenue - a.revenue),
    };
  }

  /**
   * Get occupancy statistics
   * Uses bookings and calendar events to calculate occupancy
   */
  async getOccupancyStats(filters: ReportFilters) {
    const { userId, startDate, endDate, listingId } = filters;

    // Get all user's listings
    const listingsWhere: any = { userId };
    if (listingId) listingsWhere.id = listingId;

    const listings = await this.prisma.listing.findMany({
      where: listingsWhere,
      select: { id: true, title: true },
    });

    if (listings.length === 0) {
      return {
        summary: {
          overallOccupancyRate: 0,
          totalNightsBooked: 0,
          totalNightsAvailable: 0,
          averageStayLength: 0,
          totalBookings: 0,
        },
        byListing: [],
        byMonth: [],
      };
    }

    const listingIds = listings.map((l) => l.id);

    // Calculate date range
    const start = startDate || new Date(new Date().setMonth(new Date().getMonth() - 1));
    const end = endDate || new Date();
    const totalDaysInRange = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const totalNightsAvailable = totalDaysInRange * listings.length;

    // Get bookings in date range (include pending and confirmed, exclude cancelled)
    const bookings = await this.prisma.booking.findMany({
      where: {
        listingId: { in: listingIds },
        status: { notIn: ['cancelled'] },
        OR: [
          {
            checkIn: { gte: start, lte: end },
          },
          {
            checkOut: { gte: start, lte: end },
          },
          {
            AND: [
              { checkIn: { lte: start } },
              { checkOut: { gte: end } },
            ],
          },
        ],
      },
      include: {
        listing: {
          select: { id: true, title: true },
        },
      },
    });

    // Also get calendar events (blocked dates, etc.)
    const calendarEvents = await this.prisma.calendarEvent.findMany({
      where: {
        listingId: { in: listingIds },
        OR: [
          {
            startDate: { gte: start, lte: end },
          },
          {
            endDate: { gte: start, lte: end },
          },
          {
            AND: [
              { startDate: { lte: start } },
              { endDate: { gte: end } },
            ],
          },
        ],
      },
    }).catch(() => []); // If table doesn't exist, return empty array

    // Get blocked dates
    const blockedDates = await this.prisma.blockedDate.findMany({
      where: {
        listingId: { in: listingIds },
        date: { gte: start, lte: end },
      },
    }).catch(() => []); // If table doesn't exist, return empty array

    // Initialize occupancy tracking
    const occupancyByListing: Record<number, { 
      listingId: number; 
      listingName: string; 
      nightsBooked: number; 
      nightsBlocked: number;
      occupancyRate: number;
      bookingCount: number;
    }> = {};

    listings.forEach((l) => {
      occupancyByListing[l.id] = {
        listingId: l.id,
        listingName: l.title || `Property ${l.id}`,
        nightsBooked: 0,
        nightsBlocked: 0,
        occupancyRate: 0,
        bookingCount: 0,
      };
    });

    // Calculate booked nights from bookings
    let totalNightsBooked = 0;
    const occupancyByMonth: Record<string, { month: string; nightsBooked: number; nightsAvailable: number; occupancyRate: number }> = {};

    bookings.forEach((b) => {
      const checkIn = new Date(b.checkIn);
      const checkOut = new Date(b.checkOut);
      
      // Clamp to date range
      const effectiveStart = checkIn < start ? start : checkIn;
      const effectiveEnd = checkOut > end ? end : checkOut;
      
      const nights = Math.max(0, Math.ceil((effectiveEnd.getTime() - effectiveStart.getTime()) / (1000 * 60 * 60 * 24)));
      
      totalNightsBooked += nights;
      
      if (occupancyByListing[b.listingId]) {
        occupancyByListing[b.listingId].nightsBooked += nights;
        occupancyByListing[b.listingId].bookingCount += 1;
      }

      // Distribute nights across months
      let currentDate = new Date(effectiveStart);
      while (currentDate < effectiveEnd) {
        const month = currentDate.toISOString().slice(0, 7);
        if (!occupancyByMonth[month]) {
          occupancyByMonth[month] = {
            month,
            nightsBooked: 0,
            nightsAvailable: 0,
            occupancyRate: 0,
          };
        }
        occupancyByMonth[month].nightsBooked += 1;
        currentDate.setDate(currentDate.getDate() + 1);
      }
    });

    // Add blocked dates to occupancy
    blockedDates.forEach((bd) => {
      if (occupancyByListing[bd.listingId]) {
        occupancyByListing[bd.listingId].nightsBlocked += 1;
      }
    });

    // Calculate occupancy rates per listing
    Object.values(occupancyByListing).forEach((item) => {
      const totalOccupied = item.nightsBooked + item.nightsBlocked;
      item.occupancyRate = totalDaysInRange > 0
        ? (item.nightsBooked / totalDaysInRange) * 100
        : 0;
    });

    // Calculate monthly available nights and rates
    const monthsInRange = this.getMonthsInRange(start, end);
    monthsInRange.forEach((month) => {
      if (!occupancyByMonth[month]) {
        occupancyByMonth[month] = {
          month,
          nightsBooked: 0,
          nightsAvailable: 0,
          occupancyRate: 0,
        };
      }
      const daysInMonth = this.getDaysInMonthForRange(month, start, end);
      occupancyByMonth[month].nightsAvailable = daysInMonth * listings.length;
      occupancyByMonth[month].occupancyRate = occupancyByMonth[month].nightsAvailable > 0
        ? (occupancyByMonth[month].nightsBooked / occupancyByMonth[month].nightsAvailable) * 100
        : 0;
    });

    // Calculate average stay length
    const totalStays = bookings.length;
    const totalStayNights = bookings.reduce((sum, b) => {
      const nights = Math.ceil((new Date(b.checkOut).getTime() - new Date(b.checkIn).getTime()) / (1000 * 60 * 60 * 24));
      return sum + nights;
    }, 0);
    const averageStayLength = totalStays > 0 ? totalStayNights / totalStays : 0;

    const overallOccupancyRate = totalNightsAvailable > 0
      ? (totalNightsBooked / totalNightsAvailable) * 100
      : 0;

    return {
      summary: {
        overallOccupancyRate,
        totalNightsBooked,
        totalNightsAvailable,
        averageStayLength,
        totalBookings: bookings.length,
        totalListings: listings.length,
        daysInRange: totalDaysInRange,
      },
      byListing: Object.values(occupancyByListing).sort((a, b) => b.occupancyRate - a.occupancyRate),
      byMonth: Object.values(occupancyByMonth).sort((a, b) => a.month.localeCompare(b.month)),
    };
  }

  /**
   * Get Average Daily Rate (ADR) statistics
   * Includes all non-cancelled bookings
   */
  async getADRStats(filters: ReportFilters) {
    const { userId, startDate, endDate, listingId } = filters;

    const where: any = {
      userId,
      status: { notIn: ['cancelled'] },
    };

    if (startDate || endDate) {
      where.checkIn = {};
      if (startDate) where.checkIn.gte = startDate;
      if (endDate) where.checkIn.lte = endDate;
    }

    if (listingId) {
      where.listingId = listingId;
    }

    const bookings = await this.prisma.booking.findMany({
      where,
      include: {
        listing: {
          select: { id: true, title: true, basePrice: true },
        },
      },
    });

    // Calculate ADR for each booking
    const bookingsWithADR = bookings.map((b) => {
      const nights = Math.max(1, Math.ceil((new Date(b.checkOut).getTime() - new Date(b.checkIn).getTime()) / (1000 * 60 * 60 * 24)));
      const adr = Number(b.totalPrice || 0) / nights;
      return { ...b, nights, adr };
    });

    // Overall ADR
    const totalRevenue = bookingsWithADR.reduce((sum, b) => sum + Number(b.totalPrice || 0), 0);
    const totalNights = bookingsWithADR.reduce((sum, b) => sum + b.nights, 0);
    const overallADR = totalNights > 0 ? totalRevenue / totalNights : 0;

    // ADR by month
    const adrByMonth: Record<string, { month: string; revenue: number; nights: number; adr: number; bookings: number }> = {};
    bookingsWithADR.forEach((b) => {
      const month = new Date(b.checkIn).toISOString().slice(0, 7);
      if (!adrByMonth[month]) {
        adrByMonth[month] = { month, revenue: 0, nights: 0, adr: 0, bookings: 0 };
      }
      adrByMonth[month].revenue += Number(b.totalPrice || 0);
      adrByMonth[month].nights += b.nights;
      adrByMonth[month].bookings += 1;
    });

    Object.values(adrByMonth).forEach((item) => {
      item.adr = item.nights > 0 ? item.revenue / item.nights : 0;
    });

    // ADR by listing
    const adrByListing: Record<number, { listingId: number; listingName: string; revenue: number; nights: number; adr: number; basePrice: number; bookings: number }> = {};
    bookingsWithADR.forEach((b) => {
      if (!adrByListing[b.listingId]) {
        adrByListing[b.listingId] = {
          listingId: b.listingId,
          listingName: b.listing?.title || `Property ${b.listingId}`,
          revenue: 0,
          nights: 0,
          adr: 0,
          basePrice: Number(b.listing?.basePrice || 0),
          bookings: 0,
        };
      }
      adrByListing[b.listingId].revenue += Number(b.totalPrice || 0);
      adrByListing[b.listingId].nights += b.nights;
      adrByListing[b.listingId].bookings += 1;
    });

    Object.values(adrByListing).forEach((item) => {
      item.adr = item.nights > 0 ? item.revenue / item.nights : 0;
    });

    // ADR by source
    const adrBySource: Record<string, { source: string; revenue: number; nights: number; adr: number; bookings: number }> = {};
    bookingsWithADR.forEach((b) => {
      const source = b.bookingSource || 'Direct';
      if (!adrBySource[source]) {
        adrBySource[source] = { source, revenue: 0, nights: 0, adr: 0, bookings: 0 };
      }
      adrBySource[source].revenue += Number(b.totalPrice || 0);
      adrBySource[source].nights += b.nights;
      adrBySource[source].bookings += 1;
    });

    Object.values(adrBySource).forEach((item) => {
      item.adr = item.nights > 0 ? item.revenue / item.nights : 0;
    });

    // RevPAR (Revenue Per Available Room) calculation
    const listingsWhere: any = { userId };
    if (listingId) listingsWhere.id = listingId;
    
    const listingsCount = await this.prisma.listing.count({ where: listingsWhere });
    const start = startDate || new Date(new Date().setMonth(new Date().getMonth() - 1));
    const end = endDate || new Date();
    const totalDaysInRange = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const totalAvailableNights = totalDaysInRange * listingsCount;
    const revPAR = totalAvailableNights > 0 ? totalRevenue / totalAvailableNights : 0;

    // Calculate occupancy rate for context
    const occupancyRate = totalAvailableNights > 0 ? (totalNights / totalAvailableNights) * 100 : 0;

    return {
      summary: {
        overallADR,
        totalRevenue,
        totalNights,
        revPAR,
        occupancyRate,
        totalBookings: bookings.length,
        totalAvailableNights,
      },
      byMonth: Object.values(adrByMonth).sort((a, b) => a.month.localeCompare(b.month)),
      byListing: Object.values(adrByListing).sort((a, b) => b.adr - a.adr),
      bySource: Object.values(adrBySource).sort((a, b) => b.adr - a.adr),
    };
  }

  /**
   * Get payout status statistics
   */
  async getPayoutStats(filters: ReportFilters) {
    const { userId, startDate, endDate, listingId } = filters;

    const where: any = { userId };

    if (startDate || endDate) {
      where.checkIn = {};
      if (startDate) where.checkIn.gte = startDate;
      if (endDate) where.checkIn.lte = endDate;
    }

    if (listingId) {
      where.listingId = listingId;
    }

    const bookings = await this.prisma.booking.findMany({
      where,
      include: {
        listing: {
          select: { id: true, title: true },
        },
      },
      orderBy: { checkIn: 'desc' },
    });

    // Group by status
    const statusCounts: Record<string, { status: string; count: number; revenue: number }> = {};
    bookings.forEach((b) => {
      const status = b.status || 'pending';
      if (!statusCounts[status]) {
        statusCounts[status] = { status, count: 0, revenue: 0 };
      }
      statusCounts[status].count += 1;
      statusCounts[status].revenue += Number(b.totalPrice || 0);
    });

    // Confirmed (completed) bookings revenue
    const confirmedBookings = bookings.filter((b) => b.status === 'confirmed');
    const confirmedRevenue = confirmedBookings.reduce((sum, b) => sum + Number(b.totalPrice || 0), 0);

    // Pending bookings
    const pendingBookings = bookings.filter((b) => b.status === 'pending' || !b.status);
    const pendingRevenue = pendingBookings.reduce((sum, b) => sum + Number(b.totalPrice || 0), 0);

    // Cancelled bookings
    const cancelledBookings = bookings.filter((b) => b.status === 'cancelled');
    const cancelledRevenue = cancelledBookings.reduce((sum, b) => sum + Number(b.totalPrice || 0), 0);

    // Upcoming payouts (confirmed bookings with checkout in the future)
    const now = new Date();
    const upcomingPayouts = confirmedBookings
      .filter((b) => new Date(b.checkOut) > now)
      .reduce((sum, b) => sum + Number(b.totalPrice || 0), 0);

    // Completed payouts (confirmed bookings with checkout in the past)
    const completedPayouts = confirmedBookings
      .filter((b) => new Date(b.checkOut) <= now)
      .reduce((sum, b) => sum + Number(b.totalPrice || 0), 0);

    // Payouts by source
    const payoutsBySource: Record<string, { source: string; confirmed: number; pending: number; cancelled: number }> = {};
    bookings.forEach((b) => {
      const source = b.bookingSource || 'Direct';
      if (!payoutsBySource[source]) {
        payoutsBySource[source] = { source, confirmed: 0, pending: 0, cancelled: 0 };
      }
      const amount = Number(b.totalPrice || 0);
      if (b.status === 'confirmed') {
        payoutsBySource[source].confirmed += amount;
      } else if (b.status === 'cancelled') {
        payoutsBySource[source].cancelled += amount;
      } else {
        payoutsBySource[source].pending += amount;
      }
    });

    // Recent bookings for display
    const recentBookings = bookings.slice(0, 10).map((b) => ({
      id: b.id,
      guestName: b.guestName,
      listingName: b.listing?.title || `Property ${b.listingId}`,
      checkIn: b.checkIn,
      checkOut: b.checkOut,
      amount: Number(b.totalPrice || 0),
      status: b.status || 'pending',
      source: b.bookingSource || 'Direct',
    }));

    return {
      summary: {
        totalRevenue: confirmedRevenue + pendingRevenue,
        confirmedRevenue,
        pendingRevenue,
        cancelledRevenue,
        upcomingPayouts,
        completedPayouts,
        totalBookings: bookings.length,
        confirmedCount: confirmedBookings.length,
        pendingCount: pendingBookings.length,
        cancelledCount: cancelledBookings.length,
      },
      byStatus: Object.values(statusCounts),
      bySource: Object.values(payoutsBySource),
      recentBookings,
    };
  }

  // Helper methods
  private getMonthsInRange(start: Date, end: Date): string[] {
    const months: string[] = [];
    const current = new Date(start);
    current.setDate(1);

    while (current <= end) {
      months.push(current.toISOString().slice(0, 7));
      current.setMonth(current.getMonth() + 1);
    }

    return months;
  }

  private getDaysInMonthForRange(monthStr: string, start: Date, end: Date): number {
    const monthStart = new Date(monthStr + '-01');
    const monthEnd = new Date(monthStart);
    monthEnd.setMonth(monthEnd.getMonth() + 1);
    monthEnd.setDate(0);

    const effectiveStart = monthStart < start ? start : monthStart;
    const effectiveEnd = monthEnd > end ? end : monthEnd;

    return Math.max(0, Math.ceil((effectiveEnd.getTime() - effectiveStart.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  }
}
