import { Controller, Get, Param, Post, Body } from '@nestjs/common';
import { ChannexService } from './channex.service';
import { Public } from '../auth/decorators/public.decorator';

@Controller('channex')
export class ChannexController {
  constructor(private readonly channexService: ChannexService) {}

  @Public() @Get('properties')
  async getProperties() { return this.channexService.getProperties(); }
  
  @Public() @Get('room-types/:id')
  async getRoomTypes(@Param('id') id: string) { return this.channexService.getRoomTypes(id); }
  
  @Public() @Get('rate-plans/:id')
  async getRates(@Param('id') id: string) { return this.channexService.getRatePlans(id); }
  
  @Public() @Post('create')
  async create(@Body() body: any) { return this.channexService.createProperty(body); }
  
  @Public() @Post('room-types')
  async createRoom(@Body() body: any) { return this.channexService.createRoomType(body); }
  
  @Public() @Post('rate-plans')
  async createRate(@Body() body: any) { return this.channexService.createRatePlan(body); }

  // --- NEW: CHANNEL & IMPORT ROUTES ---
  @Public() @Post('channels')
  async createChannel(@Body() body: any) { return this.channexService.createChannel(body); }

  @Public() @Post('import/:channelId')
  async startImport(@Param('channelId') channelId: string) { return this.channexService.importProperties(channelId); }
}
