/**
 * channex-ari.controller.ts — Phase 3: ARI Engine for Channex PMS Certification
 *
 * Endpoints:
 *   POST /admin/channex/full-sync/:listingId   — Cert T1: 500-day full sync (2 API calls)
 *   POST /admin/channex/push-ari               — Cert T9/T10: delta availability push
 *   GET  /admin/channex/sync-state/:listingId  — Get current sync state for a listing
 *   GET  /admin/channex/properties-mapping     — All listings with their channex mapping status
 *   PATCH /admin/channex/mappings/:mappingId   — Edit a mapping (channex_id, room_type_id, rate_plan_id)
 *   POST /admin/channex/mappings               — Create a new mapping
 *
 * All routes are admin-only (RolesGuard applied at module level).
 *
 * The ARI logic itself lives in ChannexAriService which wraps
 * ChannexDeepSyncService (already tested in ECS).
 *
 * For Cert T9/T10 (delta updates):
 *   - Dates formatted as YYYY-MM-DD strings per Channex spec
 *   - Payload: { values: [{ property_id, room_type_id, date_from, date_to, availability }] }
 *   - Single POST /availability call per update
 *
 * For Cert T1 (full 500-day sync):
 *   - Two calls: POST /availability (500 days avail), POST /restrictions (500 days rates)
 *   - Task IDs captured and returned for cert form copy-paste
 */
import {
  Controller, Get, Post, Patch, Body, Param, ParseIntPipe,
  UseGuards, Logger, HttpCode, HttpStatus, NotFoundException,
} from '@nestjs/common';
import {
  ApiTags, ApiBearerAuth, ApiOperation, ApiOkResponse,
} from '@nestjs/swagger';
import { ChannexAriService } from './channex-ari.service';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

/**
 * DTOs for ARI operations.
 * All dates are YYYY-MM-DD strings per Channex API spec.
 */

export class PushAriDto {
  /** Local listing ID */
  listingId!: number;
  /** YYYY-MM-DD */
  dateFrom!: string;
  /** YYYY-MM-DD */
  dateTo!: string;
  /** Number of rooms to set as available (0 = fully blocked) */
  availability!: number;
  /** Optional: override with a specific room_type_id (defaults to listing's mapped room type) */
  roomTypeId?: string;
  /** Optional: override with a specific rate_plan_id */
  ratePlanId?: string;
}

export class UpdateMappingDto {
  channexPropertyId?: string;
  channexRoomTypeId?: string;
  channexRatePlanId?: string;
  syncStatus?: string;
}

export class CreateMappingDto {
  userId!: string;
  listingId!: number;
  channexPropertyId!: string;
  channexRoomTypeId?: string;
  channexRatePlanId?: string;
  syncStatus?: string;
}

/**
 * SaveMappingDto — used by POST /admin/channex/mapping/:listingId
 * All three Channex IDs are required for any ARI sync to work.
 * This is the primary endpoint the cert reviewer uses to set IDs during screenshare.
 */
export class SaveMappingDto {
  /** Channex property ID (required) — used as property_id in all ARI calls */
  channexPropertyId!: string;
  /** Channex room_type ID (required) — used as room_type_id in availability calls */
  channexRoomTypeId!: string;
  /** Channex rate_plan ID (optional but recommended) — used as rate_plan_id in restrictions calls */
  channexRatePlanId?: string;
}

@ApiTags('admin — channex-ari')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles('admin')
@Controller('admin/channex')
export class ChannexAriController {
  private readonly logger = new Logger(ChannexAriController.name);

  constructor(private readonly ariService: ChannexAriService) {}

  // ── GET /admin/channex/properties-mapping ──────────────────────────────────
  // Returns all listings with their channex mapping status.
  // Used by the Properties & Mapping table in the admin UI.

  @Get('properties-mapping')
  @ApiOperation({ summary: 'All listings with channex mapping status (admin)' })
  @ApiOkResponse({ description: 'Array of { listing, mapping, syncState } objects' })
  async getPropertiesMapping() {
    this.logger.log('[ChannexAri] GET /admin/channex/properties-mapping');
    return this.ariService.getAllPropertiesWithMapping();
  }

  // ── GET /admin/channex/sync-state/:listingId ───────────────────────────────
  // Returns current sync state for a listing: hasChannexRecord, channexPropertyId,
  // roomTypeId, ratePlanId, lastSyncAt, lastSyncTaskId, syncStatus.

