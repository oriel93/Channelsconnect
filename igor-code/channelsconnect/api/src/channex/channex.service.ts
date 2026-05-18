import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

/**
 * Result of the 3-step Channex property build.
 * All three IDs are needed before any ARI push (Tests T9/T10/T11) is valid.
 */
export interface ChannexPropertyBuildResult {
  /** Channex property ID — used in all ARI calls as property_id */
  channexPropertyId: string;
  /** Channex room_type ID — used in availability calls as room_type_id */
  channexRoomTypeId: string;
  /** Channex rate_plan ID — used in restrictions/rate calls as rate_plan_id */
  channexRatePlanId: string;
  /** Raw Channex property object */
  property: any;
  /** Raw Channex room_type object */
  roomType: any;
  /** Raw Channex rate_plan object */
  ratePlan: any;
}

@Injectable()
export class ChannexService {
  private readonly logger = new Logger(ChannexService.name);
  private readonly baseUrl = 'https://staging.channex.io/api/v1';
  private readonly headers: any;

  constructor(private readonly httpService: HttpService) {
    const apiKey = process.env.CHANNEX_API_KEY || '';
    this.headers = {
      'user-api-key': apiKey,
      'Content-Type': 'application/json',
    };
  }

  // ─── Individual helpers ────────────────────────────────────────────────────

  async getProperties() {
    const res = await firstValueFrom(this.httpService.get(`${this.baseUrl}/properties`, { headers: this.headers }));
    return res.data;
  }

  async createProperty(data: any) {
    const res = await firstValueFrom(this.httpService.post(`${this.baseUrl}/properties`, { property: data }, { headers: this.headers }));
    return res.data;
  }

  async getRoomTypes(propertyId: string) {
    const res = await firstValueFrom(this.httpService.get(`${this.baseUrl}/room_types?filter[property_id]=${propertyId}`, { headers: this.headers }));
    return res.data;
  }

  async createRoomType(data: any) {
    const res = await firstValueFrom(this.httpService.post(`${this.baseUrl}/room_types`, { room_type: data }, { headers: this.headers }));
    return res.data;
  }

  async getRatePlans(propertyId: string) {
    const res = await firstValueFrom(this.httpService.get(`${this.baseUrl}/rate_plans?filter[property_id]=${propertyId}`, { headers: this.headers }));
    return res.data;
  }

  async createRatePlan(data: any) {
    const res = await firstValueFrom(this.httpService.post(`${this.baseUrl}/rate_plans`, { rate_plan: data }, { headers: this.headers }));
    return res.data;
  }

  async createChannel(data: any) {
    const res = await firstValueFrom(this.httpService.post(`${this.baseUrl}/channels`, { channel: data }, { headers: this.headers }));
    return res.data;
  }

  async importProperties(channelId: string) {
    const res = await firstValueFrom(this.httpService.post(`${this.baseUrl}/imports`, { import: { channel_id: channelId } }, { headers: this.headers }));
    return res.data;
  }

