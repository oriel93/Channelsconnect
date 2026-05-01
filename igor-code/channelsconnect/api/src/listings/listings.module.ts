import { Module } from '@nestjs/common';
import { ListingsService } from './listings.service';
import { ListingsController } from './listings.controller';
import { ICalService } from './ical.service';
import { ChannexSyncModule } from '../channex/channex-sync.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [ChannexSyncModule, PrismaModule],
  controllers: [ListingsController],
  providers: [ListingsService, ICalService],
  exports: [ListingsService, ICalService],
})
export class ListingsModule {}

