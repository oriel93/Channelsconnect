/**
 * airbnb-import.service.ts
 *
 * Full Airbnb → Channels Connect import pipeline using Channex's Channel API
 * (the proper one Channex shared with us 2026-05-20 — NOT the iframe path).
 *
 * Flow:
 *   1. start()         POST /meta/airbnb/connection_link → returns Airbnb OAuth URL
 *                       redirect_uri brings the user back to our /connect/airbnb/callback
 *                       with ?channel_id=...&token=... once they finish OAuth on Airbnb.com
 *   2. handleCallback() Verifies the token (round-tripped state for the user) and triggers
 *                       runImport() in the background.
 *   3. runImport()     For each Airbnb listing on the channel:
 *                         - GET /channels/:id/action/listings              (enumerate)
 *                         - GET /channels/:id/action/listing_details       (full content)
 *                         - POST /properties + /room_types + /rate_plans   (build Channex side)
 *                         - POST /channels/:id/mappings                    (wire listing→rate)
 *                         - Save local Listing + RoomType + ChannexMapping + PropertyImage rows
 *                      Then POST /channels/:id/activate
 *                      Then POST /channels/:id/action/load_future_reservations
 *
 * Status reporting:
 *   The frontend polls AirbnbImportStatus rows (we persist progress so it survives reloads).
 */

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ChannexHttpClient } from './channex-http.client';
import { normalizeCountryToISO2, normalizePropertyType } from '../../channex/channex.service';

/** State persisted per import-in-flight so the frontend can poll. */
export interface ImportState {
  status: 'pending' | 'awaiting_oauth' | 'importing' | 'completed' | 'failed';
  totalListings?: number;
  importedCount: number;
  failedCount: number;
  importedListingIds: number[]; // local Channels Connect listing IDs
  message?: string;
  channelId?: string;
  startedAt: Date;
  finishedAt?: Date;
}

@Injectable()
export class AirbnbImportService {
  private readonly logger = new Logger(AirbnbImportService.name);
  private readonly masterKey: string;

