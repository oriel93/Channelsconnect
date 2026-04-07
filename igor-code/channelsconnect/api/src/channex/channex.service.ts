import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChannexService {
  private readonly logger = new Logger(ChannexService.name);
  private readonly channexApi: AxiosInstance;
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.channex.io/api/v1';

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    this.apiKey = this.configService.get<string>('CHANNEX_API_KEY');

    if (!this.apiKey) {
      this.logger.warn('CHANNEX_API_KEY is not configured');
    }

    this.channexApi = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        'user-api-key': this.apiKey,
      },
      timeout: 30000,
    });
  }

  private async fetchAllPages(path: string): Promise<any[]> {
    const limit = 100;
    let page = 1;
    let allData: any[] = [];
    const separator = path.includes('?') ? '&' : '?';

    while (true) {
      const response = await this.channexApi.get(
        `${path}${separator}pagination[limit]=${limit}&pagination[page]=${page}`,
      );
      const pageData: any[] = response.data?.data || [];
      allData = allData.concat(pageData);
      if (pageData.length < limit) break;
      page++;
    }

    return allData;
  }

  async listProperties(): Promise<any[]> {
    this.logger.log('Fetching all Channex properties');
    return this.fetchAllPages('/properties');
  }

  async getProperty(propertyId: string): Promise<any> {
    this.logger.log(`Fetching Channex property: ${propertyId}`);
    const response = await this.channexApi.get(`/properties/${propertyId}`);
    return response.data?.data;
  }

  async listRoomTypes(propertyId: string): Promise<any[]> {
    return this.fetchAllPages(`/room_types?filter[property_id]=${propertyId}`);
  }

  async listRatePlans(propertyId: string): Promise<any[]> {
    return this.fetchAllPages(`/rate_plans?filter[property_id]=${propertyId}`);
  }

  async listChannels(propertyId: string): Promise<any[]> {
    const response = await this.channexApi.get(
      `/channels?filter[property_id]=${propertyId}`,
    );
    return response.data?.data || [];
  }

  /**
   * Import all properties with their room types and rate plans,
   * then upsert them into the database for the given user.
   */
  async syncAndSaveProperties(userId: string): Promise<{ properties: any[]; count: number }> {
    this.logger.log(`Syncing Channex properties for user ${userId}`);

    const rawProperties = await this.listProperties();

    const properties = await Promise.all(
      rawProperties.map(async (prop) => {
        const propId = prop.id;
        const attrs = prop.attributes || {};

        const [roomTypes, ratePlans] = await Promise.all([
          this.listRoomTypes(propId).catch(() => []),
          this.listRatePlans(propId).catch(() => []),
        ]);

        // Upsert listing in our DB
        const listing = await this.prisma.listing.upsert({
          where: {
            // Use channex property ID stored in beds24PropId field for now
            // until a dedicated channexPropertyId field is added via migration
            id: await this.getOrCreateListingId(userId, propId),
          },
          update: {
            title: attrs.title || 'Unnamed Property',
            address: attrs.address || null,
            city: attrs.city || null,
            country: attrs.country || null,
            currency: attrs.currency || 'USD',
            beds24PropId: propId, // repurposed to store channex property ID
            isActive: true,
            updatedAt: new Date(),
          },
          create: {
            userId,
            title: attrs.title || 'Unnamed Property',
            address: attrs.address || null,
            city: attrs.city || null,
            country: attrs.country || null,
            currency: attrs.currency || 'USD',
            beds24PropId: propId,
            isActive: true,
          },
        });

        return {
          id: listing.id,
          channexPropertyId: propId,
          name: attrs.title,
          city: attrs.city,
          country: attrs.country,
          currency: attrs.currency,
          roomTypesCount: roomTypes.length,
          ratePlansCount: ratePlans.length,
        };
      }),
    );

    this.logger.log(`Synced ${properties.length} properties for user ${userId}`);
    return { properties, count: properties.length };
  }

  private async getOrCreateListingId(userId: string, channexPropId: string): Promise<number> {
    const existing = await this.prisma.listing.findFirst({
      where: { userId, beds24PropId: channexPropId },
      select: { id: true },
    });
    return existing?.id ?? -1; // -1 forces upsert to create
  }

  /**
   * Handle incoming Channex webhook events
   */
  async handleBookingWebhook(payload: any): Promise<any> {
    this.logger.log(`Processing Channex webhook: ${JSON.stringify(payload).slice(0, 200)}`);

    try {
      const eventType = payload?.event || payload?.type || 'unknown';

      switch (eventType) {
        case 'booking':
        case 'new_booking':
        case 'booking_new':
          return this.handleNewBooking(payload);
        case 'booking_modification':
        case 'booking_modified':
          return this.handleModifiedBooking(payload);
        case 'booking_cancellation':
        case 'booking_cancelled':
          return this.handleCancelledBooking(payload);
        default:
          this.logger.log(`Unhandled Channex event type: ${eventType}`);
          return { processed: false, eventType };
      }
    } catch (error) {
      this.logger.error(`Webhook processing error: ${error.message}`);
      return { processed: false, error: error.message };
    }
  }

  private async handleNewBooking(payload: any): Promise<any> {
    const bookingData = payload?.booking || payload?.data || payload;
    const channexBookingId = bookingData?.id || bookingData?.booking_id;

    if (!channexBookingId) {
      return { processed: false, reason: 'No booking ID in payload' };
    }

    // Find listing by channex property ID
    const propertyId = bookingData?.property_id || bookingData?.attributes?.property_id;
    const listing = propertyId
      ? await this.prisma.listing.findFirst({ where: { beds24PropId: String(propertyId) } })
      : null;

    this.logger.log(`New Channex booking ${channexBookingId} for property ${propertyId}`);
    return { processed: true, channexBookingId, listingFound: !!listing };
  }

  private async handleModifiedBooking(payload: any): Promise<any> {
    const bookingData = payload?.booking || payload?.data || payload;
    const channexBookingId = bookingData?.id || bookingData?.booking_id;
    this.logger.log(`Modified Channex booking: ${channexBookingId}`);
    return { processed: true, channexBookingId };
  }

  private async handleCancelledBooking(payload: any): Promise<any> {
    const bookingData = payload?.booking || payload?.data || payload;
    const channexBookingId = bookingData?.id || bookingData?.booking_id;
    this.logger.log(`Cancelled Channex booking: ${channexBookingId}`);
    return { processed: true, channexBookingId };
  }

  async getConnectionStatus(): Promise<{ connected: boolean; propertiesCount: number }> {
    try {
      const properties = await this.listProperties();
      return { connected: true, propertiesCount: properties.length };
    } catch (error) {
      this.logger.error(`Channex connection check failed: ${error.message}`);
      return { connected: false, propertiesCount: 0 };
    }
  }
}
