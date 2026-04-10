/**
 * sync_service_v2.js
 * Self-Healing Synchronization Engine for Channels Connect ↔ Channex
 *
 * Architecture:
 *  - MappingService   : validates local IDs against Channex before any push
 *  - QueueService     : SQS-backed (or DB-backed fallback) queue with dedup
 *  - ARIPushService   : consumes the queue, handles conflicts, retries
 *  - SyncOrchestrator : single entry point for all outbound sync operations
 */

'use strict';

const { SQSClient, SendMessageCommand, ReceiveMessageCommand, DeleteMessageCommand } = require('@aws-sdk/client-sqs');
const axios = require('axios');
const db = require('./db'); // your existing DB adapter (knex/sequelize/pg)
const logger = require('./logger'); // your existing logger (winston/pino)

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const CONFIG = {
  channex: {
    baseUrl: process.env.CHANNEX_API_URL || 'https://api.channex.io/v1',
    apiKey: process.env.CHANNEX_API_KEY,
    timeout: 10_000, // ms
    maxRetries: 3,
    retryDelayBase: 1_000, // ms – exponential backoff base
  },
  sqs: {
    queueUrl: process.env.SQS_QUEUE_URL,
    region: process.env.AWS_REGION || 'us-east-1',
    useDbFallback: !process.env.SQS_QUEUE_URL, // fall back to DB queue when SQS not configured
  },
  sync: {
    dryRun: process.env.SYNC_DRY_RUN === 'true',
    parityCheckSampleSize: 10,
  },
};

// ---------------------------------------------------------------------------
// HTTP Client (shared, with retry interceptor)
// ---------------------------------------------------------------------------
const channexHttp = axios.create({
  baseURL: CONFIG.channex.baseUrl,
  timeout: CONFIG.channex.timeout,
  headers: {
    'Content-Type': 'application/json',
    'user-api-key': CONFIG.channex.apiKey,
  },
});

/**
 * Exponential backoff retry for transient errors (network timeouts, 429, 5xx).
 * Returns the Axios response or throws after exhausting retries.
 */
