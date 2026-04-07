import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import {
  Beds24ApiError,
  Beds24RateLimitHeaders,
  Beds24TokenResponse,
  Beds24DetailsResponse,
  Beds24StoredToken,
  Beds24AirbnbUsersResponse,
  Beds24AirbnbListingsResponse,
  Beds24AirbnbImportAction,
  Beds24AirbnbActionResponse,
  Beds24PropertiesResponse,
  Beds24RoomsResponse,
  Beds24Property,
  Beds24RoomType,
  Beds24CalendarResponse,
  Beds24GetCalendarParams,
  Beds24CalendarUpdateRequest,
  Beds24CalendarUpdateResponse,
  Beds24BookingsResponse,
  Beds24GetBookingsParams,
  Beds24Booking,
} from './types';

const BEDS24_API_V2_BASE_URL = 'https://api.beds24.com/v2';

@Injectable()
export class Beds24V2Client {
  private readonly logger = new Logger(Beds24V2Client.name);
  private readonly httpClient: AxiosInstance;
  private readonly refreshToken: string;
  
  // Token storage
  private storedToken: Beds24StoredToken | null = null;
  
  // Rate limit tracking
  private rateLimits: Beds24RateLimitHeaders | null = null;

  constructor(private configService: ConfigService) {
    // Get refresh token from env
    this.refreshToken = this.configService.get<string>('BEDS24_REFRESH_TOKEN') || '';
    
    if (this.refreshToken) {
      this.storedToken = {
        accessToken: '',
        refreshToken: this.refreshToken,
        expiresAt: 0, // Will trigger refresh on first request
      };
      this.logger.log('Beds24 V2 client initialized with refresh token');
    } else {
      this.logger.warn('BEDS24_REFRESH_TOKEN is not configured. API V2 calls will fail.');
    }

    // Create HTTP client
    this.httpClient = axios.create({
      baseURL: BEDS24_API_V2_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
      // Beds24 expects repeated params: ?id=123&id=456 (not ?id[]=123&id[]=456)
      paramsSerializer: (params) => {
        const searchParams = new URLSearchParams();
        for (const key in params) {
          const value = params[key];
          if (Array.isArray(value)) {
            // For arrays, add each value separately with the same key
            value.forEach((v) => searchParams.append(key, String(v)));
          } else if (value !== undefined && value !== null) {
            searchParams.append(key, String(value));
          }
        }
        return searchParams.toString();
      },
    });

    // Response interceptor to extract rate limit headers
    this.httpClient.interceptors.response.use(
      (response) => {
        this.extractRateLimitHeaders(response);
        return response;
      },
      (error) => {
        if (error.response) {
          this.extractRateLimitHeaders(error.response);
        }
        return Promise.reject(error);
      },
    );
  }

  /**
   * Extract rate limit headers from response
   */
  private extractRateLimitHeaders(response: AxiosResponse): void {
    this.rateLimits = {
      fiveMinCreditLimit: parseInt(response.headers['x-fivemincreditlimit'] || '0', 10),
      fiveMinCreditLimitResetsIn: parseInt(response.headers['x-fivemincreditlimit-resetsin'] || '0', 10),
      fiveMinCreditLimitRemaining: parseInt(response.headers['x-fivemincreditlimit-remaining'] || '0', 10),
      requestCost: parseInt(response.headers['x-requestcost'] || '0', 10),
    };
  }

  /**
   * Get current rate limit info
   */
  getRateLimits(): Beds24RateLimitHeaders | null {
    return this.rateLimits;
  }

  // ============ Authentication Methods ============

