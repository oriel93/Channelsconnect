import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOkResponse, ApiBearerAuth } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { CurrentUser, CurrentUserData } from '../auth/decorators/current-user.decorator';

@Controller('dashboard')
@ApiTags('dashboard')
@ApiBearerAuth()
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @ApiOkResponse()
  getDashboardData(@CurrentUser() user: CurrentUserData) {
    return this.dashboardService.getDashboardData(user.id);
  }

  @Get('calendar')
  @ApiOkResponse()
  getCalendarDashboardData(
    @CurrentUser() user: CurrentUserData,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.dashboardService.getCalendarDashboardData(
      user.id,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get('channels')
  @ApiOkResponse()
  getChannelsDashboardData(@CurrentUser() user: CurrentUserData) {
    return this.dashboardService.getChannelsDashboardData(user.id);
  }
}

