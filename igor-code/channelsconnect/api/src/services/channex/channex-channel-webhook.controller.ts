/**
 * channex-channel-webhook.controller.ts
 *
 * Receives Channex CHANNEL lifecycle webhook events (new_channel, updated_channel,
 * activate_channel, deactivate_channel). Lives at the same /connect/webhook prefix
 * as the booking webhook but dispatches on the top-level `event` field.
 *
 * Why this exists:
 *   Channex's iframe Mapping flow doesn't have a documented postMessage event we
 *   can rely on for "the user finished mapping their Airbnb listings". Instead,
 *   Channex fires `activate_channel` to its global webhook when the channel is
 *   live and at least one listing has been mapped. That's our signal to harvest
 *   the Channex property → create local Listings (one per room_type).
 *
 * Channex payload shape (from docs):
 *   {
 *     "timestamp": "2026-05-19T...Z",
 *     "user_id":   null,
 *     "payload": {
 *       "title":      "Test Channel",
 *       "channel_id": "99f25e27-...",
 *       "ota_name":   "Airbnb"
 *     },
 *     "property_id": "a92c01bb-...",
 *     "event":       "activate_channel"
 *   }
 *
 * IMPORTANT: This controller is mounted at POST /connect/webhook/channel which is
 * a DIFFERENT path than the booking webhook (POST /connect/webhook/booking-revision).
 * Channex only allows ONE callback URL per webhook, so the booking webhook
 * controller has been extended to forward channel events here via internal dispatch.
 * See ChannexBookingWebhookController.handleBookingRevision() for the dispatch shim.
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
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../../auth/decorators/public.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { ChannexHttpClient } from './channex-http.client';

/** Top-level event shape Channex sends for channel-lifecycle webhooks */
export interface ChannelLifecycleEvent {
  timestamp: string;
  user_id?: string | null;
  property_id: string;
  event: 'new_channel' | 'updated_channel' | 'activate_channel' | 'deactivate_channel';
  payload: {
    title?: string;
    channel_id: string;
    ota_name: string; // 'Airbnb', 'Booking.com', etc.
  };
}

