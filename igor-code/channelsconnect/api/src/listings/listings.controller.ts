import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  Logger,
  BadRequestException,
  ForbiddenException,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiTags,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import * as XLSX from 'xlsx';
import { ListingsService } from './listings.service';
import { ICalService } from './ical.service';
import { CreateListingDto } from './dto/create-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import { ListingEntity } from './entities/listing.entity';
import { CurrentUser, CurrentUserData } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { ChannexSyncService, MappingMissingError } from '../channex/channex-sync.service';

@Controller('listings')
@ApiTags('listings')
@ApiBearerAuth()
export class ListingsController {
  private readonly logger = new Logger(ListingsController.name);

  constructor(
    private readonly listingsService: ListingsService,
    private readonly channexSyncService: ChannexSyncService,
    private readonly icalService: ICalService,
  ) {}

  @Post()
  @ApiCreatedResponse({ type: ListingEntity })
  create(
    @CurrentUser() user: CurrentUserData,
    @Body() createListingDto: CreateListingDto,
  ) {
    return this.listingsService.create(user.id, createListingDto);
  }

  /**
   * POST /listings/import/airbnb
   * Channels Connect Content Capture — extracts listing data from an Airbnb URL
   * and persists to Supabase DB with safe defaults for all required fields.
   * Public: no auth required.
   */
  @Public()
  @Post('import/airbnb')
  async importFromAirbnb(@Body() body: { url: string }) {
    const { url } = body;
    if (!url || !url.includes('airbnb.com')) {
      throw new BadRequestException('Valid Airbnb URL required (must contain airbnb.com)');
    }
    const match = url.match(/\/rooms\/(\d+)/);
    const airbnbId = match?.[1] ?? null;
    this.logger.log(`[Import] Airbnb capture — url=${url} airbnbId=${airbnbId}`);
    try {
      const CERT_USER_ID = '1d63e070-dbff-48b8-ba2a-be8ba3a41ae8';
      const listing = await this.listingsService.create(CERT_USER_ID, {
        title: airbnbId ? `Airbnb Listing #${airbnbId}` : 'Imported Airbnb Listing',
        description: `Imported via Channels Connect content capture from: ${url}`,
        currency: 'USD',
        isActive: true,
        airbnbListingId: airbnbId ?? undefined,
        captureUrl: url,
        source: 'channex',
      } as any);
      this.logger.log(`[Import] Created listing id=${listing.id} airbnbId=${airbnbId}`);
      return {
        success: true,
        data: { id: listing.id, title: listing.title, airbnbListingId: airbnbId, source: 'channex' },
        message: 'Imported. Use POST /listings/:id/rates to push rates.',
      };
    } catch (err: any) {
      this.logger.error(`[Import] Failed: ${err?.message}\n${err?.stack}`);
      throw err;
    }
  }

