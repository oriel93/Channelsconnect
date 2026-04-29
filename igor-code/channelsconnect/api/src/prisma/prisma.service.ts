import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * PrismaService — wraps PrismaClient for NestJS DI.
 *
 * $connect() is called non-fatally on startup: if the database is temporarily
 * unreachable (e.g. cold-start networking delay in ECS/VPC), the app still
 * boots and the ALB health check can pass. Prisma will reconnect lazily on
 * the first query.
 *
 * A fatal crash here would prevent the ALB from ever receiving a healthy
 * response, causing a permanent 503.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('✅ Prisma connected to database');
    } catch (err: any) {
      // Non-fatal: Prisma reconnects lazily on first query.
      // Logging the error here gives CloudWatch visibility without crashing
      // the app before the ALB health check can register a healthy target.
      this.logger.error(
        `⚠️  Prisma $connect() failed at startup — app will continue and retry on first query. ` +
          `Error: ${err.message ?? String(err)}`,
      );
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('👋 Prisma disconnected from database');
  }
}