  /**
   * GET /authentication/token
   * Get an access token using the refresh token.
   * Called automatically when token is expired.
   */
  async refreshAccessToken(): Promise<Beds24TokenResponse> {
    if (!this.refreshToken) {
      throw new Error('BEDS24_REFRESH_TOKEN is not configured in .env');
    }

    this.logger.log('Getting Beds24 access token...');

    try {
      const response = await this.httpClient.get<Beds24TokenResponse>('/authentication/token', {
        headers: {
          refreshToken: this.refreshToken,
        },
      });

      // Update stored token
      this.storedToken = {
        accessToken: response.data.token,
        refreshToken: this.refreshToken,
        expiresAt: Date.now() + (response.data.expiresIn * 1000),
      };

      this.logger.log(`Beds24 access token obtained (expires in ${response.data.expiresIn}s)`);

      return response.data;
    } catch (error) {
      this.handleApiError(error, 'Token refresh failed');
      throw error;
    }
  }

  /**
   * GET /authentication/details
   * Get information about a token and diagnostics.
   */
  async getTokenDetails(token?: string): Promise<Beds24DetailsResponse> {
    const accessToken = token || await this.getValidAccessToken();

    try {
      const response = await this.httpClient.get<Beds24DetailsResponse>('/authentication/details', {
        headers: {
          token: accessToken,
        },
      });

      return response.data;
    } catch (error) {
      this.handleApiError(error, 'Failed to get token details');
      throw error;
    }
  }

  /**
   * Get a valid access token, refreshing if necessary.
   * This is the main method other API methods should use.
   */
  async getValidAccessToken(): Promise<string> {
    if (!this.refreshToken) {
      throw new Error('BEDS24_REFRESH_TOKEN is not configured in .env');
    }

    // Check if token is expired or will expire soon (within 60 seconds)
    const now = Date.now();
    const expiresIn = this.storedToken ? this.storedToken.expiresAt - now : 0;
    
    if (expiresIn < 60000) {
      // Token expired or expiring soon, refresh it
      await this.refreshAccessToken();
    }

    return this.storedToken!.accessToken;
  }

  /**
   * Check if the client is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.refreshToken;
  }

  // ============ Airbnb Channel API ============

  /**
   * GET /channels/airbnb/users
   * Get all Airbnb user IDs connected to the Beds24 account.
   */
  async getAirbnbUsers(): Promise<Beds24AirbnbUsersResponse> {
    this.logger.log('Fetching Airbnb users connected to Beds24...');
    return this.get<Beds24AirbnbUsersResponse>('/channels/airbnb/users');
  }

  /**
   * GET /channels/airbnb/listings
   * Get all Airbnb listings for a specified Airbnb user ID.
   */
  async getAirbnbListings(
    airbnbUserId: string,
    airbnbListingId?: string,
  ): Promise<Beds24AirbnbListingsResponse> {
    this.logger.log(`Fetching Airbnb listings for user ${airbnbUserId}...`);
    
    const params: Record<string, string> = { airbnbUserId };
    if (airbnbListingId) {
      params.airbnbListingId = airbnbListingId;
    }
    
    return this.get<Beds24AirbnbListingsResponse>('/channels/airbnb/listings', params);
  }

  /**
   * POST /channels/airbnb
   * Perform actions at Airbnb (e.g., import listings).
   */
  async performAirbnbAction(
    actions: Beds24AirbnbImportAction[],
  ): Promise<Beds24AirbnbActionResponse[]> {
    this.logger.log('Performing Airbnb action...');
    return this.post<Beds24AirbnbActionResponse[]>('/channels/airbnb', actions);
  }

  /**
   * Check if a specific Airbnb user ID is connected to Beds24.
   * Returns the user info if found, null otherwise.
   */
  async findAirbnbUser(airbnbUserId: string): Promise<{
    airbnbUserId: string;
    firstName: string;
    picture: string;
  } | null> {
    try {
      const response = await this.getAirbnbUsers();
      const user = response.data.find(
        (wrapper) => wrapper.airbnbUser.airbnbUserId === airbnbUserId,
      );
      return user?.airbnbUser || null;
    } catch (error) {
      this.logger.error(`Failed to find Airbnb user ${airbnbUserId}:`, error.message);
      return null;
    }
  }

