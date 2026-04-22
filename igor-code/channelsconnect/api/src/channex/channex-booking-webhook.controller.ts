/**
 * channex-booking-webhook.controller.ts
 * POST /connect/webhook/booking-revision
 *
 * Receives Channex booking_revision webhook payloads, maps Channex UUIDs
 * back to internal PMS Room/Rate IDs, persists the booking, and sends the
 * mandatory Booking Acknowledge message back to Channex (Source 106/108).
 *
 * Replaces the deprecated getBookingRevisionFeed() polling approach.
 * Webhooks are the required method for certification to ensure real-time
 * booking delivery (Source 108).
 */

import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiHeader } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { ChannexHttpClient } from '../services/channex/channex-http.client';
import * as crypto from 'crypto';

// ---------------------------------------------------------------------------
// Channex webhook payload shape (booking_revision event)
// See: https://docs.channex.io/api-v.1-documentation/booking-revisions
// ---------------------------------------------------------------------------

interface ChannexBookingRevisionPayload {
  event: string;                       // e.g. 'booking_revision'
  booking_revision: {
    id: string;                        // Channex booking_revision UUID
    booking_id: string;                // Channex booking UUID
    status: string;                    // 'new' | 'modified' | 'cancelled'
    ota_name?: string;
    ota_reservation_code?: string;
    arrival_date: string;              // 'YYYY-MM-DD'
    departure_date: string;            // 'YYYY-MM-DD'
    property_id: string;               // Channex property UUID
    room_type_id: string;              // Channex room_type UUID
    rate_plan_id?: string;             // Channex rate_plan UUID
    amount: string | number;           // Total booking amount
    currency: string;
    guests?: {
      adults?: number;
      children?: number;
      infants?: number;
    };
    customer?: {
      name?: string;
      surname?: string;
      email?: string;
      phone?: string;
      country?: string;
    };
    notes?: string;
  };
}

// ---------------------------------------------------------------------------
// Controller
// ---------------------------------------------------------------------------

@ApiTags('Channex Webhooks')
@Controller('connect/webhook')
export class ChannexBookingWebhookController {
  private readonly logger = new Logger(ChannexBookingWebhookController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly http: ChannexHttpClient,
  ) {}

  // -------------------------------------------------------------------------
  // Signature validation
  // -------------------------------------------------------------------------

  /**
   * Validates the X-Channex-Signature HMAC-SHA256 signature that Channex
   * attaches to every webhook delivery. Rejects requests with an invalid or
   * missing signature.
   *
   * If CHANNEX_WEBHOOK_SECRET is not configured, validation is skipped with
   * a warning (allows local development without secrets).
   */
  private validateSignature(
    rawBody: Buffer | string,
    signature: string | undefined,
  ): void {
    const secret = process.env.CHANNEX_WEBHOOK_SECRET;
    if (!secret) {
      this.logger.warn(
        '[Webhook] CHANNEX_WEBHOOK_SECRET not set — skipping signature validation',
      );
      return;
    }

    if (!signature) {
      throw new UnauthorizedException('Missing X-Channex-Signature header');
    }

    const expected =
      'sha256=' +
      crypto
        .createHmac('sha256', secret)
        .update(rawBody)
        .digest('hex');

    // Constant-time comparison to prevent timing attacks
    const sigBuffer = Buffer.from(signature, 'utf8');
    const expBuffer = Buffer.from(expected, 'utf8');

    if (
      sigBuffer.length !== expBuffer.length ||
      !crypto.timingSafeEqual(sigBuffer, expBuffer)
    ) {
      this.logger.error('[Webhook] Invalid signature — rejecting request');
      throw new UnauthorizedException('Invalid webhook signature');
    }
  }

  // -------------------------------------------------------------------------
  // UUID → internal ID mapping
  // -------------------------------------------------------------------------

  /**
   * Resolves the internal listingId and (optionally) ratePlanId from
   * Channex UUIDs using the ChannexMapping table populated during onboarding.
   */
  private async resolveInternalIds(
    channexPropertyId: string,
    channexRoomTypeId: string,
  ): Promise<{ listingId: number; userId: string }> {
    const mapping = await this.prisma.channexMapping.findFirst({
      where: {
        channexPropertyId,
        channexRoomTypeId,
      },
    });

    if (!mapping?.listingId) {
      // Fallback: match by property_id only (room type may differ)
      const propMapping = await this.prisma.channexMapping.findFirst({
        where: { channexPropertyId },
      });

      if (!propMapping?.listingId) {
        throw new BadRequestException(
          `No internal listing found for Channex property ${channexPropertyId}`,
        );
      }

      return { listingId: propMapping.listingId, userId: propMapping.userId };
    }

    return { listingId: mapping.listingId, userId: mapping.userId };
  }

  // -------------------------------------------------------------------------
  // Booking Acknowledge (Source 106)
  // -------------------------------------------------------------------------

  /**
   * Sends the required Booking Acknowledge message back to Channex.
   * This MUST be sent after every booking_revision webhook to confirm receipt.
   * Failure to ACK causes Channex to re-deliver the webhook and flags the
   * integration as non-compliant during certification (Source 106/108).
   */
  private async sendBookingAck(
    bookingRevisionId: string,
    apiKey: string,
  ): Promise<void> {
    try {
      await this.http.post(
        `/booking_revisions/${bookingRevisionId}/ack`,
        apiKey,
        {},
      );
      this.logger.log(
        `[Webhook] ACK sent for booking_revision ${bookingRevisionId}`,
      );
    } catch (err: any) {
      // Log but do not throw — the booking is already saved; ACK failure
      // will be retried by Channex on the next webhook delivery.
      this.logger.error(
        `[Webhook] ACK failed for ${bookingRevisionId}: ${err.message}`,
      );
    }
  }

