import {
  Controller, Get, Post, Body, Patch, Param, Delete,
  ParseIntPipe, Query, Res, Header,
} from '@nestjs/common';
import { ApiTags, ApiOkResponse, ApiCreatedResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { IcalService } from './ical.service';
import {
  CreateIcalConnectionDto,
  UpdateIcalConnectionDto,
  ImportIcalDto,
} from './dto/ical.dto';
import { CurrentUser, CurrentUserData } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';

@Controller('ical')
@ApiTags('ical')
@ApiBearerAuth()
export class IcalController {
  constructor(private readonly icalService: IcalService) {}

  // ─── Connections CRUD ─────────────────────────────────────────────────────

  @Post('connections')
  @ApiCreatedResponse()
  createConnection(
    @CurrentUser() user: CurrentUserData,
    @Body() createDto: CreateIcalConnectionDto,
  ) {
    return this.icalService.createConnection(user.id, createDto);
  }

  @Get('connections')
  @ApiOkResponse()
  findAllConnections(
    @CurrentUser() user: CurrentUserData,
    @Query('listingId') listingId?: string,
  ) {
    return this.icalService.findAll(
      user.id,
      listingId ? parseInt(listingId) : undefined,
    );
  }

  @Get('connections/:id')
  @ApiOkResponse()
  findOneConnection(@Param('id', ParseIntPipe) id: number) {
    return this.icalService.findOne(id);
  }

  @Patch('connections/:id')
  @ApiOkResponse()
  updateConnection(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateIcalConnectionDto,
  ) {
    return this.icalService.update(id, updateDto);
  }

  @Delete('connections/:id')
  @ApiOkResponse()
  removeConnection(@Param('id', ParseIntPipe) id: number) {
    return this.icalService.remove(id);
  }

  // ─── Sync ─────────────────────────────────────────────────────────────────

  @Post('sync/:id')
  @ApiOkResponse()
  syncConnection(@Param('id', ParseIntPipe) id: number) {
    return this.icalService.syncConnection(id);
  }

  @Post('sync-all')
  @ApiOkResponse()
  syncAll(@CurrentUser() user: CurrentUserData) {
    return this.icalService.syncAll(user.id);
  }

  // ─── Import ───────────────────────────────────────────────────────────────

  @Post('import')
  @ApiCreatedResponse()
  importIcal(
    @CurrentUser() user: CurrentUserData,
    @Body() importDto: ImportIcalDto,
  ) {
    return this.icalService.importIcal(
      user.id,
      importDto.listingId,
      importDto.icalUrl,
    );
  }

  // ─── Export (.ics feed — public, cacheable) ───────────────────────────────

  /**
   * GET /ical/export/:listingId.ics
   * Returns a valid iCalendar (.ics) stream that any calendar app can subscribe to.
   * Publicly accessible — no auth required (listings are identified by ID).
   */
  @Get('export/:listingId.ics')
  @Public()
  @ApiOkResponse({ description: 'iCalendar feed' })
  async exportIcalFile(
    @Param('listingId', ParseIntPipe) listingId: number,
    @Res() res: Response,
  ) {
    const icsContent = await this.icalService.exportIcal(listingId);
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="listing-${listingId}.ics"`,
    );
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(icsContent);
  }

  // ─── Export (JSON fallback) ───────────────────────────────────────────────

  @Get('export/:listingId')
  @ApiOkResponse()
  async exportIcalJson(@Param('listingId', ParseIntPipe) listingId: number) {
    // Returns raw .ics string — useful for debugging
    const icsContent = await this.icalService.exportIcal(listingId);
    return { listingId, icsContent };
  }
}