  // ============ Properties API ============

  /**
   * GET /properties
   * Get properties matching specified criteria.
   */
  async getProperties(options?: {
    id?: number[];
    includeLanguages?: ('all' | 'en' | 'de' | 'es' | 'fr' | 'it' | 'pt' | 'ru' | 'zh')[];
    includeAllRooms?: boolean;
    includeTexts?: ('all' | 'property' | 'roomType')[];
    includePictures?: boolean;
    includeOffers?: boolean;
    includePriceRules?: boolean;
    includeUpsellItems?: boolean;
    includeUnitDetails?: boolean;
    roomId?: number[];
    page?: number;
  }): Promise<Beds24PropertiesResponse> {
    const roomIdStr = options?.roomId?.length ? options.roomId.join(', ') : 'all';
    this.logger.log(`Fetching properties from Beds24 (roomIds: ${roomIdStr})...`);
    
    const params: Record<string, any> = {};
    
    if (options?.id?.length) {
      params.id = options.id;
    }
    if (options?.includeLanguages?.length) {
      params.includeLanguages = options.includeLanguages;
    }
    if (options?.includeAllRooms !== undefined) {
      params.includeAllRooms = options.includeAllRooms;
    }
    if (options?.includeTexts?.length) {
      params.includeTexts = options.includeTexts;
    }
    if (options?.includePictures !== undefined) {
      params.includePictures = options.includePictures;
    }
    if (options?.includeOffers !== undefined) {
      params.includeOffers = options.includeOffers;
    }
    if (options?.includePriceRules !== undefined) {
      params.includePriceRules = options.includePriceRules;
    }
    if (options?.includeUpsellItems !== undefined) {
      params.includeUpsellItems = options.includeUpsellItems;
    }
    if (options?.includeUnitDetails !== undefined) {
      params.includeUnitDetails = options.includeUnitDetails;
    }
    if (options?.roomId?.length) {
      params.roomId = options.roomId;
    }
    if (options?.page) {
      params.page = options.page;
    }

    return this.get<Beds24PropertiesResponse>('/properties', params);
  }

  /**
   * Get a single property by ID with full details.
   */
  async getPropertyById(propertyId: number): Promise<Beds24Property | null> {
    this.logger.log(`Fetching property ${propertyId} from Beds24...`);
    
    try {
      const response = await this.getProperties({
        id: [propertyId],
        includeAllRooms: true,
        includeTexts: ['all'],
        includeUnitDetails: true,
      });
      
      return response.data[0] || null;
    } catch (error) {
      this.logger.error(`Failed to fetch property ${propertyId}:`, error.message);
      return null;
    }
  }

  /**
   * Get all properties with full details.
   */
  async getAllPropertiesWithDetails(): Promise<Beds24Property[]> {
    this.logger.log('Fetching all properties with details from Beds24...');
    
    try {
      const response = await this.getProperties({
        includeAllRooms: true,
        includeTexts: ['all'],
        includeUnitDetails: true,
      });
      
      return response.data || [];
    } catch (error) {
      this.logger.error('Failed to fetch all properties:', error.message);
      return [];
    }
  }

