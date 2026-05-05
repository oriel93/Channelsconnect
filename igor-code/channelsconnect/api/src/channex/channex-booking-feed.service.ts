/**
 * channex-booking-feed.service.ts
 *
 * Polls GET /booking_revisions/feed every 15 minutes as a safety net.
 * The feed returns ONLY non-acknowledged revisions, so any booking that
 * was missed by the webhook (network blip, restart, etc.) is caught here.
 *
 * Andrew Yudin (Channex certifier) requires this as part of certification.
 */

import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ChannexHttpClient } from '../services/channex/channex-http.client';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class ChannexBookingFeedService {
  private readonly logger = new Logger(ChannexBookingFeedService.name);
  private readonly apiKey = process.env.CHANNEX_API_KEY || '';

  constructor(
    private readonly http: ChannexHttpClient,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Runs every 15 minutes.
   * Fetches all non-ACKed booking revisions from the feed,
   * fetches each one by ID (required by Channex cert spec),
   * persists any new ones, then ACKs them.
   */
  @Cron('0 */15 * * * *') // every 15 minutes
  async pollBookingFeed(): Promise<void> {
    if (!this.apiKey) {
      this.logger.warn('[BookingFeed] CHANNEX_API_KEY not set — skipping feed poll');
      return;
    }

    this.logger.log('[BookingFeed] Polling /booking_revisions/feed …');

    let feedData: any[];
    try {
      const res = await this.http.get<any>('/booking_revisions/feed', this.apiKey);
      feedData = res?.data ?? [];
    } catch (err: any) {
      this.logger.error(`[BookingFeed] Feed fetch failed: ${err.message}`);
      return;
    }

    if (!feedData.length) {
      this.logger.log('[BookingFeed] No pending revisions in feed.');
      return;
    }

    this.logger.log(`[BookingFeed] Found ${feedData.length} non-ACKed revision(s).`);

    for (const item of feedData) {
      const revisionId: string = item?.id ?? item?.attributes?.id;
      if (!revisionId) continue;

      try {
        // ── Step 1: Fetch revision by ID (required by cert spec) ──────────
        const revRes = await this.http.get<any>(
          `/booking_revisions/${revisionId}`,
          this.apiKey,
        );
        const revision = revRes?.data?.attributes ?? revRes?.data ?? {};

        this.logger.log(
          `[BookingFeed] Processing revision ${revisionId} ` +
            `status=${revision.status ?? '?'}`,
        );

        // ── Step 2: Persist if not already in DB ─────────────────────────
        if (revision.booking_id) {
          await this.upsertBooking(revisionId, revision);
        }

        // ── Step 3: ACK the revision ──────────────────────────────────────
        await this.http.post<any>(
          `/booking_revisions/${revisionId}/ack`,
          this.apiKey,
          {},
        );
        this.logger.log(`[BookingFeed] ACKed revision ${revisionId}`);
      } catch (err: any) {
        this.logger.error(
          `[BookingFeed] Failed to process revision ${revisionId}: ${err.message}`,
        );
        // Continue to next revision — don't let one failure block others
      }
    }
  }

  // -------------------------------------------------------------------------
  // Upsert booking from feed revision
  // -------------------------------------------------------------------------

  private async upsertBooking(revisionId: string, revision: any): Promise<void> {
    const propId   = revision.property_id;
    const roomType = revision.room_type_id;
    if (!propId) return;

    // Resolve internal IDs
    const mapping = await this.prisma.channexMapping.findFirst({
      where: roomType
        ? { channexPropertyId: propId, channexRoomTypeId: roomType }
        : { channexPropertyId: propId },
    });

    if (!mapping?.listingId) {
      this.logger.warn(
        `[BookingFeed] No mapping found for property=${propId} — skipping`,
      );
      return;
    }

    const { listingId, userId } = mapping;

    const guestName =
      [revision.customer?.name, revision.customer?.surname]
        .filter(Boolean)
        .join(' ') || 'Guest';

    const status = this.mapStatus(revision.status);

    const existing = await this.prisma.booking.findFirst({
      where: { externalId: revision.booking_id, listingId },
    });

    if (existing) {
      await this.prisma.booking.update({
        where: { id: existing.id },
        data: { status, totalPrice: parseFloat(String(revision.amount)) || 0 },
      });
    } else {
      await this.prisma.booking.create({
        data: {
          userId,
          listingId,
          guestName,
          guestEmail: revision.customer?.email ?? null,
          guestPhone: revision.customer?.phone ?? null,
          checkIn:    new Date(revision.arrival_date),
          checkOut:   new Date(revision.departure_date),
          numGuests:  (revision.guests?.adults ?? 1) + (revision.guests?.children ?? 0),
          totalPrice: parseFloat(String(revision.amount)) || 0,
          status,
          bookingSource: revision.ota_name ?? 'channex',
          externalId:    revision.booking_id,
        },
      });
    }

    // Log
    await this.prisma.syncLog.create({
      data: {
        userId,
        syncType:   'channex_booking_feed',
        entityType: 'booking',
        status:     'synced',
        message:    `booking_revision ${revisionId} processed via feed poll`,
        details: {
          bookingRevisionId: revisionId,
          bookingId:         revision.booking_id,
          status:            revision.status,
          listingId,
        } as unknown as Prisma.JsonObject,
      },
    });
  }

  private mapStatus(s: string): string {
    if (s === 'cancelled') return 'cancelled';
    return 'confirmed';
  }
}
