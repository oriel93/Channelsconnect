import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ListingsService } from './listings.service';
import { ListingsController } from './listings.controller';
import { BulkImportController } from './bulk-import.controller';
import { ICalService } from './ical.service';
import { ChannexSyncModule } from '../channex/channex-sync.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  imports: [
    ChannexSyncModule,
    PrismaModule,
    MulterModule.register({ storage: memoryStorage() }),
  ],
  controllers: [ListingsController, BulkImportController],
  providers: [ListingsService, ICalService, PrismaService],
  exports: [ListingsService, ICalService],
})
export class ListingsModule {}

