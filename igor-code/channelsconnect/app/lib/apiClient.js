import axios from 'axios';
import { supabase } from './supabase';

// VITE_API_URL is injected at build time by SST with the ALB URL for the API service.
// In development it falls back to localhost:3001.
// The legacy '/' value (same-origin server setup) collapses to '' so relative paths still work,
// but for any real URL (http/https) we use it verbatim.
const rawApiUrl = import.meta.env.VITE_API_URL || '';
const API_URL = rawApiUrl === '/' ? '' : rawApiUrl || 'http://localhost:3001';

// Create axios instance
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  async (config) => {
    const { data: { session } } = await supabase.auth.getSession();

    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;

    if (status === 401) {
      // Token expired — attempt a silent refresh before redirecting
      try {
        const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();
        if (!refreshError && session?.access_token) {
          // Retry original request with new token
          error.config.headers.Authorization = `Bearer ${session.access_token}`;
          return apiClient.request(error.config);
        }
      } catch { /* ignore refresh errors */ }

      // Only redirect to login if the caller hasn't opted out
      if (!error.config?._suppressAuthRedirect) {
        window.location.href = '/Login';
      }
    }

    // 403 Forbidden — DO NOT redirect to login.
    // The admin portal and role-guarded routes return 403 for non-admin users.
    // Redirecting on 403 would cause the admin kick-out loop.
    // Let callers handle 403 with their own error UI.

    return Promise.reject(error);
  }
);

