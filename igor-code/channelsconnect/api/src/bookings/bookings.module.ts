import { Module } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { ChannexSyncModule } from '../channex/channex-sync.module';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [ChannexSyncModule, AdminModule.forRoot()],
  controllers: [BookingsController],
  providers: [BookingsService],
  exports: [BookingsService],
})
export class BookingsModule {}