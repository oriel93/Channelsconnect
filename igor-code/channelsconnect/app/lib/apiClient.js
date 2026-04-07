import axios from 'axios';
import { supabase } from './supabase';

// In production: VITE_API_URL="/" means same origin (Router serves both)
// In development: falls back to localhost:3001
const API_URL = import.meta.env.VITE_API_URL === '/' 
  ? '' 
  : (import.meta.env.VITE_API_URL || 'http://localhost:3001');

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
    if (error.response?.status === 401) {
      // Token expired or invalid, try to refresh
      const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();
      
      if (!refreshError && session) {
        // Retry the request with new token
        error.config.headers.Authorization = `Bearer ${session.access_token}`;
        return apiClient.request(error.config);
      } else {
        // Refresh failed, redirect to login
        window.location.href = '/';
      }
    }
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
    getAll: () => apiClient.get('/listings'),
    getById: (id) => apiClient.get(`/listings/${id}`),
    getActive: () => apiClient.get('/listings/active'),
    create: (data) => apiClient.post('/listings', data),
    update: (id, data) => apiClient.patch(`/listings/${id}`, data),
    delete: (id) => apiClient.delete(`/listings/${id}`),
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

  // Channex (server-side integration - API key never exposed to frontend)
  channex: {
    listProperties: () => apiClient.get('/channex/properties'),
    importProperties: () => apiClient.post('/channex/properties/import'),
    syncProperties: () => apiClient.post('/channex/sync/full'),
    syncBookings: () => apiClient.post('/channex/bookings/sync'),
    getBookings: () => apiClient.get('/channex/bookings'),
  },

  // Reports
  reports: {
    getRevenue: (params) => apiClient.get('/reports/revenue', { params }),
    getOccupancy: (params) => apiClient.get('/reports/occupancy', { params }),
    getADR: (params) => apiClient.get('/reports/adr', { params }),
    getPayouts: (params) => apiClient.get('/reports/payouts', { params }),
  },
};

export default apiClient;

