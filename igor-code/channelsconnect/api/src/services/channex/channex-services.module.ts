import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ChannexHttpClient } from './channex-http.client';
import { ChannexOnboardingService } from './channex-onboarding.service';
import { ChannexDeepSyncService } from './channex-deep-sync.service';
import { ChannexContentService } from './channex-content.service';
import { ChannexWhitelabelController } from './channex-whitelabel.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  imports: [HttpModule, PrismaModule],
  controllers: [ChannexWhitelabelController],
  providers: [ChannexHttpClient, ChannexOnboardingService, ChannexDeepSyncService, ChannexContentService, PrismaService],
  exports: [ChannexHttpClient, ChannexOnboardingService, ChannexDeepSyncService, ChannexContentService],
})
export class ChannexServicesModule {}
