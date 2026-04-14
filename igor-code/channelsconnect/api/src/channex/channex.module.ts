import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ChannexService } from './channex.service';
import { ChannexController } from './channex.controller';
@Module({
  imports: [HttpModule],
  providers: [ChannexService],
  controllers: [ChannexController],
  exports: [ChannexService],
})
export class ChannexModule {}
