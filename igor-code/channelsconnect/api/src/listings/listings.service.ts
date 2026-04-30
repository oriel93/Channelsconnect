import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
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

    // Use Prisma's unchecked create input to avoid XOR conflict.
    // All non-relation fields go directly in data; userId is the FK.
    const listing = await this.prisma.listing.create({
      data: {
        userId,
        title:              data.title,
        currency:           data.currency,
        minNights:          data.minNights,
        isActive:           data.isActive,
        source:             data.source,
        description:        data.description,
        address:            data.address,
        city:               data.city,
        state:              data.state,
        country:            data.country,
        postalCode:         data.postalCode,
        latitude:           data.latitude,
        longitude:          data.longitude,
        propertyType:       data.propertyType,
        bedrooms:           data.bedrooms,
        bathrooms:          data.bathrooms,
        beds:               data.beds,
        maxGuests:          data.maxGuests,
        basePrice:          data.basePrice,
        amenities:          data.amenities,
        houseRules:         data.houseRules,
        cancellationPolicy: data.cancellationPolicy,
        checkInTime:        data.checkInTime,
        checkOutTime:       data.checkOutTime,
        maxNights:          data.maxNights,
        beds24PropId:       data.beds24PropId,
        beds24RoomId:       data.beds24RoomId,
        airbnbListingId:    data.airbnbListingId,
        captureUrl:         data.captureUrl,
      },
    });

    this.logger.log(`[Listings] Created listing id=${listing.id} title="${listing.title}"`);
    return listing;
  }

  // ─── Standard user-scoped queries (multi-tenancy) ─────────────────────────

  /**
   * Returns listings for the authenticated user ONLY.
   * Never returns listings belonging to other users.
   */
  async findAll(userId: string) {
    return this.prisma.listing.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findActive(userId: string) {
    return this.prisma.listing.findMany({
      where: { userId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Fetch a single listing by id.
   * @param ownerUserId  When supplied, throws 403 if the listing doesn't belong to this user.
   *                     Omit only for admin / internal service calls.
   */
  async findOne(id: number, ownerUserId?: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id },
      include: {
        roomTypes: true,
        propertyImages: true,
      },
    });

    if (!listing) throw new NotFoundException(`Listing ${id} not found`);

    if (ownerUserId && listing.userId !== ownerUserId) {
      throw new ForbiddenException('You do not have access to this listing');
    }

    return listing;
  }

  /**
   * Update a listing — verifies ownership before writing.
   */
  async update(id: number, updateListingDto: UpdateListingDto, ownerUserId?: string) {
    // Ownership check — throws 403 for cross-tenant attempts
    if (ownerUserId) {
      const existing = await this.prisma.listing.findUnique({ where: { id } });
      if (!existing) throw new NotFoundException(`Listing ${id} not found`);
      if (existing.userId !== ownerUserId) {
        throw new ForbiddenException('You do not have permission to update this listing');
      }
    }

    // Allow only known schema fields
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

  /**
   * Delete a listing — verifies ownership before deleting.
   */
  async remove(id: number, ownerUserId?: string) {
    if (ownerUserId) {
      const existing = await this.prisma.listing.findUnique({ where: { id } });
      if (!existing) throw new NotFoundException(`Listing ${id} not found`);
      if (existing.userId !== ownerUserId) {
        throw new ForbiddenException('You do not have permission to delete this listing');
      }
    }

    return this.prisma.listing.delete({ where: { id } });
  }

  // ─── Admin-only queries (no user filter) ──────────────────────────────────

  /** All listings across all users — admin use only */
  async findAllGlobal() {
    return this.prisma.listing.findMany({
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, email: true, name: true, role: true } } },
    });
  }

  /** Count listings per user — for admin stats */
  async countByUser() {
    return this.prisma.listing.groupBy({
      by: ['userId'],
      _count: { id: true },
    });
  }
}
