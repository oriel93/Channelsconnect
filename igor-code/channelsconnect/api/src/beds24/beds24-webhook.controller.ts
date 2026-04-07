import { Controller, Post, Body, HttpCode, HttpStatus, Logger, Headers, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiHeader } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Beds24Service } from './beds24.service';

@ApiTags('Beds24 Webhooks')
@Controller('webhooks/beds24')
export class Beds24WebhookController {
  private readonly logger = new Logger(Beds24WebhookController.name);
  private readonly webhookSecret: string;

  constructor(
    private readonly beds24Service: Beds24Service,
    private configService: ConfigService,
  ) {
    this.webhookSecret = this.configService.get<string>('BEDS24_WEBHOOK_SECRET') || '';
  }

  /**
   * Validate webhook signature if secret is configured
   */
  private validateWebhook(signature: string | undefined): void {
    // If no secret configured, skip validation (for development)
    if (!this.webhookSecret) {
      this.logger.warn('BEDS24_WEBHOOK_SECRET not configured - skipping signature validation');
      return;
    }

    if (!signature || signature !== this.webhookSecret) {
      this.logger.error('Invalid webhook signature');
      throw new UnauthorizedException('Invalid webhook signature');
    }
  }

  @Post('booking')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle Beds24 booking webhook events' })
  @ApiOkResponse({ description: 'Webhook processed successfully' })
  @ApiHeader({ name: 'x-beds24-signature', required: false, description: 'Webhook signature for verification' })
  async handleBookingWebhook(
    @Body() payload: {
      event: string;
      bookingId: number;
      propertyId: number;
      roomId: number;
      timestamp?: string;
      data?: any;
    },
    @Headers('x-beds24-signature') signature?: string,
  ) {
    this.logger.log(`Received Beds24 booking webhook: ${payload.event} for booking ${payload.bookingId}`);

    // Validate webhook signature
    this.validateWebhook(signature);

    try {
      const result = await this.beds24Service.handleBookingWebhook(payload);
      return {
        success: true,
        ...result,
      };
    } catch (error) {
      this.logger.error(`Failed to process booking webhook: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Post('test')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Test endpoint for webhook connectivity' })
  @ApiOkResponse({ description: 'Test successful' })
  async testWebhook(
    @Body() payload: any,
  ) {
    this.logger.log('Received test webhook');
    this.logger.log(`Payload: ${JSON.stringify(payload)}`);

    return {
      success: true,
      message: 'Webhook test successful',
      receivedAt: new Date().toISOString(),
      payload,
    };
  }
}
