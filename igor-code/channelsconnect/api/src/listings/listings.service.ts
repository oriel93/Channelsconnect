import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateListingDto } from './dto/create-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';

@Injectable()
export class ListingsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createListingDto: CreateListingDto) {
    return this.prisma.listing.create({
      data: {
        ...createListingDto,
        userId,
      },
    });
  }

  async findAll(userId?: string) {
    if (userId) {
      return this.prisma.listing.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
    }
    return this.prisma.listing.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findActive(userId?: string) {
    if (userId) {
      return this.prisma.listing.findMany({
        where: { userId, isActive: true },
        orderBy: { createdAt: 'desc' },
      });
    }
    return this.prisma.listing.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    return this.prisma.listing.findUnique({
      where: { id },
      include: {
        roomTypes: true,
        propertyImages: true,
      },
    });
  }

  async update(id: number, updateListingDto: UpdateListingDto) {
    // Filter out any fields that don't exist in the Prisma schema
    const allowedFields = [
      'title', 'description', 'address', 'city', 'state', 'country', 'postalCode',
      'latitude', 'longitude', 'propertyType', 'bedrooms', 'bathrooms',
      'maxGuests', 'basePrice', 'currency', 'amenities',
      'houseRules', 'cancellationPolicy', 'checkInTime', 'checkOutTime',
      'minNights', 'maxNights', 'isActive', 'beds24PropId', 'beds24RoomId'
    ];
    
    const filteredData = Object.keys(updateListingDto)
      .filter(key => allowedFields.includes(key))
      .reduce((obj, key) => {
        obj[key] = updateListingDto[key];
        return obj;
      }, {} as any);

    return this.prisma.listing.update({
      where: { id },
      data: filteredData,
    });
  }

  async remove(id: number) {
    return this.prisma.listing.delete({
      where: { id },
    });
  }
}

