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
} from '@nestjs/common';
import { ChannexOnboardingService, OnboardPropertyDto } from './channex-onboarding.service';
import { ChannexDeepSyncService, SyncProgress } from './channex-deep-sync.service';
import { ChannexHttpClient } from './channex-http.client';
import { SupabaseAuthGuard } from '../../auth/guards/supabase-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Public } from '../../auth/decorators/public.decorator';

@Controller('connect')
@UseGuards(SupabaseAuthGuard)
export class ChannexWhitelabelController {
  private readonly logger = new Logger(ChannexWhitelabelController.name);
  private readonly masterKey = process.env.CHANNEX_API_KEY || '';

  constructor(
    private readonly onboarding: ChannexOnboardingService,
    private readonly deepSync: ChannexDeepSyncService,
    private readonly http: ChannexHttpClient,
  ) {}

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

  // ── OTA OAuth Bridge ──────────────────────────────────────────────────

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

  /** PMS Cert Test #11 — Booking Acknowledge */
  @Post('booking/:bookingId/ack')
  async acknowledgeBooking(@Param('bookingId') bookingId: string) {
    this.logger.log(`[Cert#11] Acknowledging booking ${bookingId}`);
    const res = await this.http.post<any>(`/bookings/${bookingId}/ack`, this.masterKey, {});
    this.logger.log(`[Cert#11] ACK response: ${JSON.stringify(res)}`);
    return { success: true, message: 'Booking acknowledged.', data: res };
  }

  /** PMS Cert — Full 500-day ARI (EXACTLY 2 API calls) */
  @Post('ari/full')
  async pushFullARI(@Body() body: any) {
    const taskIds = await this.deepSync.pushCertificationARI(
      body.propertyId,
      body.roomTypeId,
      body.ratePlanId,
      body.rate ?? 100,
      body.availability ?? 1,
      body.minStay ?? 1,
      body.listingId ?? undefined, // pass listingId for varied DB-backed rates
    );
    return {
      success: true,
      message: `500-day ARI sent in ${taskIds.length} call(s). Task IDs logged.`,
      taskIds,
      callCount: taskIds.length,
    };
  }

  /** PMS Cert — Single/Multi date range update */
  @Post('ari/update')
  async updateARI(@Body() body: any) {
    const taskId = await this.deepSync.updateARI(
      body.propertyId,
      body.roomTypeId,
      body.ratePlanId,
      body.dateFrom,
      body.dateTo,
      { rate: body.rate, minStay: body.minStay, stopSell: body.stopSell, availability: body.availability },
    );
    return { success: true, message: 'ARI updated.', taskId: taskId || null };
  }
}