  /**
   * GET /properties/rooms
   * Get rooms matching specified criteria.
   */
  async getRooms(options?: {
    id?: number[];
    propertyId?: number[];
    includeLanguages?: ('all' | 'en' | 'de' | 'es' | 'fr' | 'it' | 'pt' | 'ru' | 'zh')[];
    includeTexts?: ('all' | 'property' | 'roomType')[];
    includePictures?: boolean;
    includeOffers?: boolean;
    includePriceRules?: boolean;
    includeUpsellItems?: boolean;
    includeUnitDetails?: boolean;
    page?: number;
  }): Promise<Beds24RoomsResponse> {
    this.logger.log(`Fetching rooms from Beds24 (roomIds: ${options?.id?.join(', ') || 'all'}, propertyIds: ${options?.propertyId?.join(', ') || 'all'})...`);
    
    const params: Record<string, any> = {};
    
    if (options?.id?.length) {
      params.id = options.id;
    }
    if (options?.propertyId?.length) {
      params.propertyId = options.propertyId;
    }
    if (options?.includeLanguages?.length) {
      params.includeLanguages = options.includeLanguages;
    }
    if (options?.includeTexts?.length) {
      params.includeTexts = options.includeTexts;
    }
    if (options?.includePictures !== undefined) {
      params.includePictures = options.includePictures;
    }
    if (options?.includeOffers !== undefined) {
      params.includeOffers = options.includeOffers;
    }
    if (options?.includePriceRules !== undefined) {
      params.includePriceRules = options.includePriceRules;
    }
    if (options?.includeUpsellItems !== undefined) {
      params.includeUpsellItems = options.includeUpsellItems;
    }
    if (options?.includeUnitDetails !== undefined) {
      params.includeUnitDetails = options.includeUnitDetails;
    }
    if (options?.page) {
      params.page = options.page;
    }

    return this.get<Beds24RoomsResponse>('/properties/rooms', params);
  }

  /**
   * Get rooms by room IDs with full details.
   */
  async getRoomsByIds(roomIds: number[]): Promise<Beds24RoomType[]> {
    this.logger.log(`Fetching ${roomIds.length} rooms by ID from Beds24...`);
    
    try {
      const response = await this.getRooms({
        id: roomIds,
        includeTexts: ['all'],
        includeUnitDetails: true,
        includePriceRules: true,
      });
      
      return response.data || [];
    } catch (error) {
      this.logger.error(`Failed to fetch rooms by IDs:`, error.message);
      return [];
    }
  }

  /**
   * Get all rooms for specific properties.
   */
  async getRoomsByPropertyIds(propertyIds: number[]): Promise<Beds24RoomType[]> {
    this.logger.log(`Fetching rooms for ${propertyIds.length} properties from Beds24...`);
    
    try {
      const response = await this.getRooms({
        propertyId: propertyIds,
        includeTexts: ['all'],
        includeUnitDetails: true,
        includePriceRules: true,
      });
      
      return response.data || [];
    } catch (error) {
      this.logger.error(`Failed to fetch rooms by property IDs:`, error.message);
      return [];
    }
  }

  // ============ Calendar/Inventory API ============

  /**
   * GET /inventory/rooms/calendar
   * Get calendar data for rooms.
   */
  async getCalendar(params: Beds24GetCalendarParams): Promise<Beds24CalendarResponse> {
    this.logger.log(`Fetching calendar from ${params.startDate} to ${params.endDate}...`);
    
    const queryParams: Record<string, any> = {
      startDate: params.startDate,
      endDate: params.endDate,
    };
    
    if (params.roomId?.length) {
      queryParams.roomId = params.roomId;
    }
    if (params.propertyId?.length) {
      queryParams.propertyId = params.propertyId;
    }
    if (params.includeNumAvail !== undefined) {
      queryParams.includeNumAvail = params.includeNumAvail;
    }
    if (params.includeMinStay !== undefined) {
      queryParams.includeMinStay = params.includeMinStay;
    }
    if (params.includeMaxStay !== undefined) {
      queryParams.includeMaxStay = params.includeMaxStay;
    }
    if (params.includeMultiplier !== undefined) {
      queryParams.includeMultiplier = params.includeMultiplier;
    }
    if (params.includeOverride !== undefined) {
      queryParams.includeOverride = params.includeOverride;
    }
    if (params.includePrices !== undefined) {
      queryParams.includePrices = params.includePrices;
    }
    if (params.includeLinkedPrices !== undefined) {
      queryParams.includeLinkedPrices = params.includeLinkedPrices;
    }
    if (params.includeChannels !== undefined) {
      queryParams.includeChannels = params.includeChannels;
    }
    if (params.page) {
      queryParams.page = params.page;
    }

    return this.get<Beds24CalendarResponse>('/inventory/rooms/calendar', queryParams);
  }

