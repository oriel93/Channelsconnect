import { Module } from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { CalendarController } from './calendar.controller';
import { ChannexSyncModule } from '../channex/channex-sync.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [ChannexSyncModule, PrismaModule],
  controllers: [CalendarController],
  providers: [CalendarService],
  exports: [CalendarService],
})
export class CalendarModule {}