  /**
   * POST /listings/manual
   * Certification helper — creates a listing without auth (Public).
   * Used by CertDashboard to generate test properties.
   */
  @Public()
  @Post('manual')
  async createManual(@Body() body: { title?: string }) {
    try {
      const listing = await this.listingsService.create('1d63e070-dbff-48b8-ba2a-be8ba3a41ae8', {
        title: body?.title || 'Channex Cert Villa',
        currency: 'USD',
        isActive: true,
      });
      this.logger.log(`[Cert] Manual listing created id=${listing.id} title="${listing.title}"`);
      return { success: true, data: listing };
    } catch (err: any) {
      this.logger.error(`[Cert] createManual failed: ${err?.message}\n${err?.stack}`);
      throw err;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Phase 2: iCal Import / Export  (SAFE — no ARI/channex-sync contact)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * POST /listings/import/ical
   * Parse a remote iCal URL and return the list of events (no DB write).
   */
  @Post('import/ical')
  async importIcal(@Body() body: { url: string }) {
    const { url } = body;
    if (!url) throw new BadRequestException('url is required');
    const events = await this.icalService.parseICalUrl(url);
    return { success: true, count: events.length, events };
  }

  /**
   * GET /listings/:id/calendar.ics
   * Public endpoint — streams an iCal feed of bookings for a listing.
   */
  @Public()
  @Get(':id/calendar.ics')
  async exportIcal(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ) {
    const icsData = await this.icalService.exportICalForListing(id);
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="listing-${id}.ics"`);
    res.send(icsData);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Phase 2: Excel Bulk Import / Template
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * GET /listings/bulk-template
   * Returns an xlsx file with the correct column headers for bulk import.
   */
  @Get('bulk-template')
  getBulkTemplate(@Res() res: Response) {
    const headers = [
      'Title', 'Property Type', 'Address', 'City', 'Country', 'Zip',
      'Latitude', 'Longitude', 'Max Occupancy', 'Bedrooms', 'Bathrooms',
      'Bed Breakdown', 'Base Price', 'Amenities (comma-separated)', 'Description',
    ];
    const ws = XLSX.utils.aoa_to_sheet([headers]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Listings');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="listings-template.xlsx"');
    res.send(buf);
  }

  /**
   * POST /listings/bulk-import
   * Accepts an array of listing objects, creates each via ListingsService.
   * Returns { created: N, failed: [...] }
   */
  @Post('bulk-import')
  @HttpCode(HttpStatus.OK)
  async bulkImport(
    @CurrentUser() user: CurrentUserData,
    @Body() rows: Array<{
      title?: string;
      propertyType?: string;
      address?: string;
      city?: string;
      country?: string;
      postalCode?: string;
      latitude?: number;
      longitude?: number;
      maxGuests?: number;
      bedrooms?: number;
      bathrooms?: number;
      beds?: string;
      basePrice?: number;
      amenities?: string;
      description?: string;
    }>,
  ) {
    if (!Array.isArray(rows) || rows.length === 0) {
      throw new BadRequestException('Body must be a non-empty array of listing objects');
    }
    const results: Array<{ index: number; id?: number; error?: string }> = [];
    let created = 0;
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row.title?.trim()) {
        results.push({ index: i, error: 'Missing title' });
        continue;
      }
      try {
        const listing = await this.listingsService.create(user.id, row as any);
        results.push({ index: i, id: listing.id });
        created++;
      } catch (err: any) {
        results.push({ index: i, error: err?.message ?? 'Unknown error' });
      }
    }
    const failed = results.filter((r) => r.error);
    return { success: true, created, failed };
  }

  /**
   * POST /listings/:id/rates
   * Certification helper — synchronously pushes a rate to Channex and returns
   * the task_id immediately so the CertDashboard can display it for copy-paste.
   *
   * Uses pushRateSync() (direct call, not the async queue/drain) so the
   * task_id is available in the HTTP response — not just in CloudWatch logs.
   * Rate-limit token is still consumed via ChannexHttpClient.
   *
   * Public: no session token required (cert testing only).
   */
  @Public()
  @Post(':id/rates')
  async syncRate(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { rate: number; date?: string; minStay?: number },
  ) {
    const date = body.date || new Date().toISOString().split('T')[0];
    const rate = Number(body.rate);

    this.logger.log(`[Cert] Direct rate push — listing=${id} rate=${rate} date=${date}`);

    try {
      const taskId = await this.channexSyncService.pushRateSync({
        listingId: id,
        date,
        price: rate,
        available: true,
        ...(body.minStay !== undefined ? { minStay: body.minStay } : {}),
      });

      this.logger.log(
        taskId
          ? `[CHANNEX_CERT] TASK_ID=${taskId} listing=${id}`
          : `[Cert] No task_id returned — check CHANNEX_API_KEY and mapping for listing=${id}`,
      );

      return {
        success: true,
        taskId: taskId ?? null,
        task_id: taskId ?? null,   // alias — dashboard accepts either key
        listingId: id,
        date,
        rate,
      };
    } catch (err: any) {
      this.logger.error(`[Cert] syncRate failed listing=${id}: ${err?.message}\n${err?.stack}`);
      // MappingMissingError = no Channex property linked yet — return 200 with explanation
      // so the UI doesn't show a red 500 error for a legitimate 'not yet synced' state.
      if (err instanceof MappingMissingError || err?.name === 'MappingMissingError') {
        return {
          success: false,
          taskId: null,
          task_id: null,
          listingId: id,
          error: 'Channex mapping not yet created for this listing. Complete onboarding sync first.',
          hint: 'Use POST /connect/sync after connecting your Airbnb channel.',
        };
      }
      throw err;
    }
  }

  @Get()
  @ApiOkResponse({ type: ListingEntity, isArray: true })
  findAll(@CurrentUser() user: CurrentUserData) {
    return this.listingsService.findAll(user.id);
  }

  @Get('active')
  @ApiOkResponse({ type: ListingEntity, isArray: true })
  findActive(@CurrentUser() user: CurrentUserData) {
    return this.listingsService.findActive(user.id);
  }

  @Get('my-listings')
  @ApiOkResponse({ type: ListingEntity, isArray: true })
  findMyListings(@CurrentUser() user: CurrentUserData) {
    return this.listingsService.findAll(user.id);
  }

  @Get(':id')
  @ApiOkResponse({ type: ListingEntity })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUserData,
  ) {
    // Ownership enforced inside service — throws 403 if listing belongs to another user
    return this.listingsService.findOne(id, user.id);
  }

  @Patch(':id')
  @ApiOkResponse({ type: ListingEntity })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateListingDto: UpdateListingDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.listingsService.update(id, updateListingDto, user.id);
  }

  @Delete(':id')
  @ApiOkResponse({ type: ListingEntity })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.listingsService.remove(id, user.id);
  }

  // ── Property Images ──────────────────────────────────────────────────────────────────
  // Frontend uploads the FILE bytes directly to Supabase Storage (anon key, allowed
  // by storage policies). After upload it calls these endpoints to save the
  // metadata row in property_images using our service-role Prisma client,
  // bypassing the RLS policy that silently blocked frontend inserts.
  // ────────────────────────────────────────────────────────────────────────────

  /** POST /listings/:id/images — batch save image records after upload to storage */
  @Post(':id/images')
  @HttpCode(HttpStatus.OK)
  async saveImages(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUserData,
    @Body() body: { records: Array<{ url: string; storagePath?: string; filename?: string; sortOrder?: number; isCover?: boolean; caption?: string }> },
  ) {
    const records = Array.isArray(body?.records) ? body.records : [];
    if (records.length === 0) {
      throw new BadRequestException('records must be a non-empty array');
    }
    return this.listingsService.saveImageRecords(user.id, id, records);
  }

  /** GET /listings/:id/images — list all images for a listing (sortOrder ASC) */
  @Get(':id/images')
  async listImages(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUserData,
  ) {
    const images = await this.listingsService.listImages(user.id, id);
    return { images };
  }

  /** DELETE /listings/images/:imageId — remove one image record (storage file left intact) */
  @Delete('images/:imageId')
  async deleteImage(
    @Param('imageId', ParseIntPipe) imageId: number,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.listingsService.deleteImage(user.id, imageId);
  }
}

