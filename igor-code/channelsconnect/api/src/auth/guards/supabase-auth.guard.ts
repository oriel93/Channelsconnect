import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SupabaseService } from '../supabase.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

const BASE44_APP_ID = process.env.BASE44_APP_ID || '6862f92c2e623c50a6ce3dec';
const BASE44_API = 'https://base44.app/api';

/**
 * Dual-auth guard: accepts both Supabase JWTs and Base44 tokens.
 *
 * Auth path 1 (primary):
 *   Supabase JWT → verifyToken() via JWKS → user.id = payload.sub
 *
 * Auth path 2 (fallback — for Base44-authenticated frontend):
 *   Base44 token → GET /apps/:id/entities/User/me → user.id = response.id
 *   This allows the existing Base44-authenticated frontend to call our NestJS
 *   /connect/* endpoints without any frontend refactoring.
 */
@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  private readonly logger = new Logger(SupabaseAuthGuard.name);

  constructor(
    private supabaseService: SupabaseService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader) throw new UnauthorizedException('No authorization token provided');

    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) throw new UnauthorizedException('Invalid authorization token format');

    // ── Path 1: Supabase JWT ─────────────────────────────────────────────
    try {
      const payload = await this.supabaseService.verifyToken(token);
      if (payload?.sub) {
        request.user = {
          id: payload.sub,
          email: payload.email,
          name: payload.user_metadata?.full_name,
        };
        return true;
      }
    } catch {
      // Not a Supabase JWT — fall through to Base44 path
    }

    // ── Path 2: Base44 token ─────────────────────────────────────────────
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);

      const res = await fetch(
        `${BASE44_API}/apps/${BASE44_APP_ID}/entities/User/me`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        },
      ).finally(() => clearTimeout(timer));

      if (res.ok) {
        const user = await res.json();
        if (user?.id) {
          request.user = {
            id: user.id,
            email: user.email || '',
            name: user.full_name || user.name || '',
          };
          return true;
        }
      }
    } catch (err: any) {
      this.logger.warn(`[Auth] Base44 verification failed: ${err.message}`);
    }

    throw new UnauthorizedException('Invalid or expired token');
  }
}
