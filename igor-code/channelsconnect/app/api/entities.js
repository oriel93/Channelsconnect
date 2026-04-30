// Compatibility layer - maps old base44 entity calls to new API
import { api } from '../lib/apiClient';
import { authHelpers } from '../lib/supabase';

// User entity (was base44.auth)
export const User = {
  me: async () => {
    const { user } = await authHelpers.getUser();
    if (!user) throw new Error('Not authenticated');
    
    // Also sync with our backend
    try {
      const { data } = await api.users.me();
      return data;
    } catch (error) {
      console.error('Error fetching user from backend:', error);
      return user;
    }
  },
  
  loginWithRedirect: async (redirectUrl) => {
    const { error } = await authHelpers.signInWithGoogle(redirectUrl);
    if (error) throw error;
  },

  signUp: async (email, password, additionalData) => {
    const { data, error } = await authHelpers.signUp(email, password, additionalData);
    if (error) throw error;
    return data;
  },

  signIn: async (email, password) => {
    const { data, error } = await authHelpers.signIn(email, password);
    if (error) throw error;
    return data;
  },

  signOut: async () => {
    const { error } = await authHelpers.signOut();
    if (error) throw error;
  },
};

// Helper to create entity wrapper
// Defensive: always checks method exists before calling to prevent
// 'TypeError: t.getAll is not a function' runtime crashes.
const createEntityWrapper = (entityName, apiResource) => {
  const safeCall = (method, fallback, ...args) => {
    if (typeof apiResource?.[method] !== 'function') {
      console.error(
        `[entities] ${entityName}.${method}() is not a function. ` +
        `Check apiClient.js — the '${entityName.toLowerCase()}s' namespace must export .${method}()`,
      );
      return Promise.resolve(fallback);
    }
    return apiResource[method](...args);
  };

  return {
    // find() — returns array; never throws; always falls back to []
    find: (params) =>
      safeCall('getAll', { data: [] }, params)
        .then(res => {
          const raw = res?.data;
          // Handle both { data: [...] } and flat [...] shapes
          if (Array.isArray(raw)) return raw;
          if (Array.isArray(raw?.data)) return raw.data;
          return [];
        })
        .catch(err => {
          console.error(`[entities] ${entityName}.find() failed:`, err?.message);
          return [];
        }),

    // findOne() — returns object or null; never throws
    findOne: (id) =>
      safeCall('getById', { data: null }, id)
        .then(res => res?.data?.data ?? res?.data ?? null)
        .catch(err => {
          console.error(`[entities] ${entityName}.findOne(${id}) failed:`, err?.message);
          return null;
        }),

    // create / update / delete — pass through; let caller handle errors
    create: (data) =>
      safeCall('create', { data: null }, data).then(res => res?.data?.data ?? res?.data ?? null),
    update: (id, data) =>
      safeCall('update', { data: null }, id, data).then(res => res?.data?.data ?? res?.data ?? null),
    delete: (id) =>
      safeCall('delete', { data: null }, id).then(res => res?.data ?? null),
  };
};

export const Channel = createEntityWrapper('Channel', api.channels);
export const Listing = createEntityWrapper('Listing', api.listings);
export const Booking = {
  ...createEntityWrapper('Booking', api.bookings),
  findByListingId: (listingId) => api.bookings.getByListingId(listingId).then(res => res.data),
};

// Simplified wrappers for entities that don't have full CRUD yet
export const RoomType = {
  find: () => Promise.resolve([]),
  create: (data) => Promise.resolve(data),
};

export const Inventory = {
  find: () => Promise.resolve([]),
};

export const Lead = {
  find: () => Promise.resolve([]),
  create: (data) => Promise.resolve(data),
};

export const PropertyConnection = {
  find: () => Promise.resolve([]),
};

export const Rate = {
  find: () => Promise.resolve([]),
};

export const ChannelsConnectBooking = {
  find: () => Promise.resolve([]),
};

export const BlockedDate = {
  find: () => Promise.resolve([]),
};

export const PricingRule = {
  find: () => Promise.resolve([]),
};

export const PropertyImage = {
  filter: async (params, orderBy) => {
    const { supabase } = await import('../lib/supabase');
    let query = supabase.from('property_images').select('*');
    if (params?.listing_id) query = query.eq('listing_id', params.listing_id);
    if (orderBy) query = query.order(orderBy, { ascending: true });
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data || [];
  },
  update: async (id, fields) => {
    const { supabase } = await import('../lib/supabase');
    const { error } = await supabase.from('property_images').update(fields).eq('id', id);
    if (error) throw new Error(error.message);
  },
  delete: async (id) => {
    const { supabase } = await import('../lib/supabase');
    const { error } = await supabase.from('property_images').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },
};

export const IcalConnection = {
  find: (params) => api.ical.getConnections(params?.listingId).then(res => res.data),
  findOne: (id) => api.ical.getConnection(id).then(res => res.data),
  create: (data) => api.ical.create(data).then(res => res.data),
  update: (id, data) => api.ical.update(id, data).then(res => res.data),
  delete: (id) => api.ical.delete(id).then(res => res.data),
};

export const PriceLabsIntegration = {
  find: () => Promise.resolve([]),
};

export const PropertyPricing = {
  find: () => Promise.resolve([]),
};

export const ChannelConnection = {
  find: () => Promise.resolve([]),
};

export const CalendarAuditLog = {
  find: () => Promise.resolve([]),
};

export const AirbnbConnection = {
  find: () => Promise.resolve([]),
};

export const ImportedListing = {
  find: () => Promise.resolve([]),
};

export const SyncLog = {
  find: () => Promise.resolve([]),
};

export const CalendarEvent = {
  find: (params) => api.calendar.getEvents(params).then(res => res.data),
  create: (data) => api.calendar.createEvent(data).then(res => res.data),
  update: (id, data) => api.calendar.updateEvent(id, data).then(res => res.data),
  delete: (id) => api.calendar.deleteEvent(id).then(res => res.data),
};
