/**
 * channex-whitelabel.controller.ts
 * All user-facing branding is "Channels Connect." No "Channex" in responses.
 *
 * Routes:
 *   POST   /connect/onboard            — PM property setup
 *   GET    /connect/status             — get PM connection state
 *   GET    /connect/oauth-link         — get branded OTA connect URL
 *   GET    /connect/oauth-callback     — OTA OAuth return (Public)
 *   POST   /connect/sync               — start full deep sync
 *   GET    /connect/sync/:id/progress  — poll sync progress
 *   POST   /connect/booking/:id/ack    — PMS Cert #11: booking acknowledge
 *   POST   /connect/ari/full           — PMS Cert: 500-day ARI push (2 calls)
 *   POST   /connect/ari/update         — PMS Cert: single/multi update
 */
import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  Req,
  Res,
  UseGuards,
  Logger,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ChannexOnboardingService, OnboardPropertyDto } from './channex-onboarding.service';
import { ChannexDeepSyncService, SyncProgress } from './channex-deep-sync.service';
import { ChannexContentService } from './channex-content.service';
import { ChannexHttpClient } from './channex-http.client';
import { PrismaService } from '../../prisma/prisma.service';
import { SupabaseAuthGuard } from '../../auth/guards/supabase-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Public } from '../../auth/decorators/public.decorator';
import { AirbnbImportService } from './airbnb-import.service';
import { ParseIntPipe } from '@nestjs/common';

@Controller('connect')
@UseGuards(SupabaseAuthGuard)
export class ChannexWhitelabelController {
  private readonly logger = new Logger(ChannexWhitelabelController.name);
  private readonly masterKey = process.env.CHANNEX_API_KEY || '';

  constructor(
    private readonly onboarding: ChannexOnboardingService,
    private readonly deepSync: ChannexDeepSyncService,
    private readonly http: ChannexHttpClient,
    private readonly prisma: PrismaService,
    private readonly contentService: ChannexContentService,
    private readonly airbnbImport: AirbnbImportService,
  ) {}

  // ── Airbnb (Channel API — the real one, not the iframe) ───────────────────
  // POST /connect/airbnb/start — returns Airbnb OAuth URL for redirect.
  //   The user goes to airbnb.com, authorizes, Channex creates the channel,
  //   and Channex redirects to <FRONTEND_URL>/AirbnbCallback?channel_id=...&token=...
  @Post('airbnb/start')
  @HttpCode(HttpStatus.OK)
  async airbnbStart(@CurrentUser() user: any) {
    const appBaseUrl = process.env.FRONTEND_URL || 'https://channelsconnect.com';
    const result = await this.airbnbImport.start({
      userId: user.id,
      email:  user?.email,
      appBaseUrl,
    });
    return { success: true, data: result };
  }

  // POST /connect/airbnb/callback — called by the frontend /AirbnbCallback page
  //   after Channex bounces the user back. Kicks off the import in background.
  @Post('airbnb/callback')
  @Public() // The user may not have a fresh session right after the OAuth bounce.
  @HttpCode(HttpStatus.OK)
  async airbnbCallback(@Body() body: { channelId?: string; token?: string }) {
    if (!body?.channelId || !body?.token) {
      throw new BadRequestException('channelId and token are required');
    }
    return this.airbnbImport.handleCallback({
      channelId: body.channelId,
      token: body.token,
    });
  }

  // GET /connect/airbnb/import_status?token=... — polled by the frontend wizard
  @Get('airbnb/import_status')
  @Public()
  async airbnbImportStatus(@Query('token') token: string) {
    if (!token) throw new BadRequestException('token required');
    const state = this.airbnbImport.getStatus(token);
    if (!state) {
      return { success: false, status: 'unknown', message: 'Import not found or expired' };
    }
    return { success: true, ...state };
  }

  // ── Onboarding ────────────────────────────────────────────────────────

