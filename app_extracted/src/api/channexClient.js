/**
 * Channex.io API Client — Production-hardened
 * Full integration: Properties, Room Types, Rate Plans, ARI, Bookings
 * Docs: https://docs.channex.io
 *
 * Changes (audit & hardening pass):
 *  - Added timeout (15s) to every fetch call to prevent silent hangs
 *  - Added retry-with-exponential-backoff for transient 5xx / network errors
 *  - Added concurrency limiter for importAllProperties (avoids rate-limit hammering)
 *  - Added Source-of-Truth reconciliation in syncBookings (DB write before acknowledge)
 *  - Improved error messages to surface Channex error codes for CloudWatch/logging
 *  - SECURITY: API key must come from server-side env, not localStorage in production
 */

const CHANNEX_BASE_URL = 'https://api.channex.io/api/v1';

// ─── Retry configuration ─────────────────────────────────────────────────────
const RETRY_OPTIONS = {
  maxAttempts: 3,
  baseDelayMs: 500,   // first retry: 500 ms, second: 1000 ms, third: 2000 ms
  timeoutMs: 15_000,  // 15-second per-request timeout
};

// ─── Utility: sleep ──────────────────────────────────────────────────────────
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ─── Utility: fetch with timeout ─────────────────────────────────────────────
function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() =>
    clearTimeout(timer)
  );
}

