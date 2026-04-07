import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';

@Injectable()
export class BookingsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createBookingDto: CreateBookingDto) {
    return this.prisma.booking.create({
      data: {
        ...createBookingDto,
        userId,
      },
    });
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
    return this.prisma.booking.update({
      where: { id },
      data: updateBookingDto,
    });
  }

  async remove(id: number) {
    return this.prisma.booking.delete({
      where: { id },
    });
  }

  async cancelBooking(id: number) {
    return this.prisma.booking.update({
      where: { id },
      data: { status: 'cancelled' },
    });
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

