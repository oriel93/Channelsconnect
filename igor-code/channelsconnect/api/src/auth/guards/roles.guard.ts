import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * Hardcoded super-admin email.
 * This email is ALWAYS treated as admin regardless of the DB `role` column.
 * On first login, their DB record is auto-promoted so subsequent lookups are
 * consistent.
 */
const SUPER_ADMIN_EMAIL = 'oriel@erorentals.com';

/**
 * RolesGuard — enforces @Roles('admin') on routes.
 *
 * Resolution order:
 *   1. If user email === SUPER_ADMIN_EMAIL → always admin (auto-promotes DB row)
 *   2. Otherwise reads `role` from `users` table
 *
 * SAFE: does not touch Channex sync, webhook, or ARI logic.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No @Roles() decorator — allow through
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user?.id) {
      throw new ForbiddenException('Authentication required');
    }

    // Fetch the user's role from the database (source of truth)
    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true, email: true },
    });

    if (!dbUser) {
      throw new ForbiddenException('User not found');
    }

    // ── Super-admin bypass ────────────────────────────────────────────────────
    // oriel@erorentals.com is always admin. If their DB row says otherwise
    // (e.g. first login before any migration), auto-correct it silently.
    if (dbUser.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) {
      if ((dbUser.role || 'user').toLowerCase() !== 'admin') {
        // Auto-promote — fire-and-forget, non-blocking
        this.prisma.user
          .update({ where: { id: user.id }, data: { role: 'admin' } })
          .catch(() => {});
      }
      return true; // always passes for super-admin
    }

    const userRole = (dbUser.role || 'user').toLowerCase();
    const hasRole = requiredRoles.some((r) => r.toLowerCase() === userRole);

    if (!hasRole) {
      throw new ForbiddenException('Insufficient permissions — admin access required');
    }

    return true;
  }
}