  /**
   * POST /inventory/rooms/calendar
   * Update calendar data for rooms (prices, availability, restrictions).
   */
  async updateCalendar(updates: Beds24CalendarUpdateRequest[]): Promise<Beds24CalendarUpdateResponse[]> {
    this.logger.log(`Updating calendar for ${updates.length} rooms...`);
    return this.post<Beds24CalendarUpdateResponse[]>('/inventory/rooms/calendar', updates);
  }

  /**
   * Helper: Get calendar for a specific room with all data.
   */
  async getRoomCalendar(
    roomId: number,
    startDate: string,
    endDate: string,
  ): Promise<Beds24CalendarResponse> {
    return this.getCalendar({
      startDate,
      endDate,
      roomId: [roomId],
      includeNumAvail: true,
      includeMinStay: true,
      includeMaxStay: true,
      includePrices: true,
      includeOverride: true,
    });
  }

  /**
   * Helper: Update prices for a room.
   */
  async updateRoomPrices(
    roomId: number,
    fromDate: string,
    toDate: string,
    price1: number,
  ): Promise<Beds24CalendarUpdateResponse[]> {
    return this.updateCalendar([{
      roomId,
      calendar: [{
        from: fromDate,
        to: toDate,
        price1,
      }],
    }]);
  }

  // ============ Bookings API ============

  /**
   * GET /bookings
   * Get bookings matching specified criteria.
   */
  async getBookings(params?: Beds24GetBookingsParams): Promise<Beds24BookingsResponse> {
    this.logger.log('Fetching bookings from Beds24...');

    const queryParams: Record<string, any> = {};

    if (params?.id?.length) {
      queryParams.id = params.id;
    }
    if (params?.roomId?.length) {
      queryParams.roomId = params.roomId;
    }
    if (params?.propertyId?.length) {
      queryParams.propertyId = params.propertyId;
    }
    if (params?.arrivalFrom) {
      queryParams.arrivalFrom = params.arrivalFrom;
    }
    if (params?.arrivalTo) {
      queryParams.arrivalTo = params.arrivalTo;
    }
    if (params?.departureFrom) {
      queryParams.departureFrom = params.departureFrom;
    }
    if (params?.departureTo) {
      queryParams.departureTo = params.departureTo;
    }
    if (params?.modifiedFrom) {
      queryParams.modifiedFrom = params.modifiedFrom;
    }
    if (params?.modifiedTo) {
      queryParams.modifiedTo = params.modifiedTo;
    }
    if (params?.status?.length) {
      queryParams.status = params.status;
    }
    if (params?.includeInvoice !== undefined) {
      queryParams.includeInvoice = params.includeInvoice;
    }
    if (params?.includeInfoItems !== undefined) {
      queryParams.includeInfoItems = params.includeInfoItems;
    }
    if (params?.includeGuest !== undefined) {
      queryParams.includeGuest = params.includeGuest;
    }
    if (params?.page) {
      queryParams.page = params.page;
    }

    return this.get<Beds24BookingsResponse>('/bookings', queryParams);
  }

  /**
   * Get all bookings for specific properties.
   */
  async getBookingsByPropertyIds(propertyIds: number[]): Promise<Beds24Booking[]> {
    this.logger.log(`Fetching bookings for ${propertyIds.length} properties from Beds24...`);

    try {
      const response = await this.getBookings({
        propertyId: propertyIds,
        includeGuest: true,
        includeInfoItems: true,
      });

      return response.data || [];
    } catch (error) {
      this.logger.error('Failed to fetch bookings by property IDs:', error.message);
      return [];
    }
  }

