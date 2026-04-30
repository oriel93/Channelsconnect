import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateListingDto } from './dto/create-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';

// ─── Safe-defaults factory ────────────────────────────────────────────────────
//
// Merges caller-supplied fields with safe defaults for every non-nullable
// Listing column that has no schema default.  This guarantees Prisma never
// throws a NOT-NULL constraint violation regardless of what the controller
// passes in.
//
// Schema-level defaults (currency = 'USD', minNights = 1, isActive = true,
// source = 'channex') are already handled by Prisma; we only fill in anything
// that could arrive as undefined from the DTO.

const CERT_USER_ID = '1d63e070-dbff-48b8-ba2a-be8ba3a41ae8';

function withSafeDefaults(
  userId: string,
  dto: Partial<CreateListingDto> & Record<string, any>,
): Record<string, any> {
  return {
    // Required — always provided
    title: dto.title?.trim() || 'Channels Connect Property',
    // Schema defaults exist for these but we be explicit just in case
    currency:   dto.currency  ?? 'USD',
    minNights:  dto.minNights ?? 1,
    isActive:   dto.isActive  ?? true,
    source:     dto.source    ?? 'channex',
    // Optional fields — pass through as-is (nullable in schema)
    description:        dto.description        ?? null,
    address:            dto.address            ?? null,
    city:               dto.city               ?? null,
    state:              dto.state              ?? null,
    country:            dto.country            ?? null,
    postalCode:         dto.postalCode         ?? null,
    latitude:           dto.latitude           ?? null,
    longitude:          dto.longitude          ?? null,
    propertyType:       dto.propertyType       ?? null,
    bedrooms:           dto.bedrooms           ?? null,
    bathrooms:          dto.bathrooms          ?? null,
    beds:               dto.beds               ?? null,
    maxGuests:          dto.maxGuests          ?? null,
    basePrice:          dto.basePrice          ?? null,
    amenities:          dto.amenities          ?? null,
    houseRules:         dto.houseRules         ?? null,
    cancellationPolicy: dto.cancellationPolicy ?? null,
    checkInTime:        dto.checkInTime        ?? null,
    checkOutTime:       dto.checkOutTime       ?? null,
    maxNights:          dto.maxNights          ?? null,
    beds24PropId:       dto.beds24PropId       ?? null,
    beds24RoomId:       dto.beds24RoomId       ?? null,
    airbnbListingId:    dto.airbnbListingId    ?? null,
    captureUrl:         dto.captureUrl         ?? null,
  };
}

@Injectable()
export class ListingsService {
  private readonly logger = new Logger(ListingsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Ensure the cert/system user row exists before creating a listing under it.
   * Listing has a FK → users.id with onDelete: Cascade, so we must upsert the
   * user or Prisma will throw a foreign-key constraint violation.
   */
  private async ensureUserExists(userId: string): Promise<void> {
    const existing = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!existing) {
      this.logger.warn(`[Listings] User ${userId} not in DB — inserting placeholder row`);
      await this.prisma.user.create({
        data: {
          id:    userId,
          email: `${userId}@channelsconnect.internal`,
          name:  'Channels Connect System',
          role:  'user',
        },
      });
    }
  }

  async create(userId: string, createListingDto: Partial<CreateListingDto> & Record<string, any>) {
    // Guarantee user row exists (FK safety)
    await this.ensureUserExists(userId);

    const data = withSafeDefaults(userId, createListingDto);
    this.logger.log(`[Listings] Creating listing "${data.title}" for user ${userId}`);

    const listing = await this.prisma.listing.create({
      data: { ...data, userId },
    });

    this.logger.log(`[Listings] Created listing id=${listing.id} title="${listing.title}"`);
    return listing;
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
    // Allow all schema fields — filter only unknown keys to be safe
    const schemaFields = new Set([
      'title', 'description', 'address', 'city', 'state', 'country', 'postalCode',
      'latitude', 'longitude', 'propertyType', 'bedrooms', 'bathrooms', 'beds',
      'maxGuests', 'basePrice', 'currency', 'amenities',
      'houseRules', 'cancellationPolicy', 'checkInTime', 'checkOutTime',
      'minNights', 'maxNights', 'isActive',
      'beds24PropId', 'beds24RoomId', 'airbnbListingId', 'captureUrl', 'source',
    ]);

    const filteredData = Object.fromEntries(
      Object.entries(updateListingDto).filter(([key]) => schemaFields.has(key)),
    );

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