  @Get('sync-state/:listingId')
  @ApiOperation({ summary: 'Get Channex sync state for a listing (admin)' })
  async getSyncState(@Param('listingId', ParseIntPipe) listingId: number) {
    this.logger.log(`[ChannexAri] GET /admin/channex/sync-state/${listingId}`);
    const state = await this.ariService.getSyncState(listingId);
    if (!state) throw new NotFoundException(`Listing ${listingId} not found`);
    return state;
  }

  // ── POST /admin/channex/full-sync/:listingId — Cert T1 ───────────────────
  // Triggers a full 500-day ARI sync for a property.
  //
  // Produces EXACTLY 2 Channex API calls:
  //   Call 1: POST /availability — 500 days of availability for all room types
  //   Call 2: POST /restrictions — 500 days of rates/restrictions for all rate plans
  //
  // Data is realistic and varied (not hardcoded placeholders) per cert spec.
  // Returns task IDs for copy-paste into the certification form.
  //
  // Response shape: { success: true, taskIds: [availTaskId, ratesTaskId], message }

  @Post('full-sync/:listingId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Full 500-day ARI sync — Cert T1 (admin)' })
  async fullSync(
    @Param('listingId', ParseIntPipe) listingId: number,
  ) {
    this.logger.log(`[ChannexAri] POST /admin/channex/full-sync/${listingId} — starting 500-day sync`);

    const result = await this.ariService.executeFullSync(listingId);

    if (result.taskIds.length === 0) {
      return {
        success: false,
        taskIds: [],
        message: result.message || 'No task IDs returned — check Channex dashboard',
      };
    }

    this.logger.log(
      `[ChannexAri] Full sync complete for listing ${listingId}. ` +
        `Task IDs: ${result.taskIds.join(', ')}`,
    );

    return {
      success: true,
      taskIds: result.taskIds,
      message: `Full sync complete — ${result.taskIds.length} task(s) created. ` +
        `Copy the Task ID(s) into the certification form.`,
      listingId,
      taskIdDisplay: result.taskIds.map(tid => ({ taskId: tid, type: tid.startsWith('avail') ? 'Availability' : 'Rates' })),
    };
  }

  // ── POST /admin/channex/push-ari — Cert T9/T10 ──────────────────────────
  // Delta availability update: sets availability for a date range on a room type.
  // Called after manual bookings, cancellations, or admin overrides.
  //
  // Payload (PushAriDto):
  //   {
  //     listingId: number,       ← required
  //     dateFrom: 'YYYY-MM-DD',  ← required
  //     dateTo: 'YYYY-MM-DD',    ← required
  //     availability: 0 | 1,     ← 0 = block, 1 = open
  //     roomTypeId?: string,     ← optional override
  //     ratePlanId?: string,     ← optional override
  //   }
  //
  // Calls: POST /availability { values: [{ property_id, room_type_id, date_from, date_to, availability }] }
  // Returns: { success: true, taskId: string }

  @Post('push-ari')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Push ARI delta to Channex — Cert T9/T10 (admin)' })
  async pushAriDelta(@Body() body: PushAriDto) {
    this.logger.log(
      `[ChannexAri] POST /admin/channex/push-ari listingId=${body.listingId} ` +
        `${body.dateFrom} → ${body.dateTo} avail=${body.availability}`,
    );

    const result = await this.ariService.pushAvailability({
      listingId: body.listingId,
      dateFrom: body.dateFrom,
      dateTo: body.dateTo,
      availability: body.availability,
      roomTypeId: body.roomTypeId,
      ratePlanId: body.ratePlanId,
    });

    if (!result.taskId) {
      return {
        success: false,
        taskId: null,
        message: result.error || 'No task ID returned from Channex',
      };
    }

    this.logger.log(`[ChannexAri] Delta push complete — taskId=${result.taskId}`);

    return {
      success: true,
      taskId: result.taskId,
      message: `Availability updated for ${body.dateFrom} → ${body.dateTo} (task: ${result.taskId})`,
    };
  }

  // ── PATCH /admin/channex/mappings/:mappingId ─────────────────────────────
  // Edit an existing Channex mapping: update channexPropertyId, room_type_id,
  // or rate_plan_id. Used by the Edit Mapping modal in the admin UI.

  @Patch('mappings/:mappingId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a channex mapping (admin)' })
  async updateMapping(
    @Param('mappingId') mappingId: string,
    @Body() body: UpdateMappingDto,
  ) {
    this.logger.log(`[ChannexAri] PATCH /admin/channex/mappings/${mappingId}`);
    const updated = await this.ariService.updateMapping(mappingId, body);
    if (!updated) throw new NotFoundException(`Mapping ${mappingId} not found`);
    return { success: true, mapping: updated };
  }

  // ── POST /admin/channex/mappings ─────────────────────────────────────────
  // Create a new Channex mapping for a listing.

  @Post('mappings')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new channex mapping (admin)' })
  async createMapping(@Body() body: CreateMappingDto) {
    this.logger.log(`[ChannexAri] POST /admin/channex/mappings listingId=${body.listingId}`);
    const mapping = await this.ariService.createMapping(body);
    return { success: true, mapping };
  }

  // ── POST /admin/channex/mapping/:listingId — Primary mapping setter ──────
  // Saves all three Channex IDs for a listing.
  // Called by the admin ChannexMappingModal during cert screenshare.
  // Also updates the Listing.channexPropertyId column for fast lookups.

  @Post('mapping/:listingId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Save all three Channex IDs for a listing (admin) — primary cert screenshare endpoint' })
  async saveMapping(
    @Param('listingId', ParseIntPipe) listingId: number,
    @Body() body: SaveMappingDto,
  ) {
    this.logger.log(
      `[ChannexAri] POST /admin/channex/mapping/${listingId} — ` +
        `property_id=${body.channexPropertyId} ` +
        `room_type_id=${body.channexRoomTypeId} ` +
        `rate_plan_id=${body.channexRatePlanId ?? 'not set'}`,
    );

    const result = await this.ariService.saveMappingFromAdmin(listingId, {
      channexPropertyId:  body.channexPropertyId,
      channexRoomTypeId:  body.channexRoomTypeId,
      channexRatePlanId:  body.channexRatePlanId,
    });

    return {
      success: true,
      listingId,
      channexPropertyId:  body.channexPropertyId,
      channexRoomTypeId:  body.channexRoomTypeId,
      channexRatePlanId:  body.channexRatePlanId ?? null,
      message: 'Mapping saved. You can now run Full Sync or create a booking.',
      ...result,
    };
  }

  // ── GET /admin/channex/webhook-logs ──────────────────────────────────────
  // Returns recent webhook events from the sync log table.
  // Displays in the Webhook Logs viewer in the Channex Sync Ops tab.

  @Get('webhook-logs')
  @ApiOperation({ summary: 'Recent sync webhook events (admin)' })
  async getWebhookLogs() {
    this.logger.log('[ChannexAri] GET /admin/channex/webhook-logs');
    return this.ariService.getRecentSyncLogs();
  }

  // ── POST /admin/channex/build/:listingId — Build Property in Channex ──────
  // Executes the 3-step waterfall:
  //   Step A: POST /properties → channexPropertyId
  //   Step B: POST /room_types → channexRoomTypeId
  //   Step C: POST /rate_plans → channexRatePlanId
  // Then persists all three IDs to the local Listing + RoomType record.
  //
  // This is the prerequisite for all ARI pushes (Tests T9/T10/T11).
  // Returns: { success, channexPropertyId, channexRoomTypeId, channexRatePlanId, message }

  @Post('build/:listingId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '3-step build: create property + room_type + rate_plan in Channex (admin)' })
  async buildPropertyInChannex(@Param('listingId', ParseIntPipe) listingId: number) {
    this.logger.log(`[ChannexAri] POST /admin/channex/build/${listingId} — 3-step property build`);
    let ids: { channexPropertyId: string; channexRoomTypeId: string; channexRatePlanId: string };
    try {
      ids = await this.ariService.buildPropertyAndPersist(listingId);
    } catch (err: any) {
      // Surface BadRequestException from service as 400 JSON
      const status = err?.status ?? 500;
      const msg =
        err?.response?.data?.message ??
        err?.response?.data?.error ??
        err?.message ??
        String(err);
      this.logger.error(`[ChannexAri/build] Failed for listingId=${listingId}: ${msg}`);
      return {
        success: false,
        message: msg,
        channexPropertyId: null,
        channexRoomTypeId: null,
        channexRatePlanId: null,
      };
    }
    return {
      success: true,
      channexPropertyId: ids.channexPropertyId,
      channexRoomTypeId: ids.channexRoomTypeId,
      channexRatePlanId: ids.channexRatePlanId,
      message:
        `Property built in Channex. IDs: property=${ids.channexPropertyId} ` +
        `room_type=${ids.channexRoomTypeId} rate_plan=${ids.channexRatePlanId}`,
    };
  }
}