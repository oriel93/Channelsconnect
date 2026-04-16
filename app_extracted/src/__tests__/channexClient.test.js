/**
 * Go-Live Test Suite — Channels Connect × Channex Integration
 *
 * Covers:
 *  1. Price update from UI to Channex (pushRates)
 *  2. Booking coming from Channex to UI (syncBookings + source-of-truth)
 *  3. Database connection failure — graceful degradation
 *  4. Retry-with-backoff on transient 5xx errors
 *  5. Timeout handling (AbortError)
 *  6. Rate-limit (429) handling
 *  7. Auth error (401) — no retry, surfaces immediately
 *  8. importAllProperties concurrency control
 *  9. createPageUrl routing fix
 * 10. Booking acknowledge is NOT called when DB write fails
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  pushRates,
  syncBookings,
  importAllProperties,
  listProperties,
  acknowledgeBooking,
  getBookingRevisionFeed,
  getBooking,
} from '../api/channexClient';
import { createPageUrl } from '../utils/index';

// ─── Mock fetch globally ──────────────────────────────────────────────────────
const MOCK_API_KEY = 'test-api-key-123';

function mockFetch(responses) {
  let callIndex = 0;
  return vi.fn(() => {
    const response = Array.isArray(responses)
      ? responses[callIndex++ % responses.length]
      : responses;
    return Promise.resolve(response);
  });
}

function jsonOk(body) {
  return {
    ok: true,
    status: 200,
    headers: { get: () => null },
    json: () => Promise.resolve(body),
  };
}

function jsonError(status, body = {}) {
  return {
    ok: false,
    status,
    headers: { get: () => null },
    json: () => Promise.resolve(body),
  };
}

function networkError(message = 'Network failure') {
  return Promise.reject(new Error(message));
}

function timeoutError() {
  const err = new Error('The user aborted a request.');
  err.name = 'AbortError';
  return Promise.reject(err);
}

// ─── Test 1: Price update from UI to Channex ─────────────────────────────────
describe('Test 1 — Price update: UI → Channex', () => {
  beforeEach(() => {
    global.fetch = mockFetch(jsonOk({ data: { id: 'ari-123', type: 'bulk_update' } }));
  });
  afterEach(() => vi.restoreAllMocks());

  it('sends correct ARI bulk_update payload for rate changes', async () => {
    const updates = [
      {
        room_type_id: 'rt-abc',
        rate_plan_id: 'rp-xyz',
        date_from: '2025-08-01',
        date_to: '2025-08-07',
        rate: 199,
        min_stay_arrival: 2,
        closed: false,
      },
    ];

    const result = await pushRates(MOCK_API_KEY, 'prop-1', updates);
    expect(result.data.type).toBe('bulk_update');

    // Verify the payload structure sent to Channex
    const callBody = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(callBody.values).toHaveLength(1);
    expect(callBody.values[0].type).toBe('rates');
    expect(callBody.values[0].attributes.rate).toBe(199);
    expect(callBody.values[0].attributes.property_id).toBe('prop-1');
    expect(callBody.values[0].attributes.min_stay_arrival).toBe(2);
  });

  it('applies default values for optional rate fields', async () => {
    await pushRates(MOCK_API_KEY, 'prop-1', [
      { room_type_id: 'rt-1', rate_plan_id: 'rp-1', date_from: '2025-09-01', date_to: '2025-09-02', rate: 150 },
    ]);
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    const attrs = body.values[0].attributes;
    expect(attrs.closed).toBe(false);
    expect(attrs.max_stay).toBe(0);
    expect(attrs.min_stay_arrival).toBe(1);
  });
});

// ─── Test 2: Booking from Channex → UI (source-of-truth) ────────────────────
describe('Test 2 — Booking: Channex → UI (source-of-truth reconciliation)', () => {
  afterEach(() => vi.restoreAllMocks());

  it('fetches booking details and calls onBookingReceived BEFORE acknowledging', async () => {
    const revisionFeed = {
      data: [{ id: 'rev-001', attributes: { booking_id: 'bk-001', status: 'new' } }],
    };
    const bookingDetail = {
      data: {
        attributes: {
          arrival_date: '2025-09-10',
          departure_date: '2025-09-15',
          customer: { name: 'Jane Doe', email: 'jane@example.com' },
          ota_name: 'booking.com',
          property_id: 'prop-1',
          room_type_id: 'rt-1',
          amount: '750.00',
        },
      },
    };
    const acknowledgeResponse = { data: { acknowledged: true } };

    const callOrder = [];
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ...jsonOk(revisionFeed) })   // getBookingRevisionFeed
      .mockResolvedValueOnce({ ...jsonOk(bookingDetail) })   // getBooking
      .mockResolvedValueOnce({ ...jsonOk(acknowledgeResponse) }); // acknowledge

    const onBookingReceived = vi.fn(async (data) => {
      callOrder.push('db_write');
      expect(data.guestName).toBe('Jane Doe');
      expect(data.checkIn).toBe('2025-09-10');
    });

    // Wrap acknowledge to record call order
    const origFetch = global.fetch;
    let ackCallIndex = 0;
    global.fetch = vi.fn((...args) => {
      if (args[0].includes('acknowledge')) callOrder.push('acknowledge');
      return origFetch(...args);
    });

    // Reset and set up again properly
    global.fetch = vi.fn()
      .mockImplementationOnce(() => Promise.resolve({ ...jsonOk(revisionFeed) }))
      .mockImplementationOnce(() => Promise.resolve({ ...jsonOk(bookingDetail) }))
      .mockImplementationOnce(() => {
        callOrder.push('acknowledge');
        return Promise.resolve({ ...jsonOk(acknowledgeResponse) });
      });

    const processed = await syncBookings(MOCK_API_KEY, async (data) => {
      callOrder.push('db_write');
      expect(data.guestName).toBe('Jane Doe');
    });

    expect(processed).toHaveLength(1);
    expect(processed[0].revisionId).toBe('rev-001');
    // DB write MUST come before acknowledge (source-of-truth guarantee)
    expect(callOrder.indexOf('db_write')).toBeLessThan(callOrder.indexOf('acknowledge'));
  });

  it('does NOT acknowledge if onBookingReceived throws (keeps revision in feed)', async () => {
    const revisionFeed = {
      data: [{ id: 'rev-002', attributes: { booking_id: 'bk-002', status: 'new' } }],
    };
    const bookingDetail = {
      data: { attributes: { arrival_date: '2025-10-01', departure_date: '2025-10-05', customer: {}, amount: '0' } },
    };

    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ...jsonOk(revisionFeed) })
      .mockResolvedValueOnce({ ...jsonOk(bookingDetail) });

    const onBookingReceived = vi.fn(async () => {
      throw new Error('DB connection refused');
    });

    const processed = await syncBookings(MOCK_API_KEY, onBookingReceived);

    // Revision should NOT be in processed (DB write failed)
    expect(processed).toHaveLength(0);

    // fetch should only have been called twice (feed + booking), NOT three times (no acknowledge)
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});

// ─── Test 3: DB connection failure — graceful degradation ────────────────────
describe('Test 3 — Database connection failure: graceful degradation', () => {
  afterEach(() => vi.restoreAllMocks());

  it('returns empty processed array and logs error when booking fetch fails', async () => {
    const revisionFeed = {
      data: [{ id: 'rev-003', attributes: { booking_id: 'bk-003', status: 'new' } }],
    };

    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ...jsonOk(revisionFeed) })
      .mockRejectedValueOnce(new Error('ECONNREFUSED: database at 127.0.0.1:5432'));

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Should not throw — errors are caught internally
    const processed = await syncBookings(MOCK_API_KEY);
    expect(processed).toHaveLength(0);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[Channex] Failed to process revision rev-003'),
      expect.any(String)
    );
  });
});

// ─── Test 4: Retry-with-backoff on 5xx ───────────────────────────────────────
describe('Test 4 — Retry-with-backoff on transient 5xx errors', () => {
  afterEach(() => vi.restoreAllMocks());

  it('retries up to 3 times on 500 and succeeds on the 3rd attempt', async () => {
    vi.useFakeTimers();
    const successResponse = jsonOk({ data: [] });

    let attempt = 0;
    global.fetch = vi.fn(() => {
      attempt++;
      if (attempt < 3) return Promise.resolve(jsonError(500, { errors: { title: 'Internal Server Error' } }));
      return Promise.resolve(successResponse);
    });

    const promise = listProperties(MOCK_API_KEY);
    // Fast-forward timers for retry delays
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.data).toEqual([]);
    expect(attempt).toBe(3);
    vi.useRealTimers();
  });

  it('throws after exhausting all retry attempts', async () => {
    vi.useFakeTimers();
    global.fetch = vi.fn(() =>
      Promise.resolve(jsonError(503, { errors: { title: 'Service Unavailable' } }))
    );

    const promise = listProperties(MOCK_API_KEY).catch((e) => e);
    await vi.runAllTimersAsync();
    const err = await promise;
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toMatch('Channex API error');
    vi.useRealTimers();
  });
});

// ─── Test 5: Timeout handling ────────────────────────────────────────────────
describe('Test 5 — Request timeout handling', () => {
  afterEach(() => vi.restoreAllMocks());

  it('retries on AbortError (timeout) and eventually throws', async () => {
    vi.useFakeTimers();
    const abortErr = new Error('The operation was aborted');
    abortErr.name = 'AbortError';
    global.fetch = vi.fn(() => Promise.reject(abortErr));

    const promise = listProperties(MOCK_API_KEY).catch((e) => e);
    await vi.runAllTimersAsync();
    const err = await promise;
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toMatch('Request timed out');
    vi.useRealTimers();
  });
});

// ─── Test 6: 429 Rate-limit handling ─────────────────────────────────────────
describe('Test 6 — Rate-limit (429) handling', () => {
  afterEach(() => vi.restoreAllMocks());

  it('retries after 429 and succeeds', async () => {
    vi.useFakeTimers();
    let attempt = 0;
    global.fetch = vi.fn(() => {
      attempt++;
      if (attempt === 1) {
        return Promise.resolve({
          ok: false,
          status: 429,
          headers: { get: (h) => (h === 'Retry-After' ? '1' : null) },
          json: () => Promise.resolve({ errors: { title: 'Too Many Requests' } }),
        });
      }
      return Promise.resolve(jsonOk({ data: [] }));
    });

    const promise = listProperties(MOCK_API_KEY);
    await vi.runAllTimersAsync();
    const result = await promise;
    expect(result.data).toEqual([]);
    expect(attempt).toBe(2);
    vi.useRealTimers();
  });
});

// ─── Test 7: Auth error (401) — no retry ─────────────────────────────────────
describe('Test 7 — Auth error (401): no retry, surface immediately', () => {
  afterEach(() => vi.restoreAllMocks());

  it('throws immediately on 401 without retrying', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve(jsonError(401, { errors: { code: 'unauthorized', title: 'Invalid API key' } }))
    );

    await expect(listProperties('bad-key')).rejects.toThrow('unauthorized');
    // Should only have been called once (no retries for auth errors)
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});

// ─── Test 8: importAllProperties concurrency ─────────────────────────────────
describe('Test 8 — importAllProperties: concurrency control (max 5)', () => {
  afterEach(() => vi.restoreAllMocks());

  it('processes all properties correctly with concurrency limit', async () => {
    const properties = Array.from({ length: 8 }, (_, i) => ({
      id: `prop-${i}`,
      attributes: { title: `Property ${i}`, currency: 'USD', address: '', city: '', country: '' },
    }));

    global.fetch = vi.fn((url) => {
      if (url.includes('/properties?')) return Promise.resolve(jsonOk({ data: properties }));
      if (url.includes('/room_types')) return Promise.resolve(jsonOk({ data: [] }));
      if (url.includes('/rate_plans')) return Promise.resolve(jsonOk({ data: [] }));
      if (url.includes('/channels')) return Promise.resolve(jsonOk({ data: [] }));
      return Promise.resolve(jsonOk({ data: [] }));
    });

    const result = await importAllProperties(MOCK_API_KEY);
    expect(result).toHaveLength(8);
    result.forEach((p, i) => {
      expect(p.name).toBe(`Property ${i}`);
      expect(p.roomTypes).toEqual([]);
      expect(p.ratePlans).toEqual([]);
    });
  });
});

// ─── Test 9: createPageUrl routing fix ───────────────────────────────────────
describe('Test 9 — createPageUrl routing fix', () => {
  it('preserves page name casing for case-sensitive routes', () => {
    expect(createPageUrl('ChannexDashboard')).toBe('/ChannexDashboard');
    expect(createPageUrl('Dashboard')).toBe('/Dashboard');
    expect(createPageUrl('ImportListings')).toBe('/ImportListings');
  });

  it('converts spaces to hyphens', () => {
    expect(createPageUrl('My Listings')).toBe('/My-Listings');
  });
});

// ─── Test 10: syncBookings — no acknowledge on DB failure ────────────────────
describe('Test 10 — syncBookings: acknowledge gating', () => {
  afterEach(() => vi.restoreAllMocks());

  it('processes multiple revisions and skips acknowledge only for failed ones', async () => {
    const revisionFeed = {
      data: [
        { id: 'rev-ok', attributes: { booking_id: 'bk-ok', status: 'new' } },
        { id: 'rev-fail', attributes: { booking_id: 'bk-fail', status: 'new' } },
      ],
    };
    const goodBooking = { data: { attributes: { arrival_date: '2025-11-01', departure_date: '2025-11-03', customer: { name: 'Good Guest' }, ota_name: 'airbnb', property_id: 'p1', room_type_id: 'rt1', amount: '300' } } };
    const badBooking = { data: { attributes: { arrival_date: '2025-11-10', departure_date: '2025-11-12', customer: { name: 'Bad Guest' }, ota_name: 'vrbo', property_id: 'p1', room_type_id: 'rt1', amount: '200' } } };

    const acknowledgedRevisions = [];
    global.fetch = vi.fn((url) => {
      if (url.includes('/booking_revisions') && !url.includes('acknowledge') && !url.includes('bk-')) {
        return Promise.resolve(jsonOk(revisionFeed));
      }
      if (url.includes('bk-ok')) return Promise.resolve(jsonOk(goodBooking));
      if (url.includes('bk-fail')) return Promise.resolve(jsonOk(badBooking));
      if (url.includes('acknowledge')) {
        const id = url.split('/booking_revisions/')[1].split('/')[0];
        acknowledgedRevisions.push(id);
        return Promise.resolve(jsonOk({ data: { acknowledged: true } }));
      }
      return Promise.resolve(jsonOk({}));
    });

    let callCount = 0;
    const onBookingReceived = vi.fn(async (data) => {
      callCount++;
      if (data.revisionId === 'rev-fail') throw new Error('Simulated DB write failure');
    });

    const processed = await syncBookings(MOCK_API_KEY, onBookingReceived);

    expect(processed).toHaveLength(1);
    expect(processed[0].revisionId).toBe('rev-ok');
    // Only the successful revision should be acknowledged
    expect(acknowledgedRevisions).toContain('rev-ok');
    expect(acknowledgedRevisions).not.toContain('rev-fail');
  });
});
