/**
 * Channex.io API Client
 * Full integration: Properties, Room Types, Rate Plans, ARI, Bookings
 * Docs: https://docs.channex.io
 */

const CHANNEX_BASE_URL = 'https://api.channex.io/api/v1';

// API key should be stored in your environment / backend — never hardcoded in production.
// For Base44 backend functions, pass it via the function payload from a secure env variable.
const getHeaders = (apiKey) => ({
  'Content-Type': 'application/json',
  'user-api-key': apiKey,
});

// ─── Generic request helper ───────────────────────────────────────────────────

async function channexRequest(method, path, apiKey, body = null) {
  const url = `${CHANNEX_BASE_URL}${path}`;
  const options = {
    method,
    headers: getHeaders(apiKey),
  };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(url, options);
  const json = await res.json();

  if (!res.ok) {
    const firstError = Array.isArray(json?.errors) ? json.errors[0] : json?.errors;
    const errMsg = firstError?.detail || firstError?.title || firstError?.code || `HTTP ${res.status}`;
    throw new Error(`Channex API error: ${errMsg}`);
  }
  return json;
}

// ─── Pagination helper ────────────────────────────────────────────────────────

/**
 * Fetches all pages of a paginated Channex endpoint.
 * @param {string} basePath - path without pagination params (e.g. '/properties')
 * @param {string} apiKey
 * @param {number} [limit=100]
 */
async function fetchAllPages(basePath, apiKey, limit = 100) {
  const separator = basePath.includes('?') ? '&' : '?';
  let page = 1;
  let allData = [];

  while (true) {
    const json = await channexRequest(
      'GET',
      `${basePath}${separator}pagination[limit]=${limit}&pagination[page]=${page}`,
      apiKey
    );
    const pageData = json?.data || [];
    allData = allData.concat(pageData);
    if (pageData.length < limit) break;
    page++;
  }

  return { data: allData };
}

// ─── Properties ──────────────────────────────────────────────────────────────

/**
 * List all properties under this API key account.
 */
export async function listProperties(apiKey) {
  return fetchAllPages('/properties', apiKey);
}

/**
 * Get a single property by its Channex ID.
 */
export async function getProperty(apiKey, propertyId) {
  return channexRequest('GET', `/properties/${propertyId}`, apiKey);
}

/**
 * Create a new property in Channex.
 * @param {object} propertyData - { title, currency, email, phone, zip_code, country, city, address, latitude, longitude, timezone, content }
 */
export async function createProperty(apiKey, propertyData) {
  return channexRequest('POST', '/properties', apiKey, {
    property: {
      ...propertyData,
    },
  });
}

/**
 * Update an existing property.
 */
export async function updateProperty(apiKey, propertyId, propertyData) {
  return channexRequest('PUT', `/properties/${propertyId}`, apiKey, {
    property: propertyData,
  });
}

// ─── Room Types ───────────────────────────────────────────────────────────────

/**
 * List room types for a property.
 */
export async function listRoomTypes(apiKey, propertyId) {
  return fetchAllPages(`/room_types?filter[property_id]=${propertyId}`, apiKey);
}

/**
 * Create a room type.
 * @param {object} roomTypeData - { title, property_id, count_of_rooms, occ_adults, occ_children, occ_infants, description }
 */
export async function createRoomType(apiKey, roomTypeData) {
  return channexRequest('POST', '/room_types', apiKey, {
    room_type: roomTypeData,
  });
}

/**
 * Update a room type.
 */
export async function updateRoomType(apiKey, roomTypeId, roomTypeData) {
  return channexRequest('PUT', `/room_types/${roomTypeId}`, apiKey, {
    room_type: roomTypeData,
  });
}

// ─── Rate Plans ───────────────────────────────────────────────────────────────

/**
 * List rate plans for a property.
 */
export async function listRatePlans(apiKey, propertyId) {
  return fetchAllPages(`/rate_plans?filter[property_id]=${propertyId}`, apiKey);
}

/**
 * Create a rate plan.
 * @param {object} ratePlanData - { title, property_id, room_type_id, currency, sell_mode, rate_mode, inherit_rate, inherit_closed, inherit_min_stay_arrival }
 */
export async function createRatePlan(apiKey, ratePlanData) {
  return channexRequest('POST', '/rate_plans', apiKey, {
    rate_plan: ratePlanData,
  });
}

/**
 * Update a rate plan.
 */
export async function updateRatePlan(apiKey, ratePlanId, ratePlanData) {
  return channexRequest('PUT', `/rate_plans/${ratePlanId}`, apiKey, {
    rate_plan: ratePlanData,
  });
}

