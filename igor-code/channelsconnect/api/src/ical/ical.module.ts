import { Module } from '@nestjs/common';
import { IcalService } from './ical.service';
import { IcalController } from './ical.controller';

@Module({
  controllers: [IcalController],
  providers: [IcalService],
  exports: [IcalService],
})
export class IcalModule {}

