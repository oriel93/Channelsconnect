/**
 * channex-sync.controller.ts
 *
 * POST /channex-sync/apply     — atomic price/availability change (event-driven)
 * POST /channex-sync/drain     — manually signal the queue drain
 * GET  /channex-sync/parity    — run a 10-sample parity check
 * GET  /channex-sync/refresh-mappings — re-fetch Channex IDs for a listing
 */

/**
 * channex-sync.controller.ts
 *
 * All endpoints are @Public() — auth is handled at the service / webhook
 * signature layer, not at the HTTP guard level.
 *
 * POST /channex-sync/apply           — atomic ARI change (event-driven push)
 * POST /channex-sync/drain           — manually trigger queue drain
 * GET  /channex-sync/parity          — 10-sample parity check
 * GET  /channex-sync/refresh-mappings — re-fetch Channex IDs for a listing
 */

import { Controller, Post, Get, Body, Query, Logger } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { ChannexSyncService, ARIUpdate } from './channex-sync.service';

@Controller('channex-sync')
export class ChannexSyncController {
  private readonly logger = new Logger(ChannexSyncController.name);

  constructor(private readonly syncService: ChannexSyncService) {}

  /**
   * Called by the PMS UI whenever a user changes a price or availability.
   * Writes to the local DB atomically, then triggers an event-driven push to
   * Channex within the 500 ms debounce window — no cron delay.
   *
   * Batching guarantee: 100 consecutive price updates for the same property
   * arriving within 500 ms produce exactly 1 POST /ari/bulk_update call.
   */
  @Public()
  @Post('apply')
  async applyChange(@Body() body: { update: ARIUpdate }) {
    const { listingId, date } = body.update;
    this.logger.log(
      `[Batching] applyChange received — listing=${listingId} date=${date} — debounce window started`,
    );
    await this.syncService.applyChange(body.update);
    return { success: true, queued: true };
  }

  /**
   * Manually signal a queue drain (admin tooling / cert testing).
   * In production the drain is triggered automatically by every applyChange().
   */
  @Public()
  @Post('drain')
  async drainQueue() {
    this.logger.log('[Queue] Manual drain triggered via /channex-sync/drain');
    await this.syncService.triggerDrain();
    return { success: true, triggered: true };
  }

  /**
   * Compare a random sample of local Rate rows against live Channex values.
   */
  @Public()
  @Get('parity')
  async parityCheck(
    @Query('apiKey') apiKey: string,
    @Query('sample') sample?: string,
  ) {
    const sampleSize = sample ? parseInt(sample, 10) : 10;
    this.logger.log(`[Parity] Running parity check — sample=${sampleSize}`);
    return this.syncService.runParityCheck(apiKey, sampleSize);
  }

  /**
   * Trigger a background mapping refresh for a single listing.
   */
  @Public()
  @Get('refresh-mappings')
  async refreshMappings(@Query('listingId') listingId: string) {
    const id = parseInt(listingId, 10);
    this.logger.log(`[Mapping] Refresh triggered for listing=${id}`);
    await this.syncService.refreshMappingsForListing(id);
    return { success: true };
  }
}
