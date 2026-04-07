// Compatibility layer - maps old base44 function calls to new API
import { api } from '../lib/apiClient';

// Calendar functions
export const blockDate = (data) => api.calendar.blockDate(data).then(res => res.data);
export const exportIcal = (listingId) => api.ical.export(listingId).then(res => res.data);
export const syncAllIcals = () => api.ical.syncAll().then(res => res.data);
export const importIcal = (data) => api.ical.import(data).then(res => res.data);
export const forceIcalSync = (connectionId) => api.ical.sync(connectionId).then(res => res.data);

// Rate functions
export const updateRate = (data) => api.calendar.updateRate(data).then(res => res.data);
export const bulkUpdateRates = (data) => api.calendar.bulkUpdateRates(data).then(res => res.data);
export const bulkBlockDates = (data) => api.calendar.bulkBlockDates(data).then(res => res.data);
export const bulkUnblockDates = (data) => api.calendar.bulkUnblockDates(data).then(res => res.data);

// Dashboard functions
export const getDashboardData = () => api.dashboard.getData().then(res => res.data);
export const getCalendarData = (params) => api.calendar.getData(params).then(res => res.data);
export const getDashboardCalendarData = (params) => api.dashboard.getCalendarData(params).then(res => res.data);
export const getChannelsDashboardData = () => api.dashboard.getChannelsData().then(res => res.data);

// Analytics functions
export const getAnalytics = (params) => api.analytics.get(params).then(res => res.data);
export const getMarketData = (params) => api.analytics.getMarketData(params).then(res => res.data);

// Calendar entry management
export const updateCalendarEntry = (id, data) => api.calendar.updateEvent(id, data).then(res => res.data);

// Placeholder functions for features not yet implemented
export const uploadImages = (data) => {
  console.warn('uploadImages not yet implemented in new API');
  return Promise.resolve({ message: 'Not implemented' });
};

export const processIcalData = (data) => {
  console.warn('processIcalData not yet implemented in new API');
  return Promise.resolve({ message: 'Not implemented' });
};

export const priceLabsConnect = (data) => {
  console.warn('priceLabsConnect not yet implemented in new API');
  return Promise.resolve({ message: 'Not implemented' });
};

export const priceLabsGetPricing = (data) => {
  console.warn('priceLabsGetPricing not yet implemented in new API');
  return Promise.resolve({ message: 'Not implemented' });
};

export const downloadExcelTemplate = () => {
  console.warn('downloadExcelTemplate not yet implemented in new API');
  return Promise.resolve({ message: 'Not implemented' });
};

export const debugIcalImport = (data) => {
  console.warn('debugIcalImport not yet implemented in new API');
  return Promise.resolve({ message: 'Not implemented' });
};

export const debugCheckEvents = (data) => {
  console.warn('debugCheckEvents not yet implemented in new API');
  return Promise.resolve({ message: 'Not implemented' });
};

export const fixPropertyMismatch = (data) => {
  console.warn('fixPropertyMismatch not yet implemented in new API');
  return Promise.resolve({ message: 'Not implemented' });
};

export const updatePricingRules = (data) => {
  console.warn('updatePricingRules not yet implemented in new API');
  return Promise.resolve({ message: 'Not implemented' });
};

export const importBookingCom = (data) => {
  console.warn('importBookingCom not yet implemented in new API');
  return Promise.resolve({ message: 'Not implemented' });
};

export const importExcel = (data) => {
  console.warn('importExcel not yet implemented in new API');
  return Promise.resolve({ message: 'Not implemented' });
};

export const importPms = (data) => {
  console.warn('importPms not yet implemented in new API');
  return Promise.resolve({ message: 'Not implemented' });
};

export const debugIcalUrl = (data) => {
  console.warn('debugIcalUrl not yet implemented in new API');
  return Promise.resolve({ message: 'Not implemented' });
};

export const uploadImageFiles = (data) => {
  console.warn('uploadImageFiles not yet implemented in new API');
  return Promise.resolve({ message: 'Not implemented' });
};

export const getCloudinarySignature = (data) => {
  console.warn('getCloudinarySignature not yet implemented in new API');
  return Promise.resolve({ message: 'Not implemented' });
};

export const saveImageMetadata = (data) => {
  console.warn('saveImageMetadata not yet implemented in new API');
  return Promise.resolve({ message: 'Not implemented' });
};

