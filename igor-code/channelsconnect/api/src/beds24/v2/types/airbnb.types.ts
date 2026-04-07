/**
 * Beds24 API V2 - Airbnb Channel Types
 */

import { Beds24Pages } from './common.types';

// Airbnb User from GET /channels/airbnb/users
export interface Beds24AirbnbUser {
  airbnbUserId: string;
  firstName: string;
  picture: string;
}

export interface Beds24AirbnbUserWrapper {
  airbnbUser: Beds24AirbnbUser;
}

export interface Beds24AirbnbUsersResponse {
  success: true;
  type: 'airbnbUser';
  count: number;
  pages: Beds24Pages & {
    nextPageExists: boolean;
    nextPageLink: string | null;
  };
  data: Beds24AirbnbUserWrapper[];
}

// Airbnb Check-in Option
export interface Beds24AirbnbCheckInOption {
  category: string; // 'keypad', 'lockbox', etc.
}

// Airbnb Amenity item in array
export interface Beds24AirbnbAmenityItem {
  [amenityName: string]: {
    instruction: string;
    is_present: boolean;
  };
}

// Airbnb Listing from GET /channels/airbnb/listings
export interface Beds24AirbnbListing {
  id: string;
  name: string;
  property_type_category?: string;
  room_type_category?: string;
  bedrooms?: number;
  bathrooms?: number;
  beds?: number;
  check_in_option?: Beds24AirbnbCheckInOption;
  has_availability?: boolean;
  street?: string;
  city?: string;
  state?: string;
  zipcode?: string;
  country_code?: string;
  lat?: number;
  lng?: number;
  directions?: string;
  person_capacity?: number;
  synchronization_category?: string;
  listing_nickname?: string;
  tier?: string;
  display_exact_location_to_guest?: boolean;
  house_manual?: string;
  amenities?: Beds24AirbnbAmenityItem[];
  rate_plan_enabled?: boolean;
}

// Wrapper for each listing in the response
export interface Beds24AirbnbListingWrapper {
  roomId?: number;
  name?: string;
  enabled?: boolean;
  airbnbListing: Beds24AirbnbListing;
}

export interface Beds24AirbnbListingsResponse {
  success: true;
  type: 'airbnbListing';
  count: number;
  pages: Beds24Pages & {
    nextPageExists: boolean;
    nextPageLink: string | null;
  };
  data: Beds24AirbnbListingWrapper[];
}

// Import action for POST /channels/airbnb
export interface Beds24AirbnbImportAction {
  action: 'importAsNewProperty' | 'importToExistingProperty';
  airbnbUserId: string;
  airbnbListingId: string;
  connect: 'full' | 'calendar' | 'none';
  importBlockedDates?: boolean;
  importBookings?: boolean;
  propertyId?: number; // Required for importToExistingProperty
}

export interface Beds24AirbnbActionResponse {
  success: boolean;
  new?: Record<string, any>;
  modified?: Record<string, any>;
  errors?: Array<{
    action: string;
    field: string;
    message: string;
  }>;
  warnings?: Array<{
    action: string;
    field: string;
    message: string;
  }>;
  info?: Array<{
    action: string;
    field: string;
    message: string;
  }>;
}

