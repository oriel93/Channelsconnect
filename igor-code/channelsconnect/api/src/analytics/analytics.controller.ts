import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOkResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { CurrentUser, CurrentUserData } from '../auth/decorators/current-user.decorator';

@Controller('analytics')
@ApiTags('analytics')
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get()
  @ApiOkResponse()
  getAnalytics(
    @CurrentUser() user: CurrentUserData,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.analyticsService.getAnalytics(
      user.id,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('market')
  @ApiOkResponse()
  getMarketData(
    @Query('city') city?: string,
    @Query('country') country?: string,
  ) {
    return this.analyticsService.getMarketData(city, country);
  }
}