  @Post('onboard')
  async onboard(@CurrentUser() user: any, @Body() body: any, @Req() req: any) {
    // User must be authenticated — userId comes from validated JWT
    const userId = user?.id;
    const email = user?.email || body.email || '';
    const result = await this.onboarding.onboardUser(userId, {
      title: body.propertyTitle || body.title || `${email.split('@')[0] || 'My'}'s Property`,
      currency: body.currency || 'USD',
      email,
      country: body.country || 'US',
      city: body.city || '',
      address: body.address || '',
      zipCode: body.zipCode || body.zip_code,
      timezone: body.timezone,
    } as OnboardPropertyDto);
    // Normalize the response so the frontend success gate can always check `data.id`
    return {
      success: true,
      message: 'Property connected successfully to Channels Connect.',
      data: {
        id: result.listingId ?? result.channexPropertyId,  // frontend checks this first
        listingId: result.listingId ?? null,
        channexPropertyId: result.channexPropertyId,
      },
    };
  }

  // ── Status (frontend state machine) ──────────────────────────────────

  /**
   * Public: returns safe defaults when not authenticated.
   * Authenticated users get their real status.
   */
  @Public()
  @Get('status')
  async getStatus(@CurrentUser() user: any) {
    if (!user?.id) {
      return { success: true, data: { hasProperty: false, hasChannel: false, syncStatus: null, channexPropertyId: null, listingId: null } };
    }
    const status = await this.onboarding.getUserStatus(user.id);
    return { success: true, data: status };
  }

  // ── Airbnb iFrame Connect ──────────────────────────────────────────────

