import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getAnalytics(userId: string, startDate?: Date, endDate?: Date) {
    const dateFilter: any = {};
    if (startDate) dateFilter.gte = startDate;
    if (endDate) dateFilter.lte = endDate;

    const bookings = await this.prisma.booking.findMany({
      where: {
        userId,
        ...(Object.keys(dateFilter).length > 0 && {
          checkIn: dateFilter,
        }),
      },
    });

    // Calculate metrics
    const totalBookings = bookings.length;
    const confirmedBookings = bookings.filter(b => b.status === 'confirmed').length;
    const cancelledBookings = bookings.filter(b => b.status === 'cancelled').length;
    
    const totalRevenue = bookings
      .filter(b => b.status === 'confirmed')
      .reduce((sum, b) => sum + Number(b.totalPrice), 0);

    const avgBookingValue = confirmedBookings > 0 ? totalRevenue / confirmedBookings : 0;

    // Bookings by source
    const bookingsBySource = bookings.reduce((acc: any, b) => {
      const source = b.bookingSource || 'direct';
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    }, {});

    // Monthly breakdown
    const monthlyData = bookings.reduce((acc: any, b) => {
      const month = new Date(b.checkIn).toISOString().slice(0, 7);
      if (!acc[month]) {
        acc[month] = {
          bookings: 0,
          revenue: 0,
        };
      }
      acc[month].bookings += 1;
      if (b.status === 'confirmed') {
        acc[month].revenue += Number(b.totalPrice);
      }
      return acc;
    }, {});

    return {
      summary: {
        totalBookings,
        confirmedBookings,
        cancelledBookings,
        totalRevenue,
        avgBookingValue,
        cancellationRate: totalBookings > 0 ? (cancelledBookings / totalBookings) * 100 : 0,
      },
      bookingsBySource,
      monthlyData,
    };
  }

  async getMarketData(city?: string, country?: string) {
    // This would typically query external market data APIs
    // For now, return basic statistics from the database
    const where: any = {};
    if (city) where.city = city;
    if (country) where.country = country;

    const listings = await this.prisma.listing.findMany({
      where: {
        ...where,
        isActive: true,
      },
      select: {
        basePrice: true,
        bedrooms: true,
        propertyType: true,
      },
    });

    const avgPrice = listings.length > 0
      ? listings.reduce((sum, l) => sum + Number(l.basePrice || 0), 0) / listings.length
      : 0;

    return {
      location: { city, country },
      listingsCount: listings.length,
      averagePrice: avgPrice,
      priceRange: {
        min: Math.min(...listings.map(l => Number(l.basePrice || 0))),
        max: Math.max(...listings.map(l => Number(l.basePrice || 0))),
      },
    };
  }
}

