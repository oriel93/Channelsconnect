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
 * RolesGuard — enforces @Roles('admin') on routes.
 *
 * Reads the current user from request.user (set by SupabaseAuthGuard),
 * then looks up their `role` column in the `users` table.
 * Throws 403 Forbidden if the role doesn't match.
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
      select: { role: true },
    });

    if (!dbUser) {
      throw new ForbiddenException('User not found');
    }

    const userRole = (dbUser.role || 'user').toLowerCase();
    const hasRole = requiredRoles.some((r) => r.toLowerCase() === userRole);

    if (!hasRole) {
      throw new ForbiddenException('Insufficient permissions — admin access required');
    }

    return true;
  }
}
