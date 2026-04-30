/**
 * channex-http.client.ts
 * Uses NestJS HttpService (@nestjs/axios) — the same transport used by the
 * existing ChannexService that works correctly in ECS. Raw axios.create()
 * and native fetch both fail DNS resolution in this ECS VPC configuration.
 *
 * Features:
 *  - 15s timeout
 *  - Token-bucket rate limiter: ≤ 20 ARI updates per minute per property
 *  - Exponential backoff retry (3 attempts: 500 / 1000 / 2000ms)
 *  - Respects Retry-After header on 429 (Source 19)
 *  - No retry on 4xx auth/validation errors
 *  - [CHANNEX_CERT_LOG] task_id logging for PMS Certification
 */
import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

const CHANNEX_BASE = 'https://staging.channex.io/api/v1';
const TIMEOUT_MS = 15_000;
const MAX_RETRIES = 3;

// ---------------------------------------------------------------------------
// Token-bucket rate limiter (per property, per minute)
// ---------------------------------------------------------------------------
// Channex limit: ≤ 20 ARI updates per minute per property (Source 18).
// We use a simple sliding-window token bucket: each property gets a bucket
// of 20 tokens that refills completely every 60 seconds.  If the bucket is
// empty we wait until the oldest token is 60 s old before proceeding.

const RATE_LIMIT_MAX = 20;          // tokens per window
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute window

interface Bucket {
  tokens: number;          // remaining tokens
  windowStart: number;     // epoch ms when the current window started
}

// ---------------------------------------------------------------------------
// ChannexHttpClient
// ---------------------------------------------------------------------------

@Injectable()
export class ChannexHttpClient {
  private readonly logger = new Logger(ChannexHttpClient.name);

  /** Per-property token buckets — keyed by channexPropertyId. */
  private readonly buckets = new Map<string, Bucket>();

  constructor(private readonly httpService: HttpService) {}

  // -------------------------------------------------------------------------
  // Rate-limit helpers
  // -------------------------------------------------------------------------

  /**
   * Acquire one token for the given property, blocking if the bucket is
   * exhausted until the window resets.  Pass 'global' as the property key
   * for non-ARI calls that don't need per-property tracking.
   */
  private async acquireToken(propertyId: string): Promise<void> {
    const now = Date.now();
    let bucket = this.buckets.get(propertyId);

    if (!bucket || now - bucket.windowStart >= RATE_LIMIT_WINDOW_MS) {
      // Fresh window — full bucket
      bucket = { tokens: RATE_LIMIT_MAX, windowStart: now };
      this.buckets.set(propertyId, bucket);
    }

    if (bucket.tokens > 0) {
      bucket.tokens--;
      return;
    }

    // Bucket exhausted — wait until the current window expires
    const waitMs = RATE_LIMIT_WINDOW_MS - (now - bucket.windowStart);
    this.logger.warn(
      `[Rate Limit Hit] Property ${propertyId} — bucket exhausted (0/${RATE_LIMIT_MAX} tokens). ` +
        `Worker paused ${waitMs}ms until window reset. ` +
        `This is expected behaviour — queue will resume automatically.`,
    );
    await this.sleep(waitMs);

    // Reset bucket after wait
    bucket.tokens = RATE_LIMIT_MAX - 1; // consume 1 for this call
    bucket.windowStart = Date.now();
    this.buckets.set(propertyId, bucket);
  }

  /**
   * Extract the property_id from the request body or URL so we can apply
   * per-property rate limiting.  Defaults to 'global' if not determinable.
   */
  private extractPropertyId(path: string, body?: object): string {
    // From URL query string: ?filter[property_id]=...
    const urlMatch = path.match(/filter\[property_id\]=([^&]+)/);
    if (urlMatch) return urlMatch[1];

    // From POST body: values[0].attributes.property_id
    if (body) {
      const b = body as any;
      const values: any[] = b?.values || [];
      const propId = values[0]?.attributes?.property_id;
      if (propId) return propId;
    }

    return 'global';
  }

  // -------------------------------------------------------------------------
  // Core request method
  // -------------------------------------------------------------------------

  private buildHeaders(apiKey: string) {
    return {
      'Content-Type': 'application/json',
      'user-api-key': apiKey,
    };
  }