export const enterpriseIcalSync = (data) => {
  console.warn('enterpriseIcalSync not yet implemented in new API');
  return Promise.resolve({ message: 'Not implemented' });
};

export const channelManagerService = (data) => {
  console.warn('channelManagerService not yet implemented in new API');
  return Promise.resolve({ message: 'Not implemented' });
};

export const webSocketHandler = (data) => {
  console.warn('webSocketHandler not yet implemented in new API');
  return Promise.resolve({ message: 'Not implemented' });
};

export const airbnbImportListings = (data) => {
  console.warn('airbnbImportListings not yet implemented in new API');
  return Promise.resolve({ message: 'Not implemented' });
};

export const advancedIcalProcessor = (data) => {
  console.warn('advancedIcalProcessor not yet implemented in new API');
  return Promise.resolve({ message: 'Not implemented' });
};

export const icalSyncService = (data) => {
  console.warn('icalSyncService not yet implemented in new API');
  return Promise.resolve({ message: 'Not implemented' });
};

export const generateICalFeed = (data) => {
  console.warn('generateICalFeed not yet implemented in new API');
  return Promise.resolve({ message: 'Not implemented' });
};

export const createBeds24SubAccount = (data) => {
  console.warn('createBeds24SubAccount not yet implemented in new API');
  return Promise.resolve({ message: 'Not implemented' });
};

export const importBeds24Properties = async () => {
  return importChannexProperties();
};

export const beds24ApiService = (data) => {
  console.warn('beds24ApiService not yet implemented in new API');
  return Promise.resolve({ message: 'Not implemented' });
};

export const channexApiService = (data) => {
  console.warn('channexApiService not yet implemented in new API');
  return Promise.resolve({ message: 'Not implemented' });
};

export const enhancedImportBeds24Properties = async () => {
  return importChannexProperties();
};

export const disconnectChannexConnection = () => {
  return Promise.resolve({ data: { success: true } });
};

export const enhancedExcelImport = (data) => {
  console.warn('enhancedExcelImport not yet implemented in new API');
  return Promise.resolve({ message: 'Not implemented' });
};

export const twoWayUpdateRate = (data) => {
  console.warn('twoWayUpdateRate not yet implemented in new API');
  return Promise.resolve({ message: 'Not implemented' });
};

export const twoWayBlockDate = (data) => {
  console.warn('twoWayBlockDate not yet implemented in new API');
  return Promise.resolve({ message: 'Not implemented' });
};

export const setupBeds24Connection = (data) => {
  console.warn('setupBeds24Connection not yet implemented in new API');
  return Promise.resolve({ message: 'Not implemented' });
};

// Channex connection check - calls backend which uses the server-side API key
export const setupChannexConnection = async () => {
  try {
    const response = await api.channex.getStatus();
    const { connected, propertiesCount } = response.data;
    if (connected) {
      return { data: { success: true, message: `Connected! Found ${propertiesCount} properties.`, propertiesCount } };
    }
    return { data: { success: false, error: 'Could not connect to channel manager. Please contact support.' } };
  } catch (error) {
    return { data: { success: false, error: error.response?.data?.message || error.message || 'Connection check failed' } };
  }
};

// Import all properties from Channex via backend
export const importChannexProperties = async () => {
  try {
    const response = await api.channex.syncProperties();
    return { data: { success: true, ...response.data } };
  } catch (error) {
    return { data: { success: false, error: error.response?.data?.message || error.message || 'Failed to sync properties' } };
  }
};

export const configureCustomAuth = (data) => {
  console.warn('configureCustomAuth not yet implemented in new API');
  return Promise.resolve({ message: 'Not implemented' });
};

export const disconnectBeds24Connection = (data) => {
  console.warn('disconnectBeds24Connection not yet implemented in new API');
  return Promise.resolve({ message: 'Not implemented' });
};

export const getUserLocation = () => {
  console.warn('getUserLocation not yet implemented in new API');
  return Promise.resolve({ message: 'Not implemented' });
};

// Beds24 functions
export const syncAirbnbToBeds24 = (data) => api.beds24.syncAirbnb(data).then(res => res.data);
export const getBeds24PropertiesByHostId = (airbnbHostId) => api.beds24.getPropertiesByHostId(airbnbHostId).then(res => res.data);
export const getBeds24Property = (propKey) => api.beds24.getProperty(propKey).then(res => res.data);
