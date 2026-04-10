/**
 * sync_service_v2.test.js
 * Three unit test cases for the self-healing sync engine.
 *
 * Framework: Jest
 * Run: npx jest sync_service_v2.test.js --verbose
 */

'use strict';

// ---------------------------------------------------------------------------
// Mock dependencies before requiring the module under test
// ---------------------------------------------------------------------------
jest.mock('./db');
jest.mock('./logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));
jest.mock('axios');

const axios = require('axios');
const db = require('./db');

// Build a minimal axios instance mock that channexHttp can delegate to
const mockAxiosInstance = {
  get: jest.fn(),
  post: jest.fn(),
};
axios.create.mockReturnValue(mockAxiosInstance);

// Now import the module (axios.create is already mocked)
const {
  SyncOrchestrator,
  MappingService,
  ARIPushService,
  QueueService,
  MappingMissingError,
} = require('./sync_service_v2');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const validMapping = {
  local_room_type_id: 'room-local-1',
  channex_room_type_id: 'room-channex-abc',
  verified: true,
};

const validPropertyMapping = {
  local_property_id: 'prop-local-1',
  channex_property_id: 'prop-channex-xyz',
  verified: true,
};

/** Builds a db() mock that returns a fluent query builder resolving to `result`. */
function mockDbQuery(result) {
  const builder = {
    where: jest.fn().mockReturnThis(),
    first: jest.fn().mockResolvedValue(result),
    insert: jest.fn().mockResolvedValue([1]),
    update: jest.fn().mockResolvedValue(1),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue([]),
    onConflict: jest.fn().mockReturnThis(),
    merge: jest.fn().mockResolvedValue(1),
  };
  return builder;
}

// ---------------------------------------------------------------------------
// Test Case 1 – Successful Price Push
// ---------------------------------------------------------------------------
describe('Test 1: Successful price push', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // db('channex_room_type_mappings') → returns valid mapping
    // db('channex_property_mappings')  → returns valid property mapping
    // db('room_availability_cache')    → upsert succeeds
    // db('sync_queue')                 → no existing pending job, insert succeeds
    db.mockImplementation((table) => {
      if (table === 'channex_room_type_mappings') return mockDbQuery(validMapping);
      if (table === 'channex_property_mappings')  return mockDbQuery(validPropertyMapping);
      if (table === 'room_availability_cache')    return mockDbQuery(null);
      if (table === 'sync_queue') {
        const builder = mockDbQuery(null); // no existing dedup key
        builder.insert = jest.fn().mockResolvedValue([42]);
        return builder;
      }
      return mockDbQuery(null);
    });

    // db.transaction – execute the callback with the same mock as trx
    db.transaction = jest.fn().mockImplementation(async (fn) => {
      return fn(db); // pass same mock as the transaction object
    });

    // Channex POST → 200 success
    mockAxiosInstance.post.mockResolvedValue({
      status: 200,
      data: { data: { id: 'ari-push-001', type: 'ari' } },
    });
  });

  test('applyChange commits to DB and enqueues, then processUpdate pushes to Channex', async () => {
    const change = {
      room_type_id: 'room-local-1',
      property_id: 'prop-local-1',
      date: '2025-09-15',
      rate: 199.99,
    };

    // Step A – apply change (writes DB + enqueues)
    const applyResult = await SyncOrchestrator.applyChange(change);
    expect(applyResult.success).toBe(true);
    expect(db.transaction).toHaveBeenCalledTimes(1);

    // Step B – process the queued payload (push to Channex)
    const pushResult = await ARIPushService.processUpdate(change, 42);
    expect(pushResult.success).toBe(true);
    expect(mockAxiosInstance.post).toHaveBeenCalledWith(
      '/ari',
      expect.objectContaining({
        data: expect.objectContaining({
          attributes: expect.objectContaining({
            room_type_id: validMapping.channex_room_type_id,
            rate: 199.99,
          }),
        }),
      })
    );
  });
});