  // ─── 3-Step Property Build (Cert T1 onboarding) ────────────────────────────
  /**
   * Builds a brand-new property in Channex in strict 3-step sequence:
   *
   *   Step A — POST /properties
   *     Creates the Channex property record. Extracts property_id.
   *     Payload: { title, description, address, city, country, currency }
   *
   *   Step B — POST /room_types
   *     Creates a default "Standard Room" room type linked to the property.
   *     Extracts room_type_id — REQUIRED for availability (T9/T10/T11).
   *     Payload: { property_id, title, count_of_rooms, occupancy }
   *
   *   Step C — POST /rate_plans
   *     Creates a default "Standard Rate" rate plan linked to property + room_type.
   *     Extracts rate_plan_id — REQUIRED for rate restrictions (T9/T10).
   *     Payload: { property_id, room_type_id, title, currency, options }
   *
   * All 3 steps must succeed before any ARI push is valid.
   * If any step fails, the whole build is rolled back (error thrown, no partial state).
   *
   * @param localListing — our Prisma Listing row (fields used: title, description, address, city, country, currency)
   * @returns ChannexPropertyBuildResult with all three IDs
   * @throws BadRequestException if any Channex API call fails, with explicit err.response?.data
   */
  async buildPropertyInChannex(localListing: {
    title: string;
    description?: string | null;
    address?: string | null;
    city?: string | null;
    country?: string | null;
    currency?: string;
    maxGuests?: number;
    basePrice?: number;
  }): Promise<ChannexPropertyBuildResult> {
    this.logger.log(
      `[ChannexBuild] Starting 3-step property build — "${localListing.title}"`,
    );

    // ── Step A: Create Property ──────────────────────────────────────────────
    let propertyId: string;
    let propertyData: any;
    try {
      this.logger.log('[ChannexBuild/StepA] POST /properties');
      const propResult = await this.createProperty({
        title:       localListing.title,
        description: localListing.description ?? undefined,
        address:     localListing.address ?? undefined,
        city:        localListing.city ?? undefined,
        country:     localListing.country ?? undefined,
        currency:    localListing.currency ?? 'USD',
        // Channex expects these fields on the property
      });
      // Channex returns { data: { id: "...", attributes: { ... } } } for single-resource POSTs
      // (NOT an array). Tolerate both shapes for safety.
      propertyData = Array.isArray(propResult?.data) ? propResult.data[0] : propResult?.data;
      if (!propertyData?.id) {
        const errMsg = `Step A (create property) succeeded but no property_id in response: ${JSON.stringify(propResult)}`;
        this.logger.error(`[ChannexBuild/StepA] FAIL — ${errMsg}`);
        throw new BadRequestException(`Channex property creation failed: ${errMsg}`);
      }
      propertyId = propertyData.id;
      this.logger.log(`[ChannexBuild/StepA] OK — property_id=${propertyId}`);
    } catch (err: any) {
      const detail =
        err?.response?.data?.message ??
        err?.response?.data?.error ??
        err?.response?.data?.errors?.title ??
        err?.message ??
        String(err);
      this.logger.error(`[ChannexBuild/StepA] Channex API error: ${detail} | response=${JSON.stringify(err?.response?.data)}`);
      throw new BadRequestException(`Step A (create property) failed in Channex: ${detail}`);
    }

    // ── Step B: Create Default Room Type ─────────────────────────────────────
    let roomTypeId: string;
    let roomTypeData: any;
    try {
      this.logger.log(`[ChannexBuild/StepB] POST /room_types — property_id=${propertyId}`);
      // Channex /room_types requires occ_adults, occ_children, occ_infants — all non-null.
      // 'occupancy' alone is NOT accepted; the API rejects with "can't be blank" on occ_children/occ_infants.
      const adults = Math.max(1, localListing.maxGuests ?? 2);
      const roomResult = await this.createRoomType({
        property_id:       propertyId,
        title:             'Standard Room',
        count_of_rooms:    1,
        occ_adults:        adults,
        occ_children:      0,
        occ_infants:       0,
        default_occupancy: adults,
        description:       localListing.description ?? 'Default room type',
      });
      roomTypeData = Array.isArray(roomResult?.data) ? roomResult.data[0] : roomResult?.data;
      if (!roomTypeData?.id) {
        const errMsg = `Step B (create room type) succeeded but no room_type_id in response: ${JSON.stringify(roomResult)}`;
        this.logger.error(`[ChannexBuild/StepB] FAIL — ${errMsg}`);
        throw new BadRequestException(`Channex room type creation failed: ${errMsg}`);
      }
      roomTypeId = roomTypeData.id;
      this.logger.log(`[ChannexBuild/StepB] OK — room_type_id=${roomTypeId}`);
    } catch (err: any) {
      // Attempt to deactivate the property we just created (best-effort cleanup)
      this.logger.warn(`[ChannexBuild/StepB] Failed — attempting rollback of property_id=${propertyId}`);
      try {
        await firstValueFrom(
          this.httpService.delete(`${this.baseUrl}/properties/${propertyId}`, { headers: this.headers }),
        );
        this.logger.log(`[ChannexBuild/StepB] Rollback OK — property_id=${propertyId} deleted`);
      } catch (_e: any) {
        this.logger.warn(`[ChannexBuild/StepB] Rollback failed for property_id=${propertyId}: ${_e?.message}`);
      }
      const detail =
        err?.response?.data?.message ??
        err?.response?.data?.error ??
        err?.response?.data?.errors?.title ??
        err?.message ??
        String(err);
      this.logger.error(`[ChannexBuild/StepB] Channex API error: ${detail} | response=${JSON.stringify(err?.response?.data)}`);
      throw new BadRequestException(`Step B (create room type) failed in Channex: ${detail}`);
    }

    // ── Step C: Create Default Rate Plan ─────────────────────────────────────
    let ratePlanId: string;
    let ratePlanData: any;
    try {
      this.logger.log(
        `[ChannexBuild/StepC] POST /rate_plans — property_id=${propertyId} room_type_id=${roomTypeId}`,
      );
      // Channex /rate_plans options need occupancy + is_primary on the primary option.
      // sell_mode/rate_mode are top-level. stop_sell/closed_to_* belong on /restrictions, not the rate plan.
      const rpAdults = Math.max(1, localListing.maxGuests ?? 2);
      const rateResult = await this.createRatePlan({
        property_id:  propertyId,
        room_type_id: roomTypeId,
        title:        'Standard Rate',
        currency:     localListing.currency ?? 'USD',
        sell_mode:    'per_room',
        rate_mode:    'manual',
        options: [
          {
            // Base rate (rate field = cents)
            rate:             Math.round((Number(localListing.basePrice) || 100) * 100),
            occupancy:        rpAdults,
            is_primary:       true,
            // Default min stay = 1 night
            min_stay_arrival: 1,
          },
        ],
      });
      ratePlanData = Array.isArray(rateResult?.data) ? rateResult.data[0] : rateResult?.data;
      if (!ratePlanData?.id) {
        const errMsg = `Step C (create rate plan) succeeded but no rate_plan_id in response: ${JSON.stringify(rateResult)}`;
        this.logger.error(`[ChannexBuild/StepC] FAIL — ${errMsg}`);
        throw new BadRequestException(`Channex rate plan creation failed: ${errMsg}`);
      }
      ratePlanId = ratePlanData.id;
      this.logger.log(`[ChannexBuild/StepC] OK — rate_plan_id=${ratePlanId}`);
    } catch (err: any) {
      // Attempt to deactivate property + delete room type (best-effort cleanup)
      this.logger.warn(
        `[ChannexBuild/StepC] Failed — attempting cleanup of property_id=${propertyId} + room_type_id=${roomTypeId}`,
      );
      try {
        await firstValueFrom(
          this.httpService.delete(`${this.baseUrl}/room_types/${roomTypeId}`, { headers: this.headers }),
        );
        this.logger.log(`[ChannexBuild/StepC] Rollback OK — room_type_id=${roomTypeId} deleted`);
      } catch (_e: any) {
        this.logger.warn(`[ChannexBuild/StepC] Room-type rollback failed: ${_e?.message}`);
      }
      try {
        await firstValueFrom(
          this.httpService.delete(`${this.baseUrl}/properties/${propertyId}`, { headers: this.headers }),
        );
        this.logger.log(`[ChannexBuild/StepC] Rollback OK — property_id=${propertyId} deleted`);
      } catch (_e: any) {
        this.logger.warn(`[ChannexBuild/StepC] Property rollback failed: ${_e?.message}`);
      }
      const detail =
        err?.response?.data?.message ??
        err?.response?.data?.error ??
        err?.response?.data?.errors?.title ??
        err?.message ??
        String(err);
      this.logger.error(`[ChannexBuild/StepC] Channex API error: ${detail} | response=${JSON.stringify(err?.response?.data)}`);
      throw new BadRequestException(`Step C (create rate plan) failed in Channex: ${detail}`);
    }

    // ── Step D: Install Booking CRS app (best-effort, non-fatal) ────────────────
    // Required so we can POST /bookings (PMS → Channex) when a manual or direct
    // booking is created. If it's already installed, Channex returns a 422 we ignore.
    try {
      this.logger.log(`[ChannexBuild/StepD] POST /applications/install booking_crs property_id=${propertyId}`);
      await firstValueFrom(
        this.httpService.post(
          `${this.baseUrl}/applications/install`,
          { application_installation: { property_id: propertyId, application_code: 'booking_crs' } },
          { headers: this.headers },
        ),
      );
      this.logger.log(`[ChannexBuild/StepD] OK — booking_crs installed`);
    } catch (err: any) {
      const detail =
        err?.response?.data?.errors?.application_id?.[0] ??
        err?.response?.data?.message ??
        err?.message;
      const alreadyInstalled =
        typeof detail === 'string' && /already|exists|allowed/i.test(detail);
      if (alreadyInstalled) {
        this.logger.log(`[ChannexBuild/StepD] booking_crs already installed (skip)`);
      } else {
        this.logger.warn(
          `[ChannexBuild/StepD] booking_crs install failed (non-fatal): ${detail ?? err?.message}`,
        );
      }
    }

    this.logger.log(
      `[ChannexBuild] COMPLETE — property_id=${propertyId} room_type_id=${roomTypeId} rate_plan_id=${ratePlanId}`,
    );

    return {
      channexPropertyId: propertyId,
      channexRoomTypeId: roomTypeId,
      channexRatePlanId: ratePlanId,
      property:   propertyData,
      roomType:   roomTypeData,
      ratePlan:   ratePlanData,
    };
  }
}
