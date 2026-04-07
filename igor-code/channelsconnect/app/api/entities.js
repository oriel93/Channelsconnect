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
const createEntityWrapper = (entityName, apiResource) => {
  return {
    find: (params) => apiResource.getAll(params).then(res => res.data),
    findOne: (id) => apiResource.getById(id).then(res => res.data),
    create: (data) => apiResource.create(data).then(res => res.data),
    update: (id, data) => apiResource.update(id, data).then(res => res.data),
    delete: (id) => apiResource.delete(id).then(res => res.data),
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
  find: () => Promise.resolve([]),
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
