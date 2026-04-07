import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateIcalConnectionDto, UpdateIcalConnectionDto } from './dto/ical.dto';

@Injectable()
export class IcalService {
  constructor(private prisma: PrismaService) {}

  async createConnection(userId: string, createDto: CreateIcalConnectionDto) {
    return this.prisma.icalConnection.create({
      data: {
        ...createDto,
        userId,
      },
    });
  }

  async findAll(userId?: string, listingId?: number) {
    const where: any = {};
    if (userId) where.userId = userId;
    if (listingId) where.listingId = listingId;

    return this.prisma.icalConnection.findMany({
      where,
      include: {
        listing: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    return this.prisma.icalConnection.findUnique({
      where: { id },
      include: {
        listing: true,
      },
    });
  }

  async update(id: number, updateDto: UpdateIcalConnectionDto) {
    return this.prisma.icalConnection.update({
      where: { id },
      data: updateDto,
    });
  }

  async remove(id: number) {
    return this.prisma.icalConnection.delete({
      where: { id },
    });
  }

  async syncConnection(id: number) {
    // TODO: Implement actual iCal sync logic
    // This would fetch the iCal feed, parse it, and update bookings
    await this.prisma.icalConnection.update({
      where: { id },
      data: {
        lastSyncAt: new Date(),
        lastSyncStatus: 'success',
      },
    });

    return { message: 'Sync initiated', connectionId: id };
  }

  async syncAll(userId: string) {
    const connections = await this.prisma.icalConnection.findMany({
      where: {
        userId,
        syncEnabled: true,
      },
    });

    // TODO: Implement actual sync logic
    const results = connections.map(conn => ({
      connectionId: conn.id,
      status: 'queued',
    }));

    return { message: 'All syncs initiated', results };
  }

  async exportIcal(listingId: number) {
    // TODO: Generate iCal feed for a listing
    const bookings = await this.prisma.booking.findMany({
      where: {
        listingId,
        status: { not: 'cancelled' },
      },
    });

    return {
      message: 'iCal export generated',
      listingId,
      bookingsCount: bookings.length,
      // In a real implementation, return the iCal feed content
    };
  }

  async importIcal(userId: string, listingId: number, icalUrl: string) {
    // TODO: Import from iCal URL
    return {
      message: 'iCal import initiated',
      listingId,
      icalUrl,
    };
  }
}

