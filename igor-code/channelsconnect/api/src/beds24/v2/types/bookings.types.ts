/**
 * Beds24 API V2 - Bookings Types
 * Based on Beds24 API documentation
 */

import { Beds24Pages } from './common.types';

// Booking status types
export type Beds24BookingStatus = 'new' | 'request' | 'confirmed' | 'cancelled' | 'black' | 'deleted';

// Guest info in booking
export interface Beds24BookingGuest {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  address?: string;
  city?: string;
  state?: string;
  postcode?: string;
  country?: string;
  country2?: string;
  comments?: string;
}

// Info item in booking
export interface Beds24BookingInfoItem {
  code: string;
  text?: string;
  qty?: number;
  price?: number;
  priceType?: 'fixed' | 'per_night' | 'per_guest' | 'per_guest_night';
}

// Invoice item in booking
export interface Beds24BookingInvoiceItem {
  id?: number;
  bookId?: number;
  description: string;
  qty: number;
  price: number;
  vatRate?: number;
  invoiceId?: number;
  offerId?: number;
}

// Single booking object from Beds24
export interface Beds24Booking {
  id: number;
  propertyId: number;
  roomId: number;
  unitId?: number;
  arrival: string; // YYYY-MM-DD
  departure: string; // YYYY-MM-DD
  numAdult: number;
  numChild?: number;
  status: Beds24BookingStatus;

  // Price information
  price?: number;
  commission?: number;
  deposit?: number;
  tax?: number;

  // Reference and source
  referer?: string;
  apiReference?: string;
  stripePaymentIntentId?: string;

  // Guest information (V2 API format)
  title?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  address?: string;
  city?: string;
  state?: string;
  postcode?: string;
  country?: string;
  country2?: string;
  comments?: string;
  notes?: string;
  
  // Legacy field names (for backward compatibility)
  guestTitle?: string;
  guestFirstName?: string;
  guestName?: string; // Last name
  guestEmail?: string;
  guestPhone?: string;
  guestMobile?: string;
  guestAddress?: string;
  guestCity?: string;
  guestState?: string;
  guestPostcode?: string;
  guestCountry?: string;
  guestCountry2?: string;
  guestComments?: string;

  // Booking details
  arrivalTime?: string;
  departureTime?: string;
  firstNight?: string;
  lastNight?: string;

  // Additional info
  infoItems?: Beds24BookingInfoItem[];
  invoiceItems?: Beds24BookingInvoiceItem[];

  // Timestamps
  bookingTime?: string;
  modifiedTime?: string;
  cancelTime?: string;

  // Channel info
  masterId?: number;
  offerId?: number;
  offerRoomId?: number;
  invoiceId?: number;
  voucherId?: number;
}

// Parameters for GET /bookings
export interface Beds24GetBookingsParams {
  id?: number[];
  roomId?: number[];
  propertyId?: number[];
  arrivalFrom?: string; // YYYY-MM-DD
  arrivalTo?: string; // YYYY-MM-DD
  departureFrom?: string; // YYYY-MM-DD
  departureTo?: string; // YYYY-MM-DD
  modifiedFrom?: string; // YYYY-MM-DDTHH:MM:SS or YYYY-MM-DD HH:MM:SS
  modifiedTo?: string; // YYYY-MM-DDTHH:MM:SS or YYYY-MM-DD HH:MM:SS
  status?: Beds24BookingStatus[];
  includeInvoice?: boolean;
  includeInfoItems?: boolean;
  includeGuest?: boolean;
  page?: number;
}

// Response from GET /bookings
export interface Beds24BookingsResponse {
  success: boolean;
  data: Beds24Booking[];
  count: number;
  pages?: Beds24Pages;
}

// Webhook payload for booking notifications
export interface Beds24BookingWebhookPayload {
  event: 'booking.created' | 'booking.modified' | 'booking.cancelled' | 'booking.deleted';
  bookingId: number;
  propertyId: number;
  roomId: number;
  timestamp: string;
  data?: Partial<Beds24Booking>;
}

// Request body for POST /bookings (create/update booking)
export interface Beds24BookingCreateRequest {
  propertyId: number;
  roomId: number;
  unitId?: number;
  arrival: string;
  departure: string;
  numAdult: number;
  numChild?: number;
  status?: Beds24BookingStatus;
  price?: number;
  deposit?: number;

  // Guest info
  guestTitle?: string;
  guestFirstName?: string;
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
  guestMobile?: string;
  guestAddress?: string;
  guestCity?: string;
  guestPostcode?: string;
  guestCountry?: string;
  guestComments?: string;

  // Additional
  arrivalTime?: string;
  apiReference?: string;
  infoItems?: Beds24BookingInfoItem[];
}

// Response from POST /bookings
export interface Beds24BookingCreateResponse {
  success: boolean;
  bookId?: number;
  warnings?: string[];
  error?: string;
}
