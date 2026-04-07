import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Beds24Service } from './beds24.service';
import { Beds24Controller } from './beds24.controller';
import { Beds24WebhookController } from './beds24-webhook.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { Beds24V2Client } from './v2';

@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [Beds24Controller, Beds24WebhookController],
  providers: [Beds24Service, Beds24V2Client],
  exports: [Beds24Service, Beds24V2Client],
})
export class Beds24Module {}