  // In-memory status store keyed by `token`. For multi-instance prod this would
  // move to Redis or a DB table, but for our single ECS task it's fine and the
  // status survives only the lifetime of a single import (~30s typically).
  private readonly states = new Map<string, ImportState>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly http: ChannexHttpClient,
  ) {
    this.masterKey = process.env.CHANNEX_API_KEY || '';
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Step 1: kick off OAuth
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Returns an Airbnb OAuth URL the user should be redirected to. After they
   * authorize on airbnb.com, Channex creates the channel and redirects back to
   * `redirect_uri` with ?channel_id=...&token=... — where token is the same
   * string we pass in here, used to look up which Channels Connect user this
   * is for.
   */
  async start(params: {
    userId: string;
    email?: string;
    appBaseUrl: string; // e.g. 'https://channelsconnect.com'
  }): Promise<{ authUrl: string; token: string }> {
    const token = `ccuid_${params.userId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // Seed the state so polling-before-callback works.
    this.states.set(token, {
      status: 'awaiting_oauth',
      importedCount: 0,
      failedCount: 0,
      importedListingIds: [],
      startedAt: new Date(),
    });

    const groupId = await this.getGroupId();
    const email = params.email || `noreply+${params.userId.slice(0, 8)}@channelsconnect.com`;

    // Channex's /meta/airbnb/connection_link REQUIRES properties[] to have at
    // least 1 item (despite the docs implying empty is allowed). Create a
    // placeholder Channex property up front; we'll repurpose it as the FIRST
    // imported Airbnb listing's property during runImport(), so it doesn't
    // become an orphan.
    let placeholderPropertyId: string;
    try {
      const propRes = await this.http.post<any>('/properties', this.masterKey, {
        property: {
          title:         'Airbnb Import (pending)',
          currency:      'USD',
          country:       'US',
          property_type: 'villa',
          timezone:      'America/New_York',
          email,
          settings: {
            allow_availability_autoupdate_on_modification: true,
            allow_availability_autoupdate_on_cancellation: false,
          },
        },
      });
      placeholderPropertyId = propRes?.data?.id;
      if (!placeholderPropertyId) throw new Error('No property id returned');
    } catch (err: any) {
      this.logger.error(`[AirbnbImport] placeholder property create failed: ${err?.message ?? err}`);
      throw new BadRequestException('Could not initialize Airbnb connection (placeholder property)');
    }

    // Stash the placeholder on the state object so handleCallback() can pass it
    // to runImport() and reuse it for the first imported listing.
    (this.states.get(token) as any).placeholderPropertyId = placeholderPropertyId;

    const redirectUri = `${params.appBaseUrl.replace(/\/+$/, '')}/AirbnbCallback`;
    const failureRedirectUri = `${params.appBaseUrl.replace(/\/+$/, '')}/AirbnbCallback?error=1`;

    const payload = {
      connection_link: {
        group_id: groupId,
        properties: [placeholderPropertyId],
        redirect_uri:        redirectUri,
        failure_redirect_uri: failureRedirectUri,
        token,
        title: 'Airbnb',
        settings: {
          min_stay_type: 'Arrival',
          booking_amount_settings: 'Payout Amount',
          cohost_payout_calculations: false,
          send_email_notifications: false,
        },
      },
    };

    const res = await this.http.post<any>('/meta/airbnb/connection_link', this.masterKey, payload);
    const authUrl: string | undefined = res?.data?.attributes?.url;
    if (!authUrl) {
      this.logger.error(`[AirbnbImport] connection_link did not return URL: ${JSON.stringify(res)}`);
      throw new BadRequestException('Could not generate Airbnb authorization link');
    }

    this.logger.log(
      `[AirbnbImport] OAuth URL minted for user=${params.userId} token=${token.slice(0, 24)}… ` +
        `placeholder=${placeholderPropertyId.slice(0, 8)}`,
    );
    return { authUrl, token };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Step 2: callback from Channex (after user finishes Airbnb OAuth)
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Called by our frontend's /AirbnbCallback page once Channex bounces the
   * user back. We get channel_id + the original token. We resolve the token
   * back to a user, kick off runImport() in the background, and return.
   */
  async handleCallback(params: {
    channelId: string;
    token: string;
  }): Promise<{ accepted: true; token: string }> {
    const { channelId, token } = params;
    const state = this.states.get(token);
    if (!state) {
      this.logger.warn(`[AirbnbImport] callback with unknown token ${token.slice(0, 24)}…`);
      throw new BadRequestException('Unknown or expired Airbnb import token');
    }
    // Token shape: ccuid_<userId>_<ts>_<rand>
    const match = /^ccuid_([0-9a-f-]+)_/i.exec(token);
    const userId = match?.[1];
    if (!userId) throw new BadRequestException('Malformed import token');

    state.status = 'importing';
    state.channelId = channelId;
    state.message = 'Reading your Airbnb listings…';

    // Fire-and-forget. State is reported by getStatus().
    this.runImport(userId, channelId, token).catch((err) => {
      this.logger.error(`[AirbnbImport] runImport crashed: ${err?.message ?? err}\n${err?.stack ?? ''}`);
      const s = this.states.get(token);
      if (s) {
        s.status = 'failed';
        s.message = err?.message ?? 'Import failed';
        s.finishedAt = new Date();
      }
    });

    return { accepted: true, token };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Step 3: the actual import
  // ──────────────────────────────────────────────────────────────────────────

  private async runImport(userId: string, channelId: string, token: string): Promise<void> {
    const state = this.states.get(token)!;

    // 3a. Enumerate the host's Airbnb listings.
    const listingsRes = await this.http.get<any>(`/channels/${channelId}/action/listings`, this.masterKey);
    const dict = listingsRes?.data?.listing_id_dictionary?.values || [];
    state.totalListings = dict.length;
    state.message = `Found ${dict.length} listing${dict.length === 1 ? '' : 's'} on Airbnb`;
    this.logger.log(`[AirbnbImport] user=${userId} channel=${channelId.slice(0, 8)} found ${dict.length} listing(s)`);

    const placeholderPropertyId: string | undefined = (state as any).placeholderPropertyId;

    if (dict.length === 0) {
      state.status = 'completed';
      state.message = 'No Airbnb listings found on this account.';
      state.finishedAt = new Date();
      // Clean up the placeholder property since no listing claimed it.
      if (placeholderPropertyId) {
        try {
          await this.http.delete<any>(`/properties/${placeholderPropertyId}`, this.masterKey);
          this.logger.log(`[AirbnbImport] cleaned up unused placeholder ${placeholderPropertyId.slice(0, 8)}`);
        } catch (err: any) {
          this.logger.warn(`[AirbnbImport] placeholder cleanup failed: ${err?.message ?? err}`);
        }
      }
      return;
    }

    // 3b. For each Airbnb listing, build the property/room/rate in Channex and locally.
    // The FIRST listing reuses the placeholder property we created in start().
    // Every other listing creates a fresh Channex property.
    let firstUsedPlaceholder = false;
    for (const entry of dict) {
      const listingId: string = entry.id;
      const listingTitle: string = entry.title || `Airbnb #${listingId}`;
      const reusePropId = !firstUsedPlaceholder ? placeholderPropertyId : undefined;
      try {
        state.message = `Importing "${listingTitle}"…`;
        const localListingId = await this.importOneListing(
          userId,
          channelId,
          listingId,
          listingTitle,
          reusePropId,
        );
        if (reusePropId) firstUsedPlaceholder = true;
        state.importedCount += 1;
        state.importedListingIds.push(localListingId);
      } catch (err: any) {
        this.logger.error(
          `[AirbnbImport] failed listing=${listingId} (${listingTitle}): ${err?.message ?? err}`,
        );
        state.failedCount += 1;
      }
    }
    // Edge case: every import failed and the placeholder is still unused.
    if (!firstUsedPlaceholder && placeholderPropertyId) {
      try {
        await this.http.delete<any>(`/properties/${placeholderPropertyId}`, this.masterKey);
        this.logger.log(`[AirbnbImport] all imports failed; cleaned up placeholder`);
      } catch {/* swallow */}
    }

    // 3c. Activate the channel + pull future reservations (non-fatal).
    try {
      await this.http.post<any>(`/channels/${channelId}/activate`, this.masterKey, {});
      this.logger.log(`[AirbnbImport] channel=${channelId.slice(0, 8)} activated`);
    } catch (err: any) {
      this.logger.warn(`[AirbnbImport] channel activate failed: ${err?.message ?? err}`);
    }
    try {
      await this.http.post<any>(
        `/channels/${channelId}/action/load_future_reservations`,
        this.masterKey,
        {},
      );
      this.logger.log(`[AirbnbImport] load_future_reservations queued`);
    } catch (err: any) {
      this.logger.warn(`[AirbnbImport] load_future_reservations failed: ${err?.message ?? err}`);
    }

    state.status = 'completed';
    state.finishedAt = new Date();
    state.message = `Imported ${state.importedCount}/${state.totalListings} listings`;
    this.logger.log(
      `[AirbnbImport] DONE user=${userId} imported=${state.importedCount} failed=${state.failedCount}`,
    );
  }

  /**
   * Single-listing pipeline:
   *   GET listing_details → build Channex property + room + rate plan →
   *   create local Listing + RoomType + ChannexMapping + PropertyImage rows →
   *   POST /channels/:id/mappings to link Airbnb listing_id → our rate_plan.
   *
   * Returns the local Channels Connect listing ID.
   */
  private async importOneListing(
    userId: string,
    channelId: string,
    airbnbListingId: string,
    fallbackTitle: string,
    reusePropertyId?: string,
  ): Promise<number> {
    // 1. Fetch the Airbnb listing detail through Channex.
    const detailRes = await this.http.get<any>(
      `/channels/${channelId}/action/listing_details?listing_id=${airbnbListingId}`,
      this.masterKey,
    );
    const l = detailRes?.data?.listing || {};

    const title: string = l.name || l.descriptions?.name || fallbackTitle;
    const descriptions = l.descriptions || {};
    const description: string = descriptions.description || descriptions.summary || '';
    const currency: string = l.listing_currency || 'USD';
    const country = normalizeCountryToISO2(l.country_code) ?? 'US';
    const propertyType = normalizePropertyType(l.property_type_category) ?? 'villa';
    const maxGuests: number = Number(l.person_capacity) || 2;
    const bedrooms: number = Number(l.bedrooms) || 0;
    const bathrooms: number = Math.max(1, Math.floor(Number(l.bathrooms) || 1));
    const basePriceMajor: number = Number(l.pricing_settings?.default_daily_price) || Number(l.listing_price) || 100;
    const minNights: number = Number(l.availability_rules?.default_min_nights) || 1;
    const lat = l.lat != null ? Number(l.lat) : null;
    const lng = l.lng != null ? Number(l.lng) : null;
    const photos: string[] = (l.images || [])
      .map((img: any) => img.large_url || img.extra_large_url || img.extra_medium_url || img.small_url)
      .filter(Boolean);

    // 2. Build (or update) the Channex property.
    // If reusePropertyId is set, this is the FIRST Airbnb listing in a batch and
    // we should repurpose the placeholder we created during start() so it doesn't
    // become an orphan. Otherwise create a fresh property.
    let channexPropertyId: string;
    const propertyPayload = {
      property: {
        title,
        currency,
        country,
        property_type: propertyType,
        timezone: 'America/New_York',
        email: `noreply+abb${airbnbListingId}@channelsconnect.com`,
        address: l.street || undefined,
        city: l.city || undefined,
        state: l.state || undefined,
        zip: l.zipcode || undefined,
        ...(lat != null ? { latitude: lat } : {}),
        ...(lng != null ? { longitude: lng } : {}),
        settings: {
          allow_availability_autoupdate_on_modification: true,
          allow_availability_autoupdate_on_cancellation: false,
        },
      },
    };
    if (reusePropertyId) {
      try {
        await this.http.put<any>(`/properties/${reusePropertyId}`, this.masterKey, propertyPayload);
        channexPropertyId = reusePropertyId;
      } catch (err: any) {
        // Update failed — fall back to a fresh property (the placeholder will
        // be cleaned up later by the orphan-check in runImport()).
        this.logger.warn(`[AirbnbImport] PUT placeholder failed (${err?.message}); creating new property`);
        const propRes = await this.http.post<any>('/properties', this.masterKey, propertyPayload);
        channexPropertyId = propRes?.data?.id;
      }
    } else {
      const propRes = await this.http.post<any>('/properties', this.masterKey, propertyPayload);
      channexPropertyId = propRes?.data?.id;
    }
    if (!channexPropertyId) {
      throw new Error(`Channex /properties returned no id (Airbnb listing ${airbnbListingId})`);
    }

    // 3. Build the Channex room_type matching the Airbnb listing.
    const rtRes = await this.http.post<any>('/room_types', this.masterKey, {
      room_type: {
        property_id: channexPropertyId,
        title: 'Standard Room',
        count_of_rooms: 1, // Airbnb is always 1 room per listing
        occ_adults: maxGuests,
        occ_children: 0,
        occ_infants: 0,
        default_occupancy: maxGuests,
        description: description || undefined,
      },
    });
    const channexRoomTypeId: string | undefined = rtRes?.data?.id;
    if (!channexRoomTypeId) throw new Error('Channex /room_types returned no id');

    // 4. Build the Channex rate_plan.
    const rpRes = await this.http.post<any>('/rate_plans', this.masterKey, {
      rate_plan: {
        property_id: channexPropertyId,
        room_type_id: channexRoomTypeId,
        title: 'Standard Rate',
        currency,
        sell_mode: 'per_room',
        rate_mode: 'manual',
        options: [
          {
            rate: Math.round(basePriceMajor * 100),
            occupancy: maxGuests,
            is_primary: true,
            min_stay_arrival: minNights,
          },
        ],
      },
    });
    const channexRatePlanId: string | undefined = rpRes?.data?.id;
    if (!channexRatePlanId) throw new Error('Channex /rate_plans returned no id');

    // 5. Install booking_crs so bookings flow back to us.
    try {
      await this.http.post<any>('/applications/install', this.masterKey, {
        application_installation: {
          property_id: channexPropertyId,
          application_code: 'booking_crs',
        },
      });
    } catch (err: any) {
      // Non-fatal: likely "already installed".
      this.logger.debug(`[AirbnbImport] booking_crs install warning: ${err?.message ?? err}`);
    }

    // 6. Create the local Listing + RoomType + Mapping + PropertyImage records.
    const local = await this.prisma.$transaction(async (tx) => {
      const listing = await tx.listing.create({
        data: {
          userId,
          title,
          description: description || null,
          address: l.street || null,
          city: l.city || null,
          state: l.state || null,
          country: country,
          postalCode: l.zipcode || null,
          latitude: lat ?? null,
          longitude: lng ?? null,
          currency,
          propertyType: l.property_type_category || 'apartment',
          bedrooms: bedrooms || null,
          bathrooms: bathrooms || null,
          maxGuests: maxGuests || null,
          basePrice: basePriceMajor,
          minNights,
          source: 'airbnb',
          // Active immediately so users see what they just imported on the calendar.
          // Admin can still un-activate from the admin dashboard if review is needed.
          isActive: true,
          reviewStatus: 'approved',
          channexPropertyId,
          channexRoomId: channexRoomTypeId,
          airbnbListingId: airbnbListingId,
        },
      });

      await tx.roomType.create({
        data: {
          listingId: listing.id,
          name: 'Standard Room',
          description: description || null,
          maxGuests,
          quantity: 1,
          channexRoomTypeId,
          channexRatePlanId,
        },
      });

      await tx.channexMapping.create({
        data: {
          userId,
          listingId: listing.id,
          channexPropertyId,
          channexRoomTypeId,
          channexRatePlanId,
          channelType: 'airbnb',
          syncStatus: 'active',
          lastSyncAt: new Date(),
        },
      });

      // Photos: each as a PropertyImage row pointing at Airbnb's CDN URL.
      // We don't re-host yet — the URLs are stable Muscache CDN paths.
      if (photos.length > 0) {
        await tx.propertyImage.createMany({
          data: photos.map((url, idx) => ({
            userId,
            listingId: listing.id,
            url,
            sortOrder: idx,
            displayOrder: idx,
            isCover: idx === 0,
            isPrimary: idx === 0,
            caption: null,
          })),
        });
      }

      return listing;
    });

    // 7. Wire the Channex Airbnb-channel mapping: tells Channex
    //    "this Airbnb listing_id maps to this rate_plan_id"
    try {
      await this.http.post<any>(`/channels/${channelId}/mappings`, this.masterKey, {
        mapping: {
          rate_plan_id: channexRatePlanId,
          settings: { listing_id: airbnbListingId },
        },
      });
    } catch (err: any) {
      this.logger.warn(
        `[AirbnbImport] channel mapping failed for listing=${airbnbListingId}: ${err?.message ?? err}`,
      );
    }

    this.logger.log(
      `[AirbnbImport] imported airbnb=${airbnbListingId} → local=${local.id} ` +
        `prop=${channexPropertyId.slice(0, 8)} photos=${photos.length}`,
    );
    return local.id;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Step 4: status polling
  // ──────────────────────────────────────────────────────────────────────────

  getStatus(token: string): ImportState | null {
    return this.states.get(token) ?? null;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Helpers
  // ──────────────────────────────────────────────────────────────────────────

  private async getGroupId(): Promise<string> {
    if (process.env.CHANNEX_GROUP_ID) return process.env.CHANNEX_GROUP_ID;
    // Look it up via /groups (first one). Channex single-org accounts have 1.
    const res = await this.http.get<any>('/groups', this.masterKey);
    const id = res?.data?.[0]?.id;
    if (!id) throw new Error('Could not resolve Channex group_id');
    return id;
  }
}