  /**
   * POST /connect/airbnb/init
   * Step 1 of Airbnb connect:
   *   1. Create a blank Channex property (Airbnb will overwrite the name after OAuth)
   *   2. Generate a one_time_token scoped to that property
   *   3. Return the iFrame URL (filtered to ABB only, headless — no Channex branding)
   */
  @Post('airbnb/init')
  @HttpCode(HttpStatus.OK)
  async airbnbInit(@CurrentUser() user: any) {
    const email = user?.email || `user+${user?.id}@channelsconnect.com`;

    // ✨ Idempotency: if the user already has a pending Airbnb-connect listing whose
    //    OAuth hasn't completed yet (still 'pending_airbnb_connect'), REUSE it. Avoids
    //    spawning a fresh Channex property + DB listing every time the user clicks the
    //    button (which used to happen on page reload, double-click, etc).
    const existingPending = await this.prisma.listing.findFirst({
      where: {
        userId:       user.id,
        source:       'airbnb_oauth',
        reviewStatus: 'pending_airbnb_connect',
      },
      include: { channexMappings: { take: 1, orderBy: { createdAt: 'desc' } } },
      orderBy: { createdAt: 'desc' },
    });
    if (existingPending?.channexMappings?.[0]?.channexPropertyId) {
      const channexPropertyId = existingPending.channexMappings[0].channexPropertyId;

      // Before reusing, verify the property still exists on Channex. If we (or the
      // user) cleaned it up out-of-band, the one_time_token mint will 500. Probe
      // first; if it's gone, drop the stale local rows and fall through to fresh-build.
      let propertyStillExists = false;
      try {
        await this.http.get<any>(`/properties/${channexPropertyId}`, this.masterKey);
        propertyStillExists = true;
      } catch (err: any) {
        const status = err?.response?.status ?? err?.status;
        if (status === 404 || status === 410) {
          this.logger.warn(
            `[Airbnb/init] Pending listingId=${existingPending.id} points at deleted ` +
              `Channex property ${channexPropertyId}; cleaning up and rebuilding.`,
          );
          // Delete the orphan local rows (mapping FK first, then listing).
          await this.prisma.channexMapping.deleteMany({ where: { listingId: existingPending.id } });
          await this.prisma.listing.delete({ where: { id: existingPending.id } });
        } else {
          this.logger.warn(
            `[Airbnb/init] Channex property probe failed (non-404): ${err?.message ?? err}. ` +
              `Continuing with reuse path anyway.`,
          );
          propertyStillExists = true; // probe failure != property gone; let the token call try
        }
      }

      if (propertyStillExists) {
        this.logger.log(
          `[Airbnb/init] Reusing pending listingId=${existingPending.id} ` +
            `propertyId=${channexPropertyId} for user=${user.id}`,
        );
        // Re-mint the one-time token (they're short-lived) and rebuild iframe URL.
        const tokenRes = await this.http.post<any>('/auth/one_time_token', this.masterKey, {
          one_time_token: {
            property_id: channexPropertyId,
            group_id:    process.env.CHANNEX_GROUP_ID || undefined,
            username:    email,
          },
        });
        const oneTimeToken = tokenRes?.data?.token;
        if (!oneTimeToken) throw new Error('Failed to generate one-time token (reuse path)');
        const apiBase = process.env.CHANNEX_BASE || process.env.CHANNEX_BASE_URL || 'https://app.channex.io/api/v1';
        const channexBase = apiBase.replace(/\/api\/v1\/?$/, '').replace(/\/+$/, '');
        const iframeUrl =
          `${channexBase}/auth/exchange` +
          `?oauth_session_key=${oneTimeToken}` +
          `&app_mode=headless` +
          `&redirect_to=/channels` +
          `&property_id=${channexPropertyId}` +
          `&channels=ABB`;
        return {
          success: true,
          data: { iframeUrl, listingId: existingPending.id, channexPropertyId, reused: true },
        };
      }
      // Else: fall through and build fresh below.
    }

    // 1. Create a blank Channex property — Airbnb will populate the real name after OAuth
    let channexPropertyId: string;
    try {
      const propRes = await this.http.post<any>('/properties', this.masterKey, {
        property: {
          title:    'New Property',
          currency: 'USD',
          email,
          country:  'US',
          timezone: 'America/New_York',
        },
      });
      channexPropertyId = propRes?.data?.id;
      if (!channexPropertyId) throw new Error('No property ID returned');
    } catch (err: any) {
      this.logger.error(`[Airbnb/init] Property create failed: ${err.message}`);
      throw err;
    }

    // 2. Save a pending listing in our DB so we can track it
    const listing = await this.prisma.listing.create({
      data: {
        userId:       user.id,
        title:        'Airbnb Import — pending',
        source:       'airbnb_oauth',
        isActive:     false,
        reviewStatus: 'pending_airbnb_connect',
        currency:     'USD',
        minNights:    1,
      },
    });

    // 3. Save the channexPropertyId mapping immediately (partial — harvest fills the rest)
    await this.prisma.channexMapping.create({
      data: {
        userId:            user.id,
        listingId:         listing.id,
        channexPropertyId,
        syncStatus:        'pending_airbnb_connect',
      },
    });

    // 4. Generate one_time_token for the Channex iFrame
    const tokenRes = await this.http.post<any>('/auth/one_time_token', this.masterKey, {
      one_time_token: {
        property_id: channexPropertyId,
        group_id:    process.env.CHANNEX_GROUP_ID || undefined,
        username:    email,
      },
    });
    const oneTimeToken = tokenRes?.data?.token;
    if (!oneTimeToken) throw new Error('Failed to generate one-time token');

    // 5. Build the iFrame URL — headless, ABB-only filter, no Channex branding shown.
    // CHANNEX_BASE drives the API host (...channex.io/api/v1). The iFrame lives at the
    // host root /auth/exchange (no /api/v1), so we strip the path off CHANNEX_BASE.
    // Falls back to production app.channex.io when neither env var is set.
    const apiBase = process.env.CHANNEX_BASE || process.env.CHANNEX_BASE_URL || 'https://app.channex.io/api/v1';
    const channexBase = apiBase.replace(/\/api\/v1\/?$/, '').replace(/\/+$/, '');
    const iframeUrl =
      `${channexBase}/auth/exchange` +
      `?oauth_session_key=${oneTimeToken}` +
      `&app_mode=headless` +
      `&redirect_to=/channels` +
      `&property_id=${channexPropertyId}` +
      `&channels=ABB`;

    this.logger.log(
      `[Airbnb/init] user=${user.id} listingId=${listing.id} propertyId=${channexPropertyId}`,
    );

    return {
      success: true,
      data: { listingId: listing.id, channexPropertyId, iframeUrl },
    };
  }

