import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  ParseIntPipe,
  Res,
  UseGuards,
  Logger,
  HttpCode,
  HttpStatus,
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

  // ── GET /admin/users/:id/export ───────────────────────────────────────

  @Get('users/:id/export')
  @ApiOperation({ summary: 'Export all data for a single user as JSON (admin only)' })
  @ApiOkResponse({ description: 'Structured JSON: user profile, listings, bookings, consent audit data' })
  async exportUserData(
    @Param('id') userId: string,
    @Res() res: Response,
  ) {
    this.logger.log(`[Admin] GET /admin/users/${userId}/export`);
    const data = await this.adminService.exportUserData(userId);
    const filename = `user_export_${userId}_${new Date().toISOString().slice(0, 10)}.json`;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.json(data);
  }

  // ── GET /admin/listings/:listingId/images ──────────────────────────────

  @Get('listings/:listingId/images')
  @ApiOperation({ summary: 'Get all images for a listing (admin only)' })
  @ApiOkResponse({ description: 'Array of property_images rows including hi-res metadata' })
  getListingImages(@Param('listingId', ParseIntPipe) listingId: number) {
    this.logger.log(`[Admin] GET /admin/listings/${listingId}/images`);
    return this.adminService.getListingImages(listingId);
  }

  // ── Review Queue endpoints ─────────────────────────────────────────────────────

  @Get('review')
  @ApiOperation({ summary: 'All listings pending admin review' })
  getPendingReview() {
    this.logger.log('[Admin] GET /admin/review');
    return this.adminService.getPendingReviewListings();
  }

  @Get('review/:listingId')
  @ApiOperation({ summary: 'Single pending listing for editing' })
  getReviewListing(@Param('listingId', ParseIntPipe) listingId: number) {
    return this.adminService.getReviewListing(listingId);
  }

  @Patch('review/:listingId')
  @ApiOperation({ summary: 'Save admin edits to a pending listing' })
  updateReviewListing(
    @Param('listingId', ParseIntPipe) listingId: number,
    @Body() body: Record<string, any>,
  ) {
    this.logger.log(`[Admin] PATCH /admin/review/${listingId}`);
    return this.adminService.updateReviewListing(listingId, body);
  }

  @Post('review/:listingId/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve a pending listing — makes it live' })
  approveListing(@Param('listingId', ParseIntPipe) listingId: number) {
    this.logger.log(`[Admin] POST /admin/review/${listingId}/approve`);
    return this.adminService.approveListing(listingId);
  }

  @Post('review/:listingId/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject a pending listing with optional reason' })
  rejectListing(
    @Param('listingId', ParseIntPipe) listingId: number,
    @Body() body: { reason?: string },
  ) {
    this.logger.log(`[Admin] POST /admin/review/${listingId}/reject`);
    return this.adminService.rejectListing(listingId, body?.reason);
  }

  // ── POST /admin/listings/:listingId/images/:imageId/convert ──────────────

  @Post('listings/:listingId/images/:imageId/convert')
  @ApiOperation({
    summary: 'Convert a property image to OTA hi-res spec using sharp (admin only)',
    description:
      'Downloads source image from Supabase Storage, processes with sharp ' +
      '(resize max 1920×1080, JPEG 92%), uploads back as _highres, updates DB.',
  })
  @ApiOkResponse({ description: 'highResUrl, storagePath, dimensions, sizeBytes' })
  async convertImageToHighRes(
    @Param('listingId', ParseIntPipe) listingId: number,
    @Param('imageId', ParseIntPipe) imageId: number,
  ) {
    this.logger.log(`[Admin] POST convert listing=${listingId} image=${imageId}`);
    return this.adminService.convertImageToHighRes(listingId, imageId);
  }
}
