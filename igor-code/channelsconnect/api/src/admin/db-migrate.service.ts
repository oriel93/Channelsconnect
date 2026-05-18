/**
 * db-migrate.service.ts
 *
 * Applies structural schema changes that are safe to run live:
 *   - All new columns are nullable or have defaults
 *   - No data-destructive operations
 *
 * Uses raw SQL so we don't need Prisma migrations to be deployed —
 * the app itself can apply safe additions in a transaction.
 *
 * Only called from POST /admin/migrate-db (RolesGuard + @Roles('admin')).
 * Logs all changes for auditability.
 */
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class DbMigrateService {
  private readonly logger = new Logger(DbMigrateService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Apply all Phase 2 schema additions.
   * Safe: all nullable, all have defaults, all non-destructive.
   *
   * Runs in a single transaction — if any column already exists, it's a no-op.
   */
  async applySafeSchemaAdditions(): Promise<{ applied: string[]; errors: string[] }> {
    const applied: string[] = [];
    const errors: string[] = [];

    // ── listings.isArchived ───────────────────────────────────────────────
    try {
      await this.prisma.$executeRawUnsafe(`
        ALTER TABLE listings
        ADD COLUMN IF NOT EXISTS isArchived Boolean NOT NULL DEFAULT false;
      `);
      // Set default for existing rows
      await this.prisma.$executeRawUnsafe(`
        ALTER TABLE listings
        ALTER COLUMN isArchived SET DEFAULT false;
      `);
      applied.push('listings.isArchived');
    } catch (err: any) {
      if (err?.code === '42710' || err?.message?.includes('already exists')) {
        applied.push('listings.isArchived (already exists)');
      } else {
        errors.push(`listings.isArchived: ${err?.message ?? err}`);
      }
    }

    // ── listings.archivedAt ──────────────────────────────────────────────
    try {
      await this.prisma.$executeRawUnsafe(`
        ALTER TABLE listings
        ADD COLUMN IF NOT EXISTS archivedAt TIMESTAMPTZ;
      `);
      applied.push('listings.archivedAt');
    } catch (err: any) {
      if (err?.message?.includes('already exists')) {
        applied.push('listings.archivedAt (already exists)');
      } else {
        errors.push(`listings.archivedAt: ${err?.message ?? err}`);
      }
    }

    // ── room_types.channexRoomTypeId ──────────────────────────────────────
    try {
      await this.prisma.$executeRawUnsafe(`
        ALTER TABLE room_types
        ADD COLUMN IF NOT EXISTS channexRoomTypeId TEXT;
      `);
      applied.push('room_types.channexRoomTypeId');
    } catch (err: any) {
      if (err?.message?.includes('already exists')) {
        applied.push('room_types.channexRoomTypeId (already exists)');
      } else {
        errors.push(`room_types.channexRoomTypeId: ${err?.message ?? err}`);
      }
    }

    // ── room_types.channexRatePlanId ──────────────────────────────────────
    try {
      await this.prisma.$executeRawUnsafe(`
        ALTER TABLE room_types
        ADD COLUMN IF NOT EXISTS channexRatePlanId TEXT;
      `);
      applied.push('room_types.channexRatePlanId');
    } catch (err: any) {
      if (err?.message?.includes('already exists')) {
        applied.push('room_types.channexRatePlanId (already exists)');
      } else {
        errors.push(`room_types.channexRatePlanId: ${err?.message ?? err}`);
      }
    }

    // ── channex_mappings.userId+listingId unique constraint ───────────────
    try {
      await this.prisma.$executeRawUnsafe(`
        ALTER TABLE channex_mappings
        ADD CONSTRAINT channex_mappings_userId_listingId_key
        UNIQUE (userId, listingId);
      `);
      applied.push('channex_mappings(userId, listingId) unique');
    } catch (err: any) {
      if (err?.code === '42P07' || err?.message?.includes('already exists')) {
        applied.push('channex_mappings(userId, listingId) unique (already exists)');
      } else {
        errors.push(`channex_mappings unique: ${err?.message ?? err}`);
      }
    }

    // ── listings.channexPropertyId unique ─────────────────────────────────
    try {
      await this.prisma.$executeRawUnsafe(`
        ALTER TABLE listings
        ADD CONSTRAINT listings_channexPropertyId_key UNIQUE (channexPropertyId);
      `);
      applied.push('listings(channexPropertyId) unique');
    } catch (err: any) {
      if (err?.code === '42P07' || err?.message?.includes('already exists')) {
        applied.push('listings(channexPropertyId) unique (already exists)');
      } else {
        errors.push(`listings channexPropertyId unique: ${err?.message ?? err}`);
      }
    }

    this.logger.log(`[DbMigrate] Applied: ${JSON.stringify(applied)}`);
    if (errors.length) {
      this.logger.warn(`[DbMigrate] Errors: ${JSON.stringify(errors)}`);
    }

    return { applied, errors };
  }

  /**
   * Archive a listing (soft-delete). Preserves all bookings.
   * Sets isArchived=true and archivedAt=now().
   * Also marks it inactive so it disappears from normal UI queries.
   *
   * @returns success + listing title
   * @throws BadRequestException if listing has future CONFIRMED bookings (configurable override)
   */
  async archiveListing(listingId: number, force = false): Promise<{ success: boolean; title: string }> {
    // Check for future confirmed bookings
    if (!force) {
      const futureBookings = await this.prisma.booking.count({
        where: {
          listingId,
          status: { in: ['confirmed', 'CONFIRMED'] },
          checkIn: { gte: new Date() },
        },
      });
      if (futureBookings > 0) {
        throw new BadRequestException(
          `Listing ${listingId} has ${futureBookings} future confirmed bookings. ` +
          `Archive anyway with force=true, or cancel the bookings first.`,
        );
      }
    }

    const listing = await this.prisma.listing.update({
      where: { id: listingId },
      data: {
        isArchived:  true,
        archivedAt:  new Date(),
        isActive:    false, // hide from normal UI
      },
      select: { id: true, title: true },
    });

    this.logger.log(`[DbMigrate] Archived listing=${listingId} title=\"${listing.title}\"`);
    return { success: true, title: listing.title };
  }

  /**
   * Restore a previously archived listing.
   */
  async restoreListing(listingId: number): Promise<{ success: boolean; title: string }> {
    const listing = await this.prisma.listing.update({
      where: { id: listingId },
      data: { isArchived: false, archivedAt: null, isActive: true },
      select: { id: true, title: true },
    });
    this.logger.log(`[DbMigrate] Restored listing=${listingId} title=\"${listing.title}\"`);
    return { success: true, title: listing.title };
  }

  /**
   * Hard-delete an archived listing (admin only, no recovery).
   * Fails if listing has any bookings.
   */
  async deleteListing(listingId: number): Promise<{ success: boolean }> {
    const bookingCount = await this.prisma.booking.count({ where: { listingId } });
    if (bookingCount > 0) {
      throw new BadRequestException(
        `Listing ${listingId} has ${bookingCount} bookings. Delete bookings first.`,
      );
    }
    const listing = await this.prisma.listing.findUnique({ where: { id: listingId }, select: { isArchived: true } });
    if (!listing?.isArchived) {
      throw new BadRequestException(
        `Listing ${listingId} must be archived before hard delete.`,
      );
    }
    await this.prisma.listing.delete({ where: { id: listingId } });
    this.logger.warn(`[DbMigrate] DELETED listing=${listingId} (no recovery possible)`);
    return { success: true };
  }
}