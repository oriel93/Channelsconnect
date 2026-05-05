/**
 * channex-sync.module.ts
 *
 * Wires:
 *  - EventEmitterModule (NestJS EventEmitter2) — required for event-driven queue
 *  - ChannexSyncService               — event-driven sync engine
 *  - ChannexSyncController            — /channex-sync/* endpoints
 *  - ChannexBookingWebhookController  — POST /connect/webhook/booking-revision
 *  - ChannexHttpClient (via ChannexServicesModule)
 *
 * ScheduleModule is NOT imported here — the @Cron decorator has been removed.
 * EventEmitter2 replaces it for zero-latency, event-driven queue draining.
 */

import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ChannexSyncService } from './channex-sync.service';
import { ChannexSyncController } from './channex-sync.controller';
import { ChannexBookingWebhookController } from './channex-booking-webhook.controller';
import { ChannexBookingFeedService } from './channex-booking-feed.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ChannexServicesModule } from '../services/channex/channex-services.module';

@Module({
  imports: [
    PrismaModule,
    ChannexServicesModule, // provides ChannexHttpClient
    ScheduleModule.forRoot(), // required for @Cron in ChannexBookingFeedService
  ],
  providers: [
    ChannexSyncService,
    ChannexBookingFeedService, // 15-min feed polling (cert requirement)
  ],
  controllers: [
    ChannexSyncController,
    ChannexBookingWebhookController,
  ],
  exports: [ChannexSyncService],
})
export class ChannexSyncModule {}
