import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ListingsModule } from './listings/listings.module';
import { BookingsModule } from './bookings/bookings.module';
import { ChannelsModule } from './channels/channels.module';
import { CalendarModule } from './calendar/calendar.module';
import { IcalModule } from './ical/ical.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { Beds24Module } from './beds24/beds24.module';
import { ReportsModule } from './reports/reports.module';


// Channex Modules
import { ChannexSyncModule } from './channex/channex-sync.module';
import { ChannexModule } from './channex/channex.module'; // <--- New Import

// White-label Services Module
import { ChannexServicesModule } from './services/channex/channex-services.module';

@Module({
  imports: [
    // Core Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    AuthModule,

    // Feature Modules
    ChannexModule,          // <--- Added for Property/Room fetching
    ChannexSyncModule,      // Existing sync logic
    ChannexServicesModule,  // White-label integration services (/connect/* routes)
    UsersModule,
    ListingsModule,
    BookingsModule,
    ChannelsModule,
    CalendarModule,
    IcalModule,
    DashboardModule,
    AnalyticsModule,
    Beds24Module,
    ReportsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}