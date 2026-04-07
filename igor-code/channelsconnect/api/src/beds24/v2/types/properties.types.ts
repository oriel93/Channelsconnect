/**
 * Beds24 API V2 - Properties Types
 */

import { Beds24Pages } from './common.types';

// Room Type within a Property
export interface Beds24RoomType {
  id: number;
  propertyId: number;
  name: string;
  roomType?: string; // 'single', 'double', etc.
  qty?: number;
  minPrice?: number;
  maxPeople?: number;
  maxAdult?: number;
  maxChildren?: number;
  minStay?: number;
  maxStay?: number;
  taxPercentage?: number;
  taxPerson?: number;
  rackRate?: number;
  cleaningFee?: number;
  securityDeposit?: number;
  roomSize?: number;
  texts?: Array<{
    language: string;
    displayName?: string;
    accommodationType?: string;
    roomDescription?: string;
    auxiliary?: string;
    marketing?: string;
    contentHeadline?: string;
    contentDescription?: string;
  }>;
  units?: Array<{
    id: number;
    name: string;
    statusColor?: string;
    statusText?: string;
    note?: string;
  }>;
  featureCodes?: string[][];
}

// Property Texts
export interface Beds24PropertyText {
  language: string;
  houseRules?: string;
  directions?: string;
  headline?: string;
  propertyDescription?: string;
  propertyDescription1?: string;
  propertyDescription2?: string;
  generalPolicy?: string;
  cancellationPolicy?: string;
  locationDescription?: string;
}

// Full Property from GET /properties
export interface Beds24Property {
  id: number;
  name: string;
  propertyType?: string; // 'apartment', 'house', etc.
  currency?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string; // ISO country code
  postcode?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  mobile?: string;
  email?: string;
  web?: string;
  contactFirstName?: string;
  contactLastName?: string;
  checkInStart?: string; // '00:00' format
  checkInEnd?: string;
  checkOutEnd?: string;
  account?: {
    ownerId: number;
  };
  texts?: Beds24PropertyText[];
  roomTypes?: Beds24RoomType[];
  bookingRules?: {
    bookingType?: string;
    bookingCutOffHour?: number;
    vatRatePercentage?: number;
  };
  groupKeywords?: string[];
  featureCodes?: string[][];
}

// GET /properties response
export interface Beds24PropertiesResponse {
  success: true;
  type: 'property';
  count: number;
  pages?: Beds24Pages & {
    nextPageExists: boolean;
    nextPageLink: string | null;
  };
  data: Beds24Property[];
}

// GET /properties/rooms response
export interface Beds24RoomsResponse {
  success: true;
  type: 'room';
  count: number;
  pages?: Beds24Pages & {
    nextPageExists: boolean;
    nextPageLink: string | null;
  };
  data: Beds24RoomType[];
}