  async request<T = any>(
    method: string,
    path: string,
    apiKey: string,
    body?: object,
    attempt = 1,
  ): Promise<T> {
    const url = `${CHANNEX_BASE}${path}`;
    const headers = this.buildHeaders(apiKey);

    // Acquire a rate-limit token before making the request.
    // ARI write calls (POST /ari/bulk_update) are the ones that count against
    // the per-property limit.  Read calls use the 'global' bucket.
    const propertyId = this.extractPropertyId(path, body);
    await this.acquireToken(propertyId);

    try {
      const obs = this.httpService.request<T>({
        method,
        url,
        headers,
        timeout: TIMEOUT_MS,
        ...(body ? { data: body } : {}),
      });

      const res = await firstValueFrom(obs);
      const data: any = res.data;

      // Log task_id for PMS Certification (→ CloudWatch)
      if (data?.meta?.task_id) {
        this.logger.log(
          `[CHANNEX_CERT_LOG] TASK_ID=${data.meta.task_id} method=${method} path=${path}`,
        );
      }

      return data as T;
    } catch (err: any) {
      const axiosErr = err as AxiosError;
      const status = axiosErr.response?.status;
      const responseData: any = axiosErr.response?.data;

      // ── 429 Too Many Requests: honour Retry-After (Source 19) ──────────
      if (status === 429) {
        const retryAfterHeader =
          axiosErr.response?.headers?.['retry-after'] || '0';
        const retryAfterSec = parseInt(retryAfterHeader, 10);
        const delay = retryAfterSec > 0 ? retryAfterSec * 1000 : RATE_LIMIT_WINDOW_MS;

        this.logger.warn(
          `[ChannexHTTP] 429 Too Many Requests — backing off ${delay}ms ` +
            `(Retry-After: ${retryAfterHeader}) prop=${propertyId} attempt=${attempt}`,
        );

        // Reset the property bucket so subsequent calls wait the full window
        this.buckets.delete(propertyId);

        if (attempt < MAX_RETRIES) {
          await this.sleep(delay);
          return this.request(method, path, apiKey, body, attempt + 1);
        }

        throw new Error(
          `Channex rate limit exceeded after ${MAX_RETRIES} attempts (prop=${propertyId})`,
        );
      }

      // ── Non-retryable 4xx ───────────────────────────────────────────────
      if (status && status < 500) {
        const code = responseData?.errors?.code || status;
        const msg =
          responseData?.errors?.title ||
          responseData?.error ||
          `HTTP ${status}`;
        const detail = responseData?.errors?.detail
          ? ` — ${responseData.errors.detail}`
          : '';
        throw new Error(`Channex API error [${code}]: ${msg}${detail}`);
      }

      const errCode = axiosErr.code || '';
      const isDnsError = errCode.startsWith('EAI') || errCode === 'ENOTFOUND';

      if (isDnsError) {
        throw new Error(
          `Channex DNS error (${errCode}) — api.channex.io unreachable`,
        );
      }

      // ── Exponential backoff retry for 5xx / timeout / network errors ────
      if (attempt < MAX_RETRIES) {
        // Source 19: exponential backoff — 500ms, 1000ms, 2000ms
        const delay = 500 * Math.pow(2, attempt - 1);

        const label =
          errCode === 'ECONNABORTED'
            ? 'Request timed out'
            : status
            ? `HTTP ${status}`
            : axiosErr.message;

        this.logger.warn(
          `[ChannexHTTP] ${label} — retry ${attempt}/${MAX_RETRIES} in ${delay}ms (${method} ${path})`,
        );
        await this.sleep(delay);
        return this.request(method, path, apiKey, body, attempt + 1);
      }

      const finalCode = axiosErr.code || '';
      const finalLabel =
        finalCode === 'ECONNABORTED'
          ? 'Request timed out after 15s'
          : finalCode.startsWith('EAI') || finalCode === 'ENOTFOUND'
          ? `DNS resolution failed for api.channex.io (code: ${finalCode})`
          : axiosErr.message;

      throw new Error(
        `Channex unreachable after ${MAX_RETRIES} attempts: ${finalLabel}`,
      );
    }
  }

  // -------------------------------------------------------------------------
  // Convenience wrappers
  // -------------------------------------------------------------------------

  get<T = any>(path: string, apiKey: string): Promise<T> {
    return this.request<T>('GET', path, apiKey);
  }

  post<T = any>(path: string, apiKey: string, body: object): Promise<T> {
    return this.request<T>('POST', path, apiKey, body);
  }

  put<T = any>(path: string, apiKey: string, body: object): Promise<T> {
    return this.request<T>('PUT', path, apiKey, body);
  }

  patch<T = any>(path: string, apiKey: string, body: object): Promise<T> {
    return this.request<T>('PATCH', path, apiKey, body);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }
}
