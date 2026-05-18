import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { ChannexAriController } from './channex-ari.controller';
import { ChannexAriService } from './channex-ari.service';
import { DbMigrateController } from './db-migrate.controller';
import { DbMigrateService } from './db-migrate.service';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PrismaModule } from '../prisma/prisma.module';
import { ChannexServicesModule } from '../services/channex/channex-services.module';
import { ChannexModule } from '../channex/channex.module';

/**
 * AdminModule — all admin-only routes.
 *
 * Controllers:
 *   AdminController        — users, listings, markup, review queue
 *   ChannexAriController   — ARI sync engine, mapping management, webhook logs
 *
 * Both controllers are gated by RolesGuard + @Roles('admin').
 */
@Module({
  imports: [PrismaModule, ChannexServicesModule, ChannexModule],
  controllers: [AdminController, ChannexAriController, DbMigrateController],
  providers: [AdminService, ChannexAriService, DbMigrateService, RolesGuard],
})
export class AdminModule {
  static forRoot() {
    return {
      module: AdminModule,
      exports: [ChannexAriService],
    };
  }
}