// API methods organized by resource
export const api = {
  // Users
  users: {
    me: () => apiClient.get('/users/me'),
    update: (data) => apiClient.patch('/users/me', data),
    connectAirbnb: (profileUrl) => apiClient.post('/users/connect-airbnb', { profileUrl }),
    getSyncStatus: () => apiClient.get('/users/sync-status'),
  },

  // Listings
  listings: {
    // CRUD
    getAll: () => apiClient.get('/listings'),
    getById: (id) => apiClient.get(`/listings/${id}`),
    getActive: () => apiClient.get('/listings/active'),
    create: (data) => apiClient.post('/listings', data),
    update: (id, data) => apiClient.patch(`/listings/${id}`, data),
    delete: (id) => apiClient.delete(`/listings/${id}`),
    // Airbnb content capture
    importAirbnb: (url) => apiClient.post('/listings/import/airbnb', { url }),
    createManual: (title) => apiClient.post('/listings/manual', { title }),
    list: () => apiClient.get('/listings'),
    syncRate: (listingId, rate, date) =>
      apiClient.post(`/listings/${listingId}/rates`, { rate, date }),
    // ── Path 2: Excel bulk upload ────────────────────────────────────────────
    /** Download the .xlsx template as a Blob (use with URL.createObjectURL) */
    downloadBulkTemplate: () =>
      apiClient.get('/listings/bulk-import/template', { responseType: 'blob' }),
    /** Upload a filled-in .xlsx; body must be FormData with field "file" */
    bulkUpload: (formData) =>
      apiClient.post('/listings/bulk-import/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }),
    // ── Path 4: Website / URL import ────────────────────────────────────────
    /** Scrape a property listing URL and create a draft listing */
    importFromWebsite: (data) => apiClient.post('/listings/import/website', data),
    // ── Path 1: iCal import (convenience alias → /ical/import) ──────────────
    importIcal: (data) => apiClient.post('/ical/import', data),
  },

  // Bookings
  bookings: {
    getAll: (listingId) => apiClient.get('/bookings', { params: listingId ? { listingId } : undefined }),
    getById: (id) => apiClient.get(`/bookings/${id}`),
    getUpcoming: () => apiClient.get('/bookings/upcoming'),
    getByListingId: (listingId) => apiClient.get(`/bookings/listing/${listingId}`),
    create: (data) => apiClient.post('/bookings', data),
    update: (id, data) => apiClient.patch(`/bookings/${id}`, data),
    cancel: (id) => apiClient.patch(`/bookings/${id}/cancel`),
    delete: (id) => apiClient.delete(`/bookings/${id}`),
  },

  // Channels
  channels: {
    getAll: () => apiClient.get('/channels'),
    getActive: () => apiClient.get('/channels/active'),
    getById: (id) => apiClient.get(`/channels/${id}`),
    create: (data) => apiClient.post('/channels', data),
    update: (id, data) => apiClient.patch(`/channels/${id}`, data),
    delete: (id) => apiClient.delete(`/channels/${id}`),
  },

  // Calendar
  calendar: {
    getData: (params) => apiClient.get('/calendar/data', { params }),
    getEvents: (params) => apiClient.get('/calendar/events', { params }),
    getRates: (params) => apiClient.get('/calendar/rates', { params }),
    getBlockedDates: (params) => apiClient.get('/calendar/blocked-dates', { params }),
    updateRate: (data) => apiClient.post('/calendar/rates', data),
    bulkUpdateRates: (data) => apiClient.post('/calendar/rates/bulk', data),
    blockDate: (data) => apiClient.post('/calendar/block', data),
    bulkBlockDates: (data) => apiClient.post('/calendar/block/bulk', data),
    unblockDate: (params) => apiClient.delete('/calendar/unblock', { params }),
    bulkUnblockDates: (data) => apiClient.post('/calendar/unblock/bulk', data),
    createEvent: (data) => apiClient.post('/calendar/events', data),
    updateEvent: (id, data) => apiClient.patch(`/calendar/events/${id}`, data),
    deleteEvent: (id) => apiClient.delete(`/calendar/events/${id}`),
  },

  // iCal
  ical: {
    getConnections: (listingId) => apiClient.get('/ical/connections', { params: listingId ? { listingId } : undefined }),
    getConnection: (id) => apiClient.get(`/ical/connections/${id}`),
    create: (data) => apiClient.post('/ical/connections', data),
    update: (id, data) => apiClient.patch(`/ical/connections/${id}`, data),
    delete: (id) => apiClient.delete(`/ical/connections/${id}`),
    sync: (id) => apiClient.post(`/ical/sync/${id}`),
    syncAll: () => apiClient.post('/ical/sync-all'),
    export: (listingId) => apiClient.get(`/ical/export/${listingId}`),
    import: (data) => apiClient.post('/ical/import', data),
    /** Alias for api.ical.import — used by ICalTab in Listings.jsx */
    importIcal: (data) => apiClient.post('/ical/import', data),
  },

  // Dashboard
  dashboard: {
    getData: () => apiClient.get('/dashboard'),
    getCalendarData: (params) => apiClient.get('/dashboard/calendar', { params }),
    getChannelsData: () => apiClient.get('/dashboard/channels'),
  },

  // Analytics
  analytics: {
    get: (params) => apiClient.get('/analytics', { params }),
    getMarketData: (params) => apiClient.get('/analytics/market', { params }),
  },

  // Beds24
  beds24: {
    syncAirbnb: (data) => apiClient.post('/beds24/sync-airbnb', data),
    getPropertiesByHostId: (airbnbHostId) => apiClient.get(`/beds24/properties/${airbnbHostId}`),
    getProperty: (propKey) => apiClient.get(`/beds24/property/${propKey}`),
    getAllProperties: () => apiClient.get('/beds24/properties'),
    syncAndSaveProperties: () => apiClient.post('/beds24/sync-properties'),
    getCalendar: (params) => apiClient.get('/beds24/calendar', { params }),
    updateCalendar: (data) => apiClient.post('/beds24/calendar', data),
  },

  // Reports
  reports: {
    getRevenue: (params) => apiClient.get('/reports/revenue', { params }),
    getOccupancy: (params) => apiClient.get('/reports/occupancy', { params }),
    getADR: (params) => apiClient.get('/reports/adr', { params }),
    getPayouts: (params) => apiClient.get('/reports/payouts', { params }),
  },

  /**
   * connect — White-label Channels Connect onboarding API (/connect/*)
   * Channels are synced server-side; the browser never talks to Channex directly.
   */
  connect: {
    /** Returns { hasProperty, hasChannel, syncStatus, channexPropertyId, listingId } */
    getStatus: () => apiClient.get('/connect/status'),

    /** Step 1: Create the user's property. Body: { title, city, country, currency, address } */
    onboard: (data) => apiClient.post('/connect/onboard', data),

    /** Step 2: Get a branded OTA OAuth URL to open in a modal. channel = 'airbnb' | 'booking_com' */
    getOAuthLink: (channel = 'airbnb') => apiClient.get(`/connect/oauth-link?channel=${channel}`),

    /** Step 3: Start full deep sync (property details, photos, 500-day ARI). Returns { syncLogId } */
    startSync: () => apiClient.post('/connect/sync'),

    /** Poll sync progress by syncLogId */
    getSyncProgress: (syncLogId) => apiClient.get(`/connect/sync/${syncLogId}/progress`),

    /** PMS Cert Test #11: acknowledge a booking */
    acknowledgeBooking: (bookingId) => apiClient.post(`/connect/booking/${bookingId}/ack`),

    /** PMS Cert: push 500 days of ARI in exactly 2 calls */
    pushFullARI: (payload) => apiClient.post('/connect/ari/full', payload),

    /** PMS Cert: single/multi date range update */
    updateARI: (payload) => apiClient.post('/connect/ari/update', payload),

    /**
     * Phase 4: Push listing content (title, address, room type) to Channex.
     * SAFE: no ARI batching, no channex-sync contact.
     */
    pushPropertyContent: (listingId) =>
      apiClient.post('/connect/content/push-property', { listingId }),
  },

  /**
   * channexSync — Direct ARI sync API (/channex-sync/* and /listings/*)
   * Use these from dashboard sync buttons.
   */
  /**
   * admin — Super Admin Portal API
   * All routes require role='admin' in the users table.
   * Returns 403 for non-admin users.
   */
  admin: {
    getStats: () => apiClient.get('/admin/stats'),
    getUsers: () => apiClient.get('/admin/users'),
    getListings: () => apiClient.get('/admin/listings'),
    /** Returns a Blob — use with URL.createObjectURL for download */
    exportListingsBlob: () =>
      apiClient.get('/admin/export/listings', { responseType: 'blob' }),
    /** Per-user full data export (JSON blob download) */
    exportUserData: (userId) =>
      apiClient.get(`/admin/users/${userId}/export`, { responseType: 'blob' }),
    /** Get all images for a listing (admin view, includes hi-res metadata) */
    getListingImages: (listingId) =>
      apiClient.get(`/admin/listings/${listingId}/images`),
    /** Trigger server-side sharp hi-res conversion for one image */
    convertImageToHighRes: (listingId, imageId) =>
      apiClient.post(`/admin/listings/${listingId}/images/${imageId}/convert`),
    // ── Review Queue ───────────────────────────────────────────────────────
    /** All listings with reviewStatus='pending_admin_review' */
    getPendingReview: () => apiClient.get('/admin/review'),
    /** Single listing detail for admin edit modal */
    getReviewListing: (listingId) => apiClient.get(`/admin/review/${listingId}`),
    /** Save admin edits before approving */
    updateReviewListing: (listingId, data) => apiClient.patch(`/admin/review/${listingId}`, data),
    /** Approve — sets isActive=true, reviewStatus='approved' */
    approveListing: (listingId) => apiClient.post(`/admin/review/${listingId}/approve`),
    /** Reject with optional reason */
    rejectListing: (listingId, reason) => apiClient.post(`/admin/review/${listingId}/reject`, { reason }),

    // ── Channex Sync Engine ───────────────────────────────────────────────────
    /** Get Channex sync state — determines smart button label (Publish vs Sync Updates) */
    getListingSyncState: (listingId) => apiClient.get(`/admin/listings/${listingId}/sync-state`),
    /** POST creates new Channex property if none exists; PUT updates if it does */
    syncListingToChannex: (listingId) => apiClient.post(`/admin/listings/${listingId}/sync`),
    /** Set Channex property inactive and archive locally */
    deactivateListing: (listingId) => apiClient.post(`/admin/listings/${listingId}/deactivate`),
  },

  /** Record ToS consent — called immediately after signup */
  recordConsent: () => apiClient.post('/users/consent'),

  channexSync: {
    /** Apply a single ARI change (event-driven, 500 ms batch window) */
    applyChange: (update) => apiClient.post('/channex-sync/apply', { update }),

    /** Manually drain the queue (admin / cert testing) */
    drainQueue: () => apiClient.post('/channex-sync/drain'),

    /** Push a rate directly (synchronous — returns task_id immediately) */
    pushRate: (listingId, rate, date, minStay) =>
      apiClient.post(`/listings/${listingId}/rates`, { rate, date, minStay }),

    /** Parity check (random sample of local vs Channex) */
    parity: (apiKey, sample = 10) =>
      apiClient.get('/channex-sync/parity', { params: { apiKey, sample } }),
  },

};

export default apiClient;
