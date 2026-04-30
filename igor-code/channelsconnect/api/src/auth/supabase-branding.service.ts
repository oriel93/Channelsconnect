/**
 * SupabaseBrandingService
 *
 * Configures Supabase email branding on app startup using the Supabase
 * Management API (requires SUPABASE_SERVICE_ROLE_KEY env var).
 *
 * Sets:
 *   - Sender name: "Channels Connect"
 *   - Confirm email redirect: https://channelsconnect.com/AuthCallback
 *   - Password reset redirect: https://channelsconnect.com/ResetPassword
 *
 * If SUPABASE_SERVICE_ROLE_KEY is not present, this service is a no-op.
 *
 * SAFE: Does not touch Channex sync, webhook, or ARI logic.
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseBrandingService implements OnModuleInit {
  private readonly logger = new Logger(SupabaseBrandingService.name);

  async onModuleInit() {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl    = process.env.SUPABASE_URL;

    if (!serviceRoleKey || !supabaseUrl) {
      this.logger.warn(
        '[Branding] SUPABASE_SERVICE_ROLE_KEY not set — email branding not configured. ' +
        'Set it in Supabase Dashboard → Settings → API → service_role key, then add to SST secrets.',
      );
      return;
    }

    try {
      // Extract project ref from URL: https://<ref>.supabase.co
      const match = supabaseUrl.match(/https:\/\/([a-z0-9]+)\.supabase\.co/);
      if (!match) {
        this.logger.warn('[Branding] Could not parse project ref from SUPABASE_URL');
        return;
      }
      const projectRef = match[1];

      // Supabase Management API: PATCH /v1/projects/{ref}/config/auth
      const res = await fetch(
        `https://api.supabase.com/v1/projects/${projectRef}/config/auth`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${serviceRoleKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            mailer_sender: 'Channels Connect <noreply@channelsconnect.com>',
            site_url: 'https://channelsconnect.com',
            // Redirect URLs for email confirmations
            additional_redirect_urls: [
              'https://channelsconnect.com/AuthCallback',
              'https://channelsconnect.com/ResetPassword',
              'https://channelsconnect.com',
            ],
          }),
        },
      );

      if (res.ok) {
        this.logger.log('[Branding] ✅ Supabase email branding configured: Channels Connect');
      } else {
        const body = await res.text();
        this.logger.warn(
          `[Branding] Management API returned ${res.status}: ${body.slice(0, 200)}. ` +
          'Email branding may need to be set manually in Supabase Dashboard.',
        );
      }
    } catch (err: any) {
      // Non-fatal: branding is cosmetic, don't crash the app
      this.logger.warn(`[Branding] Could not configure email branding: ${err.message}`);
    }
  }
}
