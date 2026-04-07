import { Controller, Post, Get, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiOkResponse, ApiQuery } from '@nestjs/swagger';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { Beds24Service } from './beds24.service';
import { SyncAirbnbDto } from './dto';
import { CurrentUser, CurrentUserData } from '../auth/decorators/current-user.decorator';

@ApiTags('Beds24')
@Controller('beds24')
@UseGuards(SupabaseAuthGuard)
@ApiBearerAuth()
export class Beds24Controller {
  constructor(private readonly beds24Service: Beds24Service) {}

  @Post('sync-airbnb')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sync Airbnb listing to Beds24' })
  @ApiOkResponse({ description: 'Listing successfully synced to Beds24' })
  async syncAirbnb(
    @Body() syncDto: SyncAirbnbDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.beds24Service.syncAirbnbToBeds24(
      syncDto.airbnbHostId,
      syncDto,
    );
  }

  @Get('properties/:airbnbHostId')
  @ApiOperation({ summary: 'Get Beds24 properties for Airbnb host' })
  @ApiOkResponse({ description: 'Returns Beds24 properties' })
  async getPropertiesByHostId(
    @Param('airbnbHostId') airbnbHostId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.beds24Service.getPropertiesByHostId(airbnbHostId);
  }

  @Get('property/:propKey')
  @ApiOperation({ summary: 'Get specific Beds24 property details' })
  @ApiOkResponse({ description: 'Returns property details' })
  async getProperty(
    @Param('propKey') propKey: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.beds24Service.getProperty(propKey);
  }

  @Get('properties')
  @ApiOperation({ summary: 'Get all properties from Beds24 account' })
  @ApiOkResponse({ description: 'Returns all properties in the account' })
  async getAllProperties(
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.beds24Service.getAllProperties();
  }

  @Post('sync-properties')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sync all properties from Beds24 and save to database' })
  @ApiOkResponse({ description: 'Properties synced and saved successfully' })
  async syncAndSaveProperties(
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.beds24Service.syncAndSaveProperties(user.id);
  }

  @Get('calendar')
  @ApiOperation({ summary: 'Get calendar data from Beds24' })
  @ApiOkResponse({ description: 'Returns calendar data for specified rooms/properties' })
  @ApiQuery({ name: 'startDate', required: true, type: String, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: true, type: String, description: 'End date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'roomId', required: false, type: [Number], description: 'Room IDs (comma-separated)' })
  @ApiQuery({ name: 'propertyId', required: false, type: [Number], description: 'Property IDs (comma-separated)' })
  async getCalendar(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('roomId') roomIdStr?: string,
    @Query('propertyId') propertyIdStr?: string,
    @CurrentUser() user?: CurrentUserData,
  ) {
    const roomId = roomIdStr ? roomIdStr.split(',').map(id => parseInt(id, 10)) : undefined;
    const propertyId = propertyIdStr ? propertyIdStr.split(',').map(id => parseInt(id, 10)) : undefined;
    
    return this.beds24Service.getCalendar({
      startDate,
      endDate,
      roomId,
      propertyId,
    });
  }

  @Post('calendar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update calendar data in Beds24' })
  @ApiOkResponse({ description: 'Calendar updated successfully' })
  async updateCalendar(
    @Body() updates: Array<{
      roomId: number;
      calendar: Array<{
        from: string;
        to: string;
        price1?: number;
        price2?: number;
        numAvail?: number;
        minStay?: number;
        maxStay?: number;
        override?: 'none' | 'open' | 'closed';
      }>;
    }>,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.beds24Service.updateCalendar(updates);
  }

  // ============ Bookings Endpoints ============

  @Get('bookings')
  @ApiOperation({ summary: 'Get bookings from Beds24' })
  @ApiOkResponse({ description: 'Returns bookings from Beds24' })
  @ApiQuery({ name: 'propertyId', required: false, type: String, description: 'Property IDs (comma-separated)' })
  @ApiQuery({ name: 'roomId', required: false, type: String, description: 'Room IDs (comma-separated)' })
  @ApiQuery({ name: 'arrivalFrom', required: false, type: String, description: 'Arrival from date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'arrivalTo', required: false, type: String, description: 'Arrival to date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'departureFrom', required: false, type: String, description: 'Departure from date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'departureTo', required: false, type: String, description: 'Departure to date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'modifiedFrom', required: false, type: String, description: 'Modified from datetime' })
  @ApiQuery({ name: 'status', required: false, type: String, description: 'Status filter (comma-separated: new,request,confirmed,cancelled)' })
  async getBookings(
    @Query('propertyId') propertyIdStr?: string,
    @Query('roomId') roomIdStr?: string,
    @Query('arrivalFrom') arrivalFrom?: string,
    @Query('arrivalTo') arrivalTo?: string,
    @Query('departureFrom') departureFrom?: string,
    @Query('departureTo') departureTo?: string,
    @Query('modifiedFrom') modifiedFrom?: string,
    @Query('status') statusStr?: string,
    @CurrentUser() user?: CurrentUserData,
  ) {
    const propertyId = propertyIdStr ? propertyIdStr.split(',').map(id => parseInt(id, 10)) : undefined;
    const roomId = roomIdStr ? roomIdStr.split(',').map(id => parseInt(id, 10)) : undefined;
    const status = statusStr ? statusStr.split(',') : undefined;

    return this.beds24Service.getBookings({
      propertyId,
      roomId,
      arrivalFrom,
      arrivalTo,
      departureFrom,
      departureTo,
      modifiedFrom,
      status,
    });
  }

  @Post('sync-bookings')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sync all bookings from Beds24 for user properties' })
  @ApiOkResponse({ description: 'Bookings synced successfully' })
  async syncBookings(
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.beds24Service.syncBookings(user.id);
  }
}