  /**
   * POST /connect/airbnb/harvest
   * Step 2 — called after the user completes Airbnb OAuth in the iFrame.
   * Reads back property + room type + photo data that Airbnb pushed to Channex,
   * then overwrites our DB listing with the real Airbnb content.
   * Sets status to pending_admin_review so admin can push to other channels.
   */
  @Post('airbnb/harvest')
  @HttpCode(HttpStatus.OK)
  async airbnbHarvest(
    @CurrentUser() user: any,
    @Body() body: { listingId: number; channexPropertyId: string },
  ) {
    const { listingId, channexPropertyId } = body;
    if (!listingId || !channexPropertyId) {
      return { success: false, message: 'listingId and channexPropertyId are required' };
    }

    // 1. Fetch property data Airbnb has now populated in Channex
    let propData: any = {};
    try {
      const propRes = await this.http.get<any>(`/properties/${channexPropertyId}`, this.masterKey);
      propData = propRes?.data?.attributes || propRes?.data || {};
    } catch (err: any) {
      this.logger.warn(`[Airbnb/harvest] Property fetch failed: ${err.message}`);
    }

    // 2. Fetch room types
    let roomTypes: any[] = [];
    try {
      const rtRes = await this.http.get<any>(
        `/room_types?filter[property_id]=${channexPropertyId}`,
        this.masterKey,
      );
      roomTypes = rtRes?.data || [];
    } catch (err: any) {
      this.logger.warn(`[Airbnb/harvest] Room types fetch failed: ${err.message}`);
    }

    // 3. Fetch photos Channex got from Airbnb
    let photos: string[] = [];
    try {
      const photoRes = await this.http.get<any>(
        `/photos?filter[property_id]=${channexPropertyId}`,
        this.masterKey,
      );
      photos = (photoRes?.data || [])
        .map((p: any) => p?.attributes?.url || p?.url)
        .filter(Boolean);
    } catch (err: any) {
      this.logger.warn(`[Airbnb/harvest] Photos fetch failed: ${err.message}`);
    }

    // 4. Build update from harvested Airbnb data
    const firstRoom = roomTypes[0]?.attributes || {};
    const updateData: Record<string, any> = {
      title:        propData.title     || 'Airbnb Property',
      address:      propData.address   || null,
      city:         propData.city      || null,
      country:      propData.country   || null,
      postalCode:   propData.zip_code  || null,
      latitude:     propData.latitude  ? parseFloat(propData.latitude)  : null,
      longitude:    propData.longitude ? parseFloat(propData.longitude) : null,
      currency:     propData.currency  || 'USD',
      description:  propData.content?.description || null,
      maxGuests:    firstRoom.occ_adults || firstRoom.default_occupancy || null,
      bedrooms:     firstRoom.count_of_rooms || null,
      reviewStatus: 'pending_admin_review',
      isActive:     false,
    };

    await this.prisma.listing.update({ where: { id: Number(listingId) }, data: updateData });

    // 5. Update mapping status
    await this.prisma.channexMapping.updateMany({
      where: { listingId: Number(listingId), channexPropertyId },
      data:  { syncStatus: 'pending_admin_review', lastSyncAt: new Date() },
    });

    this.logger.log(
      `[Airbnb/harvest] listingId=${listingId} title="${updateData.title}" ` +
      `rooms=${roomTypes.length} photos=${photos.length}`,
    );

    return {
      success: true,
      message: 'Your Airbnb listing has been imported successfully.',
      data: {
        listingId,
        title:   updateData.title,
        rooms:   roomTypes.length,
        photos:  photos.length,
        status:  'pending_admin_review',
      },
    };
  }

