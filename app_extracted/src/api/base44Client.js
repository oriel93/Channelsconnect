/**
 * Supabase + NestJS API replacement for the Base44 SDK.
 * Provides the same interface: base44.auth, base44.entities.X, base44.functions.X
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ncaacrnkdgymcxaxnzcw.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jYWFjcm5rZGd5bWN4YXhuemN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzMzgzMDksImV4cCI6MjA2NjkxNDMwOX0.eYC3MY4RNC_tbMAwm_5okf5VLHXfrG2wToyGKWxXnZk';
const API_URL = 'https://api.channelsconnect.com';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─── API fetch helper ─────────────────────────────────────────────────────────

async function getToken() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

async function apiCall(method, path, body) {
  const token = await getToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  if (res.status === 204) return null;
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = json?.message || json?.error || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return json;
}

// ─── Entity factory ────────────────────────────────────────────────────────────

function normalizeArray(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.data)) return data.data;
  if (data && typeof data === 'object') return [data];
  return [];
}

function createEntity(apiPath, { allowCreate = true, allowUpdate = true, allowDelete = true } = {}) {
  const base = {
    async list() {
      try { return normalizeArray(await apiCall('GET', `/${apiPath}`)); }
      catch (e) { console.warn(`[API] ${apiPath} list failed:`, e.message); return []; }
    },
    async filter(filters = {}) {
      try {
        const qs = new URLSearchParams(filters).toString();
        const url = qs ? `/${apiPath}?${qs}` : `/${apiPath}`;
        return normalizeArray(await apiCall('GET', url));
      } catch (e) { console.warn(`[API] ${apiPath} filter failed:`, e.message); return []; }
    },
    async get(id) {
      return apiCall('GET', `/${apiPath}/${id}`);
    },
  };
  if (allowCreate) base.create = (data) => apiCall('POST', `/${apiPath}`, data);
  if (allowUpdate) base.update = (id, data) => apiCall('PATCH', `/${apiPath}/${id}`, data);
  if (allowDelete) base.delete = (id) => apiCall('DELETE', `/${apiPath}/${id}`);
  return base;
}

// Stub entity — returns empty arrays, silently no-ops writes
function stubEntity() {
  return {
    list: async () => [],
    filter: async () => [],
    get: async () => null,
    create: async (d) => d,
    update: async (id, d) => d,
    delete: async () => null,
  };
}

// ─── Auth entity ───────────────────────────────────────────────────────────────

const authEntity = {
  async me() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session) throw new Error('Not authenticated');
    try {
      const userData = await apiCall('GET', '/users/me');
      return { ...userData, email: session.user.email };
    } catch {
      // Fall back to Supabase user data
      return {
        id: session.user.id,
        email: session.user.email,
        full_name: session.user.user_metadata?.full_name || '',
        avatar_url: session.user.user_metadata?.avatar_url || '',
      };
    }
  },

  async loginWithRedirect(returnUrl) {
    const redirectTo = `${window.location.origin}/AuthCallback`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
    if (error) throw error;
  },

  async logout() {
    await supabase.auth.signOut();
    window.location.href = '/';
  },
};

// ─── Function stubs ────────────────────────────────────────────────────────────

const getDashboardData = async () => {
  try { return await apiCall('GET', '/dashboard'); }
  catch { return { stats: {}, recentBookings: [] }; }
};

const getDashboardCalendarData = async ({ startDate, endDate } = {}) => {
  try {
    const qs = startDate && endDate ? `?startDate=${startDate}&endDate=${endDate}` : '';
    return await apiCall('GET', `/dashboard/calendar${qs}`);
  } catch { return { listings: [], bookings: [], blockedDates: [], rates: [] }; }
};

const getChannelsDashboardData = async () => {
  try { return await apiCall('GET', '/dashboard/channels'); }
  catch { return { listings: [], channels: [], channelConnections: [], stats: {} }; }
};

function noopFn(name) {
  return async (params) => {
    console.warn(`[stub] function "${name}" not implemented`);
    return { data: null, error: null, success: false };
  };
}

const functions = new Proxy(
  {
    getDashboardData,
    getDashboardCalendarData,
    getChannelsDashboardData,
  },
  {
    get(target, name) {
      return name in target ? target[name] : noopFn(name);
    },
  }
);

// ─── Exported base44 object ────────────────────────────────────────────────────

export const base44 = {
  auth: authEntity,

  entities: {
    // Real API-backed entities
    Channel: createEntity('channels'),
    Listing: createEntity('listings'),
    Booking: createEntity('bookings'),

    // ChannelConnection — stored locally via API (or stub if no endpoint)
    ChannelConnection: {
      ...stubEntity(),
      _store: {},
      async filter(filters = {}) {
        // Stored in localStorage for now since no dedicated endpoint
        try {
          const all = JSON.parse(localStorage.getItem('channelConnections') || '[]');
          return all.filter(c =>
            Object.entries(filters).every(([k, v]) => c[k] == v)
          );
        } catch { return []; }
      },
      async create(data) {
        const all = JSON.parse(localStorage.getItem('channelConnections') || '[]');
        const entry = { ...data, id: Date.now().toString() };
        all.push(entry);
        localStorage.setItem('channelConnections', JSON.stringify(all));
        return entry;
      },
      async update(id, data) {
        let all = JSON.parse(localStorage.getItem('channelConnections') || '[]');
        all = all.map(c => c.id == id ? { ...c, ...data } : c);
        localStorage.setItem('channelConnections', JSON.stringify(all));
        return all.find(c => c.id == id);
      },
      async delete(id) {
        let all = JSON.parse(localStorage.getItem('channelConnections') || '[]');
        all = all.filter(c => c.id != id);
        localStorage.setItem('channelConnections', JSON.stringify(all));
      },
    },

    // Stubs for entities without API endpoints in this version
    RoomType: stubEntity(),
    Inventory: stubEntity(),
    Rate: stubEntity(),
    Lead: stubEntity(),
    PropertyConnection: stubEntity(),
    ChannelsConnectBooking: stubEntity(),
    BlockedDate: stubEntity(),
    PricingRule: stubEntity(),
    PropertyImage: stubEntity(),
    IcalConnection: stubEntity(),
    PriceLabsIntegration: stubEntity(),
    PropertyPricing: stubEntity(),
    CalendarAuditLog: stubEntity(),
    AirbnbConnection: stubEntity(),
    ImportedListing: stubEntity(),
    SyncLog: stubEntity(),
    CalendarEvent: stubEntity(),
  },

  functions,

  agents: {
    initAgent: () => ({
      sendMessage: async () => ({ content: 'AI assistant not available in this version.' }),
    }),
  },
};