// ---------------------------------------------------------------------------
// Test Case 2 – Failed Push Due to Network Timeout (verify retry logic)
// ---------------------------------------------------------------------------
describe('Test 2: Failed push due to network timeout – verifies retry logic', () => {
  const TIMEOUT_ERROR = Object.assign(new Error('connect ETIMEDOUT'), { code: 'ETIMEDOUT' });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers(); // control setTimeout for backoff

    db.mockImplementation((table) => {
      if (table === 'channex_room_type_mappings') return mockDbQuery(validMapping);
      if (table === 'channex_property_mappings')  return mockDbQuery(validPropertyMapping);
      if (table === 'sync_queue') {
        const b = mockDbQuery(null);
        b.update = jest.fn().mockResolvedValue(1);
        return b;
      }
      return mockDbQuery(null);
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('retries 3 times on timeout then marks job as failed', async () => {
    // All POST calls throw a network timeout (no .response → treated as retryable)
    mockAxiosInstance.post.mockRejectedValue(TIMEOUT_ERROR);

    const payload = {
      room_type_id: 'room-local-1',
      property_id: 'prop-local-1',
      date: '2025-09-16',
      rate: 149.0,
    };

    // Run processUpdate; drain all pending timers between retries
    const processPromise = ARIPushService.processUpdate(payload, 99);

    // Advance timers through the 3 exponential backoffs: 1s, 2s, 4s
    for (let i = 0; i < 3; i++) {
      await Promise.resolve(); // flush microtasks
      jest.runAllTimers();
    }

    const result = await processPromise;

    expect(result.success).toBe(false);
    // Post should have been called 1 (initial) + 3 (retries) = 4 times
    expect(mockAxiosInstance.post).toHaveBeenCalledTimes(4);
    expect(result.reason).toMatch(/ETIMEDOUT/i);
  });
});

// ---------------------------------------------------------------------------
// Test Case 3 – Push with Invalid room_type_id (verify error handling)
// ---------------------------------------------------------------------------
describe('Test 3: Push with invalid room_type_id – verifies MappingMissingError handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    db.mockImplementation((table) => {
      // Simulate a missing mapping for the room type
      if (table === 'channex_room_type_mappings') return mockDbQuery(undefined);
      if (table === 'channex_property_mappings')  return mockDbQuery(validPropertyMapping);
      return mockDbQuery(null);
    });

    // _triggerFetchMappings calls refreshMappings → Channex GET for room_types
    mockAxiosInstance.get.mockResolvedValue({ data: { data: [] } });
  });

  test('processUpdate returns mapping_missing and does NOT call Channex POST', async () => {
    const payload = {
      room_type_id: 'room-local-INVALID',
      property_id: 'prop-local-1',
      date: '2025-09-17',
      rate: 120.0,
    };

    const result = await ARIPushService.processUpdate(payload, 77);

    // Should fail gracefully with a meaningful reason
    expect(result.success).toBe(false);
    expect(result.reason).toBe('mapping_missing');

    // Channex POST must NOT have been called
    expect(mockAxiosInstance.post).not.toHaveBeenCalled();

    // A GET to /room_types should have been triggered (FetchMappings)
    expect(mockAxiosInstance.get).toHaveBeenCalledWith(
      '/room_types',
      expect.any(Object)
    );
  });

  test('applyChange rolls back DB transaction when mapping is missing', async () => {
    db.transaction = jest.fn().mockImplementation(async (fn) => fn(db));

    const change = {
      room_type_id: 'room-local-INVALID',
      property_id: 'prop-local-1',
      date: '2025-09-17',
      rate: 120.0,
    };

    await expect(SyncOrchestrator.applyChange(change)).rejects.toThrow(MappingMissingError);

    // The transaction should never have been entered (validation is pre-transaction)
    expect(db.transaction).not.toHaveBeenCalled();
  });
});
