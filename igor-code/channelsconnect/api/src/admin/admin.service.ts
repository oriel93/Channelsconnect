import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import { PrismaService } from '../prisma/prisma.service';
import { ChannexContentService } from '../services/channex/channex-content.service';

// Supabase admin client for Storage operations
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_ANON_KEY || '',
);

const STORAGE_BUCKET = 'property-media';

/** OTA high-res spec: 1920×1080 max, JPEG 92 % */
const HR_WIDTH  = 1920;
const HR_HEIGHT = 1080;
const HR_QUALITY = 92;

/**
 * AdminService — global platform data access.
 *
 * All methods here bypass the per-user WHERE clause used by ListingsService.
 * Only called from AdminController, which is gated behind RolesGuard('admin').
 *
 * SAFE: does not touch Channex sync, webhook, or ARI logic.
 */
@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private prisma: PrismaService,
    private readonly channexContent: ChannexContentService,
  ) {}

  // ── Users ──────────────────────────────────────────────────────────────────

  async getAllUsers() {
    return this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        airbnbHostId: true,
        syncStatus: true,
        createdAt: true,
        _count: {
          select: { listings: true, bookings: true },
        },
      },
    });
  }

  // ── User role management ───────────────────────────────────────────────────

  /** The one address that can never be demoted */
  private readonly SUPER_ADMIN_EMAIL = 'oriel@erorentals.com';

  async updateUserRole(targetUserId: string, newRole: string) {
    const allowed = ['user', 'admin'];
    if (!allowed.includes(newRole.toLowerCase())) {
      throw new BadRequestException(`Invalid role. Must be one of: ${allowed.join(', ')}`);
    }

    const target = await this.prisma.user.findUnique({ where: { id: targetUserId } });
    if (!target) throw new NotFoundException('User not found');

    // Super-admin can never be demoted via this endpoint
    if (target.email?.toLowerCase() === this.SUPER_ADMIN_EMAIL.toLowerCase() && newRole !== 'admin') {
      throw new ForbiddenException('The super-admin account cannot be demoted');
    }

    const updated = await this.prisma.user.update({
      where: { id: targetUserId },
      data: { role: newRole.toLowerCase() },
      select: { id: true, email: true, role: true },
    });

    this.logger.log(`[Admin] Role updated: ${updated.email} → ${updated.role}`);
    return updated;
  }

  // ── Listings ───────────────────────────────────────────────────────────────

  async getAllListings() {
    return this.prisma.listing.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, email: true, name: true, role: true } },
        _count: { select: { bookings: true, propertyImages: true } },
      },
    });
  }

  // ── CSV Export ─────────────────────────────────────────────────────────────

  /**
   * Build a CSV string from all listings + their owner email.
   * Manually escaped — no external dependencies needed.
   */
  async buildListingsCsv(): Promise<string> {
    this.logger.log('[Admin] Building global listings CSV export');

    const listings = await this.prisma.listing.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { email: true, name: true } },
      },
    });

    const headers = [
      'ID',
      'Title',
      'Property Type',
      'Bedrooms',
      'Bathrooms',
      'Max Guests',
      'City',
      'Country',
      'Amenities',
      'Source',
      'Active',
      'Base Price',
      'Currency',
      'Owner Email',
      'Owner Name',
      'Created At',
    ];

    const escape = (v: any): string => {
      const str = v == null ? '' : String(v);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const parseAmenities = (raw: any): string => {
      if (!raw) return '';
      try {
        const arr = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (Array.isArray(arr)) return arr.filter(Boolean).join(' | ');
        return String(raw);
      } catch {
        return String(raw);
      }
    };

    const rows = listings.map((l) => [
      l.id,
      l.title,
      l.propertyType || '',
      l.bedrooms ?? '',
      l.bathrooms ?? '',
      l.maxGuests ?? '',
      l.city || '',
      l.country || '',
      parseAmenities(l.amenities),
      l.source || '',
      l.isActive ? 'Yes' : 'No',
      l.basePrice ?? '',
      l.currency,
      l.user?.email || '',
      l.user?.name || '',
      l.createdAt.toISOString(),
    ]);

    const lines = [headers.join(','), ...rows.map((r) => r.map(escape).join(','))];
    return lines.join('\n');
  }

  // ── Per-User Data Export ───────────────────────────────────────────────────

  /**
   * Export all data for a single user as a structured JSON object.
   * Includes listings, bookings, ical connections, channex mappings,
   * property images, and consent/audit fields.
   */
  async exportUserData(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        listings: {
          include: {
            propertyImages: true,
            channexMappings: true,
            icalConnections: true,
            rates: { take: 10, orderBy: { date: 'desc' } },
          },
        },
        bookings: { orderBy: { createdAt: 'desc' } },
        airbnbConnections: true,
        icalConnections: true,
        syncLogs: { take: 20, orderBy: { createdAt: 'desc' } },
      },
    });

    if (!user) throw new NotFoundException(`User ${userId} not found`);

    return {
      exportedAt: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt,
        // Legal consent audit trail
        tosAcceptedAt: (user as any).tosAcceptedAt ?? null,
        signupIp: (user as any).signupIp ?? null,
        syncStatus: user.syncStatus,
        airbnbHostId: user.airbnbHostId,
      },
      listings: user.listings,
      bookings: user.bookings,
      icalConnections: user.icalConnections,
      airbnbConnections: user.airbnbConnections,
      recentSyncLogs: user.syncLogs,
      summary: {
        listingCount: user.listings.length,
        bookingCount: user.bookings.length,
        icalCount: user.icalConnections.length,
      },
    };
  }

  // ── Image Processing (admin-only sharp pipeline) ───────────────────────────

  /**
   * Convert a single property image to OTA hi-res spec using sharp.
   *
   * Pipeline:
   *   1. Download original image from Supabase Storage (or URL)
   *   2. Resize to max 1920×1080, maintain aspect ratio, JPEG 92 %
   *   3. Upload back with _highres suffix
   *   4. Update property_images row with highResUrl + highResStoragePath
   *
   * Returns the new public URL.
   */
  async convertImageToHighRes(listingId: number, imageId: number): Promise<{
    highResUrl: string;
    storagePath: string;
    width: number;
    height: number;
    sizeBytes: number;
  }> {
    this.logger.log(`[Admin/Image] Converting image id=${imageId} listing=${listingId}`);

    // 1. Fetch image record
    const image = await this.prisma.propertyImage.findFirst({
      where: { id: imageId, listingId },
    });
    if (!image) throw new NotFoundException(`Image ${imageId} not found for listing ${listingId}`);

    // 2. Download source image
    let sourceBuffer: Buffer;

    if (image.storagePath) {
      // Download from Supabase Storage
      const { data, error } = await supabaseAdmin.storage
        .from(STORAGE_BUCKET)
        .download(image.storagePath);
      if (error || !data) {
        throw new Error(`Failed to download from Storage: ${error?.message || 'no data'}`);
      }
      sourceBuffer = Buffer.from(await data.arrayBuffer());
    } else {
      // Fallback: fetch from public URL
      const response = await fetch(image.url);
      if (!response.ok) throw new Error(`Failed to fetch image URL: ${response.status}`);
      sourceBuffer = Buffer.from(await response.arrayBuffer());
    }

    // 3. Process with sharp — resize to 1920×1080 max, JPEG 92%
    const sharpInstance = sharp(sourceBuffer)
      .resize(HR_WIDTH, HR_HEIGHT, {
        fit: 'inside',      // preserve aspect ratio, never crop
        withoutEnlargement: false, // allow upscale to meet OTA minimum
      })
      .jpeg({ quality: HR_QUALITY, mozjpeg: true });

    const outputBuffer = await sharpInstance.toBuffer();
    const metadata = await sharp(outputBuffer).metadata();

    // 4. Build hi-res storage path
    const originalName = image.storagePath
      ? path.basename(image.storagePath, path.extname(image.storagePath))
      : `image_${imageId}`;
    const hrStoragePath = `listings/${listingId}/highres/${originalName}_highres.jpg`;

    // 5. Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .upload(hrStoragePath, outputBuffer, {
        contentType: 'image/jpeg',
        upsert: true,
      });
    if (uploadError) throw new Error(`Hi-res upload failed: ${uploadError.message}`);

    // 6. Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(hrStoragePath);
    const highResUrl = urlData.publicUrl;

    // 7. Update DB record
    await this.prisma.propertyImage.update({
      where: { id: imageId },
      data: {
        highResUrl,
        highResStoragePath: hrStoragePath,
        highResConvertedAt: new Date(),
      },
    });

    this.logger.log(
      `[Admin/Image] Converted image id=${imageId} → ${hrStoragePath} ` +
      `(${metadata.width}×${metadata.height}, ${outputBuffer.length} bytes)`,
    );

    return {
      highResUrl,
      storagePath: hrStoragePath,
      width: metadata.width ?? HR_WIDTH,
      height: metadata.height ?? HR_HEIGHT,
      sizeBytes: outputBuffer.length,
    };
  }

  /** Fetch all images for a listing (admin view — includes hi-res metadata) */
  async getListingImages(listingId: number) {
    return this.prisma.propertyImage.findMany({
      where: { listingId },
      orderBy: [{ sortOrder: 'asc' }, { displayOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  // ── Stats ──────────────────────────────────────────────────────────────────

  async getPlatformStats() {
    const [userCount, listingCount, bookingCount, activeListings] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.listing.count(),
      this.prisma.booking.count(),
      this.prisma.listing.count({ where: { isActive: true } }),
    ]);

    return {
      userCount,
      listingCount,
      bookingCount,
      activeListings,
      inactiveListings: listingCount - activeListings,
    };
  }

  // ── Review Queue ──────────────────────────────────────────────────────────

  // ── Concierge Scrape Queue (OTA + Website extract) ────────────────────────

  async getConciergeQueue() {
    return this.prisma.listing.findMany({
      where: {
        reviewStatus: { in: ['pending_ota_scrape', 'pending_website_extract'] },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, email: true, name: true } },
        propertyImages: { take: 5 },
      },
    });
  }

  /**
   * Admin manually patches extracted data onto a scrape-pending listing,
   * then marks it approved — making it visible and active for the user.
   */
  async completeConciergeListing(listingId: number, data: Record<string, any>) {
    const listing = await this.prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) throw new NotFoundException(`Listing ${listingId} not found`);

    const safeFields: Record<string, any> = {};
    const allowed = [
      'title','description','address','city','state','country','postalCode',
      'latitude','longitude','propertyType','maxGuests','bedrooms','bathrooms',
      'basePrice','currency','amenities','houseRules','cancellationPolicy',
      'checkInTime','checkOutTime','minNights','maxNights',
    ];
    for (const key of allowed) {
      if (key in data && data[key] !== undefined && data[key] !== '') {
        safeFields[key] = data[key];
      }
    }

    const updated = await this.prisma.listing.update({
      where: { id: listingId },
      data: { ...safeFields, reviewStatus: 'approved', isActive: true },
    });

    this.logger.log(`[Concierge] Listing ${listingId} completed and approved by admin`);
    return updated;
  }

  async getPendingReviewListings() {
    return this.prisma.listing.findMany({
      where: { reviewStatus: 'pending_admin_review' },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, email: true, name: true } },
        propertyImages: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }], take: 10 },
        _count: { select: { bookings: true, propertyImages: true } },
      },
    });
  }

  async getReviewListing(listingId: number) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      include: {
        user: { select: { id: true, email: true, name: true } },
        propertyImages: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] },
        _count: { select: { bookings: true } },
      },
    });
    if (!listing) throw new NotFoundException(`Listing ${listingId} not found`);
    return listing;
  }

  async updateReviewListing(
    listingId: number,
    data: {
      title?: string;
      description?: string;
      address?: string;
      city?: string;
      state?: string;
      country?: string;
      postalCode?: string;
      latitude?: number;
      longitude?: number;
      propertyType?: string;
      bedrooms?: number;
      bathrooms?: number;
      maxGuests?: number;
      basePrice?: number;
      currency?: string;
      amenities?: string[];
      houseRules?: string;
      beds?: number;
      checkInTime?: string;
      checkOutTime?: string;
      minNights?: number;
    },
  ) {
    // TASK 1: Strip immutable / non-schema fields before update to prevent 500s.
    // Destructure out id, createdAt, updatedAt, userId, and any other Prisma-
    // managed or relation fields that Prisma rejects in a data payload.
    const {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      id: _id,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      created_at: _ca,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      createdAt: _cat,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      updatedAt: _uat,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      userId: _uid,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      user: _user,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      propertyImages: _imgs,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      bookings: _bk,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      _count: _cnt,
      ...updateData
    } = data as any;

    // Further restrict to known-safe listing fields only
    const allowedKeys = new Set([
      'title','description','address','city','state','country','postalCode',
      'latitude','longitude','propertyType','bedrooms','bathrooms','beds',
      'maxGuests','basePrice','currency','amenities',
      'houseRules','cancellationPolicy','checkInTime','checkOutTime',
      'minNights','maxNights','isActive','reviewStatus',
    ]);
    const safeData: Record<string, any> = Object.fromEntries(
      Object.entries(updateData).filter(([k]) => allowedKeys.has(k)),
    );

    try {
      return await this.prisma.listing.update({ where: { id: listingId }, data: safeData });
    } catch (err: any) {
      this.logger.error(`[AdminService] updateReviewListing ${listingId} failed: ${err?.message}`, err?.stack);
      throw err; // NestJS global filter will return 500 with the real message
    }
  }

  async approveListing(listingId: number) {
    const listing = await this.prisma.listing.update({
      where: { id: listingId },
      data: { reviewStatus: 'approved', isActive: true },
    });
    this.logger.log(`[Admin/Review] Approved listing id=${listingId} — now live`);
    return { approved: true, listingId: listing.id, title: listing.title };
  }

  async rejectListing(listingId: number, reason?: string) {
    const listing = await this.prisma.listing.update({
      where: { id: listingId },
      data: { reviewStatus: 'rejected', isActive: false },
    });
    this.logger.log(`[Admin/Review] Rejected listing id=${listingId}. Reason: ${reason || 'none'}`);
    return { rejected: true, listingId: listing.id, title: listing.title, reason };
  }

  // ── Channex Sync Engine ────────────────────────────────────────────────────

  /**
   * Return the current Channex sync state for a listing.
   * Used by the admin UI to decide which button label to show.
   */
  async getListingSyncState(listingId: number) {
    return this.channexContent.getSyncState(listingId);
  }

  /**
   * Sync a listing to Channex (intelligent POST/PUT routing).
   * Returns SyncResult — never throws; errors surface via result.errorMessage.
   */
  async syncListingToChannex(listingId: number) {
    this.logger.log(`[Admin/Sync] Syncing listing ${listingId} to Channex`);
    const result = await this.channexContent.syncListing(listingId);
    this.logger.log(
      `[Admin/Sync] listing ${listingId} → outcome=${result.outcome} ` +
      `propertyId=${result.channexPropertyId} roomTypeId=${result.channexRoomTypeId}`,
    );
    return result;
  }

  /**
   * Deactivate a listing on Channex and archive it locally.
   */
  async deactivateListingOnChannex(listingId: number) {
    this.logger.log(`[Admin/Sync] Deactivating listing ${listingId} on Channex`);
    return this.channexContent.deactivateListing(listingId);
  }
}
