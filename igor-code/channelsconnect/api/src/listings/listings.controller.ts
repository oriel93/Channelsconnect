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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ListingsService } from './listings.service';
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
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.listingsService.findOne(id);
  }

  @Patch(':id')
  @ApiOkResponse({ type: ListingEntity })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateListingDto: UpdateListingDto,
  ) {
    return this.listingsService.update(id, updateListingDto);
  }

  @Delete(':id')
  @ApiOkResponse({ type: ListingEntity })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.listingsService.remove(id);
  }
}