@ApiTags('Channex Channel Webhook')
@Controller('connect/webhook')
export class ChannexChannelWebhookController {
  private readonly logger = new Logger(ChannexChannelWebhookController.name);
  private readonly masterKey: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly http: ChannexHttpClient,
  ) {
    this.masterKey = process.env.CHANNEX_API_KEY || '';
  }

  /**
   * POST /connect/webhook/channel
   * Direct entry point for channel events. Currently the dispatch from the
   * booking-revision controller calls handleChannelEvent() programmatically,
   * so this HTTP route is mostly for testing + future use if we move Channex
   * to a multi-URL webhook setup.
   */
  @Public()
  @Post('channel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receive Channex channel lifecycle webhook (new/updated/activate/deactivate)' })
  async handleChannel(
    @Body() payload: ChannelLifecycleEvent,
    @Headers('x-channex-webhook-secret') webhookSecret?: string,
  ) {
    this.validateSecret(webhookSecret);
    return this.handleChannelEvent(payload);
  }

  /**
   * The actual event handler. Exposed as a public method so the booking-revision
   * controller can call it directly when Channex sends a channel event via the
   * shared webhook URL.
   */
  async handleChannelEvent(payload: ChannelLifecycleEvent) {
    const { event, property_id, payload: detail } = payload || ({} as any);
    if (!event || !property_id) {
      this.logger.warn('[ChannelWebhook] Skipping payload without event or property_id');
      return { ack: true, skipped: true };
    }

    this.logger.log(
      `[ChannelWebhook] event=${event} property=${property_id.slice(0, 8)} ` +
        `ota=${detail?.ota_name} channel=${detail?.channel_id?.slice(0, 8)}`,
    );

    switch (event) {
      case 'activate_channel':
        // This is the "user finished OAuth + mapped at least one listing" signal.
        // Harvest the Channex property into local DB.
        await this.harvestForActivation(property_id, detail);
        break;
      case 'new_channel':
      case 'updated_channel':
        // No-op for now — `new_channel` fires too early (before mapping happens) and
        // `updated_channel` fires for every mapping tweak. We harvest on `activate`
        // which is the unambiguous "ready for sync" trigger.
        break;
      case 'deactivate_channel':
        // Mark the local mapping inactive so we stop pushing to that channel,
        // but DON'T delete listings (the user can re-activate later).
        await this.deactivateChannel(property_id, detail?.channel_id);
        break;
      default:
        this.logger.debug(`[ChannelWebhook] Unhandled event=${event}`);
    }

    return { ack: true, received: true, event };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Harvest on activate_channel
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * After a channel activates, pull everything Channex now has for this property
   * (its title/address from OTA, all room_types, all photos) and reconcile into
   * our local DB.
   *
   * Behaviour:
   *   - Look up the local Listing currently mapped to this channexPropertyId.
   *   - If there are MORE Channex room_types than local RoomType rows, the user
   *     OAuth'd a multi-listing Airbnb account → we treat each Channex room_type
   *     as its own listing and spawn additional local Listings + Mappings, all
   *     under the same user.
   *   - If counts match, just sync content into existing rows.
   */
  private async harvestForActivation(
    channexPropertyId: string,
    detail: ChannelLifecycleEvent['payload'],
  ): Promise<void> {
    // 1. Find the local listing that owns this Channex property.
    const mapping = await this.prisma.channexMapping.findFirst({
      where: { channexPropertyId },
      orderBy: { createdAt: 'desc' },
    });
    if (!mapping) {
      this.logger.warn(
        `[ChannelWebhook] No local mapping for channex_property=${channexPropertyId}; ` +
          `cannot harvest. (Was the listing deleted before activate fired?)`,
      );
      return;
    }
    const userId = mapping.userId;
    const seedListingId = mapping.listingId;
    if (!seedListingId) {
      this.logger.warn(`[ChannelWebhook] Mapping has no listingId; aborting harvest`);
      return;
    }

    // 2. Pull Channex property attributes + room_types + photos.
    const [propRes, rtRes, photoRes] = await Promise.all([
      this.http.get<any>(`/properties/${channexPropertyId}`, this.masterKey).catch(() => null),
      this.http
        .get<any>(`/room_types?filter[property_id]=${channexPropertyId}`, this.masterKey)
        .catch(() => null),
      this.http
        .get<any>(`/photos?filter[property_id]=${channexPropertyId}`, this.masterKey)
        .catch(() => null),
    ]);
    const propAttrs: any = propRes?.data?.attributes ?? {};
    const roomTypes: any[] = rtRes?.data ?? [];
    const photoUrls: string[] = (photoRes?.data ?? [])
      .map((p: any) => p?.attributes?.url || p?.url)
      .filter(Boolean);

    this.logger.log(
      `[ChannelWebhook/harvest] property=${channexPropertyId.slice(0, 8)} ` +
        `rooms=${roomTypes.length} photos=${photoUrls.length}`,
    );

    // 3. Fetch rate plans grouped by room_type_id so we can stash them on the
    //    local RoomType rows (used later for ARI push).
    const ratePlansByRoom: Record<string, { id: string; currency: string }> = {};
    try {
      const rpRes = await this.http.get<any>(
        `/rate_plans?filter[property_id]=${channexPropertyId}`,
        this.masterKey,
      );
      for (const rp of rpRes?.data ?? []) {
        const a = rp.attributes || {};
        const rt = a.room_type_id;
        // First rate plan per room type wins (Airbnb only maps 1 anyway).
        if (rt && !ratePlansByRoom[rt]) {
          ratePlansByRoom[rt] = { id: rp.id, currency: a.currency || propAttrs.currency || 'USD' };
        }
      }
    } catch (err: any) {
      this.logger.warn(`[ChannelWebhook/harvest] rate_plans fetch failed: ${err?.message}`);
    }

    // 4. Resolve: for each Channex room_type, find-or-create a local Listing.
    //    Strategy: the seed listing owns roomTypes[0]; every additional Channex
    //    room_type becomes its own listing with title from the room_type itself.
    if (roomTypes.length === 0) {
      this.logger.warn('[ChannelWebhook/harvest] Channex returned 0 room_types; nothing to harvest');
      return;
    }

    const seedListing = await this.prisma.listing.findUnique({ where: { id: seedListingId } });
    if (!seedListing) {
      this.logger.warn(`[ChannelWebhook/harvest] Seed listing ${seedListingId} vanished`);
      return;
    }

    // First room_type → updates the seed listing in-place.
    const first = roomTypes[0].attributes || {};
    const firstId = roomTypes[0].id;
    await this.updateListingFromChannex(seedListingId, propAttrs, first, photoUrls);
    await this.upsertRoomTypeAndMapping(
      seedListingId,
      userId,
      channexPropertyId,
      firstId,
      first,
      ratePlansByRoom[firstId]?.id,
      mapping.id,
    );

    // Additional room_types → each becomes a NEW listing under the same user.
    for (let i = 1; i < roomTypes.length; i++) {
      const rt = roomTypes[i];
      const rtAttrs = rt.attributes || {};
      const newListing = await this.prisma.listing.create({
        data: {
          userId,
          title:
            rtAttrs.title || `${propAttrs.title || detail?.ota_name || 'Imported'} #${i + 1}`,
          source: 'airbnb_oauth',
          isActive: false,
          reviewStatus: 'pending_admin_review',
          currency: propAttrs.currency || 'USD',
          minNights: 1,
          // copy address from parent property — multi-listing hosts usually share
          // an account but each listing has its own address; we'll let the user
          // correct in admin if needed.
          address: propAttrs.address || null,
          city: propAttrs.city || null,
          country: propAttrs.country || null,
          postalCode: propAttrs.zip_code || null,
          latitude: propAttrs.latitude ? parseFloat(propAttrs.latitude) : null,
          longitude: propAttrs.longitude ? parseFloat(propAttrs.longitude) : null,
          description: rtAttrs.description || propAttrs.content?.description || null,
          maxGuests: rtAttrs.occ_adults || rtAttrs.default_occupancy || null,
          bedrooms: rtAttrs.count_of_rooms || null,
          channexPropertyId, // shared property — all sibling listings reference it
        },
      });
      await this.upsertRoomTypeAndMapping(
        newListing.id,
        userId,
        channexPropertyId,
        rt.id,
        rtAttrs,
        ratePlansByRoom[rt.id]?.id,
        null, // no existing mapping yet; create one fresh
      );
      this.logger.log(
        `[ChannelWebhook/harvest] Spawned sibling listing id=${newListing.id} ` +
          `for channex_room_type=${rt.id.slice(0, 8)}`,
      );
    }
  }

  /**
   * Apply Channex property + first room_type data to a local Listing row.
   * Used for both the seed listing and (separately) for sibling listings created
   * in the multi-listing case. Idempotent.
   */
  private async updateListingFromChannex(
    listingId: number,
    propAttrs: any,
    firstRoomAttrs: any,
    photoUrls: string[],
  ): Promise<void> {
    await this.prisma.listing.update({
      where: { id: listingId },
      data: {
        title: propAttrs.title || firstRoomAttrs.title || 'Imported Property',
        address: propAttrs.address || null,
        city: propAttrs.city || null,
        country: propAttrs.country || null,
        postalCode: propAttrs.zip_code || null,
        latitude: propAttrs.latitude ? parseFloat(propAttrs.latitude) : null,
        longitude: propAttrs.longitude ? parseFloat(propAttrs.longitude) : null,
        currency: propAttrs.currency || 'USD',
        description:
          firstRoomAttrs.description ||
          propAttrs.content?.description ||
          propAttrs.description ||
          null,
        maxGuests: firstRoomAttrs.occ_adults || firstRoomAttrs.default_occupancy || null,
        bedrooms: firstRoomAttrs.count_of_rooms || null,
        // Photos: we don't have a Photo table yet; stash the URLs as a JSON array
        // on the listing for the UI to render. Schema-wise this is in
        // listing.photos (Json[]) if it exists; otherwise no-op safely.
        ...(photoUrls.length > 0 ? ({ photos: photoUrls } as any) : {}),
        reviewStatus: 'pending_admin_review',
      },
    });
  }

  /**
   * Find-or-create a RoomType row + Mapping row for one Channex room_type.
   * `existingMappingId` is passed when we know the mapping row already exists
   * (the seed listing's pre-OAuth placeholder); otherwise we create a new
   * mapping. Mappings use the (userId, listingId) unique key so this is safe
   * to call repeatedly.
   */
  private async upsertRoomTypeAndMapping(
    listingId: number,
    userId: string,
    channexPropertyId: string,
    channexRoomTypeId: string,
    rtAttrs: any,
    channexRatePlanId: string | undefined,
    existingMappingId: string | null,
  ): Promise<void> {
    // Upsert the RoomType (one local room per Channex room_type).
    const existingRoom = await this.prisma.roomType.findFirst({
      where: { listingId, channexRoomTypeId },
    });
    if (existingRoom) {
      await this.prisma.roomType.update({
        where: { id: existingRoom.id },
        data: {
          name: rtAttrs.title || existingRoom.name,
          maxGuests: rtAttrs.occ_adults || rtAttrs.default_occupancy || existingRoom.maxGuests,
          quantity: rtAttrs.count_of_rooms || existingRoom.quantity || 1,
          channexRatePlanId: channexRatePlanId ?? existingRoom.channexRatePlanId,
        },
      });
    } else {
      await this.prisma.roomType.create({
        data: {
          listingId,
          name: rtAttrs.title || 'Room',
          maxGuests: rtAttrs.occ_adults || rtAttrs.default_occupancy || 2,
          quantity: rtAttrs.count_of_rooms || 1,
          channexRoomTypeId,
          channexRatePlanId,
        },
      });
    }

    // Mapping row — use upsert keyed by (userId, listingId).
    if (existingMappingId) {
      await this.prisma.channexMapping.update({
        where: { id: existingMappingId },
        data: {
          channexPropertyId,
          channexRoomTypeId,
          channexRatePlanId,
          syncStatus: 'active',
          lastSyncAt: new Date(),
        },
      });
    } else {
      await this.prisma.channexMapping.upsert({
        where: { userId_listingId: { userId, listingId } },
        create: {
          userId,
          listingId,
          channexPropertyId,
          channexRoomTypeId,
          channexRatePlanId,
          channelType: 'channex',
          syncStatus: 'active',
        },
        update: {
          channexPropertyId,
          channexRoomTypeId,
          channexRatePlanId,
          syncStatus: 'active',
          lastSyncAt: new Date(),
        },
      });
    }

    // Mark Listing as having a Channex property so UI knows it's connected.
    await this.prisma.listing.update({
      where: { id: listingId },
      data: { channexPropertyId, channexRoomId: channexRoomTypeId },
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Deactivate handling
  // ──────────────────────────────────────────────────────────────────────────

  private async deactivateChannel(channexPropertyId: string, channelId?: string): Promise<void> {
    const mappings = await this.prisma.channexMapping.findMany({
      where: { channexPropertyId },
    });
    for (const m of mappings) {
      await this.prisma.channexMapping.update({
        where: { id: m.id },
        data: { syncStatus: 'channel_disabled' },
      });
    }
    this.logger.log(
      `[ChannelWebhook] Marked ${mappings.length} mapping(s) as channel_disabled ` +
        `for property=${channexPropertyId.slice(0, 8)} channel=${channelId?.slice(0, 8)}`,
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Secret validation (same scheme as booking-revision webhook)
  // ──────────────────────────────────────────────────────────────────────────

  private validateSecret(headerSecret: string | undefined): void {
    const expected = process.env.CHANNEX_WEBHOOK_SECRET;
    if (!expected) return; // dev-mode: accept anything
    if (!headerSecret || headerSecret !== expected) {
      this.logger.warn(
        `[ChannelWebhook] Rejected request — invalid x-channex-webhook-secret header`,
      );
      throw new UnauthorizedException('Invalid webhook secret');
    }
  }
}