async function withRetry(requestFn, retries = CONFIG.channex.maxRetries, attempt = 0) {
  try {
    return await requestFn();
  } catch (err) {
    const isRetryable =
      !err.response || // network-level error (timeout, ECONNRESET)
      err.response.status === 429 ||
      err.response.status >= 500;

    if (isRetryable && attempt < retries) {
      const delay = CONFIG.channex.retryDelayBase * Math.pow(2, attempt);
      logger.warn(`[Retry] attempt ${attempt + 1}/${retries} after ${delay}ms — ${err.message}`);
      await sleep(delay);
      return withRetry(requestFn, retries, attempt + 1);
    }
    throw err;
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// 1. MappingService
//    Validates that every local room_type_id / property_id has a matching
//    Channex ID. Triggers a FetchMappings job when anything is missing.
// ---------------------------------------------------------------------------
const MappingService = {
  /**
   * Returns the Channex room_type_id for a given local room_type_id.
   * Throws (with a FetchMappings side-effect) if the mapping is absent.
   */
  async getChannexRoomTypeId(localRoomTypeId) {
    const mapping = await db('channex_room_type_mappings')
      .where({ local_room_type_id: localRoomTypeId, verified: true })
      .first();

    if (!mapping) {
      logger.error(`[MappingService] Missing verified mapping for room_type_id=${localRoomTypeId}. Triggering FetchMappings.`);
      await MappingService._triggerFetchMappings({ room_type_id: localRoomTypeId });
      throw new MappingMissingError(`No verified Channex mapping for room_type_id=${localRoomTypeId}`);
    }
    return mapping.channex_room_type_id;
  },

  /**
   * Returns the Channex property_id for a given local property_id.
   * Throws (with a FetchMappings side-effect) if the mapping is absent.
   */
  async getChannexPropertyId(localPropertyId) {
    const mapping = await db('channex_property_mappings')
      .where({ local_property_id: localPropertyId, verified: true })
      .first();

    if (!mapping) {
      logger.error(`[MappingService] Missing verified mapping for property_id=${localPropertyId}. Triggering FetchMappings.`);
      await MappingService._triggerFetchMappings({ property_id: localPropertyId });
      throw new MappingMissingError(`No verified Channex mapping for property_id=${localPropertyId}`);
    }
    return mapping.channex_property_id;
  },

  /**
   * Validates a full ARI payload's IDs before it reaches the queue.
   * Returns { channexRoomTypeId, channexPropertyId }.
   */
  async validateAndResolveIds(localRoomTypeId, localPropertyId) {
    const [channexRoomTypeId, channexPropertyId] = await Promise.all([
      MappingService.getChannexRoomTypeId(localRoomTypeId),
      MappingService.getChannexPropertyId(localPropertyId),
    ]);
    return { channexRoomTypeId, channexPropertyId };
  },

  /**
   * Fetches the latest mappings from Channex and upserts them into our DB.
   * Called automatically when a mapping is missing; can also be called manually.
   */
  async refreshMappings(propertyId = null) {
    logger.info(`[MappingService] Refreshing mappings from Channex${propertyId ? ` for property ${propertyId}` : ''}`);

    const params = propertyId ? { property_id: propertyId } : {};
    const response = await withRetry(() =>
      channexHttp.get('/room_types', { params })
    );

    const roomTypes = response.data?.data || [];
    for (const rt of roomTypes) {
      await db('channex_room_type_mappings')
        .insert({
          channex_room_type_id: rt.id,
          local_room_type_id: rt.attributes?.meta?.local_id || null,
          verified: true,
          last_verified_at: new Date(),
        })
        .onConflict('channex_room_type_id')
        .merge(['local_room_type_id', 'verified', 'last_verified_at']);
    }

    logger.info(`[MappingService] Upserted ${roomTypes.length} room type mappings.`);
  },

  /** Enqueues a FetchMappings background job (non-blocking). */
  async _triggerFetchMappings(context) {
    // If you have a job queue (e.g. Bull, Sidekiq-JS), enqueue here.
    // For now we run it inline but in a detached promise so we don't block the caller.
    setImmediate(async () => {
      try {
        await MappingService.refreshMappings(context?.property_id);
      } catch (err) {
        logger.error('[MappingService] Background FetchMappings failed:', err.message);
      }
    });
  },
};

// ---------------------------------------------------------------------------
// 2. QueueService
//    SQS-first, falls back to a DB-backed queue when SQS is not configured.
//    Implements "last-write-wins" dedup: a pending update for the same
//    (room_type_id, date) is overwritten rather than duplicated.
// ---------------------------------------------------------------------------
const QueueService = {
  _sqsClient: CONFIG.sqs.useDbFallback
    ? null
    : new SQSClient({ region: CONFIG.sqs.region }),

  /**
   * Enqueues (or overwrites) an ARI update.
   * @param {object} payload – { room_type_id, property_id, date, rate, availability, ... }
   */
  async enqueue(payload) {
    if (CONFIG.sync.dryRun) {
      logger.info('[DryRun] Would enqueue:', payload);
      return { dry_run: true };
    }

    if (CONFIG.sqs.useDbFallback) {
      return QueueService._dbEnqueue(payload);
    }
    return QueueService._sqsEnqueue(payload);
  },

  /** DB-backed enqueue with dedup (upsert on room_type_id + date). */
  async _dbEnqueue(payload) {
    const dedupKey = `${payload.room_type_id}::${payload.date}`;

    const existing = await db('sync_queue')
      .where({ dedup_key: dedupKey, status: 'pending' })
      .first();

    if (existing) {
      // Overwrite with latest value – prevents stale rate pushes
      await db('sync_queue')
        .where({ id: existing.id })
        .update({ payload: JSON.stringify(payload), updated_at: new Date() });
      logger.info(`[QueueService] Overwrote pending update for key=${dedupKey}`);
      return { overwritten: true, id: existing.id };
    }

    const [id] = await db('sync_queue').insert({
      dedup_key: dedupKey,
      payload: JSON.stringify(payload),
      status: 'pending',
      attempts: 0,
      created_at: new Date(),
      updated_at: new Date(),
    });

    logger.info(`[QueueService] Enqueued new update id=${id} key=${dedupKey}`);
    return { enqueued: true, id };
  },

  /** SQS enqueue. Uses MessageDeduplicationId for FIFO queues. */
  async _sqsEnqueue(payload) {
    const dedupKey = `${payload.room_type_id}::${payload.date}`;
    const command = new SendMessageCommand({
      QueueUrl: CONFIG.sqs.queueUrl,
      MessageBody: JSON.stringify(payload),
      MessageGroupId: payload.property_id,
      MessageDeduplicationId: dedupKey,
    });
    const result = await QueueService._sqsClient.send(command);
    logger.info(`[QueueService] SQS message sent: ${result.MessageId}`);
    return { messageId: result.MessageId };
  },

  /** Pull next batch from DB queue (used by the worker). */
  async dequeueDb(batchSize = 10) {
    return db('sync_queue')
      .where({ status: 'pending' })
      .orderBy('created_at', 'asc')
      .limit(batchSize);
  },

  async markDbJobDone(id) {
    await db('sync_queue').where({ id }).update({ status: 'done', updated_at: new Date() });
  },

  async markDbJobFailed(id, error) {
    await db('sync_queue')
      .where({ id })
      .update({ status: 'failed', last_error: error, updated_at: new Date() });
  },
};

// ---------------------------------------------------------------------------
// 3. ARIPushService
//    Consumes queued updates, pushes to Channex, handles 422 conflicts,
//    and reconciles local state when Channex disagrees.
// ---------------------------------------------------------------------------
const ARIPushService = {
  /**
   * Processes a single ARI update payload.
   * Called by the queue worker (SQS Lambda trigger or DB cron).
   */
  async processUpdate(payload, jobId = null) {
    const { room_type_id, property_id, date, rate, availability } = payload;

    logger.info(`[ARIPushService] Processing update room_type_id=${room_type_id} date=${date}`);

    // Step 1 – Resolve IDs (throws MappingMissingError if mapping absent)
    let channexRoomTypeId, channexPropertyId;
    try {
      ({ channexRoomTypeId, channexPropertyId } = await MappingService.validateAndResolveIds(
        room_type_id,
        property_id
      ));
    } catch (err) {
      if (err instanceof MappingMissingError) {
        logger.error(`[ARIPushService] Aborting push – mapping missing: ${err.message}`);
        if (jobId) await QueueService.markDbJobFailed(jobId, err.message);
        return { success: false, reason: 'mapping_missing' };
      }
      throw err;
    }

    // Step 2 – Build Channex payload
    const channexPayload = {
      data: {
        type: 'ari',
        attributes: {
          property_id: channexPropertyId,
          room_type_id: channexRoomTypeId,
          date_from: date,
          date_to: date,
          ...(rate !== undefined && { rate }),
          ...(availability !== undefined && { availability }),
        },
      },
    };

    if (CONFIG.sync.dryRun) {
      logger.info('[DryRun] Would push to Channex:', channexPayload);
      if (jobId) await QueueService.markDbJobDone(jobId);
      return { success: true, dry_run: true };
    }

    // Step 3 – Push with retry
    try {
      const response = await withRetry(() => channexHttp.post('/ari', channexPayload));
      logger.info(`[ARIPushService] Push succeeded for room_type_id=${room_type_id} date=${date}`);
      if (jobId) await QueueService.markDbJobDone(jobId);
      return { success: true, response: response.data };
    } catch (err) {
      return ARIPushService._handlePushError(err, payload, channexRoomTypeId, jobId);
    }
  },

  /** Handles push errors, including 422 conflict resolution. */
  async _handlePushError(err, payload, channexRoomTypeId, jobId) {
    const status = err.response?.status;
    const { room_type_id, date } = payload;

    if (status === 422 || status === 409) {
      logger.warn(`[ARIPushService] Conflict ${status} for room_type_id=${room_type_id} date=${date}. Fetching Channex state.`);

      try {
        const channexState = await ARIPushService._fetchChannexState(channexRoomTypeId, date);
        await ARIPushService._reconcileLocalCache(room_type_id, date, channexState);
        logger.warn(
          `[ARIPushService] Reconciled local cache for room_type_id=${room_type_id} date=${date}. ` +
          `Channex rate=${channexState.rate}, local rate was=${payload.rate}`
        );
      } catch (reconcileErr) {
        logger.error(`[ARIPushService] Reconciliation failed: ${reconcileErr.message}`);
      }

      if (jobId) await QueueService.markDbJobFailed(jobId, `Channex ${status} conflict`);
      return { success: false, reason: `channex_${status}_conflict`, reconciled: true };
    }

    // All other errors (network timeouts exhausted, etc.)
    logger.error(`[ARIPushService] Push failed for room_type_id=${room_type_id} date=${date}: ${err.message}`);
    if (jobId) await QueueService.markDbJobFailed(jobId, err.message);
    return { success: false, reason: err.message };
  },

  /** GETs the current ARI state for a room type / date from Channex. */
  async _fetchChannexState(channexRoomTypeId, date) {
    const response = await withRetry(() =>
      channexHttp.get('/ari', {
        params: {
          room_type_id: channexRoomTypeId,
          date_from: date,
          date_to: date,
        },
      })
    );
    const attrs = response.data?.data?.[0]?.attributes || {};
    return { rate: attrs.rate, availability: attrs.availability };
  },

  /** Updates the local cache to match Channex ground truth. */
  async _reconcileLocalCache(localRoomTypeId, date, channexState) {
    await db('room_availability_cache')
      .where({ room_type_id: localRoomTypeId, date })
      .update({
        rate: channexState.rate,
        availability: channexState.availability,
        last_synced_from_channex_at: new Date(),
        sync_discrepancy_detected: true,
      });
  },
};

// ---------------------------------------------------------------------------
// 4. SyncOrchestrator
//    The single public entry point. Wraps everything in an atomic transaction:
//    the DB update only commits if the sync job is successfully queued.
// ---------------------------------------------------------------------------
const SyncOrchestrator = {
  /**
   * Called when a user changes a price or availability on the frontend.
   * Atomically: updates local DB + enqueues the sync job.
   * Rolls back the DB update if queueing fails.
   *
   * @param {object} change – { room_type_id, property_id, date, rate?, availability? }
   */
  async applyChange(change) {
    const { room_type_id, property_id, date, rate, availability } = change;

    logger.info(`[SyncOrchestrator] Applying change room_type_id=${room_type_id} date=${date}`);

    // Validate mappings BEFORE opening the transaction
    await MappingService.validateAndResolveIds(room_type_id, property_id);

    return db.transaction(async (trx) => {
      // 1. Write to local DB inside transaction
      await trx('room_availability_cache')
        .insert({
          room_type_id,
          property_id,
          date,
          ...(rate !== undefined && { rate }),
          ...(availability !== undefined && { availability }),
          updated_at: new Date(),
        })
        .onConflict(['room_type_id', 'date'])
        .merge(['rate', 'availability', 'updated_at']);

      // 2. Enqueue sync job – if this throws, the transaction rolls back
      const queueResult = await QueueService.enqueue(change);

      logger.info(`[SyncOrchestrator] Change committed and queued: ${JSON.stringify(queueResult)}`);
      return { success: true, queueResult };
    });
  },

  /**
   * Worker entry point – drains the DB queue.
   * Call this from a cron job or a dedicated worker process.
   */
  async drainQueue(batchSize = 10) {
    const jobs = await QueueService.dequeueDb(batchSize);
    logger.info(`[SyncOrchestrator] Draining ${jobs.length} queued jobs.`);

    const results = await Promise.allSettled(
      jobs.map((job) => ARIPushService.processUpdate(JSON.parse(job.payload), job.id))
    );

    return results.map((r, i) => ({
      jobId: jobs[i].id,
      ...(r.status === 'fulfilled' ? r.value : { success: false, reason: r.reason?.message }),
    }));
  },

  /**
   * Parity check – compares N random local entries against Channex live values.
   * @returns { checked, matched, parity_pct }
   */
  async runParityCheck(sampleSize = CONFIG.sync.parityCheckSampleSize) {
    logger.info(`[SyncOrchestrator] Running parity check on ${sampleSize} random rooms.`);

    const samples = await db('room_availability_cache')
      .orderByRaw('RANDOM()')
      .limit(sampleSize);

    let matched = 0;
    const report = [];

    for (const row of samples) {
      try {
        const mapping = await db('channex_room_type_mappings')
          .where({ local_room_type_id: row.room_type_id, verified: true })
          .first();

        if (!mapping) {
          report.push({ room_type_id: row.room_type_id, date: row.date, status: 'no_mapping' });
          continue;
        }

        const channexState = await ARIPushService._fetchChannexState(mapping.channex_room_type_id, row.date);

        const rateMatch = channexState.rate === null || Number(channexState.rate) === Number(row.rate);
        const availMatch = channexState.availability === null || channexState.availability === row.availability;
        const isMatch = rateMatch && availMatch;

        if (isMatch) matched++;

        report.push({
          room_type_id: row.room_type_id,
          date: row.date,
          local: { rate: row.rate, availability: row.availability },
          channex: channexState,
          match: isMatch,
        });
      } catch (err) {
        report.push({ room_type_id: row.room_type_id, date: row.date, status: 'error', error: err.message });
      }
    }

    const parity_pct = samples.length > 0 ? ((matched / samples.length) * 100).toFixed(1) : 'N/A';

    logger.info(`[SyncOrchestrator] Parity check complete. ${matched}/${samples.length} matched (${parity_pct}%)`);
    return { checked: samples.length, matched, parity_pct, report };
  },
};

// ---------------------------------------------------------------------------
// Custom Errors
// ---------------------------------------------------------------------------
class MappingMissingError extends Error {
  constructor(message) {
    super(message);
    this.name = 'MappingMissingError';
  }
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------
module.exports = {
  MappingService,
  QueueService,
  ARIPushService,
  SyncOrchestrator,
  MappingMissingError,
  CONFIG, // exported for tests
};
