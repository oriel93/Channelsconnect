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
import { Prisma } from '@prisma/client';
import * as crypto from 'crypto';

// ---------------------------------------------------------------------------
// Channex webhook payload shape (booking_revision event)
// See: https://docs.channex.io/api-v.1-documentation/booking-revisions
// ---------------------------------------------------------------------------

interface ChannexRoom {
  meta?: {
    mapping_id?: string;               // Internal mapping UUID
    rate_plan_code?: number;
    room_type_code?: string;           // BDC room type code
    days_breakdown?: Array<{
      date: string;
      amount: string;
      rate_plan: string;               // Channex rate_plan UUID
    }>;
  };
  checkin_date?: string;
  checkout_date?: string;
  occupancy?: {
    adults?: number;
    children?: number;
    infants?: number;
  };
}

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
    // NOTE: room_type_id is NOT a top-level field in real Channex payloads.
    // Room data is inside the rooms[] array.
    rooms?: ChannexRoom[];
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
   * Validates the X-Channex-Webhook-Secret header that Channex attaches to
   * every webhook delivery.
   *
   * Channex sends the secret as a PLAIN header value (not HMAC-signed).
   * The header is configured in the Channex webhook settings as:
   *   headers: { "x-channex-webhook-secret": "<secret>" }
   *
   * We compare it against CHANNEX_WEBHOOK_SECRET env var using constant-time
   * comparison to prevent timing attacks.
   *
   * If CHANNEX_WEBHOOK_SECRET is not configured, validation is skipped
   * (allows development without the env var set).
   */
  private validateSecret(incomingSecret: string | undefined): void {
    const expectedSecret = process.env.CHANNEX_WEBHOOK_SECRET;
    if (!expectedSecret) {
      this.logger.warn(
        '[Webhook] CHANNEX_WEBHOOK_SECRET not set — skipping secret validation',
      );
      return;
    }

    if (!incomingSecret) {
      this.logger.error('[Webhook] Missing x-channex-webhook-secret header');
      throw new UnauthorizedException('Missing webhook secret header');
    }

    // Constant-time comparison to prevent timing attacks
    const incomingBuf = Buffer.from(incomingSecret, 'utf8');
    const expectedBuf = Buffer.from(expectedSecret, 'utf8');

    const valid =
      incomingBuf.length === expectedBuf.length &&
      crypto.timingSafeEqual(incomingBuf, expectedBuf);

    if (!valid) {
      this.logger.error('[Webhook] Invalid x-channex-webhook-secret — rejecting request');
      throw new UnauthorizedException('Invalid webhook secret');
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
    name: 'x-channex-webhook-secret',
    required: false,
    description: 'Plain-text shared secret configured in Channex webhook settings',
  })
  async handleBookingRevision(
    @Body() payload: ChannexBookingRevisionPayload,
    @Headers('x-channex-webhook-secret') webhookSecret?: string,
  ) {
    // ── 1. Validate secret ─────────────────────────────────────────────────
    this.validateSecret(webhookSecret);

    const revision = payload?.booking_revision;
    if (!revision?.id) {
      this.logger.warn('[Webhook] Received payload with no booking_revision.id');
      return { ack: true, received: true, skipped: true, reason: 'no_revision_id' };
    }

    this.logger.log(
      `[Webhook] booking_revision id=${revision.id} ` +
        `booking_id=${revision.booking_id} status=${revision.status}`,
    );

    const apiKey = process.env.CHANNEX_API_KEY || '';

    try {
      // ── 2. Use webhook payload directly ───────────────────────────────────
      // Per Andrew Yudin (Channex): the Feed payload is identical to what
      // GET /booking_revisions/:id would return — no need for an extra API call.
      // Use the webhook payload as the authoritative source of truth.

      // ── 3. Extract room_type_id from rooms[] array ────────────────────────
      // Real Channex payloads have rooms[] not a flat room_type_id.
      const roomTypeId: string | undefined =
        (revision as any).room_type_id ??
        revision.rooms?.[0]?.meta?.room_type_code ??
        undefined;

      // ── 4. Map Channex UUIDs → internal IDs ──────────────────────────────
      const { listingId, userId } = await this.resolveInternalIds(
        revision.property_id,
        roomTypeId ?? '',
      );

      // ── 5. Persist booking to DB ──────────────────────────────────────────
      const fr = revision as any; // cast for flexible field access
      const arrivalDate: string = fr.arrival_date;
      const departureDate: string = fr.departure_date;
      const bookingId: string = fr.booking_id;
      const otaName: string = fr.ota_name ?? 'channex';
      const otaRef: string | undefined = fr.ota_reservation_code;
      const revStatus: string = fr.status;
      const revAmount: string | number = fr.amount;
      const customer = fr.customer ?? {};
      const guests = fr.guests ?? {};
      const revNotes: string | undefined = fr.notes;

      if (!arrivalDate || !departureDate) {
        this.logger.error(`[Webhook] Missing arrival/departure dates for revision ${revision.id}`);
        await this.sendBookingAck(revision.id, apiKey);
        return { ack: true, received: true, bookingRevisionId: revision.id, processed: false, error: 'missing_dates' };
      }

      const guestName =
        [customer.name, customer.surname].filter(Boolean).join(' ') || 'Guest';

      const bookingData = {
        userId,
        listingId,
        guestName,
        guestEmail: customer.email ?? null,
        guestPhone: customer.phone ?? null,
        checkIn: new Date(arrivalDate),
        checkOut: new Date(departureDate),
        numGuests:
          (guests.adults ?? 1) +
          (guests.children ?? 0) +
          (guests.infants ?? 0),
        totalPrice: parseFloat(String(revAmount)) || 0,
        status: this.mapChannexStatus(revStatus),
        bookingSource: otaName,
        externalId: bookingId,
        notes: [
          otaRef ? `OTA ref: ${otaRef}` : null,
          revNotes ?? null,
        ]
          .filter(Boolean)
          .join(' | ') || null,
      };

      // ── 5a. Determine action type for logging and inventory logic ─────────
      const actionType = this.resolveActionType(revStatus);
      this.logger.log(`[Webhook] Action: ${actionType} — booking_id=${bookingId}`);

      // ── 5b. Upsert booking — idempotent on re-delivery ────────────────────
      const existing = await this.prisma.booking.findFirst({
        where: { externalId: bookingId, listingId },
      });

      let bookingDbId: number;

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
        bookingDbId = existing.id;
        this.logger.log(
          `[Webhook] Action: ${actionType} — updated booking id=${existing.id} (external=${bookingId})`,
        );
      } else {
        const created = await this.prisma.booking.create({ data: bookingData });
        bookingDbId = created.id;
        this.logger.log(
          `[Webhook] Action: ${actionType} — created booking id=${created.id} (external=${bookingId})`,
        );
      }

      // ── 5c. Update local inventory (Rate table) based on action ──────────
      await this.adjustInventory({
        listingId,
        arrivalDate,
        departureDate,
        actionType,
      });

      // ── 5d. Log sync activity ───────────────────────────────────────────────
      await this.prisma.syncLog.create({
        data: {
          userId,
          syncType: 'channex_booking_webhook',
          entityType: 'booking',
          status: 'synced',
          message: `booking_revision ${revision.id} processed — Action: ${actionType} (booking ${bookingId})`,
          details: {
            bookingRevisionId: revision.id,
            bookingId,
            actionType,
            status: revStatus,
            listingId,
            bookingDbId,
          } as unknown as Prisma.JsonObject,
        },
      });

      // ── 6. Send Booking ACK back to Channex (Source 106) ─────────────────
      if (apiKey) {
        await this.sendBookingAck(revision.id, apiKey);
      } else {
        this.logger.warn(
          '[Webhook] CHANNEX_API_KEY not set — cannot send booking ACK',
        );
      }

      // Rule 11: Channex certification requires { ack: true } in the response body
      return {
        ack: true,
        received: true,
        bookingRevisionId: revision.id,
        bookingId,
        listingId,
        actionType,
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
      // Rule 11: must always include { ack: true }
      return {
        ack: true,
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

  // -------------------------------------------------------------------------
  // Helper: resolve human-readable action type from Channex status
  // -------------------------------------------------------------------------

  private resolveActionType(
    status: string,
  ): 'create' | 'modify' | 'cancel' {
    switch (status?.toLowerCase()) {
      case 'new':        return 'create';
      case 'modified':   return 'modify';
      case 'cancelled':  return 'cancel';
      default:           return 'create';
    }
  }

  // -------------------------------------------------------------------------
  // Inventory adjustment: update Rate.available for all dates in the stay
  //
  // create / modify → available = false (dates are occupied)
  // cancel          → available = true  (dates freed up)
  //
  // Uses upsert to avoid primary-key conflicts (idempotent on re-delivery).
  // Only adjusts dates strictly before departure (checkout day stays open).
  // -------------------------------------------------------------------------

  private async adjustInventory(params: {
    listingId: number;
    arrivalDate: string;
    departureDate: string;
    actionType: 'create' | 'modify' | 'cancel';
  }): Promise<void> {
    const { listingId, arrivalDate, departureDate, actionType } = params;

    // Booking spans arrival_date (inclusive) to departure_date (exclusive)
    const arrival   = new Date(arrivalDate);
    const departure = new Date(departureDate);

    if (isNaN(arrival.getTime()) || isNaN(departure.getTime())) {
      this.logger.warn(
        `[Webhook] Invalid dates for inventory adjustment: ` +
          `arrival=${arrivalDate} departure=${departureDate}`,
      );
      return;
    }

    // available = false for new/modify; true for cancel
    const available = actionType === 'cancel';

    // Iterate day-by-day from arrival up to (but not including) departure
    const stayDates: Date[] = [];
    const cursor = new Date(arrival);
    while (cursor < departure) {
      stayDates.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }

    if (stayDates.length === 0) return;

    this.logger.log(
      `[Webhook] Inventory adjustment — Action: ${actionType} ` +
        `listing=${listingId} dates=${arrivalDate}→${departureDate} ` +
        `(${stayDates.length} nights) available=${available}`,
    );

    // Upsert each date — safe against PK conflicts and re-deliveries
    for (const date of stayDates) {
      await this.prisma.rate.upsert({
        where: {
          listingId_date: { listingId, date },
        },
        update: { available },
        create: {
          listingId,
          date,
          price: 0,       // placeholder; will be overwritten by next ARI push
          available,
        },
      });
    }

    this.logger.log(
      `[Webhook] Inventory adjusted — ` +
        `${stayDates.length} Rate rows upserted for listing=${listingId}`,
    );
  }
}
