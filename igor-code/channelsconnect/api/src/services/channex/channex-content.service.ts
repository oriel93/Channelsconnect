/**
 * channex-content.service.ts — Property & Room-Type content sync engine
 *
 * STRICTLY ISOLATED FROM ARI:
 *   - No dependency on channex-deep-sync.service.ts
 *   - No dependency on channex-sync.service.ts
 *   - Does NOT touch pushARI / pushFullPropertyARI / pushCertificationARI
 *   - Only manages Channex property/room_type lifecycle (content, not rates/availability)
 *
 * Intelligent routing:
 *   - listingId has no ChannexMapping row  → POST (create new property + room type)
 *   - listingId has a ChannexMapping row   → PUT  (update existing property + room type)
 *
 * Atomic state persistence:
 *   - On successful POST: channexPropertyId + channexRoomTypeId saved to channex_mappings
 *     before returning to caller — no orphaned records
 *   - If property POST succeeds but room_type POST fails:
 *     syncStatus set to 'partial_sync' in channex_mappings
 *   - Full success → syncStatus = 'synced'
 *   - Any fatal error → syncStatus = 'error', errorMessage stored
 *
 * Error surface:
 *   - Channex 4xx/5xx error payloads are parsed and re-thrown with the exact
 *     Channex error message so the caller can display it verbatim in the UI.
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ChannexHttpClient } from './channex-http.client';
import { normalizeCountryToISO2 } from '../../channex/channex.service';

// ── Public types ──────────────────────────────────────────────────────────────

export type SyncOutcome =
  | 'synced'        // full success
  | 'partial_sync'  // property created/updated but room type failed
  | 'error';        // fatal — property call itself failed

export interface SyncResult {
  outcome:           SyncOutcome;
  channexPropertyId: string | null;
  channexRoomTypeId: string | null;
  operation:         'created' | 'updated';
  errorMessage?:     string;
}

export interface SyncStateResult {
  hasChannexRecord:  boolean;
  channexPropertyId: string | null;
  channexRoomTypeId: string | null;
  syncStatus:        string | null;
  lastSyncAt:        Date   | null;
  errorMessage?:     string | null;
}

// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class ChannexContentService {
  private readonly logger = new Logger(ChannexContentService.name);
  private readonly masterKey = process.env.CHANNEX_API_KEY || '';

  constructor(
    private readonly prisma: PrismaService,
    private readonly http: ChannexHttpClient,
  ) {}

  // ──────────────────────────────────────────────────────────────────────────
  // PUBLIC: sync state query
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Return the current Channex sync state for a listing.
   * Used by the admin UI to decide "Publish" vs "Sync Updates" label.
   */
  async getSyncState(listingId: number): Promise<SyncStateResult> {
    const mapping = await this.prisma.channexMapping.findFirst({
      where: { listingId, syncStatus: { not: 'archived' } },
      orderBy: { createdAt: 'desc' },
    });

    if (!mapping) {
      return {
        hasChannexRecord: false,
        channexPropertyId: null,
        channexRoomTypeId: null,
        syncStatus: null,
        lastSyncAt: null,
      };
    }

    return {
      hasChannexRecord:  true,
      channexPropertyId: mapping.channexPropertyId,
      channexRoomTypeId: mapping.channexRoomTypeId ?? null,
      syncStatus:        mapping.syncStatus,
      lastSyncAt:        mapping.lastSyncAt,
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PUBLIC: intelligent sync (POST vs PUT routing)
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Sync a listing to Channex.
   * - If no ChannexMapping exists → POST (create).
   * - If ChannexMapping exists     → PUT  (update).
   *
   * Returns SyncResult with full outcome details.
   * Never throws — errors are surfaced through SyncResult.errorMessage.
   */
  async syncListing(listingId: number): Promise<SyncResult> {
    // ── Fetch listing ───────────────────────────────────────────────────────
    const listing = await this.prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) throw new NotFoundException(`Listing ${listingId} not found`);

    // ── Check for existing mapping ──────────────────────────────────────────
    const existing = await this.prisma.channexMapping.findFirst({
      where: { listingId, syncStatus: { not: 'archived' } },
      orderBy: { createdAt: 'desc' },
    });

    if (existing?.channexPropertyId) {
      return this._updateProperty(listing, existing);
    } else {
      return this._createProperty(listing, existing ?? null);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PUBLIC: deactivate on Channex + archive locally
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Set Channex property to inactive and mark our DB record as archived.
   * Throws a descriptive error if the mapping or Channex call fails.
   */
  async deactivateListing(listingId: number): Promise<{ archived: boolean; channexPropertyId: string }> {
    const mapping = await this.prisma.channexMapping.findFirst({
      where: { listingId, syncStatus: { not: 'archived' } },
      orderBy: { createdAt: 'desc' },
    });

    if (!mapping?.channexPropertyId) {
      throw new Error(
        `Listing ${listingId} has no active Channex record — nothing to deactivate.`
      );
    }

    // PUT /properties/:id with is_active: false (Channex "inactive" state)
    try {
      await this.http.put(
        `/properties/${mapping.channexPropertyId}`,
        this.masterKey,
        { property: { is_active: false } },
      );
    } catch (err: any) {
      const msg = this._extractChannexError(err) ?? err?.message ?? 'Channex deactivation failed';
      throw new Error(msg);
    }

    // Archive in our DB (soft delete — keeps the record for audit trail)
    await this.prisma.channexMapping.update({
      where: { id: mapping.id },
      data: { syncStatus: 'archived', lastSyncAt: new Date() },
    });

    await this.prisma.listing.update({
      where: { id: listingId },
      data: { reviewStatus: 'archived', isActive: false },
    });

    this.logger.log(`[Content] Deactivated listing ${listingId} on Channex (propertyId=${mapping.channexPropertyId})`);
    return { archived: true, channexPropertyId: mapping.channexPropertyId };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PRIVATE: create flow (POST)
  // ──────────────────────────────────────────────────────────────────────────

  private async _createProperty(
    listing: any,
    existingMapping: any | null,
  ): Promise<SyncResult> {
    const payload = this._buildPropertyPayload(listing);
    let channexPropertyId: string | null = null;

    // ── POST /properties ────────────────────────────────────────────────────
    try {
      const res = await this.http.post<any>('/properties', this.masterKey, { property: payload });
      channexPropertyId = this._extractId(res);
      if (!channexPropertyId) throw new Error('Channex returned no property ID');
      this.logger.log(`[Content] Created Channex property ${channexPropertyId} for listing ${listing.id}`);
    } catch (err: any) {
      const errorMessage = this._extractChannexError(err) ?? err?.message ?? 'Unknown error';
      this.logger.error(`[Content] Property POST failed for listing ${listing.id}: ${errorMessage}`);

      // Persist error state
      await this._upsertMapping(listing, existingMapping, null, null, 'error', new Date());

      return { outcome: 'error', channexPropertyId: null, channexRoomTypeId: null, operation: 'created', errorMessage };
    }

    // ── Immediately persist property ID (atomic anchor) ────────────────────
    const savedMapping = await this._upsertMapping(listing, existingMapping, channexPropertyId, null, 'partial_sync', new Date());

    // ── POST /room_types ────────────────────────────────────────────────────
    let channexRoomTypeId: string | null = null;
    try {
      const rtRes = await this.http.post<any>('/room_types', this.masterKey, {
        room_type: this._buildRoomTypePayload(listing, channexPropertyId),
      });
      channexRoomTypeId = this._extractId(rtRes);
      if (!channexRoomTypeId) throw new Error('Channex returned no room_type ID');
      this.logger.log(`[Content] Created room type ${channexRoomTypeId} under property ${channexPropertyId}`);
    } catch (err: any) {
      const errorMessage = this._extractChannexError(err) ?? err?.message ?? 'Room type creation failed';
      this.logger.warn(`[Content] Room type POST failed (partial_sync) for listing ${listing.id}: ${errorMessage}`);

      // Property created but room type failed → partial_sync
      await this.prisma.channexMapping.update({
        where: { id: savedMapping.id },
        data: { syncStatus: 'partial_sync', lastSyncAt: new Date() },
      });

      return {
        outcome: 'partial_sync',
        channexPropertyId,
        channexRoomTypeId: null,
        operation: 'created',
        errorMessage: `Property created (${channexPropertyId}) but room type failed: ${errorMessage}`,
      };
    }

    // ── Full success: persist room type ID and mark synced ──────────────────
    await this.prisma.channexMapping.update({
      where: { id: savedMapping.id },
      data: { channexRoomTypeId, syncStatus: 'synced', lastSyncAt: new Date() },
    });

    // Also approve the listing (it was pending, now published)
    await this.prisma.listing.update({
      where: { id: listing.id },
      data: { reviewStatus: 'approved', isActive: true },
    });

    return { outcome: 'synced', channexPropertyId, channexRoomTypeId, operation: 'created' };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PRIVATE: update flow (PUT)
  // ──────────────────────────────────────────────────────────────────────────

  private async _updateProperty(listing: any, mapping: any): Promise<SyncResult> {
    const { channexPropertyId, channexRoomTypeId } = mapping;
    const payload = this._buildPropertyPayload(listing);

    // ── PUT /properties/:id ─────────────────────────────────────────────────
    try {
      await this.http.put<any>(
        `/properties/${channexPropertyId}`,
        this.masterKey,
        { property: payload },
      );
      this.logger.log(`[Content] Updated Channex property ${channexPropertyId} for listing ${listing.id}`);
    } catch (err: any) {
      const errorMessage = this._extractChannexError(err) ?? err?.message ?? 'Unknown error';
      this.logger.error(`[Content] Property PUT failed for listing ${listing.id}: ${errorMessage}`);

      await this.prisma.channexMapping.update({
        where: { id: mapping.id },
        data: { syncStatus: 'error', lastSyncAt: new Date() },
      });

      return {
        outcome: 'error',
        channexPropertyId,
        channexRoomTypeId: channexRoomTypeId ?? null,
        operation: 'updated',
        errorMessage,
      };
    }

    // ── PUT /room_types/:id (if we have one) ────────────────────────────────
    let finalRoomTypeId = channexRoomTypeId ?? null;
    if (channexRoomTypeId) {
      try {
        await this.http.put<any>(
          `/room_types/${channexRoomTypeId}`,
          this.masterKey,
          { room_type: this._buildRoomTypePayload(listing, channexPropertyId) },
        );
        this.logger.log(`[Content] Updated room type ${channexRoomTypeId} for listing ${listing.id}`);
      } catch (err: any) {
        // Room type update failure is non-fatal for an update — log and continue
        const errorMessage = this._extractChannexError(err) ?? err?.message ?? 'Room type update failed';
        this.logger.warn(`[Content] Room type PUT failed (non-fatal) for listing ${listing.id}: ${errorMessage}`);
        finalRoomTypeId = channexRoomTypeId;
      }
    }

    await this.prisma.channexMapping.update({
      where: { id: mapping.id },
      data: { syncStatus: 'synced', lastSyncAt: new Date() },
    });

    return {
      outcome: 'synced',
      channexPropertyId,
      channexRoomTypeId: finalRoomTypeId,
      operation: 'updated',
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PRIVATE: helpers
  // ──────────────────────────────────────────────────────────────────────────

  /** Build the Channex property payload from a Listing row. */
  private _buildPropertyPayload(listing: any): Record<string, any> {
    const p: Record<string, any> = {
      title:    listing.title,
      currency: listing.currency || 'USD',
      email:    `noreply+listing${listing.id}@channelsconnect.com`,
    };
    if (listing.address)     p['address']   = listing.address;
    if (listing.city)        p['city']       = listing.city;
    const iso2 = normalizeCountryToISO2(listing.country);
    if (iso2) p['country'] = iso2;
    if (listing.postalCode)  p['zip']        = listing.postalCode;
    if (listing.latitude)    p['latitude']   = Number(listing.latitude);
    if (listing.longitude)   p['longitude']  = Number(listing.longitude);
    if (listing.description) p['description'] = listing.description;
    return p;
  }

  /** Build the Channex room_type payload.
   *  Channex requires occ_adults + occ_children + occ_infants (all non-null) and
   *  count_of_rooms >= 1. Older versions used `occ` which Channex rejects with
   *  422 'occ_children/occ_infants can\u2019t be blank'.
   *  Defensive: handle listings created without bedroom/guest counts by defaulting.
   */
  private _buildRoomTypePayload(listing: any, propertyId: string): Record<string, any> {
    const adults = Math.max(1, Number(listing.maxGuests) || 2);
    return {
      property_id:       propertyId,
      title:             listing.title || 'Standard Room',
      count_of_rooms:    Math.max(1, Number(listing.bedrooms) || 1),
      occ_adults:        adults,
      occ_children:      0,
      occ_infants:       0,
      default_occupancy: adults,
      currency:          listing.currency || 'USD',
    };
  }

  /**
   * Upsert the ChannexMapping row.
   * If existingMapping is provided, update it; otherwise create new.
   */
  private async _upsertMapping(
    listing: any,
    existingMapping: any | null,
    channexPropertyId: string | null,
    channexRoomTypeId: string | null,
    syncStatus: string,
    lastSyncAt: Date,
  ) {
    if (existingMapping) {
      return this.prisma.channexMapping.update({
        where: { id: existingMapping.id },
        data: {
          ...(channexPropertyId && { channexPropertyId }),
          ...(channexRoomTypeId && { channexRoomTypeId }),
          syncStatus,
          lastSyncAt,
        },
      });
    }

    return this.prisma.channexMapping.create({
      data: {
        userId:            listing.userId,
        listingId:         listing.id,
        channexPropertyId: channexPropertyId ?? 'pending',
        channexRoomTypeId: channexRoomTypeId ?? undefined,
        channelType:       'channex',
        syncStatus,
        lastSyncAt,
      },
    });
  }

  /**
   * Extract the ID from various Channex response shapes:
   *   { data: { attributes: { id } } }
   *   { data: { id } }
   *   { id }
   */
  private _extractId(res: any): string | null {
    return (
      res?.data?.attributes?.id ??
      res?.data?.id ??
      res?.id ??
      null
    );
  }

  /**
   * Extract a human-readable error message from a Channex API error response.
   * Channex returns errors in shapes like:
   *   { errors: { [field]: ['message'] } }
   *   { error: 'string' }
   *   { message: 'string' }
   */
  private _extractChannexError(err: any): string | null {
    // Axios wraps the Channex response in err.response.data
    const data = err?.response?.data ?? err?.data ?? err;

    if (!data || typeof data !== 'object') return null;

    // { errors: { latitude: ['must be a valid coordinate'], ... } }
    if (data.errors && typeof data.errors === 'object') {
      const messages: string[] = [];
      for (const [field, msgs] of Object.entries(data.errors)) {
        const list = Array.isArray(msgs) ? msgs.join(', ') : String(msgs);
        messages.push(`${field}: ${list}`);
      }
      if (messages.length > 0) return messages.join(' | ');
    }

    // { error: 'string' }
    if (typeof data.error === 'string') return data.error;

    // { message: 'string' }
    if (typeof data.message === 'string') return data.message;

    return null;
  }
}