  /**
   * Get bookings modified since a specific date/time.
   * Useful for incremental syncs.
   */
  async getBookingsModifiedSince(since: string, propertyIds?: number[]): Promise<Beds24Booking[]> {
    this.logger.log(`Fetching bookings modified since ${since}...`);

    try {
      const response = await this.getBookings({
        modifiedFrom: since,
        propertyId: propertyIds,
        includeGuest: true,
        includeInfoItems: true,
      });

      return response.data || [];
    } catch (error) {
      this.logger.error('Failed to fetch modified bookings:', error.message);
      return [];
    }
  }

  /**
   * Get bookings with arrivals in a date range.
   */
  async getBookingsByArrivalRange(
    arrivalFrom: string,
    arrivalTo: string,
    propertyIds?: number[],
  ): Promise<Beds24Booking[]> {
    this.logger.log(`Fetching bookings with arrivals from ${arrivalFrom} to ${arrivalTo}...`);

    try {
      const response = await this.getBookings({
        arrivalFrom,
        arrivalTo,
        propertyId: propertyIds,
        includeGuest: true,
        includeInfoItems: true,
      });

      return response.data || [];
    } catch (error) {
      this.logger.error('Failed to fetch bookings by arrival range:', error.message);
      return [];
    }
  }

  // ============ HTTP Request Helpers ============

  /**
   * Make an authenticated GET request
   */
  async get<T>(path: string, params?: Record<string, any>): Promise<T> {
    const token = await this.getValidAccessToken();
    
    // Build full URL for logging
    const searchParams = new URLSearchParams();
    if (params) {
      for (const key in params) {
        const value = params[key];
        if (Array.isArray(value)) {
          value.forEach((v) => searchParams.append(key, String(v)));
        } else if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      }
    }
    const queryString = searchParams.toString();
    const fullUrl = `${this.httpClient.defaults.baseURL}${path}${queryString ? '?' + queryString : ''}`;
    this.logger.log(`GET ${fullUrl}`);
    
    try {
      const response = await this.httpClient.get<T>(path, {
        headers: { token },
        params,
      });
      const responseData = response.data as any;
      this.logger.log(`Response status: ${response.status}, data count: ${Array.isArray(responseData?.data) ? responseData.data.length : 'N/A'}`);
      return response.data;
    } catch (error) {
      this.handleApiError(error, `GET ${path} failed`);
      throw error;
    }
  }

  /**
   * Make an authenticated POST request
   */
  async post<T>(path: string, data?: any): Promise<T> {
    const token = await this.getValidAccessToken();
    
    try {
      const response = await this.httpClient.post<T>(path, data, {
        headers: { token },
      });
      return response.data;
    } catch (error) {
      this.handleApiError(error, `POST ${path} failed`);
      throw error;
    }
  }

  /**
   * Make an authenticated DELETE request
   */
  async delete<T>(path: string, params?: Record<string, any>): Promise<T> {
    const token = await this.getValidAccessToken();
    
    try {
      const response = await this.httpClient.delete<T>(path, {
        headers: { token },
        params,
      });
      return response.data;
    } catch (error) {
      this.handleApiError(error, `DELETE ${path} failed`);
      throw error;
    }
  }

  /**
   * Handle API errors with proper logging
   */
  private handleApiError(error: any, context: string): void {
    if (axios.isAxiosError(error)) {
      const apiError = error.response?.data as Beds24ApiError | undefined;
      
      if (apiError?.error) {
        this.logger.error(`${context}: ${apiError.error} (code: ${apiError.code})`);
      } else {
        this.logger.error(`${context}: ${error.message}`);
      }
      
      // Log rate limit info if available
      if (this.rateLimits) {
        this.logger.debug(
          `Rate limits: ${this.rateLimits.fiveMinCreditLimitRemaining}/${this.rateLimits.fiveMinCreditLimit} ` +
          `(resets in ${this.rateLimits.fiveMinCreditLimitResetsIn}s)`,
        );
      }
    } else {
      this.logger.error(`${context}: ${error.message}`);
    }
  }
}

