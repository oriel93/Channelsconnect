/**
 * channex-sync.controller.ts
 * Exposes:
 *   POST /channex-sync/apply     — atomic price/availability change
 *   POST /channex-sync/drain     — manually drain the queue
 *   GET  /channex-sync/parity    — run a 10-sample parity check
 */

import { Controller, Post, Get, Body, Query, UseGuards } from '@nestjs/common';
import { ChannexSyncService, ARIUpdate } from './channex-sync.service';

// Swap in your actual auth guard
// import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('channex-sync')
// @UseGuards(JwtAuthGuard)
export class ChannexSyncController {
  constructor(private readonly syncService: ChannexSyncService) {}

  @Post('apply')
  async applyChange(
    @Body() body: { update: ARIUpdate; apiKey: string },
  ) {
    await this.syncService.applyChange(body.update, body.apiKey);
    return { success: true };
  }

  @Post('drain')
  async drainQueue(@Body() body: { apiKey?: string }) {
    await this.syncService.drainQueue(body.apiKey);
    return { success: true };
  }

  @Get('parity')
  async parityCheck(
    @Query('apiKey') apiKey: string,
    @Query('sample') sample?: string,
  ) {
    return this.syncService.runParityCheck(apiKey, sample ? parseInt(sample) : 10);
  }

  @Get('refresh-mappings')
  async refreshMappings(
    @Query('listingId') listingId: string,
    @Query('apiKey') apiKey: string,
  ) {
    await this.syncService.refreshMappingsForListing(parseInt(listingId), apiKey);
    return { success: true };
  }
}