  /**
   * GET /connect/airbnb/status?channexPropertyId=...
   *
   * Frontend polls this endpoint after opening the OAuth iframe. The webhook
   * (ChannexChannelWebhookController) handles harvest in the background when
   * Channex fires `activate_channel`; this endpoint reports the latest state
   * of the local DB so the wizard knows when to advance.
   *
   * States:
   *   - waiting:   no listings yet; iframe still in OAuth/mapping
   *   - harvesting: webhook has fired but we're mid-update (rare timing window)
   *   - ready:     at least one listing has been harvested with content
   *   - failed:    something went wrong (mapping deleted, etc)
   */
  @Get('airbnb/status')
  async airbnbStatus(
    @CurrentUser() user: any,
    @Query('channexPropertyId') channexPropertyId: string,
  ) {
    if (!channexPropertyId) {
      return { success: false, status: 'failed', message: 'channexPropertyId required' };
    }

    // Every listing harvested for this Channex property by either the
    // webhook-driven path (preferred) or the manual harvest call.
    const listings = await this.prisma.listing.findMany({
      where: {
        userId: user.id,
        channexPropertyId,
      },
      select: {
        id: true,
        title: true,
        reviewStatus: true,
        bedrooms: true,
        maxGuests: true,
        city: true,
        country: true,
      },
      orderBy: { id: 'asc' },
    });

    // 'pending_airbnb_connect' = still waiting on user OAuth.
    // 'pending_admin_review' = harvested, content populated, ready for next step.
    const harvested = listings.filter((l) => l.reviewStatus !== 'pending_airbnb_connect');
    const stillPending = listings.filter((l) => l.reviewStatus === 'pending_airbnb_connect');

    let status: 'waiting' | 'harvesting' | 'ready' | 'failed';
    if (harvested.length === 0 && stillPending.length === 0) {
      status = 'failed'; // mapping vanished mid-flow
    } else if (harvested.length === 0) {
      status = 'waiting';
    } else if (stillPending.length > 0) {
      status = 'harvesting'; // some done, some pending
    } else {
      status = 'ready';
    }

    return {
      success: true,
      status,
      listings: harvested,
      pendingCount: stillPending.length,
    };
  }

  // ── OTA OAuth Bridge (legacy) ──────────────────────────────────────────

  @Get('oauth-link')
  async getOAuthLink(
    @CurrentUser() user: any,
    @Query('channel') channel: 'airbnb' | 'booking_com' = 'airbnb',
  ) {
    const result = await this.onboarding.generateOAuthLink(user.id, channel);
    return { success: true, data: result };
  }

