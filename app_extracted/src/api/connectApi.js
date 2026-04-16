/**
 * connectApi.js
 * Typed client for /connect/* endpoints on api.channelsconnect.com.
 *
 * Auth: reads the Base44 token from localStorage automatically.
 * The NestJS backend accepts Base44 tokens via dual-auth guard.
 * Channex is never exposed to the browser — all calls go through our backend.
 */

const API_BASE = import.meta.env.VITE_API_URL || 'https://api.channelsconnect.com';

/** Read the Base44 access token from localStorage */
function getToken() {
  try {
    return (
      localStorage.getItem('base44_access_token') ||
      localStorage.getItem('sb-access-token') ||
      localStorage.getItem('auth_token') ||
      null
    );
  } catch {
    return null;
  }
}

async function apiCall(method, path, body = null) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = json?.message || json?.error || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return json;
}

/** Get connection status for the current user (drives the onboarding state machine) */
export async function getConnectStatus() {
  return apiCall('GET', '/connect/status');
}

/** Step 1: Create the property on Channels Connect */
export async function onboardProperty(data) {
  return apiCall('POST', '/connect/onboard', data);
}

/** Step 2: Get a branded OAuth URL to connect an OTA channel */
export async function getOAuthLink(channel = 'airbnb') {
  return apiCall('GET', `/connect/oauth-link?channel=${channel}`);
}

/** Step 3: Trigger a full deep sync (property details, photos, 500-day ARI) */
export async function startSync() {
  return apiCall('POST', '/connect/sync');
}

/** Poll sync progress by syncLogId */
export async function getSyncProgress(syncLogId) {
  return apiCall('GET', `/connect/sync/${syncLogId}/progress`);
}

/** PMS Cert: Push 500-day ARI in 2 calls */
export async function pushFullARI(payload) {
  return apiCall('POST', '/connect/ari/full', payload);
}

/** PMS Cert: Update a specific date range */
export async function updateARI(payload) {
  return apiCall('POST', '/connect/ari/update', payload);
}

/** PMS Cert #11: Acknowledge a booking */
export async function acknowledgeBooking(bookingId) {
  return apiCall('POST', `/connect/booking/${bookingId}/ack`);
}
