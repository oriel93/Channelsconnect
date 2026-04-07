import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { jwtVerify, createRemoteJWKSet, JWTPayload } from 'jose';

export interface SupabaseJwtPayload extends JWTPayload {
  sub: string; // User ID
  email?: string;
  user_metadata?: {
    full_name?: string;
    [key: string]: any;
  };
  app_metadata?: {
    [key: string]: any;
  };
  role?: string;
  aal?: string;
  amr?: Array<{ method: string; timestamp: number }>;
  session_id?: string;
}

@Injectable()
export class SupabaseService {
  private supabase: SupabaseClient;
  private supabaseUrl: string;
  private jwks: ReturnType<typeof createRemoteJWKSet>;

  constructor() {
    this.supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!this.supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables');
    }

    this.supabase = createClient(this.supabaseUrl, supabaseKey);

    // Create remote JWKS for JWT verification (ES256 asymmetric keys)
    const jwksUrl = new URL(`${this.supabaseUrl}/auth/v1/.well-known/jwks.json`);
    this.jwks = createRemoteJWKSet(jwksUrl);
  }

  /**
   * Verify JWT token using Supabase JWKS (ES256)
   * Extracts user ID directly from the token without calling Supabase API
   */
  async verifyToken(token: string): Promise<SupabaseJwtPayload | null> {
    try {
      const { payload } = await jwtVerify(token, this.jwks, {
        issuer: `${this.supabaseUrl}/auth/v1`,
        algorithms: ['ES256', 'HS256'],
      });

      if (!payload.sub) {
        return null;
      }

      return payload as SupabaseJwtPayload;
    } catch {
      return null;
    }
  }

  /**
   * Legacy method: Verify token by calling Supabase API
   * Use this as a fallback if local verification fails
   */
  async verifyTokenWithApi(token: string) {
    const { data, error } = await this.supabase.auth.getUser(token);

    if (error || !data.user) {
      return null;
    }

    return data.user;
  }

  getClient(): SupabaseClient {
    return this.supabase;
  }
}
