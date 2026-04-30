import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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

  constructor(private prisma: PrismaService) {}

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
}
