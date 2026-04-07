import {
  Controller, Get, Post, Body, HttpCode, HttpStatus, UseGuards, Logger, Headers,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiOkResponse } from '@nestjs/swagger';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { CurrentUser, CurrentUserData } from '../auth/decorators/current-user.decorator';
import { ChannexService } from './channex.service';

// ─── Authenticated routes ────────────────────────────────────────────────────

@ApiTags('Channex')
@Controller('channex')
@UseGuards(SupabaseAuthGuard)
@ApiBearerAuth()
export class ChannexController {
  private readonly logger = new Logger(ChannexController.name);

  constructor(private readonly channexService: ChannexService) {}

  @Get('status')
  @ApiOperation({ summary: 'Check Channex connection status' })
  async getStatus() {
    return this.channexService.getConnectionStatus();
  }

  @Get('properties')
  @ApiOperation({ summary: 'List all Channex properties' })
  @ApiOkResponse({ description: 'Returns all properties from Channex' })
  async listProperties() {
    const properties = await this.channexService.listProperties();
    return { success: true, properties, count: properties.length };
  }

  @Post('sync-properties')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sync Channex properties and save to database' })
  @ApiOkResponse({ description: 'Properties synced and saved' })
  async syncProperties(@CurrentUser() user: CurrentUserData) {
    const result = await this.channexService.syncAndSaveProperties(user.id);
    return { success: true, ...result };
  }
}

// ─── Webhook controller (no auth — called by Channex servers) ────────────────

@ApiTags('Channex Webhooks')
@Controller('webhooks/channex')
export class ChannexWebhookController {
  private readonly logger = new Logger(ChannexWebhookController.name);

  constructor(private readonly channexService: ChannexService) {}

  @Post('booking')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle Channex booking webhook events' })
  async handleBookingWebhook(
    @Body() payload: any,
    @Headers('x-channex-signature') signature?: string,
  ) {
    this.logger.log('Received Channex booking webhook');
    const result = await this.channexService.handleBookingWebhook(payload);
    return { success: true, ...result };
  }

  @Post('ari')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle Channex ARI change webhook events' })
  async handleAriWebhook(@Body() payload: any) {
    this.logger.log('Received Channex ARI webhook');
    return { success: true, received: true };
  }

  @Post('test')
  @HttpCode(HttpStatus.OK)
  async testWebhook(@Body() payload: any) {
    this.logger.log('Channex test webhook received');
    return { success: true, message: 'Webhook test successful', receivedAt: new Date().toISOString() };
  }
}
