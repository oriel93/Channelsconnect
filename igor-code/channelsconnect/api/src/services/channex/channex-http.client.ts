/**
 * channex-http.client.ts
 * Production-hardened Channex HTTP client.
 * WHITE-LABEL: Never expose "Channex" in error messages sent to end users.
 *
 * Features:
 *  - 15s AbortController timeout per request
 *  - Exponential backoff retry (3 attempts: 500/1000/2000ms)
 *  - Respects Retry-After header on 429
 *  - No retry on 4xx (except 429) — surfaces auth errors immediately
 *  - Logs every task_id returned for PMS Certification tracking
 */
import { Injectable, Logger } from '@nestjs/common';

const CHANNEX_BASE = 'https://api.channex.io/api/v1';
const TIMEOUT_MS = 15_000;
const MAX_RETRIES = 3;

@Injectable()
export class ChannexHttpClient {
  private readonly logger = new Logger(ChannexHttpClient.name);

  async request<T = any>(
    method: string,
    path: string,
    apiKey: string,
    body?: object,
    attempt = 1,
  ): Promise<T> {
    const url = `${CHANNEX_BASE}${path}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    let res: Response;
    try {
      res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'user-api-key': apiKey,
        },
        signal: controller.signal,
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    } catch (networkErr: any) {
      clearTimeout(timer);
      const isTimeout = networkErr.name === 'AbortError';
      const label = isTimeout ? 'Request timed out' : networkErr.message;
      if (attempt < MAX_RETRIES) {
        const delay = 500 * Math.pow(2, attempt - 1);
        this.logger.warn(`[ChannexHTTP] ${label} — retry ${attempt}/${MAX_RETRIES} in ${delay}ms (${method} ${path})`);
        await this.sleep(delay);
        return this.request(method, path, apiKey, body, attempt + 1);
      }
      throw new Error(`Channel API unreachable after ${MAX_RETRIES} attempts: ${label}`);
    } finally {
      clearTimeout(timer);
    }

    // Retry on 429 rate-limit and 5xx
    if ((res.status === 429 || res.status >= 500) && attempt < MAX_RETRIES) {
      const retryAfter = parseInt(res.headers.get('Retry-After') || '0', 10);
      const delay = retryAfter > 0 ? retryAfter * 1000 : 500 * Math.pow(2, attempt - 1);
      this.logger.warn(`[ChannexHTTP] HTTP ${res.status} — retry ${attempt}/${MAX_RETRIES} in ${delay}ms`);
      await this.sleep(delay);
      return this.request(method, path, apiKey, body, attempt + 1);
    }

    let json: any;
    try {
      json = await res.json();
    } catch {
      throw new Error(`Channel API returned non-JSON response (HTTP ${res.status})`);
    }

    if (!res.ok) {
      const code = json?.errors?.code || res.status;
      const msg = json?.errors?.title || json?.error || `HTTP ${res.status}`;
      const detail = json?.errors?.detail ? ` — ${json.errors.detail}` : '';
      throw new Error(`Channel API error [${code}]: ${msg}${detail}`);
    }

    // Log task_id for PMS Certification tracking (goes to CloudWatch)
    if (json?.meta?.task_id) {
      this.logger.log(`[CHANNEX_CERT_LOG] TASK_ID=${json.meta.task_id} method=${method} path=${path}`);
    }

    return json as T;
  }

  get<T = any>(path: string, apiKey: string): Promise<T> {
    return this.request<T>('GET', path, apiKey);
  }

  post<T = any>(path: string, apiKey: string, body: object): Promise<T> {
    return this.request<T>('POST', path, apiKey, body);
  }

  put<T = any>(path: string, apiKey: string, body: object): Promise<T> {
    return this.request<T>('PUT', path, apiKey, body);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }
}
