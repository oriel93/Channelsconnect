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
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ChannexSyncService } from './channex-sync.service';
import { ChannexSyncController } from './channex-sync.controller';
import { ChannexBookingWebhookController } from './channex-booking-webhook.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ChannexServicesModule } from '../services/channex/channex-services.module';

@Module({
  imports: [
    PrismaModule,
    ChannexServicesModule, // provides ChannexHttpClient
    // EventEmitterModule.forRoot() should be registered once in AppModule.
    // If it is NOT already registered there, uncomment the next line:
    // EventEmitterModule.forRoot({ wildcard: false, delimiter: '.' }),
  ],
  providers: [ChannexSyncService],
  controllers: [
    ChannexSyncController,
    ChannexBookingWebhookController,
  ],
  exports: [ChannexSyncService],
})
export class ChannexSyncModule {}
