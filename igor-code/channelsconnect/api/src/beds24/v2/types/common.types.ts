/**
 * Beds24 API V2 - Common Types
 */

// Base API response structure
export interface Beds24ApiError {
  success: false;
  type: 'error';
  code: number;
  error: string;
}

// Rate limit headers returned with each response
export interface Beds24RateLimitHeaders {
  fiveMinCreditLimit: number;
  fiveMinCreditLimitResetsIn: number;
  fiveMinCreditLimitRemaining: number;
  requestCost: number;
}

// Generic successful response wrapper
export interface Beds24SuccessResponse<T = unknown> {
  success: true;
  data?: T;
  count?: number;
  type?: string;
}

// Pagination info
export interface Beds24Pages {
  nextPage?: number;
  prevPage?: number;
  totalPages?: number;
  totalItems?: number;
}