  @Public()
  @Get('oauth-callback')
  async oauthCallback(
    @Query('state') state: string,
    @Query('code') code: string,
    @Query('returnUrl') returnUrl: string,
    @Res({ passthrough: false }) res: any,
  ) {
    // Process the OAuth token exchange first
    let success = false;
    let errorMsg = '';
    if (!state || !code) {
      errorMsg = 'Missing state or code parameters.';
    } else {
      try {
        await this.onboarding.handleOAuthCallback(state, code);
        success = true;
      } catch (err: any) {
        errorMsg = err.message || 'OAuth callback failed.';
        this.logger.error(`[OAuth] Callback error: ${err.message}`);
      }
    }

    // If returnUrl is provided (full-page redirect fallback flow),
    // redirect back to the app with a query param
    if (returnUrl) {
      const safe = returnUrl.startsWith('https://channelsconnect.com') ||
                   returnUrl.startsWith('http://localhost');
      if (safe) {
        const sep = returnUrl.includes('?') ? '&' : '?';
        return res.redirect(`${returnUrl}${sep}oauth=${success ? 'success' : 'error'}`);
      }
    }

    // Default: return an HTML page that sends postMessage to opener and closes.
    // This is the popup flow — the parent window listens for { type: 'oauth_success' }.
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Channels Connect — ${success ? 'Connected!' : 'Error'}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
           display: flex; align-items: center; justify-content: center;
           height: 100vh; margin: 0; background: #f9fafb; }
    .card { background: white; border-radius: 16px; padding: 40px 48px;
            box-shadow: 0 4px 24px rgba(0,0,0,.10); text-align: center; max-width: 360px; }
    .icon { font-size: 3rem; margin-bottom: 16px; }
    h2 { margin: 0 0 8px; color: #111827; font-size: 1.25rem; }
    p { margin: 0; color: #6b7280; font-size: .9rem; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${success ? '✅' : '❌'}</div>
    <h2>${success ? 'Account Connected!' : 'Connection Failed'}</h2>
    <p>${success
      ? 'Your Airbnb account has been linked. This window will close automatically.'
      : `An error occurred: ${errorMsg} Please close this window and try again.`
    }</p>
  </div>
  <script>
    // Notify the parent window via postMessage (popup flow)
    (function() {
      try {
        const msg = ${success
          ? '{ type: \'oauth_success\', channelsConnectAuth: \'success\', success: true }'
          : '{ type: \'oauth_error\', success: false }'
        };
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage(msg, '*');
        }
      } catch(e) {}
      // Auto-close after a short delay so the user can read the message
      setTimeout(() => { try { window.close(); } catch(e) {} }, ${success ? 1500 : 4000});
    })();
  </script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN'); // allow our own popup but block third-party embeds
    res.status(200).send(html);
  }

  // ── Deep Sync ─────────────────────────────────────────────────────────

  @Post('sync')
  @HttpCode(HttpStatus.ACCEPTED)
  async startSync(@CurrentUser() user: any) {
    const result = await this.deepSync.startFullSync(user.id);
    return { success: true, message: 'Sync started.', data: result };
  }

  @Get('sync/:id/progress')
  async getSyncProgress(@Param('id') id: string): Promise<{ success: boolean; data: SyncProgress | null | object }> {
    const progress = this.deepSync.getProgress(parseInt(id, 10));
    return { success: true, data: progress ?? { phase: 'pending', done: 0, total: 0, taskIds: [], errors: [] } };
  }

  // ── PMS Certification Endpoints ───────────────────────────────────────

  /**
   * PMS Cert helper — returns the cert property's IDs from the DB.
   * Called by the CertDashboard to self-populate without hardcoding.
   * Uses CERT_USER_ID env var (set to the cert Supabase user).
   */
  @Public()
  @Get('cert/property-info')
  async getCertPropertyInfo() {
    const certUserId = process.env.CERT_USER_ID || '1d63e070-dbff-48b8-ba2a-be8ba3a41ae8';
    const mappings = await this.prisma.channexMapping.findMany({
      where: { userId: certUserId, syncStatus: 'active' },
      include: { listing: { select: { id: true, title: true } } },
      orderBy: { createdAt: 'asc' },
    });
    if (!mappings.length) {
      return { success: false, message: 'No active mapping for cert user' };
    }
    const first = mappings[0];
    return {
      success: true,
      data: {
        listingId: first.listingId,
        listingTitle: first.listing?.title,
        propertyId: first.channexPropertyId,
        // Legacy single-combo fields (for T1 full sync)
        roomTypeId: first.channexRoomTypeId,
        ratePlanId: first.channexRatePlanId,
        // All room type + rate plan combos for multi-room cert tests
        combos: mappings.map(m => ({
          roomTypeId: m.channexRoomTypeId,
          ratePlanId: m.channexRatePlanId,
        })),
      },
    };
  }

  /** PMS Cert Test #11-T14 — Booking Revision Acknowledge
   * Channex requires POST /booking_revisions/:revision_id/ack
   * The param here is the booking_revision UUID (not the booking UUID).
   * The webhook controller auto-ACKs on receipt; this endpoint is the
   * manual trigger used by the Cert Dashboard to prove ACK capability.
   */
  @Public()
  @Post('booking/:revisionId/ack')
  async acknowledgeBooking(@Param('revisionId') revisionId: string) {
    this.logger.log(`[Cert#11] ACKing booking_revision ${revisionId}`);
    // Correct endpoint: /booking_revisions/:id/ack  (NOT /bookings/:id/ack)
    const res = await this.http.post<any>(`/booking_revisions/${revisionId}/ack`, this.masterKey, {});
    this.logger.log(`[Cert#11] ACK response: ${JSON.stringify(res)}`);
    return { success: true, message: 'Booking revision acknowledged.', data: res };
  }

  /** PMS Cert — Full 500-day ARI across ALL room type + rate plan combos */
  @Public()
  @Post('ari/full')
  async pushFullARI(@Body() body: any) {
    /**
     * T1 Full Sync — Channex cert requires EXACTLY 2 API calls total:
     *   Call 1: POST /availability  — ALL room types × 500 days
     *   Call 2: POST /restrictions  — ALL rate plans × 500 days
     *
     * Body shape:
     * {
     *   propertyId: string,
     *   listingId:  number,
     *   roomTypes:  Array<{ roomTypeId: string }>,          // ALL room types
     *   ratePlans:  Array<{ roomTypeId: string, ratePlanId: string }> // ALL rate plans
     * }
     *
     * Legacy: if body.combos is provided (old shape), derive roomTypes/ratePlans from it.
     */
    const propertyId: string = body.propertyId;
    const listingId: number  = body.listingId ?? 35;

    // Normalise room types and rate plans from either new shape or legacy combos
    let roomTypes: Array<{ roomTypeId: string }>;
    let ratePlans: Array<{ roomTypeId: string; ratePlanId: string }>;

    if (body.roomTypes && body.ratePlans) {
      roomTypes = body.roomTypes;
      ratePlans = body.ratePlans;
    } else if (Array.isArray(body.combos)) {
      // Legacy combos shape: deduplicate room types
      const seenRooms = new Set<string>();
      roomTypes = [];
      ratePlans = [];
      for (const c of body.combos) {
        if (!c.roomTypeId || !c.ratePlanId) continue;
        if (!seenRooms.has(c.roomTypeId)) {
          seenRooms.add(c.roomTypeId);
          roomTypes.push({ roomTypeId: c.roomTypeId });
        }
        ratePlans.push({ roomTypeId: c.roomTypeId, ratePlanId: c.ratePlanId });
      }
    } else {
      // Minimal fallback: single combo from flat body fields
      roomTypes = [{ roomTypeId: body.roomTypeId }];
      ratePlans = [{ roomTypeId: body.roomTypeId, ratePlanId: body.ratePlanId }];
    }

    // Single call — produces exactly 2 Channex API requests
    const taskIds = await this.deepSync.pushFullPropertyARI(
      propertyId,
      roomTypes,
      ratePlans,
      listingId,
    );

    return {
      success:   true,
      message:   `T1 Full 500-day ARI sent. Exactly 2 API calls: availability (${roomTypes.length} room type${roomTypes.length === 1 ? '' : 's'}) + restrictions (${ratePlans.length} rate plan${ratePlans.length === 1 ? '' : 's'}).`,
      taskIds,
      callCount: taskIds.length,
      // For the cert form — clearly labelled
      availabilityTaskId:  taskIds[0] ?? null,
      restrictionsTaskId:  taskIds[1] ?? null,
    };
  }

  /** PMS Cert — Single/Multi date range update (single room/rate combo) */
  @Public()
  @Post('ari/update')
  async updateARI(@Body() body: any) {
    const taskId = await this.deepSync.updateARI(
      body.propertyId,
      body.roomTypeId,
      body.ratePlanId,
      body.dateFrom,
      body.dateTo,
      {
        rate:              body.rate,
        minStay:           body.minStay,
        maxStay:           body.maxStay,
        stopSell:          body.stopSell,
        closedToArrival:   body.closedToArrival,
        closedToDeparture: body.closedToDeparture,
        availability:      body.availability,
      },
    );
    return { success: true, message: 'ARI updated.', taskId: taskId || null };
  }

  /**
   * PMS Cert — Batch update: multiple room/rate combos in a SINGLE Channex API call.
   * Used for cert tests 3, 7, 8 that require updating multiple rate plans at once.
   * Body: { propertyId, entries: [{roomTypeId, ratePlanId, dateFrom, dateTo, rate?, minStay?, ...}] }
   */
  @Public()
  @Post('ari/batch')
  async updateARIBatch(@Body() body: any) {
    const taskId = await this.deepSync.updateARIBatch(
      body.propertyId,
      body.entries,
    );
    return { success: true, message: 'Batch ARI update sent in 1 API call.', taskId: taskId || null };
  }

  // ── Phase 4: Content Push (STRICTLY SEPARATED FROM ARI) ───────────────────

  /**
   * POST /connect/content/push-property
   * Pushes a listing's content (title, address, room type) to Channex.
   * Auth required. SAFE: no ARI batching, no channex-sync contact.
   */
  @Post('content/push-property')
  async pushPropertyContent(
    @CurrentUser() user: any,
    @Body() body: { listingId: number },
  ) {
    const listingId = Number(body?.listingId);
    if (!listingId || isNaN(listingId)) {
      return { success: false, message: 'listingId (number) is required' };
    }
    this.logger.log(`[Content] Push request from user ${user?.id} for listing ${listingId}`);
    const result = await this.contentService.syncListing(listingId);
    const success = result.outcome === 'synced' || result.outcome === 'partial_sync';
    return {
      success,
      outcome: result.outcome,
      message: result.errorMessage ?? 'Property content synced.',
      data: {
        propertyId:   result.channexPropertyId,
        roomTypeId:   result.channexRoomTypeId,
        operation:    result.operation,
      },
    };
  }
}