  // -------------------------------------------------------------------------
  // POST /connect/webhook/booking-revision
  // -------------------------------------------------------------------------

  @Public()  // Channex has no bearer token — auth is via HMAC signature (validateSignature)
  @Post('booking-revision')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Receive Channex booking_revision webhook',
    description:
      'Processes incoming booking revisions from Channex, persists them to the ' +
      'local database, and sends the mandatory ACK back to Channex. ' +
      'Replaces the deprecated getBookingRevisionFeed() polling loop.',
  })
  @ApiOkResponse({ description: 'Webhook received and processed' })
  @ApiHeader({
    name: 'x-channex-signature',
    required: false,
    description: 'HMAC-SHA256 signature for payload verification',
  })
  async handleBookingRevision(
    @Body() payload: ChannexBookingRevisionPayload,
    @Headers('x-channex-signature') signature?: string,
    @Headers('x-raw-body') rawBody?: string,
  ) {
    // ── 1. Validate signature ──────────────────────────────────────────────
    this.validateSignature(rawBody ?? JSON.stringify(payload), signature);

    const revision = payload?.booking_revision;
    if (!revision?.id) {
      this.logger.warn('[Webhook] Received payload with no booking_revision.id');
      return { received: true, skipped: true, reason: 'no_revision_id' };
    }

    this.logger.log(
      `[Webhook] booking_revision id=${revision.id} ` +
        `booking_id=${revision.booking_id} status=${revision.status}`,
    );

    const apiKey = process.env.CHANNEX_API_KEY || '';

    try {
      // ── 2. Map Channex UUIDs → internal IDs ─────────────────────────────
      const { listingId, userId } = await this.resolveInternalIds(
        revision.property_id,
        revision.room_type_id,
      );

      // ── 3. Persist booking to DB ─────────────────────────────────────────
      const guestName =
        [revision.customer?.name, revision.customer?.surname]
          .filter(Boolean)
          .join(' ') || 'Guest';

      const bookingData = {
        userId,
        listingId,
        guestName,
        guestEmail: revision.customer?.email ?? null,
        guestPhone: revision.customer?.phone ?? null,
        checkIn: new Date(revision.arrival_date),
        checkOut: new Date(revision.departure_date),
        numGuests:
          (revision.guests?.adults ?? 1) +
          (revision.guests?.children ?? 0) +
          (revision.guests?.infants ?? 0),
        totalPrice: parseFloat(String(revision.amount)) || 0,
        status: this.mapChannexStatus(revision.status),
        bookingSource: revision.ota_name ?? 'channex',
        externalId: revision.booking_id,
        notes: [
          revision.ota_reservation_code
            ? `OTA ref: ${revision.ota_reservation_code}`
            : null,
          revision.notes ?? null,
        ]
          .filter(Boolean)
          .join(' | ') || null,
      };

      // Upsert by externalId so re-deliveries are idempotent
      const existing = await this.prisma.booking.findFirst({
        where: { externalId: revision.booking_id, listingId },
      });

      if (existing) {
        await this.prisma.booking.update({
          where: { id: existing.id },
          data: {
            status: bookingData.status,
            totalPrice: bookingData.totalPrice,
            checkIn: bookingData.checkIn,
            checkOut: bookingData.checkOut,
            numGuests: bookingData.numGuests,
            notes: bookingData.notes,
          },
        });
        this.logger.log(
          `[Webhook] Updated existing booking id=${existing.id} (external=${revision.booking_id})`,
        );
      } else {
        const created = await this.prisma.booking.create({ data: bookingData });
        this.logger.log(
          `[Webhook] Created new booking id=${created.id} (external=${revision.booking_id})`,
        );
      }

      // Log sync activity
      await this.prisma.syncLog.create({
        data: {
          userId,
          syncType: 'channex_booking_webhook',
          entityType: 'booking',
          status: 'synced',
          message: `booking_revision ${revision.id} processed (booking ${revision.booking_id})`,
          details: {
            bookingRevisionId: revision.id,
            bookingId: revision.booking_id,
            status: revision.status,
            listingId,
          } as any,
        },
      });

      // ── 4. Send Booking ACK back to Channex (Source 106) ─────────────────
      // This MUST happen even if the booking was already in our DB (idempotent).
      if (apiKey) {
        await this.sendBookingAck(revision.id, apiKey);
      } else {
        this.logger.warn(
          '[Webhook] CHANNEX_API_KEY not set — cannot send booking ACK',
        );
      }

      return {
        received: true,
        bookingRevisionId: revision.id,
        bookingId: revision.booking_id,
        listingId,
        status: bookingData.status,
      };
    } catch (err: any) {
      this.logger.error(
        `[Webhook] Failed to process booking_revision ${revision.id}: ${err.message}`,
      );

      // Even on processing errors, attempt to ACK so Channex stops re-delivering
      if (apiKey) {
        await this.sendBookingAck(revision.id, apiKey);
      }

      // Return 200 with error detail — returning non-2xx causes Channex to
      // retry indefinitely, which would flood our endpoint for a data error.
      return {
        received: true,
        bookingRevisionId: revision.id,
        processed: false,
        error: err.message,
      };
    }
  }

  // -------------------------------------------------------------------------
  // Helper: map Channex status → internal booking status
  // -------------------------------------------------------------------------

  private mapChannexStatus(channexStatus: string): string {
    switch (channexStatus?.toLowerCase()) {
      case 'new':
      case 'modified':
        return 'confirmed';
      case 'cancelled':
        return 'cancelled';
      default:
        return 'confirmed';
    }
  }
}
