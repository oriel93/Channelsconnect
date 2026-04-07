import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { 
  GetPropertyDto, 
  SetPropertyDto, 
  SetPropertyContentDto, 
  SetRoomDatesDto,
  Beds24AuthDto 
} from './dto';
import { PrismaService } from '../prisma/prisma.service';
import { Beds24V2Client } from './v2';

@Injectable()
export class Beds24Service {
  private readonly logger = new Logger(Beds24Service.name);
  private readonly beds24Api: AxiosInstance;
  private readonly apiKey: string;
  private readonly baseUrl = 'https://www.beds24.com/api/json';

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private beds24V2Client: Beds24V2Client,
  ) {
    this.apiKey = this.configService.get<string>('BEDS24_API_KEY');
    
    if (!this.apiKey) {
      this.logger.warn('BEDS24_API_KEY is not configured');
    }

    this.beds24Api = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
  }

  /**
   * Get property details from Beds24
   */
  async getProperty(propKey: string, includeRooms = true): Promise<any> {
    this.logger.log(`Getting property from Beds24: ${propKey}`);
    
    try {
      const payload: GetPropertyDto = {
        authentication: {
          apiKey: this.apiKey,
          propKey,
        },
        includeRooms,
        includeRoomUnits: false,
        includeAccountAccess: false,
      };

      const response = await this.beds24Api.post('/getProperty', payload);
      
      if (response.data.error) {
        throw new HttpException(
          `Beds24 API Error: ${response.data.error}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      const propertyData = response.data.getProperty?.[0];
      
      if (!propertyData) {
        throw new HttpException(
          `Property not found with propKey: ${propKey}`,
          HttpStatus.NOT_FOUND,
        );
      }

      return propertyData;
    } catch (error) {
      this.logger.error(`Failed to get property ${propKey}:`, error.message);
      throw error;
    }
  }

  /**
   * Create or update property in Beds24
   */
  async setProperty(propKey: string, propertyData: SetPropertyDto): Promise<any> {
    this.logger.log(`Setting property in Beds24: ${propKey}`);
    
    try {
      const payload = {
        authentication: {
          apiKey: this.apiKey,
          propKey,
        },
        setProperty: [propertyData],
      };

      const response = await this.beds24Api.post('/setProperty', payload);
      
      if (response.data.error) {
        throw new HttpException(
          `Beds24 API Error: ${response.data.error}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      return response.data;
    } catch (error) {
      this.logger.error(`Failed to set property ${propKey}:`, error.message);
      throw error;
    }
  }

  /**
   * Create new property in Beds24
   */
  async createProperty(propertyName: string, propKey: string): Promise<any> {
    this.logger.log(`Creating property in Beds24: ${propertyName}`);
    
    try {
      const payload = {
        authentication: {
          apiKey: this.apiKey,
        },
        createProperties: [
          {
            name: propertyName,
            propKey: propKey,
            roomTypes: [],
          },
        ],
      };

      const response = await this.beds24Api.post('/createProperties', payload);
      
      if (response.data.error) {
        throw new HttpException(
          `Beds24 API Error: ${response.data.error}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      return response.data;
    } catch (error) {
      this.logger.error(`Failed to create property ${propertyName}:`, error.message);
      throw error;
    }
  }

  /**
   * Update property content (descriptions, images, amenities)
   */
  async setPropertyContent(propKey: string, contentData: SetPropertyContentDto): Promise<any> {
    this.logger.log(`Setting property content in Beds24: ${propKey}`);
    
    try {
      const payload = {
        authentication: {
          apiKey: this.apiKey,
          propKey,
        },
        setPropertyContent: [contentData],
      };

      const response = await this.beds24Api.post('/setPropertyContent', payload);
      
      if (response.data.error) {
        throw new HttpException(
          `Beds24 API Error: ${response.data.error}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      return response.data;
    } catch (error) {
      this.logger.error(`Failed to set property content ${propKey}:`, error.message);
      throw error;
    }
  }

  /**
   * Update room rates and availability
   */
  async setRoomDates(propKey: string, roomId: number, dates: Record<string, any>): Promise<any> {
    this.logger.log(`Setting room dates in Beds24 for room: ${roomId}`);
    
    try {
      const payload: SetRoomDatesDto = {
        authentication: {
          apiKey: this.apiKey,
          propKey,
        },
        roomId,
        dates,
      };

      const response = await this.beds24Api.post('/setRoomDates', payload);
      
      if (response.data.error) {
        throw new HttpException(
          `Beds24 API Error: ${response.data.error}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      return response.data;
    } catch (error) {
      this.logger.error(`Failed to set room dates for room ${roomId}:`, error.message);
      throw error;
    }
  }

  /**
   * Sync Airbnb listing to Beds24
   * This is the main method that orchestrates the full sync
   */
  async syncAirbnbToBeds24(airbnbHostId: string, listingData: any): Promise<any> {
    this.logger.log(`Syncing Airbnb listing to Beds24 for host: ${airbnbHostId}`);
    
    try {
      const propKey = `airbnb_${airbnbHostId}`;
      
      // Step 1: Check if property exists
      let propertyData;
      try {
        propertyData = await this.getProperty(propKey);
        this.logger.log(`Property ${propKey} already exists in Beds24`);
      } catch (error) {
        // Property doesn't exist, create it
        this.logger.log(`Property ${propKey} not found, creating...`);
        await this.createProperty(listingData.name || 'Airbnb Property', propKey);
        propertyData = await this.getProperty(propKey);
      }

      const propId = propertyData.propId;

      // Step 2: Check if room exists or create new one
      let roomId;
      const existingRoom = propertyData.roomTypes?.find((rt: any) => rt.name === listingData.name);
      
      if (existingRoom) {
        roomId = existingRoom.roomId;
        this.logger.log(`Room ${listingData.name} already exists with ID: ${roomId}`);
      } else {
        this.logger.log(`Creating new room: ${listingData.name}`);
        await this.setProperty(propKey, {
          action: 'modify',
          roomTypes: [
            {
              action: 'new',
              name: listingData.name,
              qty: 1,
            },
          ],
        });
        
        // Refresh property data to get new roomId
        propertyData = await this.getProperty(propKey);
        roomId = propertyData.roomTypes?.find((rt: any) => rt.name === listingData.name)?.roomId;
      }

      // Step 3: Update room details
      await this.setProperty(propKey, {
        action: 'modify',
        roomTypes: [
          {
            action: 'modify',
            roomId,
            name: listingData.name,
            roomSize: listingData.sqM2,
            minStay: listingData.minStay || 2,
            maxPeople: listingData.maxGuests,
            cleaningFee: listingData.cleaningFee,
            taxPercent: listingData.taxPercent,
            securityDeposit: listingData.securityDeposit,
            qty: 1,
          },
        ],
      });

      // Step 4: Update property content (descriptions, images, amenities)
      const contentData: SetPropertyContentDto = {
        action: 'modify',
        roomIds: {
          [roomId]: {
            roomId,
            cleaningFee: listingData.cleaningFee,
            taxPercent: listingData.taxPercent,
            minStay: listingData.minStay,
            securityDeposit: listingData.securityDeposit,
            texts: {
              displayName: { EN: listingData.name },
              propertyDescription1: { EN: listingData.description },
              propertyDescription2: { EN: listingData.description },
              roomDescription1: { EN: listingData.description },
            },
            images: listingData.images
              ? {
                  external: Object.fromEntries(
                    listingData.images.map((url: string, index: number) => [
                      index + 1,
                      {
                        url,
                        map: [{ propId, position: index + 1 }],
                      },
                    ]),
                  ),
                }
              : undefined,
          },
        },
      };

      await this.setPropertyContent(propKey, contentData);

      // Step 5: Update rates and availability
      if (listingData.availableDates && Object.keys(listingData.availableDates).length > 0) {
        // Filter out past dates
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const filteredDates = Object.entries(listingData.availableDates)
          .filter(([dateStr]) => {
            const dateObj = new Date(
              parseInt(dateStr.substring(0, 4)),
              parseInt(dateStr.substring(4, 6)) - 1,
              parseInt(dateStr.substring(6, 8))
            );
            return dateObj >= today;
          })
          .reduce((acc, [key, value]) => {
            acc[key] = value;
            return acc;
          }, {});

        if (Object.keys(filteredDates).length > 0) {
          await this.setRoomDates(propKey, roomId, filteredDates);
        }
      }

      this.logger.log(`Successfully synced listing to Beds24: ${listingData.name}`);
      
      return {
        success: true,
        propKey,
        propId,
        roomId,
        message: 'Listing successfully synced to Beds24',
      };
    } catch (error) {
      this.logger.error(`Failed to sync Airbnb listing to Beds24:`, error.message);
      throw error;
    }
  }

  /**
   * Get multiple properties for a user (by Airbnb host ID pattern)
   */
  async getPropertiesByHostId(airbnbHostId: string): Promise<any[]> {
    this.logger.log(`Getting properties for Airbnb host: ${airbnbHostId}`);
    
    const propKey = `airbnb_${airbnbHostId}`;
    
    try {
      const propertyData = await this.getProperty(propKey);
      return [propertyData];
    } catch (error) {
      this.logger.warn(`No properties found for host ${airbnbHostId}`);
      return [];
    }
  }

  /**
   * Get all properties from Beds24 account using getProperties endpoint
   * Uses only the API key to fetch all properties in the account
   */
  async getAllProperties(): Promise<any> {
    this.logger.log('Fetching all properties from Beds24 using getProperties endpoint');
    
    try {
      const payload = {
        authentication: {
          apiKey: this.apiKey,
        },
      };

      this.logger.log('Calling Beds24 getProperties API...');
      const response = await this.beds24Api.post('/getProperties', payload);
      
      this.logger.log('Beds24 getProperties response received');

      if (response.data.error) {
        throw new HttpException(
          `Beds24 API Error: ${response.data.error}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      // The response structure from getProperties
      const properties = response.data.getProperties || response.data.properties || response.data || [];
      
      this.logger.log(`Found ${Array.isArray(properties) ? properties.length : 0} properties in Beds24`);
      
      return {
        success: true,
        properties: Array.isArray(properties) ? properties : [],
        count: Array.isArray(properties) ? properties.length : 0,
      };
    } catch (error) {
      this.logger.error('Failed to get properties from Beds24:', error.message);
      if (error.response) {
        this.logger.error('Response data:', error.response.data);
        this.logger.error('Response status:', error.response.status);
      }
      throw new HttpException(
        error.message || 'Failed to fetch properties from Beds24',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Sync Airbnb listings from Beds24 and save them to the database
   * Uses the user's Airbnb host ID to fetch listings from Beds24's Airbnb channel API
   */
  async syncAndSaveProperties(userId: string): Promise<any> {
    this.logger.log(`Syncing Airbnb listings from Beds24 for user: ${userId}`);
    
    try {
      // Get the user's Airbnb host ID and sync status
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user?.airbnbHostId) {
        throw new HttpException(
          'Please connect your Airbnb account first before syncing properties.',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Check if sync is already in progress
      if (user.syncStatus === 'syncing') {
        const syncStarted = user.syncStartedAt ? new Date(user.syncStartedAt).toISOString() : 'unknown';
        throw new HttpException(
          `Sync is already in progress (started at ${syncStarted}). Please wait until it completes.`,
          HttpStatus.CONFLICT,
        );
      }

      // Set sync status to 'syncing'
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          syncStatus: 'syncing',
          syncStartedAt: new Date(),
          syncError: null,
        },
      });

      this.logger.log(`Sync status set to 'syncing' for user ${userId}`);

      // Verify the Airbnb account is connected to Beds24
      const beds24AirbnbUser = await this.beds24V2Client.findAirbnbUser(user.airbnbHostId);
      
      if (!beds24AirbnbUser) {
        throw new HttpException(
          `Your Airbnb account (ID: ${user.airbnbHostId}) is not connected to Beds24. ` +
          'Please connect your Airbnb account to Beds24 through the Beds24 dashboard first.',
          HttpStatus.BAD_REQUEST,
        );
      }

      this.logger.log(`Fetching Airbnb listings for user ${beds24AirbnbUser.firstName} (${user.airbnbHostId})`);

      // Fetch all Airbnb listings for this user from Beds24
      const listingsResponse = await this.beds24V2Client.getAirbnbListings(user.airbnbHostId);
      const airbnbListings = listingsResponse.data || [];
      
      if (airbnbListings.length === 0) {
        return {
          success: true,
          message: 'No Airbnb listings found in Beds24',
          beds24User: beds24AirbnbUser,
          summary: {
            listingsFound: 0,
            listingsImported: 0,
            listingsCreated: 0,
            listingsUpdated: 0,
          },
        };
      }

      this.logger.log(`Found ${airbnbListings.length} Airbnb listings`);

      // DEBUG: Limit to first 2 properties + specific property for testing
      const targetPropertyName = 'Cozy Mountain Retreat';
      const first2Listings = airbnbListings.slice(0, 2);
      const targetListing = airbnbListings.find(wrapper =>
        wrapper.airbnbListing?.name?.toLowerCase().includes(targetPropertyName.toLowerCase())
      );

      // Combine first 2 + target property (if found and not already in first 2)
      const listingsToProcess = targetListing && !first2Listings.includes(targetListing)
        ? [...first2Listings, targetListing]
        : first2Listings;

      this.logger.log(`DEBUG: Processing ${listingsToProcess.length} listings for testing`);
      this.logger.log(`DEBUG: Listings to process: ${listingsToProcess.map(w => w.airbnbListing?.name).join(', ')}`);

      // Step 1: Import listings to Beds24 that don't have a roomId yet
      const listingsToImport = listingsToProcess.filter(wrapper => !wrapper.roomId);
      const importResults = [];

      if (listingsToImport.length > 0) {
        this.logger.log(`Importing ${listingsToImport.length} new Airbnb listings to Beds24...`);
        
        const importActions = listingsToImport.map(wrapper => ({
          action: 'importAsNewProperty' as const,
          airbnbUserId: user.airbnbHostId,
          airbnbListingId: wrapper.airbnbListing.id,
          connect: 'full' as const,
          importBlockedDates: true,
          importBookings: true,
        }));

        try {
          const importResponse = await this.beds24V2Client.performAirbnbAction(importActions);
          importResults.push(...importResponse);
          this.logger.log(`Beds24 import response:`, JSON.stringify(importResponse, null, 2));
        } catch (importError) {
          this.logger.error(`Failed to import listings to Beds24: ${importError.message}`);
          // Continue with saving to our database even if import fails
        }
      } else {
        this.logger.log('All listings already have roomId - skipping Beds24 import');
      }

      // Step 2: Re-fetch listings to get updated roomIds after import
      this.logger.log('Re-fetching Airbnb listings to get updated roomIds...');
      const updatedListingsResponse = await this.beds24V2Client.getAirbnbListings(user.airbnbHostId);
      const updatedListings = updatedListingsResponse.data || [];

      // Create a map for quick lookup by Airbnb listing ID
      const airbnbListingsMap = new Map(
        updatedListings.map(wrapper => [wrapper.airbnbListing.id, wrapper])
      );
      this.logger.log(`Re-fetched ${updatedListings.length} Airbnb listings`);

      // Step 3: Get all properties from old JSON API to find propIds
      this.logger.log('Fetching all properties from old JSON API to get propIds...');
      const oldApiResponse = await this.getAllProperties();
      const oldApiProperties = oldApiResponse.properties || [];
      this.logger.log(`Found ${oldApiProperties.length} properties from old JSON API`);

      // Get names from Airbnb listings for matching
      const airbnbNames = new Set(
        updatedListings.map(wrapper => wrapper.airbnbListing.name?.toLowerCase().trim())
      );
      this.logger.log(`Airbnb listing names to match: ${Array.from(airbnbNames).join(', ')}`);

      // Filter old API properties by matching names from Airbnb listings
      const matchingProperties = oldApiProperties.filter(p => {
        const propName = p.name?.toLowerCase().trim();
        // Check if property name contains or matches any Airbnb listing name
        return Array.from(airbnbNames).some(airbnbName => 
          airbnbName && propName && (
            propName.includes(airbnbName) || 
            airbnbName.includes(propName) ||
            propName === airbnbName
          )
        );
      });

      const propIds = matchingProperties
        .filter(p => p.propId)
        .map(p => parseInt(p.propId, 10));
      
      this.logger.log(`Found ${matchingProperties.length} properties matching Airbnb names`);
      this.logger.log(`Extracted propIds: ${propIds.join(', ')}`);

      // Step 4: Fetch all properties in one call from V2 API
      this.logger.log(`Fetching ${propIds.length} properties from V2 API /properties...`);
      
      let beds24Properties: any[] = [];
      if (propIds.length > 0) {
        try {
          const propertyResponse = await this.beds24V2Client.getProperties({
            id: propIds,
            includeLanguages: ['all'],
            includeAllRooms: true,
            includeTexts: ['all'],
            includePictures: true,
            includeOffers: true,
            includePriceRules: true,
            includeUpsellItems: true,
            includeUnitDetails: true,
          });
          beds24Properties = propertyResponse.data || [];
          this.logger.log(`Got ${beds24Properties.length} properties from V2 API`);
        } catch (propError) {
          this.logger.error(`Failed to fetch properties: ${propError.message}`);
        }
      }

      // Create a map of properties by name for matching (since roomId is often undefined in Airbnb API)
      const propertiesByName = new Map<string, { property: any; roomType: any }>();
      for (const property of beds24Properties) {
        // Map by property name (lowercase for matching)
        const propNameLower = property.name?.toLowerCase().trim();
        if (propNameLower && property.roomTypes?.length > 0) {
          propertiesByName.set(propNameLower, { property, roomType: property.roomTypes[0] });
        }
        // Also map by each room type name
        for (const roomType of property.roomTypes || []) {
          const roomNameLower = roomType.name?.toLowerCase().trim();
          if (roomNameLower) {
            propertiesByName.set(roomNameLower, { property, roomType });
          }
        }
      }
      // Also create a map from old API properties by name
      const oldApiPropertiesByName = new Map<string, any>();
      for (const property of oldApiProperties) {
        const propNameLower = property.name?.toLowerCase().trim();
        if (propNameLower && property.roomTypes?.length > 0) {
          oldApiPropertiesByName.set(propNameLower, { property, roomType: property.roomTypes[0] });
        }
        for (const roomType of property.roomTypes || []) {
          const roomNameLower = roomType.name?.toLowerCase().trim();
          if (roomNameLower) {
            oldApiPropertiesByName.set(roomNameLower, { property, roomType });
          }
        }
      }

      let listingsCreated = 0;
      let listingsUpdated = 0;
      const savedListings = [];

      // Step 5: Save listings to our database with enriched data
      this.logger.log(`Processing ${listingsToProcess.length} listings...`);
      
      for (const wrapper of listingsToProcess) {
        const airbnbListing = wrapper.airbnbListing;
        const airbnbName = airbnbListing.name?.toLowerCase().trim() || '';
        
        // Get updated wrapper with roomId (if available)
        const updatedWrapper = airbnbListingsMap.get(airbnbListing.id) || wrapper;
        const roomId = updatedWrapper.roomId;
        
        // Try to find matching property by name (since roomId is often undefined in Airbnb API)
        let v2Data = null;
        let oldApiData = null;
        
        // First try to match V2 property by name
        for (const [propName, data] of propertiesByName.entries()) {
          if (airbnbName.includes(propName) || propName.includes(airbnbName)) {
            v2Data = data;
            break;
          }
        }
        
        // Fallback to old API data by name
        if (!v2Data) {
          for (const [propName, data] of oldApiPropertiesByName.entries()) {
            if (airbnbName.includes(propName) || propName.includes(airbnbName)) {
              oldApiData = data;
              break;
            }
          }
        }
        
        const beds24Property = v2Data?.property || oldApiData?.property;
        const beds24RoomType = v2Data?.roomType || oldApiData?.roomType;
        const matchedRoomId = beds24RoomType?.id || roomId;

        // Create unique external ID using Airbnb listing ID
        const externalId = `airbnb_${airbnbListing.id}`;
        
        // Check if listing already exists
        const existingImport = await this.prisma.importedListing.findUnique({
          where: {
            source_externalId: {
              source: 'airbnb',
              externalId: externalId,
            },
          },
          include: {
            listing: true,
          },
        });

        // Extract texts from Beds24 property
        const propertyTexts = beds24Property?.texts?.find(t => t.language === 'en') || beds24Property?.texts?.[0];
        const roomTexts = beds24RoomType?.texts?.find(t => t.language === 'en') || beds24RoomType?.texts?.[0];

        // Merge data from both Airbnb and Beds24
        let listing;
        const listingData = {
          // Basic info from Airbnb
          title: airbnbListing.name,
          address: beds24Property?.address || airbnbListing.street,
          city: beds24Property?.city || airbnbListing.city,
          state: beds24Property?.state || airbnbListing.state,
          country: beds24Property?.country || airbnbListing.country_code,
          postalCode: beds24Property?.postcode || airbnbListing.zipcode,
          latitude: beds24Property?.latitude || airbnbListing.lat,
          longitude: beds24Property?.longitude || airbnbListing.lng,
          
          // Room details - prefer Beds24 data
          maxGuests: beds24RoomType?.maxPeople || airbnbListing.person_capacity,
          bedrooms: airbnbListing.bedrooms,
          bathrooms: airbnbListing.bathrooms,
          beds: airbnbListing.beds,
          
          // Property type and pricing
          propertyType: beds24Property?.propertyType || airbnbListing.property_type_category || 'house',
          currency: beds24Property?.currency || 'USD',
          basePrice: beds24RoomType?.minPrice ? beds24RoomType.minPrice : null,
          
          // Check-in/out times from Beds24
          checkInTime: beds24Property?.checkInStart || null,
          checkOutTime: beds24Property?.checkOutEnd || null,
          
          // Stay restrictions from Beds24
          minNights: beds24RoomType?.minStay || 1,
          maxNights: beds24RoomType?.maxStay || null,
          
          // Descriptions and rules from Beds24
          description: roomTexts?.roomDescription || propertyTexts?.propertyDescription || null,
          houseRules: propertyTexts?.houseRules || null,
          cancellationPolicy: propertyTexts?.cancellationPolicy || null,
          
          // IDs for linking
          airbnbListingId: airbnbListing.id,
          beds24PropId: beds24Property?.id ? String(beds24Property.id) : (beds24Property?.propId || null),
          beds24RoomId: matchedRoomId ? String(matchedRoomId) : null,
        };

        // Combine raw data for storage
        const combinedRawData = {
          airbnb: updatedWrapper,
          beds24Property: beds24Property || null,
          beds24RoomType: beds24RoomType || null,
        };

        if (existingImport?.listing) {
          // Update existing listing
          listing = await this.prisma.listing.update({
            where: { id: existingImport.listing.id },
            data: {
              ...listingData,
              updatedAt: new Date(),
            },
          });

          // Update imported listing raw data
          await this.prisma.importedListing.update({
            where: { id: existingImport.id },
            data: {
              rawData: JSON.parse(JSON.stringify(combinedRawData)),
              importStatus: 'processed',
            },
          });

          listingsUpdated++;
          this.logger.log(`Updated listing: ${airbnbListing.name} (ID: ${listing.id}, propId: ${beds24Property?.id || beds24Property?.propId}, roomId: ${matchedRoomId})`);
        } else {
          // Create new listing
          listing = await this.prisma.listing.create({
            data: {
              userId,
              ...listingData,
              isActive: true,
            },
          });

          // Create or update imported listing record (upsert to handle race conditions)
          await this.prisma.importedListing.upsert({
            where: {
              source_externalId: {
                source: 'airbnb',
                externalId: externalId,
              },
            },
            update: {
              listingId: listing.id,
              rawData: JSON.parse(JSON.stringify(combinedRawData)),
              importStatus: 'processed',
            },
            create: {
              listingId: listing.id,
              source: 'airbnb',
              externalId: externalId,
              rawData: JSON.parse(JSON.stringify(combinedRawData)),
              importStatus: 'processed',
            },
          });

          listingsCreated++;
          this.logger.log(`Created listing: ${airbnbListing.name} (ID: ${listing.id}, propId: ${beds24Property?.id || beds24Property?.propId}, roomId: ${matchedRoomId})`);
        }

        savedListings.push({
          id: listing.id,
          title: listing.title,
          airbnbListingId: airbnbListing.id,
          beds24PropId: beds24Property?.id,
          beds24RoomId: matchedRoomId ? String(matchedRoomId) : null,
          hasDetailedData: !!beds24Property,
        });
      }

      this.logger.log(
        `Sync complete: ${listingsToImport.length} imported to Beds24, ${listingsCreated} created, ${listingsUpdated} updated in DB`,
      );

      // Step 6: Fetch and save bookings for the synced properties
      this.logger.log('Fetching bookings for synced properties...');
      let bookingsCreated = 0;
      let bookingsUpdated = 0;
      const syncedBookings = [];

      // Get property IDs that we just synced
      const syncedPropertyIds = savedListings
        .filter(l => l.beds24PropId)
        .map(l => parseInt(String(l.beds24PropId), 10))
        .filter(id => !isNaN(id));

      if (syncedPropertyIds.length > 0) {
        try {
          this.logger.log(`Fetching bookings for ${syncedPropertyIds.length} properties...`);
          const beds24Bookings = await this.beds24V2Client.getBookingsByPropertyIds(syncedPropertyIds);
          this.logger.log(`Fetched ${beds24Bookings.length} bookings from Beds24`);

          // Create maps for matching
          const listingByPropId = new Map(
            savedListings.map(l => [String(l.beds24PropId), l])
          );
          const listingByRoomId = new Map(
            savedListings
              .filter(l => l.beds24RoomId)
              .map(l => [String(l.beds24RoomId), l])
          );

          // Process each booking
          for (const beds24Booking of beds24Bookings) {
            // Find matching listing by roomId or propertyId
            let matchedListing = listingByRoomId.get(String(beds24Booking.roomId));
            if (!matchedListing) {
              matchedListing = listingByPropId.get(String(beds24Booking.propertyId));
            }

            if (!matchedListing) {
              this.logger.warn(
                `No listing found for booking ${beds24Booking.id} (propertyId: ${beds24Booking.propertyId}, roomId: ${beds24Booking.roomId})`
              );
              continue;
            }

            // Map Beds24 status to our status
            const statusMap: Record<string, string> = {
              'new': 'pending',
              'request': 'pending',
              'confirmed': 'confirmed',
              'cancelled': 'cancelled',
              'black': 'cancelled',
              'deleted': 'cancelled',
            };
            const status = statusMap[beds24Booking.status] || 'confirmed';

            // Create external ID for tracking
            const externalId = `beds24_${beds24Booking.id}`;

            // Check if booking exists
            const existingBooking = await this.prisma.booking.findFirst({
              where: {
                externalId,
              },
            });

            const bookingData = {
              listingId: matchedListing.id,
              guestName: [beds24Booking.firstName, beds24Booking.lastName]
                .filter(Boolean)
                .join(' ') || 'Guest',
              guestEmail: beds24Booking.email || null,
              guestPhone: beds24Booking.phone || beds24Booking.mobile || null,
              checkIn: new Date(beds24Booking.arrival),
              checkOut: new Date(beds24Booking.departure),
              numGuests: beds24Booking.numAdult + (beds24Booking.numChild || 0),
              totalPrice: beds24Booking.price || 0,
              status,
              bookingSource: beds24Booking.referer || 'beds24',
              externalId,
              notes: beds24Booking.comments || beds24Booking.notes || null,
            };

            if (existingBooking) {
              // Update existing booking
              await this.prisma.booking.update({
                where: { id: existingBooking.id },
                data: bookingData,
              });
              bookingsUpdated++;
              syncedBookings.push({
                id: existingBooking.id,
                beds24Id: beds24Booking.id,
                action: 'updated',
              });
              this.logger.log(`Updated booking ${beds24Booking.id} for listing ${matchedListing.title}`);
            } else {
              // Create new booking
              const newBooking = await this.prisma.booking.create({
                data: {
                  userId,
                  ...bookingData,
                },
              });
              bookingsCreated++;
              syncedBookings.push({
                id: newBooking.id,
                beds24Id: beds24Booking.id,
                action: 'created',
              });
              this.logger.log(`Created booking ${beds24Booking.id} for listing ${matchedListing.title}`);
            }
          }

          this.logger.log(
            `Booking sync complete: ${bookingsCreated} created, ${bookingsUpdated} updated`
          );
        } catch (bookingError) {
          this.logger.error(`Failed to sync bookings: ${bookingError.message}`);
          // Continue with property sync completion even if booking sync fails
        }
      } else {
        this.logger.log('No property IDs found to fetch bookings for');
      }

      // Step 7: Sync calendar data for all saved listings
      this.logger.log('Syncing calendar data for listings...');
      let calendarsSynced = 0;
      const calendarSyncErrors = [];

      for (const savedListing of savedListings) {
        // Get the actual listing from DB to ensure we have the latest beds24RoomId
        const listingRecord = await this.prisma.listing.findUnique({
          where: { id: savedListing.id },
          select: { id: true, title: true, beds24RoomId: true },
        });

        if (!listingRecord) {
          this.logger.warn(`Listing ${savedListing.id} not found in database`);
          continue;
        }

        const beds24RoomId = listingRecord.beds24RoomId || savedListing.beds24RoomId;
        
        this.logger.log(`Checking listing ${listingRecord.id} (${listingRecord.title}) for calendar sync - beds24RoomId: ${beds24RoomId}`);
        
        if (!beds24RoomId) {
          this.logger.warn(`Skipping calendar sync for listing ${listingRecord.id} - no beds24RoomId`);
          continue;
        }

        try {
          const roomId = parseInt(String(beds24RoomId), 10);
          
          if (isNaN(roomId)) {
            this.logger.warn(`Invalid beds24RoomId for listing ${listingRecord.id}: ${beds24RoomId}`);
            continue;
          }
          
          // Calculate date range: today to 1 year from today
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const oneYearFromNow = new Date(today);
          oneYearFromNow.setFullYear(today.getFullYear() + 1);

          const startDate = today.toISOString().split('T')[0];
          const endDate = oneYearFromNow.toISOString().split('T')[0];

          this.logger.log(`Fetching calendar for listing ${listingRecord.id} (room ${roomId}) from ${startDate} to ${endDate}`);

          // Fetch calendar from Beds24
          const calendarResponse = await this.beds24V2Client.getCalendar({
            startDate,
            endDate,
            roomId: [roomId],
            includeNumAvail: true,
            includeMinStay: true,
            includeMaxStay: true,
            includePrices: true,
            includeOverride: true,
          });

          if (!calendarResponse.data || calendarResponse.data.length === 0) {
            this.logger.warn(`No calendar data returned for listing ${listingRecord.id}`);
            continue;
          }

          const roomCalendar = calendarResponse.data[0];
          
          if (!roomCalendar.calendar || roomCalendar.calendar.length === 0) {
            this.logger.warn(`No calendar entries for listing ${listingRecord.id}`);
            continue;
          }

          this.logger.log(`Processing ${roomCalendar.calendar.length} calendar entries for listing ${listingRecord.id}`);

          // Clear existing cache for this listing
          await this.prisma.calendar.deleteMany({
            where: { listingId: listingRecord.id },
          });

          // Process and cache calendar entries
          // Use a Map to track dates and handle overlapping ranges (last entry wins)
          const dateMap = new Map<string, any>();

          for (const entry of roomCalendar.calendar) {
            // Parse date range
            const fromDate = new Date(entry.from);
            const toDate = new Date(entry.to);

            // Generate all dates in range
            const currentDate = new Date(fromDate);
            while (currentDate <= toDate) {
              const dateStr = currentDate.toISOString().split('T')[0];
              
              // Store in map (overwrites if date already exists - last entry wins)
              dateMap.set(dateStr, {
                listingId: listingRecord.id,
                roomId,
                date: new Date(dateStr),
                price: entry.price1 ? parseFloat(String(entry.price1)) : null,
                numAvail: entry.numAvail ?? null,
                minStay: entry.minStay ?? null,
                maxStay: entry.maxStay ?? null,
                override: entry.override ?? null,
                rawData: entry as any,
              });
              
              currentDate.setDate(currentDate.getDate() + 1);
            }
          }

          // Convert map to array and create upsert operations
          const cacheOperations = Array.from(dateMap.values()).map(data =>
            this.prisma.calendar.upsert({
              where: {
                listingId_date: {
                  listingId: data.listingId,
                  date: data.date,
                },
              },
              update: {
                roomId: data.roomId,
                price: data.price,
                numAvail: data.numAvail,
                minStay: data.minStay,
                maxStay: data.maxStay,
                override: data.override,
                rawData: data.rawData,
              },
              create: data,
            }),
          );

          // Execute all cache operations in transaction
          if (cacheOperations.length > 0) {
            await this.prisma.$transaction(cacheOperations);
            this.logger.log(`Cached ${cacheOperations.length} calendar days for listing ${listingRecord.id}`);
            calendarsSynced++;
          }
        } catch (calendarError) {
          this.logger.error(`Failed to sync calendar for listing ${listingRecord.id}: ${calendarError.message}`);
          calendarSyncErrors.push({
            listingId: listingRecord.id,
            error: calendarError.message,
          });
          // Continue with other listings
        }
      }

      this.logger.log(
        `Calendar sync complete: ${calendarsSynced} calendars synced, ${calendarSyncErrors.length} errors`
      );

      // Mark sync as completed
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          syncStatus: 'completed',
          syncCompletedAt: new Date(),
          syncError: null,
        },
      });

      return {
        success: true,
        message: `Successfully synced ${listingsToProcess.length} Airbnb listings (DEBUG: limited to 2)`,
        beds24User: beds24AirbnbUser,
        summary: {
          listingsFound: airbnbListings.length,
          listingsProcessed: listingsToProcess.length,
          listingsImportedToBeds24: listingsToImport.length,
          beds24PropertiesFound: beds24Properties.length,
          listingsCreated,
          listingsUpdated,
          bookingsCreated,
          bookingsUpdated,
          bookingsFound: syncedBookings.length,
          calendarsSynced,
          calendarSyncErrors: calendarSyncErrors.length,
        },
        importResults,
        properties: savedListings,
        bookings: syncedBookings,
        calendarSyncErrors: calendarSyncErrors.length > 0 ? calendarSyncErrors : undefined,
      };
    } catch (error) {
      this.logger.error('Failed to sync Airbnb listings:', error.message);
      
      // Mark sync as failed
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          syncStatus: 'failed',
          syncCompletedAt: new Date(),
          syncError: error.message || 'Unknown error',
        },
      }).catch(e => this.logger.error('Failed to update sync status:', e.message));

      throw new HttpException(
        error.message || 'Failed to sync Airbnb listings from Beds24',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ============ Calendar/Inventory Methods ============

  /**
   * Get calendar data from Beds24 V2 API
   */
  async getCalendar(params: {
    startDate: string;
    endDate: string;
    roomId?: number[];
    propertyId?: number[];
  }): Promise<any> {
    this.logger.log(`Getting calendar from ${params.startDate} to ${params.endDate}`);
    
    try {
      const response = await this.beds24V2Client.getCalendar({
        startDate: params.startDate,
        endDate: params.endDate,
        roomId: params.roomId,
        propertyId: params.propertyId,
        includeNumAvail: true,
        includeMinStay: true,
        includeMaxStay: true,
        includePrices: true,
        includeOverride: true,
        includeChannels: true,
      });

      this.logger.log(`Calendar response: ${JSON.stringify(response.data, null, 2)}`);
      
      return {
        success: true,
        data: response.data,
        count: response.count,
      };
    } catch (error) {
      this.logger.error('Failed to get calendar:', error.message);
      throw new HttpException(
        error.message || 'Failed to get calendar from Beds24',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Update calendar data in Beds24 V2 API
   */
  async updateCalendar(updates: Array<{
    roomId: number;
    calendar: Array<{
      from: string;
      to: string;
      price1?: number;
      price2?: number;
      numAvail?: number;
      minStay?: number;
      maxStay?: number;
      override?: 'none' | 'open' | 'closed';
    }>;
  }>): Promise<any> {
    this.logger.log(`Updating calendar for ${updates.length} rooms`);

    try {
      const response = await this.beds24V2Client.updateCalendar(updates);

      return {
        success: true,
        results: response,
      };
    } catch (error) {
      this.logger.error('Failed to update calendar:', error.message);
      throw new HttpException(
        error.message || 'Failed to update calendar in Beds24',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ============ Bookings Methods ============

  /**
   * Get bookings from Beds24 V2 API
   */
  async getBookings(params?: {
    propertyId?: number[];
    roomId?: number[];
    arrivalFrom?: string;
    arrivalTo?: string;
    departureFrom?: string;
    departureTo?: string;
    modifiedFrom?: string;
    status?: string[];
  }): Promise<any> {
    this.logger.log('Getting bookings from Beds24');

    try {
      const response = await this.beds24V2Client.getBookings({
        propertyId: params?.propertyId,
        roomId: params?.roomId,
        arrivalFrom: params?.arrivalFrom,
        arrivalTo: params?.arrivalTo,
        departureFrom: params?.departureFrom,
        departureTo: params?.departureTo,
        modifiedFrom: params?.modifiedFrom,
        status: params?.status as any,
        includeGuest: true,
        includeInfoItems: true,
        includeInvoice: true,
      });

      return {
        success: true,
        data: response.data,
        count: response.count,
      };
    } catch (error) {
      this.logger.error('Failed to get bookings:', error.message);
      throw new HttpException(
        error.message || 'Failed to get bookings from Beds24',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Sync all bookings from Beds24 for a user's properties
   */
  async syncBookings(userId: string): Promise<any> {
    this.logger.log(`Syncing bookings from Beds24 for user: ${userId}`);

    try {
      // Get all listings for this user that have beds24PropId
      const listings = await this.prisma.listing.findMany({
        where: {
          userId,
          beds24PropId: { not: null },
        },
        select: {
          id: true,
          title: true,
          beds24PropId: true,
          beds24RoomId: true,
        },
      });

      if (listings.length === 0) {
        return {
          success: true,
          message: 'No Beds24-connected properties found',
          summary: {
            propertiesFound: 0,
            bookingsFound: 0,
            bookingsCreated: 0,
            bookingsUpdated: 0,
          },
        };
      }

      // Extract property IDs
      const propertyIds = listings
        .filter(l => l.beds24PropId)
        .map(l => parseInt(l.beds24PropId!, 10))
        .filter(id => !isNaN(id));

      this.logger.log(`Found ${propertyIds.length} properties to sync bookings for`);

      // Fetch bookings from Beds24
      const beds24Bookings = await this.beds24V2Client.getBookingsByPropertyIds(propertyIds);
      this.logger.log(`Fetched ${beds24Bookings.length} bookings from Beds24`);

      // Create maps for matching
      const listingByPropId = new Map(
        listings.map(l => [l.beds24PropId, l])
      );
      const listingByRoomId = new Map(
        listings.filter(l => l.beds24RoomId).map(l => [l.beds24RoomId, l])
      );

      let bookingsCreated = 0;
      let bookingsUpdated = 0;
      const syncedBookings = [];

      for (const beds24Booking of beds24Bookings) {
        // Find matching listing by roomId or propertyId
        let listing = listingByRoomId.get(String(beds24Booking.roomId));
        if (!listing) {
          listing = listingByPropId.get(String(beds24Booking.propertyId));
        }

        if (!listing) {
          this.logger.warn(
            `No listing found for booking ${beds24Booking.id} (propertyId: ${beds24Booking.propertyId}, roomId: ${beds24Booking.roomId})`
          );
          continue;
        }

        // Map Beds24 status to our status
        const statusMap: Record<string, string> = {
          'new': 'pending',
          'request': 'pending',
          'confirmed': 'confirmed',
          'cancelled': 'cancelled',
          'black': 'cancelled',
          'deleted': 'cancelled',
        };
        const status = statusMap[beds24Booking.status] || 'confirmed';

        // Create external ID for tracking
        const externalId = `beds24_${beds24Booking.id}`;

        // Check if booking exists
        const existingBooking = await this.prisma.booking.findFirst({
          where: {
            externalId,
          },
        });

        const bookingData = {
          listingId: listing.id,
          guestName: [beds24Booking.firstName, beds24Booking.lastName]
            .filter(Boolean)
            .join(' ') || 'Guest',
          guestEmail: beds24Booking.email || null,
          guestPhone: beds24Booking.phone || beds24Booking.mobile || null,
          checkIn: new Date(beds24Booking.arrival),
          checkOut: new Date(beds24Booking.departure),
          numGuests: beds24Booking.numAdult + (beds24Booking.numChild || 0),
          totalPrice: beds24Booking.price || 0,
          status,
          bookingSource: beds24Booking.referer || 'beds24',
          externalId,
          notes: beds24Booking.comments || beds24Booking.notes || null,
        };

        if (existingBooking) {
          // Update existing booking
          await this.prisma.booking.update({
            where: { id: existingBooking.id },
            data: bookingData,
          });
          bookingsUpdated++;
          syncedBookings.push({
            id: existingBooking.id,
            beds24Id: beds24Booking.id,
            action: 'updated',
          });
        } else {
          // Create new booking
          const newBooking = await this.prisma.booking.create({
            data: {
              userId,
              ...bookingData,
            },
          });
          bookingsCreated++;
          syncedBookings.push({
            id: newBooking.id,
            beds24Id: beds24Booking.id,
            action: 'created',
          });
        }
      }

      this.logger.log(
        `Booking sync complete: ${bookingsCreated} created, ${bookingsUpdated} updated`
      );

      return {
        success: true,
        message: `Synced ${beds24Bookings.length} bookings from Beds24`,
        summary: {
          propertiesFound: listings.length,
          bookingsFound: beds24Bookings.length,
          bookingsCreated,
          bookingsUpdated,
        },
        bookings: syncedBookings,
      };
    } catch (error) {
      this.logger.error('Failed to sync bookings:', error.message);
      throw new HttpException(
        error.message || 'Failed to sync bookings from Beds24',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Handle Beds24 webhook for booking events
   */
  async handleBookingWebhook(payload: {
    event: string;
    bookingId: number;
    propertyId: number;
    roomId: number;
    data?: any;
  }): Promise<any> {
    this.logger.log(`Handling Beds24 booking webhook: ${payload.event} for booking ${payload.bookingId}`);

    try {
      const externalId = `beds24_${payload.bookingId}`;

      // Find the listing by propertyId or roomId
      const listing = await this.prisma.listing.findFirst({
        where: {
          OR: [
            { beds24RoomId: String(payload.roomId) },
            { beds24PropId: String(payload.propertyId) },
          ],
        },
      });

      if (!listing) {
        this.logger.warn(
          `No listing found for webhook (propertyId: ${payload.propertyId}, roomId: ${payload.roomId})`
        );
        return {
          success: false,
          message: 'Listing not found',
        };
      }

      switch (payload.event) {
        case 'booking.created':
        case 'booking.modified': {
          // Fetch fresh booking data from Beds24
          const bookingsResponse = await this.beds24V2Client.getBookings({
            id: [payload.bookingId],
            includeGuest: true,
            includeInfoItems: true,
          });

          const beds24Booking = bookingsResponse.data?.[0];
          if (!beds24Booking) {
            this.logger.warn(`Booking ${payload.bookingId} not found in Beds24`);
            return { success: false, message: 'Booking not found in Beds24' };
          }

          const statusMap: Record<string, string> = {
            'new': 'pending',
            'request': 'pending',
            'confirmed': 'confirmed',
            'cancelled': 'cancelled',
            'black': 'cancelled',
            'deleted': 'cancelled',
          };

          const bookingData = {
            listingId: listing.id,
            guestName: [beds24Booking.firstName, beds24Booking.lastName]
              .filter(Boolean)
              .join(' ') || 'Guest',
            guestEmail: beds24Booking.email || null,
            guestPhone: beds24Booking.phone || beds24Booking.mobile || null,
            checkIn: new Date(beds24Booking.arrival),
            checkOut: new Date(beds24Booking.departure),
            numGuests: beds24Booking.numAdult + (beds24Booking.numChild || 0),
            totalPrice: beds24Booking.price || 0,
            status: statusMap[beds24Booking.status] || 'confirmed',
            bookingSource: beds24Booking.referer || 'beds24',
            externalId,
            notes: beds24Booking.comments || beds24Booking.notes || null,
          };

          const existingBooking = await this.prisma.booking.findFirst({
            where: { externalId },
          });

          if (existingBooking) {
            await this.prisma.booking.update({
              where: { id: existingBooking.id },
              data: bookingData,
            });
            return { success: true, action: 'updated', bookingId: existingBooking.id };
          } else {
            const newBooking = await this.prisma.booking.create({
              data: {
                userId: listing.userId,
                ...bookingData,
              },
            });
            return { success: true, action: 'created', bookingId: newBooking.id };
          }
        }

        case 'booking.cancelled':
        case 'booking.deleted': {
          const existingBooking = await this.prisma.booking.findFirst({
            where: { externalId },
          });

          if (existingBooking) {
            await this.prisma.booking.update({
              where: { id: existingBooking.id },
              data: { status: 'cancelled' },
            });
            return { success: true, action: 'cancelled', bookingId: existingBooking.id };
          }
          return { success: true, message: 'Booking not found locally' };
        }

        default:
          this.logger.warn(`Unknown webhook event: ${payload.event}`);
          return { success: false, message: `Unknown event: ${payload.event}` };
      }
    } catch (error) {
      this.logger.error('Failed to handle booking webhook:', error.message);
      throw new HttpException(
        error.message || 'Failed to handle booking webhook',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

