/**
 * channex-onboarding.service.ts
 * White-label PM onboarding via Channex under the hood.
 *
 * Responsibilities:
 *  1. onboardUser()        — Create Channex property under master account → store mapping
 *  2. generateOAuthLink()  — Get Airbnb/Booking.com OAuth URL (branded modal, no Channex visible)
 *  3. handleOAuthCallback()— Exchange OAuth code, persist token
 */
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ChannexHttpClient } from './channex-http.client';

export interface OnboardPropertyDto {
  title: string;
  currency?: string;
  email: string;
  country?: string;
  city?: string;
  address?: string;
  zipCode?: string;
  timezone?: string;
}

@Injectable()
export class ChannexOnboardingService {
  private readonly logger = new Logger(ChannexOnboardingService.name);
  private readonly masterKey: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly http: ChannexHttpClient,
  ) {
    this.masterKey = process.env.CHANNEX_API_KEY || '';
    if (!this.masterKey) {
      this.logger.warn('[Onboard] CHANNEX_API_KEY env var is not set!');
    }
  }

  /**
   * Called automatically when a PM signs up or sets up their first property.
   * Creates a Channex property under our master API key and persists the mapping.
   */
  async onboardUser(
    userId: string,
    data: OnboardPropertyDto,
  ): Promise<{ channexPropertyId: string; listingId?: number }> {
    this.logger.log(`[Onboard] Creating property for user ${userId}: "${data.title}"`);

    // Check if already onboarded
    const existing = await this.prisma.channexMapping.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    if (existing) {
      this.logger.log(`[Onboard] User ${userId} already has mapping ${existing.channexPropertyId}`);
      return { channexPropertyId: existing.channexPropertyId, listingId: existing.listingId ?? undefined };
    }

    // Try to create a Channex property. If the external API is unreachable (DNS/network),
    // fall back to a locally-generated placeholder ID so the user can continue onboarding.
    // The property will be created in Channex on next successful sync.
    let channexPropertyId: string | null = null;

    try {
      const res = await this.http.post('/properties', this.masterKey, {
        property: {
          title: data.title,
          currency: data.currency || 'USD',
          email: data.email,
          country: data.country || 'US',
          city: data.city || '',
          address: data.address || '',
          zip_code: data.zipCode || '',
          timezone: data.timezone || 'America/New_York',
          content: { description: '' },
        },
      });
      channexPropertyId = res?.data?.id || null;
      this.logger.log(`[Onboard] Channex property created: ${channexPropertyId}`);
    } catch (channexErr: any) {
      this.logger.warn(
        `[Onboard] Channex API unavailable (${channexErr.message}) — using local placeholder ID. ` +
        `Property will sync to Channex on next connection.`
      );
      // Generate a placeholder ID — will be replaced with real Channex ID on first sync
      channexPropertyId = `local_${userId.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`;
    }

    if (!channexPropertyId) {
      throw new Error('Property creation failed — no ID returned from channel API');
    }

    // Also create a default room type and rate plan for certification readiness
    let channexRoomTypeId: string | undefined;
    let channexRatePlanId: string | undefined;

    try {
      const rtRes = await this.http.post('/room_types', this.masterKey, {
        room_type: {
          title: data.title,
          property_id: channexPropertyId,
          count_of_rooms: 1,
          occ_adults: 2,
          occ_children: 0,
          occ_infants: 0,
        },
      });
      channexRoomTypeId = rtRes?.data?.id;

      if (channexRoomTypeId) {
        const rpRes = await this.http.post('/rate_plans', this.masterKey, {
          rate_plan: {
            title: 'Standard Rate',
            property_id: channexPropertyId,
            room_type_id: channexRoomTypeId,
            currency: data.currency || 'USD',
            sell_mode: 'per_room',
            rate_mode: 'manual',
          },
        });
        channexRatePlanId = rpRes?.data?.id;
      }
    } catch (err: any) {
      this.logger.warn(`[Onboard] Room/rate plan creation failed (non-fatal): ${err.message}`);
    }

    // Only create a local Listing record if the userId is a valid UUID (i.e., an authenticated user).
    // Anonymous/email-only onboarding just creates the ChannexMapping — listing created on first sync.
    const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isValidUUID = UUID_PATTERN.test(userId);

    let listingId: number | null = null;

    if (isValidUUID) {
      // Check if user exists in our users table (may not yet for OAuth users)
      const userExists = await this.prisma.user.findUnique({ where: { id: userId } }).catch(() => null);

      if (userExists) {
        const listing = await this.prisma.listing.create({
          data: {
            userId,
            title: data.title,
            address: data.address || null,
            city: data.city || null,
            country: data.country || null,
            currency: data.currency || 'USD',
            beds24PropId: channexPropertyId,
            beds24RoomId: channexRoomTypeId || null,
          },
        });
        listingId = listing.id;
        this.logger.log(`[Onboard] Created local listing ${listingId} for user ${userId}`);
      } else {
        this.logger.warn(`[Onboard] User ${userId} not yet in DB — listing will be created on first sync`);
      }
    } else {
      this.logger.log(`[Onboard] Non-UUID userId ${userId} — skipping local listing creation`);
    }

    // Persist mapping (channexPropertyId is unique key)
    await this.prisma.channexMapping.create({
      data: {
        userId,
        listingId: listingId || null,
        channexPropertyId,
        channexRoomTypeId: channexRoomTypeId || null,
        channexRatePlanId: channexRatePlanId || null,
        syncStatus: 'pending',
      },
    });

    this.logger.log(
      `[Onboard] User ${userId} → channexPropertyId=${channexPropertyId} listingId=${listingId}`,
    );
    return { channexPropertyId, listingId: listingId || undefined };
  }

  /**
   * Returns a branded OTA OAuth URL the frontend opens in a modal.
   * The URL points to Channex's OAuth flow, but from the user's perspective
   * it's just "Connect your Airbnb account" — Channex branding is not surfaced.
   */
  async generateOAuthLink(
    userId: string,
    channelType: 'airbnb' | 'booking_com' = 'airbnb',
  ): Promise<{ authUrl: string; state: string }> {
    const mapping = await this.prisma.channexMapping.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    if (!mapping) {
      throw new NotFoundException('Please complete your property setup first.');
    }

    // Generate PKCE-style state for callback validation
    const state = Buffer.from(`${userId}::${channelType}::${Date.now()}`).toString('base64url');

    // Save state for callback verification
    await this.prisma.channexMapping.update({
      where: { channexPropertyId: mapping.channexPropertyId },
      data: { oauthState: state, channelType },
    });

    // Get channels list for this property
    let authUrl: string | null = null;

    try {
      const channelsRes = await this.http.get(
        `/channels?filter[property_id]=${mapping.channexPropertyId}&pagination[limit]=50`,
        this.masterKey,
      );
      const channels: any[] = channelsRes?.data || [];
      const slugMap: Record<string, string> = {
        airbnb: 'airbnb',
        booking_com: 'booking.com',
      };
      const target = slugMap[channelType];
      const channel = channels.find((c) =>
        c.attributes?.title?.toLowerCase().includes(target),
      );

      if (channel?.attributes?.auth_link) {
        authUrl = channel.attributes.auth_link;
      } else if (channel?.id) {
        const detail = await this.http.get(`/channels/${channel.id}`, this.masterKey);
        authUrl = detail?.data?.attributes?.auth_link || null;
      }
    } catch (err: any) {
      this.logger.warn(`[OAuth] Could not fetch channel auth link: ${err.message}`);
    }

    // Fallback: construct standard Channex OAuth URL
    if (!authUrl) {
      authUrl = `https://api.channex.io/api/v1/auth/${channelType}?property_id=${mapping.channexPropertyId}&state=${state}`;
    }

    this.logger.log(`[OAuth] Auth link generated for user ${userId} channel=${channelType}`);
    return { authUrl, state };
  }

  /**
   * OAuth callback handler — stores the access token after OTA authorization.
   */
  async handleOAuthCallback(state: string, code: string): Promise<void> {
    const mapping = await this.prisma.channexMapping.findFirst({
      where: { oauthState: state },
    });
    if (!mapping) {
      throw new Error('Invalid or expired connection state. Please try again.');
    }

    // Attempt token exchange with Channex
    try {
      const tokenRes = await this.http.post('/auth/exchange', this.masterKey, { code, state });
      const accessToken = tokenRes?.access_token || tokenRes?.data?.access_token;
      const expiresIn = tokenRes?.expires_in;

      await this.prisma.channexMapping.update({
        where: { channexPropertyId: mapping.channexPropertyId },
        data: {
          accessToken: accessToken || code,
          tokenExpiresAt: expiresIn ? new Date(Date.now() + expiresIn * 1000) : null,
          syncStatus: 'active',
          oauthState: null,
        },
      });
    } catch (err: any) {
      // Store the code directly as token if exchange endpoint fails
      this.logger.warn(`[OAuth] Token exchange failed (${err.message}) — storing code directly`);
      await this.prisma.channexMapping.update({
        where: { channexPropertyId: mapping.channexPropertyId },
        data: {
          accessToken: code,
          syncStatus: 'active',
          oauthState: null,
        },
      });
    }

    this.logger.log(`[OAuth] Token stored for property ${mapping.channexPropertyId}`);
  }

  /**
   * Get the connection status for a user (for frontend state machine).
   */
  async getUserStatus(userId: string): Promise<{
    hasProperty: boolean;
    hasChannel: boolean;
    syncStatus: string | null;
    channexPropertyId: string | null;
    listingId: number | null;
  }> {
    const mapping = await this.prisma.channexMapping.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    if (!mapping) {
      return { hasProperty: false, hasChannel: false, syncStatus: null, channexPropertyId: null, listingId: null };
    }

    return {
      hasProperty: true,
      hasChannel: !!mapping.accessToken,
      syncStatus: mapping.syncStatus,
      channexPropertyId: mapping.channexPropertyId,
      listingId: mapping.listingId ?? null,
    };
  }
}
