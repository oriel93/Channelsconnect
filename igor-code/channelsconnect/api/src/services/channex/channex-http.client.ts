/**
 * channex-http.client.ts
 * Uses NestJS HttpService (@nestjs/axios) — the same transport used by the
 * existing ChannexService that works correctly in ECS. Raw axios.create()
 * and native fetch both fail DNS resolution in this ECS VPC configuration.
 *
 * Features:
 *  - 15s timeout
 *  - Exponential backoff retry (3 attempts: 500 / 1000 / 2000ms)
 *  - Respects Retry-After on 429
 *  - No retry on 4xx auth/validation errors
 *  - [CHANNEX_CERT_LOG] task_id logging for PMS Certification
 */
import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

const CHANNEX_BASE = 'https://api.channex.io/api/v1';
const TIMEOUT_MS = 15_000;
const MAX_RETRIES = 3;

@Injectable()
export class ChannexHttpClient {
  private readonly logger = new Logger(ChannexHttpClient.name);

  constructor(private readonly httpService: HttpService) {}

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

      // Do not retry on client errors (4xx) except rate-limit (429)
      if (status && status !== 429 && status < 500) {
        const code = responseData?.errors?.code || status;
        const msg =
          responseData?.errors?.title ||
          responseData?.error ||
          `HTTP ${status}`;
        const detail = responseData?.errors?.detail
          ? ` — ${responseData.errors.detail}`
          : '';
        throw new Error(`Channel API error [${code}]: ${msg}${detail}`);
      }

      const errCode = axiosErr.code || '';
      const isDnsError = errCode.startsWith('EAI') || errCode === 'ENOTFOUND';

      // DNS errors: fail immediately — no point retrying within the same request
      // (DNS will not resolve in 500ms; we handle fallback in the caller)
      if (isDnsError) {
        throw new Error(
          `Channel API DNS error (${errCode}) — api.channex.io unreachable`,
        );
      }

      // Retry on timeout, network error (non-DNS), 429, or 5xx
      if (attempt < MAX_RETRIES) {
        let delay = 500 * Math.pow(2, attempt - 1);
        if (status === 429) {
          const ra = parseInt(
            axiosErr.response?.headers?.['retry-after'] || '0',
            10,
          );
          if (ra > 0) delay = ra * 1000;
        }

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
        `Channel API unreachable after ${MAX_RETRIES} attempts: ${finalLabel}`,
      );
    }
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
