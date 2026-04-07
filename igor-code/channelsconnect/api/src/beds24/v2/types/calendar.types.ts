/**
 * Beds24 API V2 - Calendar/Inventory Types
 */

import { Beds24Pages } from './common.types';

// Channel availability info
export interface Beds24CalendarChannel {
  maxBookings?: number;
}

// Calendar entry for a single date range
export interface Beds24CalendarEntry {
  from: string; // YYYY-MM-DD
  to: string;   // YYYY-MM-DD
  numAvail?: number;
  minStay?: number;
  maxStay?: number;
  multiplier?: number;
  override?: 'none' | 'open' | 'closed';
  price1?: number;
  price2?: number;
  price3?: number;
  price4?: number;
  price5?: number;
  price6?: number;
  price7?: number;
  price8?: number;
  price9?: number;
  price10?: number;
  price11?: number;
  price12?: number;
  price13?: number;
  price14?: number;
  price15?: number;
  price16?: number;
  linkedPrice1?: number;
  linkedPrice2?: number;
  linkedPrice3?: number;
  linkedPrice4?: number;
  linkedPrice5?: number;
  linkedPrice6?: number;
  linkedPrice7?: number;
  linkedPrice8?: number;
  linkedPrice9?: number;
  linkedPrice10?: number;
  linkedPrice11?: number;
  linkedPrice12?: number;
  linkedPrice13?: number;
  linkedPrice14?: number;
  linkedPrice15?: number;
  linkedPrice16?: number;
  channels?: {
    agoda?: Beds24CalendarChannel;
    airbnb?: Beds24CalendarChannel;
    booking?: Beds24CalendarChannel;
    expedia?: Beds24CalendarChannel;
    vrbo?: Beds24CalendarChannel;
    [key: string]: Beds24CalendarChannel | undefined;
  };
}

// Room calendar data
export interface Beds24RoomCalendar {
  propertyId: number;
  roomId: number;
  calendar: Beds24CalendarEntry[];
}

// GET /inventory/rooms/calendar response
export interface Beds24CalendarResponse {
  success: true;
  type: 'calendar';
  count: number;
  pages?: Beds24Pages & {
    nextPageExists: boolean;
    nextPageLink: string | null;
  };
  data: Beds24RoomCalendar[];
}

// GET /inventory/rooms/calendar parameters
export interface Beds24GetCalendarParams {
  startDate: string; // YYYY-MM-DD (required)
  endDate: string;   // YYYY-MM-DD (required)
  roomId?: number[];
  propertyId?: number[];
  includeNumAvail?: boolean;
  includeMinStay?: boolean;
  includeMaxStay?: boolean;
  includeMultiplier?: boolean;
  includeOverride?: boolean;
  includePrices?: boolean;
  includeLinkedPrices?: boolean;
  includeChannels?: boolean;
  page?: number;
}

// Calendar update entry (for POST)
export interface Beds24CalendarUpdateEntry {
  from: string; // YYYY-MM-DD
  to: string;   // YYYY-MM-DD
  numAvail?: number;
  minStay?: number;
  maxStay?: number;
  multiplier?: number;
  override?: 'none' | 'open' | 'closed';
  price1?: number;
  price2?: number;
  price3?: number;
  price4?: number;
  price5?: number;
  price6?: number;
  price7?: number;
  price8?: number;
  price9?: number;
  price10?: number;
  price11?: number;
  price12?: number;
  price13?: number;
  price14?: number;
  price15?: number;
  price16?: number;
}

// POST /inventory/rooms/calendar request body item
export interface Beds24CalendarUpdateRequest {
  roomId: number;
  calendar: Beds24CalendarUpdateEntry[];
}

// POST /inventory/rooms/calendar response item
export interface Beds24CalendarUpdateResponse {
  success: boolean;
  new?: {
    field?: string;
    subField?: Array<{ field: string }>;
  };
  modified?: {
    field?: string;
    subField?: Array<{ field: string }>;
  };
  errors?: Array<{
    action?: string;
    field?: string;
    message: string;
  }>;
  warnings?: Array<{
    action?: string;
    field?: string;
    message: string;
  }>;
  info?: Array<{
    action?: string;
    field?: string;
    message: string;
  }>;
}

