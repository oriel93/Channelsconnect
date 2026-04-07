import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOkResponse, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { ReportsQueryDto } from './dto/reports-query.dto';
import { CurrentUser, CurrentUserData } from '../auth/decorators/current-user.decorator';

@Controller('reports')
@ApiTags('reports')
@ApiBearerAuth()
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('revenue')
  @ApiOperation({ summary: 'Get revenue statistics' })
  @ApiOkResponse({ description: 'Revenue statistics including totals, by month, by listing, and by source' })
  getRevenueStats(
    @CurrentUser() user: CurrentUserData,
    @Query() query: ReportsQueryDto,
  ) {
    return this.reportsService.getRevenueStats({
      userId: user.id,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      listingId: query.listingId ? parseInt(query.listingId, 10) : undefined,
    });
  }

  @Get('occupancy')
  @ApiOperation({ summary: 'Get occupancy statistics' })
  @ApiOkResponse({ description: 'Occupancy rates by listing and by month' })
  getOccupancyStats(
    @CurrentUser() user: CurrentUserData,
    @Query() query: ReportsQueryDto,
  ) {
    return this.reportsService.getOccupancyStats({
      userId: user.id,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      listingId: query.listingId ? parseInt(query.listingId, 10) : undefined,
    });
  }

  @Get('adr')
  @ApiOperation({ summary: 'Get Average Daily Rate statistics' })
  @ApiOkResponse({ description: 'ADR statistics including RevPAR, by month, by listing, and by source' })
  getADRStats(
    @CurrentUser() user: CurrentUserData,
    @Query() query: ReportsQueryDto,
  ) {
    return this.reportsService.getADRStats({
      userId: user.id,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      listingId: query.listingId ? parseInt(query.listingId, 10) : undefined,
    });
  }

  @Get('payouts')
  @ApiOperation({ summary: 'Get payout status statistics' })
  @ApiOkResponse({ description: 'Payout statistics by status and source, with recent bookings' })
  getPayoutStats(
    @CurrentUser() user: CurrentUserData,
    @Query() query: ReportsQueryDto,
  ) {
    return this.reportsService.getPayoutStats({
      userId: user.id,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      listingId: query.listingId ? parseInt(query.listingId, 10) : undefined,
    });
  }
}
