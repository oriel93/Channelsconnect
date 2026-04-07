import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ChannexService } from './channex.service';
import { ChannexController, ChannexWebhookController } from './channex.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [ChannexController, ChannexWebhookController],
  providers: [ChannexService],
  exports: [ChannexService],
})
export class ChannexModule {}
