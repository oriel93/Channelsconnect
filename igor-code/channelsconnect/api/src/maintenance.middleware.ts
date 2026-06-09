/**
 * maintenance.middleware.ts
 *
 * Returns HTTP 503 with a JSON body for every request when MAINTENANCE_MODE=true,
 * EXCEPT for an allowlist of endpoints that must keep working even in maintenance:
 *   - /health         — load balancer + monitoring
 *   - /connect/webhook/* — Channex inbound webhooks (booking ACK must not stall)
 *   - /admin/*        — so the operator can flip things back without being locked out
 *
 * Toggle via SST secret:
 *   sst secret set MAINTENANCE_MODE true --stage production    # turn ON
 *   sst secret set MAINTENANCE_MODE false --stage production   # turn OFF
 *   sst deploy --stage production                              # apply
 *
 * Or for a faster toggle without redeploy, set the ECS task definition env
 * variable directly via aws ecs update-service --force-new-deployment.
 */
import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

const ALLOWLISTED_PATH_PREFIXES = [
  '/health',
  '/connect/webhook',       // Channex webhooks (booking, channel events, ACK)
  '/admin',                 // Admin dashboard so operator can fix things
  '/api/docs',              // Swagger
];

function isAllowlisted(urlPath: string): boolean {
  // Strip querystring if present (we only care about the path part).
  const qIdx = urlPath.indexOf('?');
  const path = qIdx >= 0 ? urlPath.slice(0, qIdx) : urlPath;
  // ELB target group health check hits '/' (not /health) and requires 200.
  if (path === '/' || path === '') return true;
  for (const prefix of ALLOWLISTED_PATH_PREFIXES) {
    if (path === prefix || path.startsWith(prefix + '/')) {
      return true;
    }
  }
  return false;
}

@Injectable()
export class MaintenanceMiddleware implements NestMiddleware {
  private readonly logger = new Logger(MaintenanceMiddleware.name);
  private logged = false;

  use(req: Request, res: Response, next: NextFunction) {
    const enabled = String(process.env.MAINTENANCE_MODE || '').toLowerCase() === 'true';
    if (!this.logged) {
      // Log once on first request so we can confirm middleware actually wired up.
      this.logger.log(`[Maintenance] middleware active enabled=${enabled} envVar='${process.env.MAINTENANCE_MODE}'`);
      this.logged = true;
    }
    if (!enabled) {
      return next();
    }

    // NestJS middleware applied via forRoutes('*') sees req.path stripped to '/'
    // relative to its mount point. The full URL is in req.originalUrl. Use that.
    const fullUrl = (req as any).originalUrl || req.url || req.path || '/';
    if (isAllowlisted(fullUrl)) {
      return next();
    }
    this.logger.log(`[Maintenance] 503 → ${req.method} ${fullUrl}`);
    res.status(503).json({
      maintenance: true,
      message: "Channels Connect is briefly down for review. We'll be back shortly.",
      retryAfterSeconds: 60,
    });
  }
}
