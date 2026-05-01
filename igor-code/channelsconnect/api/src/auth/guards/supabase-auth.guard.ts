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

/**
 * Supabase JWT auth guard.
 *
 * Verifies Bearer tokens via Supabase JWKS (ES256).
 * On success, attaches { id, email, name } to request.user.
 *
 * NOTE: Base44 fallback path has been removed — this is a Supabase-only app.
 * The old fallback added a 5 s network round-trip to every failed JWT verification,
 * which caused the "Submitting…" spinner to hang for users whose token was valid
 * but not yet in the local JWKS cache.
 */
@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  private readonly logger = new Logger(SupabaseAuthGuard.name);

  constructor(
    private supabaseService: SupabaseService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // @Public() routes bypass auth entirely
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('No authorization token provided');
    }

    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!token) {
      throw new UnauthorizedException('Invalid authorization token format');
    }

    // ── Path 1: Supabase JWKS local verification (fast, no network round-trip) ──
    try {
      const payload = await this.supabaseService.verifyToken(token);
      if (payload?.sub) {
        request.user = {
          id:    payload.sub,
          email: payload.email  ?? '',
          name:  (payload as any).user_metadata?.full_name ?? '',
        };
        return true;
      }
    } catch (err: any) {
      this.logger.debug(`[Auth] JWKS verify failed: ${err?.message} — trying API fallback`);
    }

    // ── Path 2: Supabase API fallback (handles key rotation, cold-JWKS-cache edge cases) ──
    // Uses the existing verifyTokenWithApi() method — purely Supabase, no Base44.
    try {
      const apiUser = await this.supabaseService.verifyTokenWithApi(token);
      if (apiUser?.id) {
        request.user = {
          id:    apiUser.id,
          email: apiUser.email  ?? '',
          name:  apiUser.user_metadata?.full_name ?? '',
        };
        this.logger.debug(`[Auth] Verified via Supabase API for user ${apiUser.id}`);
        return true;
      }
    } catch (err: any) {
      this.logger.warn(`[Auth] Supabase API fallback failed: ${err?.message}`);
    }

    throw new UnauthorizedException('Invalid or expired token. Please sign in again.');
  }
}
