/**
 * connectApi.js
 * Typed client for the /connect/* endpoints on api.channelsconnect.com.
 * All calls are proxied through our backend — Channex is never exposed to the browser.
 */

const API_BASE = import.meta.env.VITE_API_URL || 'https://api.channelsconnect.com';

async function apiCall(method, path, body = null, token = null) {
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

/** Get connection status for the current user */
export async function getConnectStatus(token) {
  return apiCall('GET', '/connect/status', null, token);
}

/** Onboard: create property on Channels Connect */
export async function onboardProperty(token, data) {
  return apiCall('POST', '/connect/onboard', data, token);
}

/** Get OAuth URL to connect an OTA (Airbnb, etc.) */
export async function getOAuthLink(token, channel = 'airbnb') {
  return apiCall('GET', `/connect/oauth-link?channel=${channel}`, null, token);
}

/** Start a full deep sync (returns { syncLogId }) */
export async function startSync(token) {
  return apiCall('POST', '/connect/sync', null, token);
}

/** Poll sync progress */
export async function getSyncProgress(token, syncLogId) {
  return apiCall('GET', `/connect/sync/${syncLogId}/progress`, null, token);
}
