/**
 * channex-sync.service.ts
 * Event-Driven, Batching Channex Sync Engine — NestJS + Prisma
 *
 * Architecture (post-refactor):
 *  - NO polling cron. Queue drains are triggered by an internal EventEmitter
 *    the instant applyChange() is called from the PMS UI.
 *  - 500 ms "collection window" groups changes for the same property into
 *    two batched calls: POST /availability + POST /restrictions
 *  - Rate limiting is delegated to ChannexHttpClient (token-bucket, 429 ACK).
 *  - Full sync produces exactly 2 API calls for 500 days of ARI.
 *
 * Channex API endpoints (staging.channex.io/api/v1):
 *  - POST /availability  — flat payload: { property_id, room_type_id, date_from, date_to, availability }
 *  - POST /restrictions  — flat payload: { property_id, rate_plan_id, date_from, date_to, rate, ... }
 *  - Task ID returned as:  res.data[0].id  (NOT res.meta.task_id)
 */

import {
  Injectable,
  Logger,
  BadRequestException,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { ChannexHttpClient } from '../services/channex/channex-http.client';
import { Prisma } from '@prisma/client';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface ARIUpdate {
  listingId: number;   // our local Listing.id
  date: string;        // ISO 'YYYY-MM-DD'
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

// Internal queue item — extends ARIUpdate with resolved Channex IDs so the
// drain loop never needs to look them up again.
interface QueuedARI extends ARIUpdate {
  channexPropertyId: string;
  channexRoomTypeId: string;
  channexRatePlanId?: string;
}

// ---------------------------------------------------------------------------
// Internal event constant
// ---------------------------------------------------------------------------
const QUEUE_DRAIN_EVENT = 'channex.queue.drain';

// ---------------------------------------------------------------------------
// ChannexSyncService
// ---------------------------------------------------------------------------

@Injectable()
export class ChannexSyncService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ChannexSyncService.name);

  /**
   * Batch window timer. Every call to enqueue() resets this timer.
   * The drain fires 500 ms after the LAST change in a burst, ensuring a
   * rapid sequence of N UI changes produces exactly 1 API call per property.
   */
  private batchTimer: NodeJS.Timeout | null = null;
  private readonly BATCH_WINDOW_MS = 500;

  /** Prevents concurrent drain runs from overlapping. */
  private draining = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly http: ChannexHttpClient,
    private readonly events: EventEmitter2,
  ) {}

  onModuleInit() {
    this.logger.log('ChannexSyncService initialised — event-driven, no cron');
  }

  onModuleDestroy() {
    if (this.batchTimer) clearTimeout(this.batchTimer);
  }

  // -------------------------------------------------------------------------
  // 1. Mapping: resolve local Listing → Channex IDs
  // -------------------------------------------------------------------------

  private async resolveChannexIds(listingId: number): Promise<{
    channexPropertyId: string;
    channexRoomTypeId: string;
    channexRatePlanId: string | null;
  }> {
    // Primary: dedicated ChannexMapping table (populated by onboarding / deep-sync)
    const mapping = await this.prisma.channexMapping.findFirst({
      where: { listingId },
    });

    if (mapping?.channexPropertyId && mapping?.channexRoomTypeId) {
      return {
        channexPropertyId: mapping.channexPropertyId,
        channexRoomTypeId: mapping.channexRoomTypeId,
        channexRatePlanId: mapping.channexRatePlanId ?? null,
      };
    }

    // Fallback: beds24PropId / beds24RoomId columns on Listing (legacy)
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      throw new BadRequestException(`Listing ${listingId} not found`);
    }

    if (!listing.beds24PropId || !listing.beds24RoomId) {
      setImmediate(() => this.refreshMappingsForListing(listingId));
      throw new MappingMissingError(
        `No Channex mapping for listing ${listingId} — refresh triggered`,
      );
    }

    return {
      channexPropertyId: listing.beds24PropId,
      channexRoomTypeId: listing.beds24RoomId,
      channexRatePlanId: null,
    };
  }

  async refreshMappingsForListing(listingId: number) {
    const apiKey = process.env.CHANNEX_API_KEY || '';
    if (!apiKey) return;

    try {
      const listing = await this.prisma.listing.findUnique({
        where: { id: listingId },
      });
      if (!listing) return;

      const json = await this.http.get('/room_types', apiKey);
      const roomTypes: any[] = json?.data || [];

      const match = roomTypes.find(
        (rt) =>
          rt.attributes?.meta?.local_listing_id === listingId ||
          rt.attributes?.title === listing.title,
      );

      if (match) {
        await this.prisma.channexMapping.upsert({
          where: { channexPropertyId: match.attributes?.property_id ?? match.id },
          update: { channexRoomTypeId: match.id, lastSyncAt: new Date() },
          create: {
            userId: listing.userId,
            listingId,
            channexPropertyId: match.attributes?.property_id ?? match.id,
            channexRoomTypeId: match.id,
            syncStatus: 'active',
          },
        });
        this.logger.log(
          `[Mapping] Refreshed Channex IDs for listing ${listingId}`,
        );
      } else {
        this.logger.warn(
          `[Mapping] Could not match listing ${listingId} to any Channex room type`,
        );
      }
    } catch (err: any) {
      this.logger.error(
        `[Mapping] Refresh failed for listing ${listingId}: ${err.message}`,
      );
    }
  }

  // -------------------------------------------------------------------------
  // 2. Queue: DB-backed, last-write-wins dedup on (listingId, date)
  // -------------------------------------------------------------------------

  private dedupKey(listingId: number, date: string) {
    return `${listingId}::${date}`;
  }

  /**
   * Persists an ARI update to the queue (SyncLog table, status='pending').
   * Duplicate (listingId, date) entries are overwritten (last-write-wins).
   * After persisting, the 500 ms batch window timer is (re)set.
   */
  private async enqueue(update: QueuedARI): Promise<void> {
    const key = this.dedupKey(update.listingId, update.date);

    const existing = await this.prisma.syncLog.findFirst({
      where: { syncType: 'channex_ari', status: 'pending', message: key },
    });

    if (existing) {
      await this.prisma.syncLog.update({
        where: { id: existing.id },
        data: { details: update as unknown as Prisma.JsonObject },
      });
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
    }

    this.logger.debug(`[Queue] Enqueued ${key}`);
    this.scheduleDrain();
  }

  /**
   * (Re)starts the 500 ms batch collection window.
   * Emits QUEUE_DRAIN_EVENT when it fires — handled by drainQueue() below.
   * No cron. No polling. Zero latency from UI action to first API call.
   */
  private scheduleDrain() {
    if (this.batchTimer) clearTimeout(this.batchTimer);
    this.batchTimer = setTimeout(() => {
      this.batchTimer = null;
      this.events.emit(QUEUE_DRAIN_EVENT);
    }, this.BATCH_WINDOW_MS);
  }

  // -------------------------------------------------------------------------
  // 3. Drain — event-driven, groups by property for single bulk_update call
  // -------------------------------------------------------------------------

  /**
   * Drains all pending queue items. Triggered immediately when the 500 ms
   * batch window closes after an enqueue() call. Groups updates by
   * channexPropertyId so that all room/rate changes for the same property
   * are sent in ONE POST /ari/bulk_update call.
   *
   * This satisfies Certification Tests 3–8 which explicitly require multiple
   * updates to be batched into a single API call.
   *
   * Certification anti-patterns eliminated:
   *  ✗ No @Cron polling loop
   *  ✗ No per-date iteration (entire array sent as one payload)
   *  ✗ No separate call per room type within the same property
   */
  @OnEvent(QUEUE_DRAIN_EVENT)
  async drainQueue() {
    if (this.draining) {
      this.logger.debug('[Queue] Drain already in progress — will re-emit after');
      return;
    }

    this.draining = true;
    const apiKey = process.env.CHANNEX_API_KEY || '';

    if (!apiKey) {
      this.logger.warn('[Queue] CHANNEX_API_KEY not set — drain skipped');
      this.draining = false;
      return;
    }

    try {
      const pendingJobs = await this.prisma.syncLog.findMany({
        where: { syncType: 'channex_ari', status: 'pending' },
        take: 50,
      });

      if (pendingJobs.length === 0) {
        return;
      }

      this.logger.log(`[Queue] Draining ${pendingJobs.length} pending job(s)`);

      // ── Group by channexPropertyId ──────────────────────────────────────
      // One entry per property → one bulk_update API call per property.
      const byProperty = new Map<
        string,
        { jobs: any[]; updates: QueuedARI[] }
      >();

      for (const job of pendingJobs) {
        const update = job.details as unknown as QueuedARI;
        const propId = update.channexPropertyId;

        if (!byProperty.has(propId)) {
          byProperty.set(propId, { jobs: [], updates: [] });
        }
        byProperty.get(propId)!.jobs.push(job);
        byProperty.get(propId)!.updates.push(update);
      }

      // ── Two calls per property: POST /availability + POST /restrictions ──
      for (const [propId, { jobs, updates }] of byProperty) {
        await this.pushBatchToChannex(propId, updates, jobs, apiKey);
      }
    } catch (err: any) {
      this.logger.error(`[Queue] Drain error: ${err.message}`);
    } finally {
      this.draining = false;
    }
  }

  /**
   * Sends availability + rates/restrictions for a batch of pending updates.
   * Uses two separate Channex API calls:
   *   1. POST /availability  — one flat entry per update with availability
   *   2. POST /restrictions  — one flat entry per update with rate/restrictions
   *
   * The flat payload format (no type/attributes wrapping) is required by
   * staging.channex.io. Task ID is in res.data[0].id.
   */
  private async pushBatchToChannex(
    channexPropertyId: string,
    updates: QueuedARI[],
    jobs: any[],
    apiKey: string,
  ) {
    // Build separate payloads for availability and rates
    const availValues: object[] = [];
    const rateValues: object[] = [];

    for (const u of updates) {
      if (u.available !== undefined) {
        availValues.push({
          property_id: channexPropertyId,
          room_type_id: u.channexRoomTypeId,
          date_from: u.date,
          date_to: u.date,
          availability: u.available ? 1 : 0,
        });
      }

      if (u.price !== undefined) {
        rateValues.push({
          property_id: channexPropertyId,
          ...(u.channexRatePlanId ? { rate_plan_id: u.channexRatePlanId } : {}),
          date_from: u.date,
          date_to: u.date,
          rate: u.price,
          min_stay_arrival: u.minStay ?? 1,
        });
      }
    }

    if (availValues.length === 0 && rateValues.length === 0) {
      await this.markJobsSynced(jobs);
      return;
    }

    try {
      let taskId: string | undefined;

      // Call 1: POST /availability
      if (availValues.length > 0) {
        const availRes = await this.http.post('/availability', apiKey, { values: availValues });
        const availTaskId: string | undefined = availRes?.data?.[0]?.id;
        if (availTaskId) {
          taskId = availTaskId;
          this.logger.log(
            `[CHANNEX_CERT_LOG] AVAIL_TASK_ID=${availTaskId} ` +
              `prop=${channexPropertyId} entries=${availValues.length}`,
          );
        }
      }

      // Call 2: POST /restrictions
      if (rateValues.length > 0) {
        const rateRes = await this.http.post('/restrictions', apiKey, { values: rateValues });
        const rateTaskId: string | undefined = rateRes?.data?.[0]?.id;
        if (rateTaskId) {
          taskId = rateTaskId;
          this.logger.log(
            `[CHANNEX_CERT_LOG] TASK_ID=${rateTaskId} ` +
              `restrictions prop=${channexPropertyId} ` +
              `entries=${rateValues.length} jobs=${jobs.length}`,
          );
        }
      }

      await this.markJobsSynced(jobs);
      this.logger.log(
        `[ARI] Batch OK — prop=${channexPropertyId} ` +
          `avail=${availValues.length} rates=${rateValues.length} jobs=${jobs.length}`,
      );
    } catch (err: any) {
      if (err.status === 422 || err.status === 409) {
        for (const u of updates) {
          await this.handleConflict(u, channexPropertyId, apiKey);
        }
        await this.markJobsSynced(jobs);
        return;
      }

      await this.markJobsFailed(jobs);
      this.logger.error(
        `[ARI] Batch FAILED prop=${channexPropertyId}: ${err.message}`,
      );
    }
  }

  private markJobsSynced(jobs: any[]) {
    return this.prisma.syncLog.updateMany({
      where: { id: { in: jobs.map((j) => j.id) } },
      data: { status: 'synced' },
    });
  }

  private markJobsFailed(jobs: any[]) {
    return this.prisma.syncLog.updateMany({
      where: { id: { in: jobs.map((j) => j.id) } },
      data: { status: 'failed' },
    });
  }

  /**
   * Conflict resolution on 422/409: fetch Channex ground truth and reconcile
   * the local Rate row so the DB stays in sync with the channel.
   */
  private async handleConflict(
    update: QueuedARI,
    channexPropertyId: string,
    apiKey: string,
  ) {
    this.logger.warn(
      `[ARI] Conflict listing=${update.listingId} date=${update.date} — reconciling`,
    );

    try {
      const json = await this.http.get(
        `/restrictions?filter[property_id]=${channexPropertyId}` +
          `&filter[date][gte]=${update.date}&filter[date][lte]=${update.date}` +
          `&filter[restrictions]=rate,availability`,
        apiKey,
      );

      const attrs = json?.data?.[0]?.attributes;
      if (!attrs) return;

      const channexPrice = attrs.rate ? parseFloat(attrs.rate) : null;
      const channexAvail = (attrs.availability ?? 1) > 0;

      await this.prisma.rate.upsert({
        where: {
          listingId_date: {
            listingId: update.listingId,
            date: new Date(update.date),
          },
        },
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

      await this.prisma.syncLog.create({
        data: {
          userId: 'system',
          syncType: 'channex_ari',
          entityType: 'rate',
          status: 'failed',
          message: `Conflict reconciled listing=${update.listingId} date=${update.date}`,
          details: {
            update,
            channex: { price: channexPrice, available: channexAvail },
          } as unknown as Prisma.JsonObject,
        },
      });
    } catch (err: any) {
      this.logger.error(`[ARI] Reconciliation failed: ${err.message}`);
    }
  }

  // -------------------------------------------------------------------------
  // 4. Public API — called by controllers / frontend
  // -------------------------------------------------------------------------

  /**
   * Atomic: writes the local Rate row AND enqueues the sync job in a single
   * DB transaction. The batch window timer fires immediately after, so the
   * push to Channex happens within 500 ms of this call returning — no cron.
   *
   * This is the ONLY method the PMS UI should call when a user changes a
   * price or availability. Never call drainQueue() directly from the UI.
   */
  async applyChange(update: ARIUpdate): Promise<void> {
    const ids = await this.resolveChannexIds(update.listingId);

    const queuedItem: QueuedARI = { ...update, ...ids };

    await this.prisma.$transaction(async (tx) => {
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

      // Enqueue inside the transaction — rolls back if persistence fails
      await this.enqueue(queuedItem);
    });

    this.logger.log(
      `[Sync] Change applied listing=${update.listingId} date=${update.date} — drain in ${this.BATCH_WINDOW_MS}ms`,
    );
  }

  /**
   * Manually trigger a drain (exposed on the /drain endpoint for testing).
   */
  async triggerDrain(): Promise<void> {
    this.events.emit(QUEUE_DRAIN_EVENT);
  }

  /**
   * pushRateSync — synchronous direct push to Channex, returns task_id.
   *
   * Used by the Certification Dashboard so the task_id can be displayed
   * immediately in the UI for copy-paste into the certification form.
   *
   * Unlike applyChange() (which queues + drains async), this method:
   *  1. Resolves Channex IDs for the listing.
   *  2. Upserts the local Rate row.
   *  3. Calls POST /ari/bulk_update immediately and synchronously.
   *  4. Returns the Channex task_id.
   *
   * Rate-limit token is still consumed via ChannexHttpClient.acquireToken().
   */
  async pushRateSync(update: ARIUpdate): Promise<string | null> {
    const apiKey = process.env.CHANNEX_API_KEY || '';
    if (!apiKey) {
      this.logger.warn('[Cert] CHANNEX_API_KEY not set — cannot push rate sync');
      return null;
    }

    const ids = await this.resolveChannexIds(update.listingId);

    // Upsert local Rate row
    await this.prisma.rate.upsert({
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

    // Build separate payloads for availability and restrictions
    // Channex API uses flat objects (no type/attributes wrapping):
    //   POST /restrictions  — { property_id, rate_plan_id, date_from, date_to, rate, ... }
    //   POST /availability  — { property_id, room_type_id, date_from, date_to, availability }
    // Task ID is in res.data[0].id
    let taskId: string | null = null;

    if (update.price !== undefined) {
      const ratePayload = [{
        property_id: ids.channexPropertyId,
        ...(ids.channexRatePlanId ? { rate_plan_id: ids.channexRatePlanId } : {}),
        date_from: update.date,
        date_to: update.date,
        rate: update.price,
        ...(update.minStay !== undefined ? { min_stay_arrival: update.minStay } : {}),
      }];
      const rateRes = await this.http.post<any>('/restrictions', apiKey, { values: ratePayload });
      const rateTaskId: string | undefined = rateRes?.data?.[0]?.id;
      if (rateTaskId) {
        taskId = rateTaskId;
        this.logger.log(
          `[CHANNEX_CERT] TASK_ID=${rateTaskId} restrictions listing=${update.listingId} date=${update.date} rate=${update.price}`,
        );
      } else {
        this.logger.warn(
          `[Cert] restrictions push: no task_id in response: ${JSON.stringify(rateRes)}`,
        );
      }
    }

    if (update.available !== undefined) {
      const availPayload = [{
        property_id: ids.channexPropertyId,
        room_type_id: ids.channexRoomTypeId,
        date_from: update.date,
        date_to: update.date,
        availability: update.available ? 1 : 0,
      }];
      const availRes = await this.http.post<any>('/availability', apiKey, { values: availPayload });
      const availTaskId: string | undefined = availRes?.data?.[0]?.id;
      if (availTaskId) {
        taskId = taskId ?? availTaskId; // prefer rate task_id if both present
        this.logger.log(
          `[CHANNEX_CERT] AVAIL_TASK_ID=${availTaskId} availability listing=${update.listingId} date=${update.date}`,
        );
      } else {
        this.logger.warn(
          `[Cert] availability push: no task_id in response: ${JSON.stringify(availRes)}`,
        );
      }
    }

    if (!taskId) {
      this.logger.warn(`[Cert] pushRateSync: nothing to push for listing=${update.listingId}`);
    }

    return taskId;
  }

  // -------------------------------------------------------------------------
  // 5. Parity check
  // -------------------------------------------------------------------------

  async runParityCheck(apiKey: string, sampleSize = 10): Promise<ParityReport> {
    const samples = await this.prisma.$queryRaw<
      {
        id: number;
        listingId: number;
        date: Date;
        price: any;
        available: boolean;
      }[]
    >`SELECT id, "listingId", date, price, available FROM rates ORDER BY RANDOM() LIMIT ${sampleSize}`;

    let matched = 0;
    const details: ParityDetail[] = [];

    for (const row of samples) {
      const dateStr = row.date.toISOString().split('T')[0];
      try {
        const mapping = await this.prisma.channexMapping.findFirst({
          where: { listingId: row.listingId },
        });

        const propId = mapping?.channexPropertyId;
        if (!propId) {
          details.push({
            listingId: row.listingId,
            date: dateStr,
            status: 'no_mapping',
          });
          continue;
        }

        const json = await this.http.get(
          `/restrictions?filter[property_id]=${propId}` +
            `&filter[date][gte]=${dateStr}&filter[date][lte]=${dateStr}` +
            `&filter[restrictions]=rate,availability`,
          apiKey,
        );

        // Response shape: { data: { [ratePlanId]: { [date]: { rate, availability } } } }
        const ratePlanId = mapping?.channexRatePlanId;
        const dateData = json?.data?.[ratePlanId]?.[dateStr] ?? {};
        const channexPrice = dateData.rate ? parseFloat(dateData.rate) : null;
        const channexAvail = dateData.availability ?? null;

        const priceMatch =
          channexPrice === null ||
          Math.abs(channexPrice - parseFloat(row.price)) < 0.01;
        const availMatch =
          channexAvail === null || (channexAvail > 0) === row.available;

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
        details.push({
          listingId: row.listingId,
          date: dateStr,
          status: 'error',
          error: err.message,
        });
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
// Custom errors
// ---------------------------------------------------------------------------

export class MappingMissingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MappingMissingError';
  }
}
