/**
 * Beds24 API V2 - Authentication Types
 */

// Token scopes
export type Beds24TokenScope =
  | 'bookings'
  | 'bookings-personal'
  | 'bookings-financial'
  | 'inventory'
  | 'properties'
  | 'accounts'
  | 'channels';

// GET /authentication/setup response
export interface Beds24SetupResponse {
  token: string;
  expiresIn: number; // seconds (typically 3600)
  refreshToken: string;
}

// GET /authentication/token response
export interface Beds24TokenResponse {
  token: string;
  expiresIn: number; // seconds (typically 3600)
}

// Token details from /authentication/details
export interface Beds24TokenDetails {
  ownerId: number;
  expiresIn: number;
  created: string; // ISO date string
  scopes: Beds24TokenScope[];
  deviceName?: string;
  linkedProperties?: boolean;
  onlyPropertyId?: number;
  whiteListOnly?: boolean;
  whiteList?: string[];
}

// Diagnostics from /authentication/details
export interface Beds24Diagnostics {
  requestIp: string;
}

// GET /authentication/details response
export interface Beds24DetailsResponse {
  validToken: boolean;
  token: Beds24TokenDetails;
  diagnostics: Beds24Diagnostics;
}

// Internal token storage
export interface Beds24StoredToken {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp in milliseconds
}