// ─── Utility: concurrency pool ───────────────────────────────────────────────
async function mapWithConcurrency(items, fn, concurrency = 5) {
  const results = [];
  const queue = [...items];

  async function worker() {
    while (queue.length) {
      const item = queue.shift();
      results.push(await fn(item));
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, worker);
  await Promise.all(workers);
  return results;
}

// ─── Generic request helper with retry ───────────────────────────────────────
const getHeaders = (apiKey) => ({
  'Content-Type': 'application/json',
  'user-api-key': apiKey,
});

/**
 * Makes a Channex API request with automatic retry on transient failures.
 * Retries on: network errors, AbortError (timeout), 429 (rate limit), 5xx errors.
 * Does NOT retry on 4xx auth/validation errors.
 */
async function channexRequest(method, path, apiKey, body = null, attempt = 1) {
  const url = `${CHANNEX_BASE_URL}${path}`;
  const options = { method, headers: getHeaders(apiKey) };
  if (body) options.body = JSON.stringify(body);

  let res;
  try {
    res = await fetchWithTimeout(url, options, RETRY_OPTIONS.timeoutMs);
  } catch (networkErr) {
    const isTimeout = networkErr.name === 'AbortError';
    const label = isTimeout ? 'Request timed out' : `Network error: ${networkErr.message}`;
    if (attempt < RETRY_OPTIONS.maxAttempts) {
      const delay = RETRY_OPTIONS.baseDelayMs * 2 ** (attempt - 1);
      console.warn(`[Channex] ${label}. Retrying in ${delay}ms (attempt ${attempt}/${RETRY_OPTIONS.maxAttempts})...`);
      await sleep(delay);
      return channexRequest(method, path, apiKey, body, attempt + 1);
    }
    throw new Error(`Channex API unreachable after ${RETRY_OPTIONS.maxAttempts} attempts: ${label}`);
  }

  // Handle rate-limiting and transient server errors with retry
  if ((res.status === 429 || res.status >= 500) && attempt < RETRY_OPTIONS.maxAttempts) {
    const retryAfter = parseInt(res.headers.get('Retry-After') || '0', 10);
    const delay = retryAfter > 0
      ? retryAfter * 1000
      : RETRY_OPTIONS.baseDelayMs * 2 ** (attempt - 1);
    console.warn(`[Channex] HTTP ${res.status}. Retrying in ${delay}ms (attempt ${attempt}/${RETRY_OPTIONS.maxAttempts})...`);
    await sleep(delay);
    return channexRequest(method, path, apiKey, body, attempt + 1);
  }

  let json;
  try {
    json = await res.json();
  } catch {
    throw new Error(`Channex API returned non-JSON response (HTTP ${res.status})`);
  }

  if (!res.ok) {
    const errCode = json?.errors?.code || '';
    const errTitle = json?.errors?.title || json?.error || `HTTP ${res.status}`;
    const errDetail = json?.errors?.detail ? ` — ${json.errors.detail}` : '';
    throw new Error(`Channex API error [${errCode || res.status}]: ${errTitle}${errDetail}`);
  }

  return json;
}

// ─── Properties ──────────────────────────────────────────────────────────────

export async function listProperties(apiKey) {
  return channexRequest('GET', '/properties?pagination[limit]=100', apiKey);
}

export async function getProperty(apiKey, propertyId) {
  return channexRequest('GET', `/properties/${propertyId}`, apiKey);
}

export async function createProperty(apiKey, propertyData) {
  return channexRequest('POST', '/properties', apiKey, { property: propertyData });
}

export async function updateProperty(apiKey, propertyId, propertyData) {
  return channexRequest('PUT', `/properties/${propertyId}`, apiKey, { property: propertyData });
}

// ─── Room Types ───────────────────────────────────────────────────────────────

export async function listRoomTypes(apiKey, propertyId) {
  return channexRequest(
    'GET',
    `/room_types?filter[property_id]=${propertyId}&pagination[limit]=100`,
    apiKey
  );
}

export async function createRoomType(apiKey, roomTypeData) {
  return channexRequest('POST', '/room_types', apiKey, { room_type: roomTypeData });
}

export async function updateRoomType(apiKey, roomTypeId, roomTypeData) {
  return channexRequest('PUT', `/room_types/${roomTypeId}`, apiKey, { room_type: roomTypeData });
}

// ─── Rate Plans ───────────────────────────────────────────────────────────────

export async function listRatePlans(apiKey, propertyId) {
  return channexRequest(
    'GET',
    `/rate_plans?filter[property_id]=${propertyId}&pagination[limit]=100`,
    apiKey
  );
}

export async function createRatePlan(apiKey, ratePlanData) {
  return channexRequest('POST', '/rate_plans', apiKey, { rate_plan: ratePlanData });
}

export async function updateRatePlan(apiKey, ratePlanId, ratePlanData) {
  return channexRequest('PUT', `/rate_plans/${ratePlanId}`, apiKey, { rate_plan: ratePlanData });
}

// ─── ARI ─────────────────────────────────────────────────────────────────────

export async function pushAvailability(apiKey, propertyId, updates) {
  const payload = updates.map(({ room_type_id, date_from, date_to, availability }) => ({
    type: 'availability',
    attributes: { property_id: propertyId, room_type_id, date_from, date_to, availability },
  }));
  return channexRequest('POST', '/ari/bulk_update', apiKey, { values: payload });
}

export async function pushRates(apiKey, propertyId, updates) {
  const payload = updates.map(({
    room_type_id,
    rate_plan_id,
    date_from,
    date_to,
    rate,
    min_stay_arrival = 1,
    max_stay = 0,
    closed = false,
    closed_to_arrival = false,
    closed_to_departure = false,
  }) => ({
    type: 'rates',
    attributes: {
      property_id: propertyId,
      room_type_id,
      rate_plan_id,
      date_from,
      date_to,
      rate,
      min_stay_arrival,
      max_stay,
      closed,
      closed_to_arrival,
      closed_to_departure,
    },
  }));
  return channexRequest('POST', '/ari/bulk_update', apiKey, { values: payload });
}

export async function getARI(apiKey, propertyId, dateFrom, dateTo) {
  return channexRequest(
    'GET',
    `/ari?filter[property_id]=${propertyId}&filter[date][gte]=${dateFrom}&filter[date][lte]=${dateTo}`,
    apiKey
  );
}

// ─── Bookings ────────────────────────────────────────────────────────────────

export async function getBookingRevisionFeed(apiKey) {
  return channexRequest('GET', '/booking_revisions', apiKey);
}

export async function getBooking(apiKey, bookingId) {
  return channexRequest('GET', `/bookings/${bookingId}`, apiKey);
}

export async function listBookings(apiKey, filters = {}) {
  const params = new URLSearchParams({ 'pagination[limit]': 100 });
  if (filters.property_id) params.append('filter[property_id]', filters.property_id);
  if (filters.date_from) params.append('filter[date][gte]', filters.date_from);
  if (filters.date_to) params.append('filter[date][lte]', filters.date_to);
  if (filters.status) params.append('filter[status]', filters.status);
  return channexRequest('GET', `/bookings?${params.toString()}`, apiKey);
}

export async function acknowledgeBooking(apiKey, revisionId) {
  return channexRequest('POST', `/booking_revisions/${revisionId}/acknowledge`, apiKey);
}

// ─── Channels ─────────────────────────────────────────────────────────────────

export async function listChannels(apiKey, propertyId) {
  return channexRequest('GET', `/channels?filter[property_id]=${propertyId}`, apiKey);
}

export async function getChannelStatus(apiKey) {
  return channexRequest('GET', '/channels?pagination[limit]=100', apiKey);
}

// ─── Full Sync Helpers ────────────────────────────────────────────────────────

/**
 * Full property import with concurrency control (max 5 parallel property fetches).
 * Previously fired unlimited parallel requests — this could trigger Channex rate limits.
 */
export async function importAllProperties(apiKey) {
  const propertiesRes = await listProperties(apiKey);
  const properties = propertiesRes?.data || [];

  const enriched = await mapWithConcurrency(
    properties,
    async (prop) => {
      const propId = prop.id;
      const [roomTypesRes, ratePlansRes, channelsRes] = await Promise.all([
        listRoomTypes(apiKey, propId),
        listRatePlans(apiKey, propId),
        listChannels(apiKey, propId),
      ]);

      return {
        id: propId,
        channexId: propId,
        name: prop.attributes?.title || 'Unnamed Property',
        address: prop.attributes?.address || '',
        city: prop.attributes?.city || '',
        country: prop.attributes?.country || '',
        currency: prop.attributes?.currency || 'USD',
        roomTypes: (roomTypesRes?.data || []).map((rt) => ({
          id: rt.id,
          name: rt.attributes?.title,
          capacity: rt.attributes?.occ_adults,
          rooms: rt.attributes?.count_of_rooms,
        })),
        ratePlans: (ratePlansRes?.data || []).map((rp) => ({
          id: rp.id,
          name: rp.attributes?.title,
          roomTypeId: rp.attributes?.room_type_id,
          currency: rp.attributes?.currency,
        })),
        channels: (channelsRes?.data || []).reduce((acc, ch) => {
          acc[ch.attributes?.title?.toLowerCase()] = ch.attributes?.is_active || false;
          return acc;
        }, {}),
      };
    },
    /* concurrency = */ 5
  );

  return enriched;
}

/**
 * Sync bookings with Source-of-Truth reconciliation.
 *
 * Key fix: We now ONLY acknowledge a revision AFTER the caller has had a chance
 * to persist it locally. The `onBookingReceived` callback receives each booking
 * and must return true (or resolve) before acknowledge is called. If it throws,
 * the revision stays unacknowledged so it's retried on the next poll cycle.
 *
 * @param {string} apiKey
 * @param {Function} [onBookingReceived] - async (bookingData) => void — persist to DB here
 * @returns {Promise<Array>}
 */
export async function syncBookings(apiKey, onBookingReceived = null) {
  const feed = await getBookingRevisionFeed(apiKey);
  const revisions = feed?.data || [];

  const processed = [];
  const failed = [];

  for (const revision of revisions) {
    const revisionId = revision.id;
    try {
      const bookingId = revision.attributes?.booking_id;
      const booking = bookingId ? await getBooking(apiKey, bookingId) : null;

      const bookingData = {
        revisionId,
        bookingId,
        status: revision.attributes?.status,
        checkIn: booking?.data?.attributes?.arrival_date,
        checkOut: booking?.data?.attributes?.departure_date,
        guestName: booking?.data?.attributes?.customer?.name,
        guestEmail: booking?.data?.attributes?.customer?.email,
        channel: booking?.data?.attributes?.ota_name,
        propertyId: booking?.data?.attributes?.property_id,
        roomTypeId: booking?.data?.attributes?.room_type_id,
        amount: booking?.data?.attributes?.amount,
      };

      // SOURCE-OF-TRUTH: Persist to DB BEFORE acknowledging.
      // If this throws, we do NOT acknowledge — revision stays in feed for retry.
      if (onBookingReceived) {
        await onBookingReceived(bookingData);
      }

      // Only acknowledge after successful local persistence
      await acknowledgeBooking(apiKey, revisionId);
      processed.push(bookingData);
    } catch (err) {
      console.error(`[Channex] Failed to process revision ${revisionId}:`, err.message);
      failed.push({ revisionId, error: err.message });
    }
  }

  if (failed.length > 0) {
    console.warn(`[Channex] syncBookings: ${failed.length} revision(s) failed and will be retried on next poll.`, failed);
  }

  return processed;
}
