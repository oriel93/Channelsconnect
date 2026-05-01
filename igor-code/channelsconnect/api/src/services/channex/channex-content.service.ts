/**
 * channex-content.service.ts — Property & room-type content push to Channex
 *
 * STRICTLY SEPARATED FROM ARI:
 *   - No dependency on channex-deep-sync.service.ts
 *   - No dependency on channex-sync.service.ts
 *   - Does NOT touch pushARI / pushFullPropertyARI / pushCertificationARI
 *   - Only deals with content (properties + room types), not rates/availability
 *
 * Responsibilities:
 *   1. Fetch listing from DB (Prisma)
 *   2. Map to Channex property payload
 *   3. POST /api/v1/properties to Channex via ChannexHttpClient
 *   4. Create one room type per listing (default: named after the listing title)
 *   5. Return { propertyId, roomTypeIds[] }
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ChannexHttpClient } from './channex-http.client';

export interface PushPropertyResult {
  propertyId: string;
  roomTypeIds: string[];
}

@Injectable()
export class ChannexContentService {
  private readonly logger = new Logger(ChannexContentService.name);
  private readonly masterKey = process.env.CHANNEX_API_KEY || '';

  constructor(
    private readonly prisma: PrismaService,
    private readonly http: ChannexHttpClient,
  ) {}

  /**
   * Push a listing as a Channex property + one default room type.
   * Returns { propertyId, roomTypeIds }.
   */
  async pushPropertyToChannex(listingId: number, userId: string): Promise<PushPropertyResult> {
    // ── 1. Fetch listing ────────────────────────────────────────────────
    const listing = await this.prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) throw new NotFoundException(`Listing ${listingId} not found`);

    this.logger.log(`[Content] Pushing listing ${listingId} ("${listing.title}") to Channex`);

    // ── 2. Map to Channex property payload ──────────────────────────────
    // Only send fields that are actually populated to avoid Channex validation errors
    const propertyPayload: Record<string, any> = {
      title: listing.title,
      currency: listing.currency || 'USD',
      email: `noreply+listing${listing.id}@channelsconnect.com`,
    };
    if (listing.address)   propertyPayload['address'] = listing.address;
    if (listing.city)      propertyPayload['city'] = listing.city;
    if (listing.country)   propertyPayload['country'] = listing.country;
    if (listing.postalCode) propertyPayload['zip'] = listing.postalCode;
    if (listing.latitude)  propertyPayload['latitude'] = listing.latitude;
    if (listing.longitude) propertyPayload['longitude'] = listing.longitude;

    // ── 3. Create property on Channex ───────────────────────────────────
    let propertyId: string;
    try {
      const propertyRes = await this.http.post<any>(
        '/properties',
        this.masterKey,
        { property: propertyPayload },
      );
      // Channex returns { data: { attributes: { id: '...' } } } or { data: { id: '...' } }
      propertyId =
        propertyRes?.data?.attributes?.id ??
        propertyRes?.data?.id ??
        propertyRes?.id;

      if (!propertyId) {
        this.logger.error(`[Content] Channex did not return a property ID: ${JSON.stringify(propertyRes)}`);
        throw new Error('Channex property creation returned no ID');
      }
      this.logger.log(`[Content] Channex property created: ${propertyId}`);
    } catch (err: any) {
      this.logger.error(`[Content] Failed to create Channex property: ${err?.message}`);
      throw err;
    }

    // ── 4. Create one default room type ─────────────────────────────────
    const roomTypeIds: string[] = [];
    try {
      const roomTypePayload = {
        property_id: propertyId,
        title: listing.title,
        occ: listing.maxGuests ?? 2,
        count_of_rooms: 1,
        currency: listing.currency || 'USD',
      };
      const rtRes = await this.http.post<any>(
        '/room_types',
        this.masterKey,
        { room_type: roomTypePayload },
      );
      const roomTypeId =
        rtRes?.data?.attributes?.id ??
        rtRes?.data?.id ??
        rtRes?.id;

      if (roomTypeId) {
        roomTypeIds.push(roomTypeId);
        this.logger.log(`[Content] Room type created: ${roomTypeId} for property ${propertyId}`);
      }
    } catch (err: any) {
      // Room type creation failing should not block the caller — log and continue
      this.logger.warn(`[Content] Room type creation failed (non-fatal): ${err?.message}`);
    }

    return { propertyId, roomTypeIds };
  }
}
