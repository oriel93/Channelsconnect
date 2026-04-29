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
import { ChannexSyncService } from '../channex/channex-sync.service';

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
   * POST /listings/manual
   * Certification helper — creates a listing without auth (Public).
   * Used by CertDashboard to generate test properties.
   */
  @Public()
  @Post('manual')
  async createManual(@Body() body: { title?: string }) {
    const listing = await this.listingsService.create('cert-user', {
      title: body?.title || 'Channex Cert Villa',
      currency: 'USD',
      isActive: true,
    });
    this.logger.log(`[Cert] Manual listing created id=${listing.id} title="${listing.title}"`);
    return { success: true, data: listing };
  }

  /**
   * POST /listings/:id/rates
   * Certification helper — applies a price change and pushes it to Channex
   * via the event-driven sync engine. Returns the Channex task_id.
   * Public so the CertDashboard can call it without a session token.
   */
  @Public()
  @Post(':id/rates')
  async syncRate(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { rate: number; date?: string; minStay?: number },
  ) {
    const date = body.date || new Date().toISOString().split('T')[0];
    const rate = Number(body.rate);

    this.logger.log(
      `[Cert] Rate sync requested listing=${id} rate=${rate} date=${date}`,
    );

    // applyChange() writes to DB + triggers event-driven Channex push (500ms window)
    // It emits the drain event which calls POST /ari/bulk_update and logs the task_id.
    await this.channexSyncService.applyChange({
      listingId: id,
      date,
      price: rate,
      available: true,
      ...(body.minStay !== undefined ? { minStay: body.minStay } : {}),
    });

    // Give the 500ms drain window time to fire, then return.
    // The task_id is logged server-side as [CHANNEX_CERT_LOG] TASK_ID=...
    // The frontend polls or the user checks CloudWatch/server logs.
    // We return a confirmation here; the actual task_id comes from the
    // async Channex response logged by ChannexHttpClient.
    this.logger.log(`[Cert] applyChange queued for listing=${id} — drain fires in 500ms`);

    return {
      success: true,
      message: 'Rate queued for Channex sync. Check server logs for [CHANNEX_CERT_LOG] TASK_ID.',
      listingId: id,
      date,
      rate,
    };
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

