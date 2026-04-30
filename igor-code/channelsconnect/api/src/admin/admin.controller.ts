import {
  Controller,
  Get,
  Res,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiOkResponse,
} from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

/**
 * AdminController — platform-owner routes.
 *
 * Every route here is gated behind RolesGuard + @Roles('admin').
 * Users without role='admin' in the users table receive 403 Forbidden.
 *
 * SAFE: does not touch Channex sync, webhook, or ARI logic.
 */
@Controller('admin')
@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles('admin')
export class AdminController {
  private readonly logger = new Logger(AdminController.name);

  constructor(private readonly adminService: AdminService) {}

  // ── GET /admin/stats ───────────────────────────────────────────────────────

  @Get('stats')
  @ApiOperation({ summary: 'Platform-wide stats (admin only)' })
  @ApiOkResponse({ description: 'Counts for users, listings, bookings' })
  getStats() {
    return this.adminService.getPlatformStats();
  }

  // ── GET /admin/users ───────────────────────────────────────────────────────

  @Get('users')
  @ApiOperation({ summary: 'List all platform users (admin only)' })
  @ApiOkResponse({ description: 'Array of user records with listing/booking counts' })
  getUsers() {
    this.logger.log('[Admin] GET /admin/users');
    return this.adminService.getAllUsers();
  }

  // ── GET /admin/listings ────────────────────────────────────────────────────

  @Get('listings')
  @ApiOperation({ summary: 'List all platform listings (admin only)' })
  @ApiOkResponse({ description: 'All listings across all users, includes owner info' })
  getListings() {
    this.logger.log('[Admin] GET /admin/listings');
    return this.adminService.getAllListings();
  }

  // ── GET /admin/export/listings ─────────────────────────────────────────────

  @Get('export/listings')
  @ApiOperation({ summary: 'Download all listings as CSV (admin only)' })
  async exportListings(@Res() res: Response) {
    this.logger.log('[Admin] GET /admin/export/listings — building CSV');

    const csv = await this.adminService.buildListingsCsv();

    const filename = `channels_connect_export_${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.send(csv);
  }
}
