/**
 * db-migrate.controller.ts
 *
 * Admin-only endpoints for schema management and listing lifecycle.
 * All routes gated behind RolesGuard + @Roles('admin').
 *
 * POST /admin/migrate-db          — apply safe schema additions (nullable columns, constraints)
 * POST /admin/listings/:id/archive — soft-delete a listing (preserves bookings)
 * POST /admin/listings/:id/restore — restore an archived listing
 * DELETE /admin/listings/:id       — hard-delete an archived listing (no recovery)
 */
import {
  Controller, Post, Delete, Param,
  ParseIntPipe, Body, UseGuards, Logger, HttpCode, HttpStatus, Query,
} from '@nestjs/common';
import {
  ApiTags, ApiBearerAuth, ApiOperation, ApiOkResponse,
} from '@nestjs/swagger';
import { DbMigrateService } from './db-migrate.service';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('admin — db-migrate')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles('admin')
@Controller('admin')
export class DbMigrateController {
  private readonly logger = new Logger(DbMigrateController.name);

  constructor(private readonly migrate: DbMigrateService) {}

  /** Apply all safe schema additions (nullable columns + constraints) */
  @Post('migrate-db')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Apply safe DB schema additions (admin only)' })
  async applySchemaMigrations() {
    this.logger.log('[DbMigrate] POST /admin/migrate-db — applying schema additions');
    const result = await this.migrate.applySafeSchemaAdditions();
    return {
      success: result.errors.length === 0,
      ...result,
      message: `Applied ${result.applied.length} changes, ${result.errors.length} errors`,
    };
  }

  /** Soft-delete (archive) a listing — preserves all bookings */
  @Post('listings/:id/archive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archive (soft-delete) a listing — preserves bookings' })
  async archiveListing(
    @Param('id', ParseIntPipe) listingId: number,
    @Query('force') force?: string,
  ) {
    this.logger.log(`[DbMigrate] POST /admin/listings/${listingId}/archive force=${force}`);
    return this.migrate.archiveListing(listingId, force === 'true');
  }

  /** Restore a previously archived listing */
  @Post('listings/:id/restore')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restore an archived listing' })
  async restoreListing(@Param('id', ParseIntPipe) listingId: number) {
    this.logger.log(`[DbMigrate] POST /admin/listings/${listingId}/restore`);
    return this.migrate.restoreListing(listingId);
  }

  /** Hard-delete an archived listing — no recovery possible */
  @Delete('listings/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Hard-delete an archived listing (admin only, no recovery)' })
  async deleteListing(@Param('id', ParseIntPipe) listingId: number) {
    this.logger.warn(`[DbMigrate] DELETE /admin/listings/${listingId} — HARD DELETE REQUESTED`);
    return this.migrate.deleteListing(listingId);
  }
}