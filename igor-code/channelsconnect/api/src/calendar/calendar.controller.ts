import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Query,
  Param,
  ParseIntPipe,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CalendarService } from './calendar.service';
import { BlockDateDto, BulkBlockDatesDto, BulkUnblockDatesDto } from './dto/block-date.dto';
import { UpdateRateDto, BulkUpdateRatesDto } from './dto/update-rate.dto';

@Controller('calendar')
@ApiTags('calendar')
@ApiBearerAuth()
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  // Rate endpoints
  @Post('rates')
  @ApiCreatedResponse()
  updateRate(@Body() updateRateDto: UpdateRateDto) {
    // Use the new sync method that updates Beds24 and refreshes cache
    return this.calendarService.updateRateAndSync(updateRateDto);
  }

  @Post('rates/bulk')
  @ApiCreatedResponse()
  bulkUpdateRates(@Body() bulkUpdateRatesDto: BulkUpdateRatesDto) {
    // Use the new sync method that updates Beds24 and refreshes cache
    return this.calendarService.bulkUpdateRatesAndSync(bulkUpdateRatesDto);
  }

  @Get('rates')
  @ApiOkResponse()
  getRates(
    @Query('listingId', ParseIntPipe) listingId: number,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.calendarService.getRates(
      listingId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  // Block/Unblock endpoints
  @Post('block')
  @ApiCreatedResponse()
  blockDate(@Body() blockDateDto: BlockDateDto) {
    return this.calendarService.blockDate(blockDateDto);
  }

  @Post('block/bulk')
  @ApiCreatedResponse()
  bulkBlockDates(@Body() bulkBlockDatesDto: BulkBlockDatesDto) {
    return this.calendarService.bulkBlockDates(bulkBlockDatesDto);
  }

  @Delete('unblock')
  @ApiOkResponse()
  unblockDate(
    @Query('listingId', ParseIntPipe) listingId: number,
    @Query('date') date: string,
  ) {
    return this.calendarService.unblockDate(listingId, new Date(date));
  }

  @Post('unblock/bulk')
  @ApiOkResponse()
  bulkUnblockDates(@Body() bulkUnblockDatesDto: BulkUnblockDatesDto) {
    return this.calendarService.bulkUnblockDates(bulkUnblockDatesDto);
  }

  @Get('blocked-dates')
  @ApiOkResponse()
  getBlockedDates(
    @Query('listingId', ParseIntPipe) listingId: number,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.calendarService.getBlockedDates(
      listingId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  // Calendar data
  @Get('data')
  @ApiOkResponse()
  getCalendarData(
    @Query('listingId', ParseIntPipe) listingId: number,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.calendarService.getCalendarData(
      listingId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  // Calendar events
  @Get('events')
  @ApiOkResponse()
  getCalendarEvents(
    @Query('listingId', ParseIntPipe) listingId: number,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.calendarService.getCalendarEvents(
      listingId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Post('events')
  @ApiCreatedResponse()
  createCalendarEvent(@Body() data: any) {
    return this.calendarService.createCalendarEvent(data);
  }

  @Patch('events/:id')
  @ApiOkResponse()
  updateCalendarEntry(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: any,
  ) {
    return this.calendarService.updateCalendarEntry(id, data);
  }

  @Delete('events/:id')
  @ApiOkResponse()
  deleteCalendarEntry(@Param('id', ParseIntPipe) id: number) {
    return this.calendarService.deleteCalendarEntry(id);
  }

  // Calendar sync endpoints
  @Post('sync/:listingId')
  @ApiCreatedResponse()
  syncCalendar(@Param('listingId', ParseIntPipe) listingId: number) {
    return this.calendarService.syncCalendarFromBeds24(listingId);
  }

  @Delete('cache/:listingId')
  @ApiOkResponse()
  clearCache(@Param('listingId', ParseIntPipe) listingId: number) {
    return this.calendarService.clearCalendarCache(listingId);
  }

  @Get('cached')
  @ApiOkResponse()
  getCachedCalendar(
    @Query('listingId', ParseIntPipe) listingId: number,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.calendarService.getCachedCalendar(
      listingId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  // ── Tape Chart (multi-listing) ────────────────────────────────────────────

  /**
   * GET /calendar/tape?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
   *
   * Returns all active listings + their rates, blocked dates, and bookings
   * for the requested window in a single response.
   * The frontend normalises into Hash Maps for O(1) cell rendering.
   */
  @Get('tape')
  @ApiOkResponse({ description: 'Multi-listing tape chart data' })
  getTapeData(
    @Request() req: any,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const userId: string = req.user?.id ?? req.user?.sub;
    return this.calendarService.getTapeData(
      userId,
      new Date(startDate),
      new Date(endDate),
    );
  }
}

