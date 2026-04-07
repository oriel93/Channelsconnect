import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getDashboardData(userId: string) {
    const [listings, bookings, upcomingBookings, recentBookings] = await Promise.all([
      this.prisma.listing.count({ where: { userId } }),
      this.prisma.booking.count({ where: { userId } }),
      this.prisma.booking.count({
        where: {
          userId,
          checkIn: { gte: new Date() },
          status: 'confirmed',
        },
      }),
      this.prisma.booking.findMany({
        where: { userId },
        include: { listing: true },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    // Calculate revenue
    const totalRevenue = await this.prisma.booking.aggregate({
      where: {
        userId,
        status: 'confirmed',
      },
      _sum: {
        totalPrice: true,
      },
    });

    return {
      stats: {
        totalListings: listings,
        totalBookings: bookings,
        upcomingBookings,
        totalRevenue: totalRevenue._sum.totalPrice || 0,
      },
      recentBookings,
    };
  }

  async getCalendarDashboardData(userId: string, startDate: Date, endDate: Date) {
    const listings = await this.prisma.listing.findMany({
      where: { userId, isActive: true },
    });

    const listingIds = listings.map(l => l.id);

    const [bookings, blockedDates, rates] = await Promise.all([
      this.prisma.booking.findMany({
        where: {
          listingId: { in: listingIds },
          checkIn: { lte: endDate },
          checkOut: { gte: startDate },
          status: { not: 'cancelled' },
        },
        include: { listing: true },
      }),
      this.prisma.blockedDate.findMany({
        where: {
          listingId: { in: listingIds },
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: { listing: true },
      }),
      this.prisma.rate.findMany({
        where: {
          listingId: { in: listingIds },
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: { listing: true },
      }),
    ]);

    return {
      listings,
      bookings,
      blockedDates,
      rates,
    };
  }

  async getChannelsDashboardData(userId: string) {
    const [listings, channels, channelConnections] = await Promise.all([
      this.prisma.listing.findMany({
        where: { userId, isActive: true },
      }),
      this.prisma.channel.findMany({
        where: { isActive: true },
      }),
      this.prisma.channelConnection.findMany({
        where: { userId },
        include: {
          channel: true,
        },
      }),
    ]);

    return {
      listings,
      channels,
      channelConnections,
      stats: {
        totalListings: listings.length,
        totalChannels: channels.length,
        activeConnections: channelConnections.filter(c => c.isActive).length,
      },
    };
  }
}