// ─── ARI (Availability, Rates & Inventory) ───────────────────────────────────

/**
 * Push availability updates to Channex.
 * Best practice: send availability separately from rates.
 * @param {string} propertyId
 * @param {Array} updates - [{ room_type_id, date_from, date_to, availability }]
 */
export async function pushAvailability(apiKey, propertyId, updates) {
  const payload = updates.map(({ room_type_id, date_from, date_to, availability }) => ({
    type: 'availability',
    attributes: {
      property_id: propertyId,
      room_type_id,
      date_from,
      date_to,
      availability,
    },
  }));

  return channexRequest('POST', '/ari/bulk_update', apiKey, { values: payload });
}

/**
 * Push rate & restriction updates to Channex.
 * @param {string} propertyId
 * @param {Array} updates - [{ room_type_id, rate_plan_id, date_from, date_to, rate, min_stay_arrival, max_stay, closed, closed_to_arrival, closed_to_departure }]
 */
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

/**
 * Get current ARI for a property across a date range.
 */
export async function getARI(apiKey, propertyId, dateFrom, dateTo) {
  return channexRequest(
    'GET',
    `/ari?filter[property_id]=${propertyId}&filter[date][gte]=${dateFrom}&filter[date][lte]=${dateTo}`,
    apiKey
  );
}

// ─── Bookings ────────────────────────────────────────────────────────────────

/**
 * Get all unacknowledged booking revisions (new bookings, modifications, cancellations).
 * Poll this regularly. After processing each booking, call acknowledgeBooking().
 */
export async function getBookingRevisionFeed(apiKey) {
  return channexRequest('GET', '/booking_revisions', apiKey);
}

/**
 * Get a single booking by ID.
 */
export async function getBooking(apiKey, bookingId) {
  return channexRequest('GET', `/bookings/${bookingId}`, apiKey);
}

/**
 * List all bookings with optional filters.
 * @param {object} filters - { property_id, date_from, date_to, status }
 */
export async function listBookings(apiKey, filters = {}) {
  const params = new URLSearchParams();
  if (filters.property_id) params.append('filter[property_id]', filters.property_id);
  if (filters.date_from) params.append('filter[date][gte]', filters.date_from);
  if (filters.date_to) params.append('filter[date][lte]', filters.date_to);
  if (filters.status) params.append('filter[status]', filters.status);

  const queryStr = params.toString();
  return fetchAllPages(`/bookings${queryStr ? `?${queryStr}` : ''}`, apiKey);
}

/**
 * Acknowledge a booking revision so it won't be returned in the feed again.
 * Call this after successfully processing each booking from getBookingRevisionFeed().
 */
export async function acknowledgeBooking(apiKey, revisionId) {
  return channexRequest('POST', `/booking_revisions/${revisionId}/acknowledge`, apiKey);
}

// ─── Channels (OTA connections) ───────────────────────────────────────────────

/**
 * List available channels (OTAs) for a property.
 */
export async function listChannels(apiKey, propertyId) {
  return channexRequest('GET', `/channels?filter[property_id]=${propertyId}`, apiKey);
}

/**
 * Get channel status across all properties.
 */
export async function getChannelStatus(apiKey) {
  return fetchAllPages('/channels', apiKey);
}

// ─── Full Sync Helpers ────────────────────────────────────────────────────────

/**
 * Full property import: fetches all properties + their room types + rate plans.
 * Returns a structured object ready to use in the dashboard.
 */
export async function importAllProperties(apiKey) {
  const propertiesRes = await listProperties(apiKey);
  const properties = propertiesRes?.data || [];

  const enriched = await Promise.all(
    properties.map(async (prop) => {
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
    })
  );

  return enriched;
}

/**
 * Process unacknowledged bookings: fetch, return list, auto-acknowledge each.
 */
export async function syncBookings(apiKey) {
  const feed = await getBookingRevisionFeed(apiKey);
  const revisions = feed?.data || [];

  const processed = [];
  for (const revision of revisions) {
    try {
      const bookingId = revision.attributes?.booking_id;
      const booking = bookingId ? await getBooking(apiKey, bookingId) : null;

      processed.push({
        revisionId: revision.id,
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
      });

      // Acknowledge so it won't show up again
      await acknowledgeBooking(apiKey, revision.id);
    } catch (err) {
      console.error(`Failed to process revision ${revision.id}:`, err.message);
    }
  }

  return processed;
}
