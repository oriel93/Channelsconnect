/**
 * channex-sync.service.ts
 * Self-Healing Channex Sync Engine — NestJS + Prisma
 *
 * Drop this into: igor-code/channelsconnect/api/src/channex/
 * Then add ChannexSyncModule to app.module.ts imports.
 *
 * Architecture:
 *  - MappingService    : validates listing → Channex IDs before any push
 *  - QueueService      : DB-backed queue with last-write-wins dedup
 *  - ARIPushService    : pushes to Channex, handles 422/409 conflicts
 *  - ChannexSyncService: atomic applyChange + queue drain + parity check
 */

import {
  Injectable,
  Logger,
  BadRequestException,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ARIUpdate {
  listingId: number;       // our local Listing.id
  date: string;            // ISO date string 'YYYY-MM-DD'
  price?: number;
  available?: boolean;
  minStay?: number;
}

export interface ParityReport {
  checked: number;
  matched: number;
  parityPct: string;
  details: ParityDetail[];
}

interface ParityDetail {
  listingId: number;
  date: string;
  local?: { price: number | null; available: boolean | null };
  channex?: { price: number | null; availability: number | null };
  match?: boolean;
  status?: string;
  error?: string;
}

// ---------------------------------------------------------------------------
// Channex HTTP helper
// ---------------------------------------------------------------------------

const CHANNEX_BASE = 'https://api.channex.io/api/v1';

async function channexRequest(
  method: string,
  path: string,
  apiKey: string,
  body?: object,
) {
  const res = await fetch(`${CHANNEX_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'user-api-key': apiKey,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const json = await res.json();

  if (!res.ok) {
    const err = Array.isArray(json?.errors) ? json.errors[0] : json?.errors;
    const msg = err?.detail || err?.title || err?.code || `HTTP ${res.status}`;
    const error: any = new Error(`Channex: ${msg}`);
    error.status = res.status;
    error.body = json;
    throw error;
  }

  return json;
}

async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  attempt = 0,
): Promise<T> {
  try {
    return await fn();
  } catch (err: any) {
    const isRetryable = !err.status || err.status === 429 || err.status >= 500;
    if (isRetryable && attempt < retries) {
      const delay = 1000 * Math.pow(2, attempt);
      await new Promise((r) => setTimeout(r, delay));
      return withRetry(fn, retries, attempt + 1);
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// ChannexSyncService
// ---------------------------------------------------------------------------

@Injectable()
export class ChannexSyncService implements OnModuleInit {
  private readonly logger = new Logger(ChannexSyncService.name);

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    this.logger.log('ChannexSyncService initialised');
  }

  // -------------------------------------------------------------------------
  // 1. Mapping: resolve local Listing → Channex IDs
  // -------------------------------------------------------------------------

  /**
   * Resolves the Channex property_id and room_type_id for a local listing.
   * Uses ChannelConnection (channelId for Channex) + Listing.beds24PropId/beds24RoomId
   * as the mapping store until a dedicated channex_mappings table exists.
   *
   * If the mapping is missing, triggers a background refresh and throws.
   */
  private async resolveChannexIds(
    listingId: number,
    apiKey: string,
  ): Promise<{ channexPropertyId: string; channexRoomTypeId: string }> {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      include: { icalConnections: true },
    });

    if (!listing) {
      throw new BadRequestException(`Listing ${listingId} not found`);
    }

    // We store channex IDs in beds24PropId/beds24RoomId until migration adds
    // dedicated columns — swap these out once you run the migration below.
    const channexPropertyId = listing.beds24PropId;
    const channexRoomTypeId = listing.beds24RoomId;

    if (!channexPropertyId || !channexRoomTypeId) {
      this.logger.error(
        `[MappingService] Missing Channex IDs for listing ${listingId} — triggering refresh`,
      );
      // Non-blocking background refresh
      setImmediate(() => this.refreshMappingsForListing(listingId, apiKey));
      throw new MappingMissingError(
        `No Channex mapping for listing ${listingId}`,
      );
    }

    return { channexPropertyId, channexRoomTypeId };
  }

  /**
   * Pulls room_types from Channex and stores the IDs back on the Listing.
   * Called automatically when a mapping is missing.
   */
  async refreshMappingsForListing(listingId: number, apiKey: string) {
    try {
      const listing = await this.prisma.listing.findUnique({
        where: { id: listingId },
      });
      if (!listing) return;

      const json = await withRetry(() =>
        channexRequest('GET', '/room_types', apiKey),
      );

      const roomTypes: any[] = json?.data || [];
      // Match by title as fallback if no local_id meta is set
      const match = roomTypes.find(
        (rt) =>
          rt.attributes?.meta?.local_listing_id === listingId ||
          rt.attributes?.title === listing.title,
      );

      if (match) {
        await this.prisma.listing.update({
          where: { id: listingId },
          data: {
            beds24RoomId: match.id,
            beds24PropId: match.attributes?.property_id,
          },
        });
        this.logger.log(
          `[MappingService] Refreshed Channex IDs for listing ${listingId}`,
        );
      } else {
        this.logger.warn(
          `[MappingService] Could not match listing ${listingId} to any Channex room type`,
        );
      }
    } catch (err: any) {
      this.logger.error(
        `[MappingService] Refresh failed for listing ${listingId}: ${err.message}`,
      );
    }
  }

  // -------------------------------------------------------------------------
  // 2. Queue: DB-backed, last-write-wins dedup on (listingId, date)
  // -------------------------------------------------------------------------

  private dedupKey(listingId: number, date: string) {
    return `${listingId}::${date}`;
  }

  private async enqueue(update: ARIUpdate): Promise<void> {
    const key = this.dedupKey(update.listingId, update.date);

    // Use a raw upsert — SyncLog doubles as our queue here via status='pending'
    // We store the payload in details (Json column).
    const existing = await this.prisma.syncLog.findFirst({
      where: {
        syncType: 'channex_ari',
        status: 'pending',
        message: key,
      },
    });

    if (existing) {
      await this.prisma.syncLog.update({
        where: { id: existing.id },
        data: { details: update as unknown as Prisma.JsonObject },
      });
      this.logger.log(`[Queue] Overwrote pending job for ${key}`);
    } else {
      await this.prisma.syncLog.create({
        data: {
          userId: 'system',
          syncType: 'channex_ari',
          entityType: 'rate',
          status: 'pending',
          message: key,
          details: update as unknown as Prisma.JsonObject,
        },
      });
      this.logger.log(`[Queue] Enqueued new job for ${key}`);
    }
  }

  // -------------------------------------------------------------------------
  // 3. ARI Push with conflict resolution
  // -------------------------------------------------------------------------

  private async pushToChannex(update: ARIUpdate, apiKey: string): Promise<void> {
    const { channexPropertyId, channexRoomTypeId } =
      await this.resolveChannexIds(update.listingId, apiKey);

    const payload = {
      values: [
        {
          type: 'availability',
          attributes: {
            property_id: channexPropertyId,
            room_type_id: channexRoomTypeId,
            date_from: update.date,
            date_to: update.date,
            ...(update.available !== undefined && {
              availability: update.available ? 1 : 0,
            }),
          },
        },
        ...(update.price !== undefined
          ? [
              {
                type: 'rates',
                attributes: {
                  property_id: channexPropertyId,
                  room_type_id: channexRoomTypeId,
                  date_from: update.date,
                  date_to: update.date,
                  rate: update.price,
                  ...(update.minStay && { min_stay_arrival: update.minStay }),
                },
              },
            ]
          : []),
      ],
    };

    try {
      await withRetry(() =>
        channexRequest('POST', '/ari/bulk_update', apiKey, payload),
      );
      this.logger.log(
        `[ARI] Push succeeded listing=${update.listingId} date=${update.date}`,
      );
    } catch (err: any) {
      if (err.status === 422 || err.status === 409) {
        await this.handleConflict(update, channexPropertyId, apiKey);
        return;
      }
      throw err;
    }
  }

  /**
   * On 422/409: fetch Channex ground truth, reconcile local Rate + Calendar rows.
   */
  private async handleConflict(
    update: ARIUpdate,
    channexPropertyId: string,
    apiKey: string,
  ) {
    this.logger.warn(
      `[ARI] Conflict for listing=${update.listingId} date=${update.date} — reconciling`,
    );

    try {
      const json = await withRetry(() =>
        channexRequest(
          'GET',
          `/ari?filter[property_id]=${channexPropertyId}&filter[date][gte]=${update.date}&filter[date][lte]=${update.date}`,
          apiKey,
        ),
      );

      const attrs = json?.data?.[0]?.attributes;
      if (!attrs) return;

      const channexPrice = attrs.rate ? parseFloat(attrs.rate) : null;
      const channexAvail = attrs.availability > 0;

      // Reconcile Rate table
      await this.prisma.rate.upsert({
        where: { listingId_date: { listingId: update.listingId, date: new Date(update.date) } },
        update: {
          price: channexPrice ?? update.price ?? 0,
          available: channexAvail,
        },
        create: {
          listingId: update.listingId,
          date: new Date(update.date),
          price: channexPrice ?? update.price ?? 0,
          available: channexAvail,
        },
      });

      this.logger.warn(
        `[ARI] Reconciled listing=${update.listingId} date=${update.date} ` +
          `channex_price=${channexPrice} channex_avail=${channexAvail} ` +
          `local_price_was=${update.price}`,
      );

      await this.prisma.syncLog.create({
        data: {
          userId: 'system',
          syncType: 'channex_ari',
          entityType: 'rate',
          status: 'failed',
          message: `Conflict reconciled for listing ${update.listingId} date ${update.date}`,
          details: ({ update, channex: { price: channexPrice, available: channexAvail } } as unknown) as Prisma.JsonObject,
        },
      });
    } catch (reconcileErr: any) {
      this.logger.error(`[ARI] Reconciliation failed: ${reconcileErr.message}`);
    }
  }

  // -------------------------------------------------------------------------
  // 4. Public API — called by your controllers/frontend
  // -------------------------------------------------------------------------

  /**
   * Atomic: updates local Rate row + enqueues sync job in one transaction.
   * Rolls back if queueing fails. This is the only method your frontend
   * should call when a user changes a price or availability.
   */
  async applyChange(update: ARIUpdate, apiKey: string): Promise<void> {
    // Validate mapping exists BEFORE opening transaction
    await this.resolveChannexIds(update.listingId, apiKey);

    await this.prisma.$transaction(async (tx) => {
      // 1. Write to local Rate table
      await tx.rate.upsert({
        where: {
          listingId_date: {
            listingId: update.listingId,
            date: new Date(update.date),
          },
        },
        update: {
          ...(update.price !== undefined && { price: update.price }),
          ...(update.available !== undefined && { available: update.available }),
          ...(update.minStay !== undefined && { minStay: update.minStay }),
        },
        create: {
          listingId: update.listingId,
          date: new Date(update.date),
          price: update.price ?? 0,
          available: update.available ?? true,
          minStay: update.minStay,
        },
      });

      // 2. Enqueue — if this throws, DB write rolls back
      await this.enqueue(update);
    });

    this.logger.log(
      `[Sync] Change committed & queued listing=${update.listingId} date=${update.date}`,
    );
  }

  /**
   * Worker: drains pending queue jobs and pushes to Channex.
   * Runs every 30 seconds via cron. Also callable manually.
   */
  @Cron(CronExpression.EVERY_30_SECONDS)
  async drainQueue(apiKey?: string) {
    // When called by the scheduler, apiKey is undefined — use master key from env
    const key = apiKey || process.env.CHANNEX_API_KEY || '';
    if (!key) {
      this.logger.warn('[Queue] CHANNEX_API_KEY not set — skipping drain');
      return;
    }
    apiKey = key;
    const pendingJobs = await this.prisma.syncLog.findMany({
      where: { status: 'pending' },
      take: 10,
    });

    for (const job of pendingJobs) {
      try {
        // We add a 'MAX_RETRIES' check here to prevent the 30s hang
        await this.processJobWithRetry(job, apiKey);
      } catch (error) {
        // If it fails after retries, we MUST update the status to 'failed'
        // so it doesn't try again forever.
        await this.prisma.syncLog.update({
          where: { id: job.id },
          data: { 
            status: 'failed',             
          },
        });
        this.logger.error(`Job ${job.id} gave up after 3 tries.`);
      }
    }
  }

  private async processJobWithRetry(job: any, apiKey: string, attempt = 1) {
    const MAX_RETRIES = 3;

    try {
      await this.pushToChannex(job.details, apiKey);
      await this.prisma.syncLog.update({
        where: { id: job.id },
        data: { status: 'synced' },
      });
    } catch (error) {
      // If we haven't hit the limit yet, wait and try again
      if (attempt <= MAX_RETRIES) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(res => setTimeout(res, delay));
        return this.processJobWithRetry(job, apiKey, attempt + 1);
      }
      // If we hit 3 tries, throw the error to stop the loop
      throw error;
    }
  }

  /**
   * Parity check: compares N random Rate rows against live Channex values.
   */
  async runParityCheck(apiKey: string, sampleSize = 10): Promise<ParityReport> {
    const samples = await this.prisma.$queryRaw<
      { id: number; listingId: number; date: Date; price: any; available: boolean }[]
    >`SELECT id, "listingId", date, price, available FROM rates ORDER BY RANDOM() LIMIT ${sampleSize}`;

    let matched = 0;
    const details: ParityDetail[] = [];

    for (const row of samples) {
      const dateStr = row.date.toISOString().split('T')[0];
      try {
        const listing = await this.prisma.listing.findUnique({
          where: { id: row.listingId },
        });

        if (!listing?.beds24PropId) {
          details.push({ listingId: row.listingId, date: dateStr, status: 'no_mapping' });
          continue;
        }

        const json = await channexRequest(
          'GET',
          `/ari?filter[property_id]=${listing.beds24PropId}&filter[date][gte]=${dateStr}&filter[date][lte]=${dateStr}`,
          apiKey,
        );

        const attrs = json?.data?.[0]?.attributes;
        const channexPrice = attrs?.rate ? parseFloat(attrs.rate) : null;
        const channexAvail = attrs?.availability ?? null;

        const priceMatch =
          channexPrice === null || Math.abs(channexPrice - parseFloat(row.price)) < 0.01;
        const availMatch =
          channexAvail === null ||
          (channexAvail > 0) === row.available;

        const match = priceMatch && availMatch;
        if (match) matched++;

        details.push({
          listingId: row.listingId,
          date: dateStr,
          local: { price: parseFloat(row.price), available: row.available },
          channex: { price: channexPrice, availability: channexAvail },
          match,
        });
      } catch (err: any) {
        details.push({ listingId: row.listingId, date: dateStr, status: 'error', error: err.message });
      }
    }

    const parityPct =
      samples.length > 0
        ? ((matched / samples.length) * 100).toFixed(1)
        : 'N/A';

    this.logger.log(
      `[Parity] ${matched}/${samples.length} matched (${parityPct}%)`,
    );

    return { checked: samples.length, matched, parityPct, details };
  }
}

// ---------------------------------------------------------------------------
// Custom error
// ---------------------------------------------------------------------------
export class MappingMissingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MappingMissingError';
  }
}
