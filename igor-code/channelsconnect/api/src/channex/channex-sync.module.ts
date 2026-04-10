/**
 * channex-sync.module.ts
 * Drop into: igor-code/channelsconnect/api/src/channex/
 * Then add ChannexSyncModule to your AppModule imports array.
 */

import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ChannexSyncService } from './channex-sync.service';
import { ChannexSyncController } from './channex-sync.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    ScheduleModule.forRoot(), // remove if already in AppModule
  ],
  providers: [ChannexSyncService],
  controllers: [ChannexSyncController],
  exports: [ChannexSyncService],
})
export class ChannexSyncModule {}
