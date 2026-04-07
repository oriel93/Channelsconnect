import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Beds24V2Client } from '../beds24/v2';
import { SupabaseBeforeUserCreatedDto } from './dto/supabase-webhook.dto';
import axios from 'axios';
import * as crypto from 'crypto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private prisma: PrismaService,
    private beds24Client: Beds24V2Client,
  ) {}

  async create(createUserDto: CreateUserDto) {
    return this.prisma.user.create({
      data: createUserDto,
    });
  }

  async findAll() {
    return this.prisma.user.findMany();
  }

  async findOne(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    return this.prisma.user.update({
      where: { id },
      data: updateUserDto,
    });
  }

  async remove(id: string) {
    return this.prisma.user.delete({
      where: { id },
    });
  }

  // User is now auto-created by database trigger
  // This method just ensures the user exists (should always be true after signup)
  async ensureUserExists(supabaseUserId: string, email: string, name?: string) {
    try {
      let user = await this.findOne(supabaseUserId);
      
      // If for some reason the trigger didn't create the user, create it manually
      if (!user) {
        this.logger.warn(`User ${supabaseUserId} not found in database - creating manually`);
        user = await this.create({
          id: supabaseUserId, // Use Supabase UUID as primary key
          email,
          name,
        });
        this.logger.log(`User ${supabaseUserId} created successfully`);
      }
      
      return user;
    } catch (error) {
      this.logger.error(`Error in ensureUserExists for user ${supabaseUserId}:`, error);
      throw new HttpException(
        `Failed to get or create user: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Extract Airbnb host ID from profile URL, verify it's connected to Beds24, and save it
   * Accepts URLs like: https://airbnb.com/p/oliviastays or https://www.airbnb.com/users/show/369257999
   */
  async connectAirbnbProfile(userId: string, profileUrl: string): Promise<any> {
    this.logger.log(`Connecting Airbnb profile for user ${userId}: ${profileUrl}`);

    try {
      // Normalize URL
      let url = profileUrl.trim();
      if (!url.startsWith('http')) {
        url = 'https://' + url;
      }

      let airbnbHostId: string | null = null;

      // If it's already a /users/show/ URL, extract the ID directly
      const usersShowMatch = url.match(/\/users\/show\/(\d+)/);
      if (usersShowMatch) {
        airbnbHostId = usersShowMatch[1];
      } else {
        // Otherwise, fetch the page and extract from meta tags
        this.logger.log(`Fetching Airbnb profile page: ${url}`);
        
        const response = await axios.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
          },
          timeout: 15000,
          maxRedirects: 5,
        });

        const html = response.data;

        // Look for twitter:url meta tag with user ID
        // <meta name="twitter:url" content="https://www.airbnb.com/users/show/369257999" />
        const twitterUrlMatch = html.match(/<meta[^>]*name=["']twitter:url["'][^>]*content=["']([^"']+)["']/i) 
          || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']twitter:url["']/i);

        if (twitterUrlMatch) {
          const twitterUrl = twitterUrlMatch[1];
          const idMatch = twitterUrl.match(/\/users\/show\/(\d+)/);
          if (idMatch) {
            airbnbHostId = idMatch[1];
          }
        }

        // Fallback: look for any /users/show/ pattern in the HTML
        if (!airbnbHostId) {
          const fallbackMatch = html.match(/\/users\/show\/(\d+)/);
          if (fallbackMatch) {
            airbnbHostId = fallbackMatch[1];
          }
        }
      }

      if (!airbnbHostId) {
        throw new HttpException(
          'Could not extract Airbnb host ID from the provided URL. Please make sure you provided a valid Airbnb profile link.',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Verify that this Airbnb account is connected to Beds24
      this.logger.log(`Verifying Airbnb user ${airbnbHostId} is connected to Beds24...`);
      const beds24AirbnbUser = await this.beds24Client.findAirbnbUser(airbnbHostId);

      if (!beds24AirbnbUser) {
        throw new HttpException(
          `Airbnb account (ID: ${airbnbHostId}) is not connected to Beds24. ` +
          'Please first connect your Airbnb account to Beds24 through the Beds24 dashboard.',
          HttpStatus.BAD_REQUEST,
        );
      }

      this.logger.log(`Airbnb user ${airbnbHostId} (${beds24AirbnbUser.firstName}) verified in Beds24`);

      return this.saveAirbnbHostId(userId, airbnbHostId, beds24AirbnbUser);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      
      this.logger.error(`Failed to connect Airbnb profile: ${error.message}`);
      
      if (error.response?.status === 404) {
        throw new HttpException(
          'Airbnb profile not found. Please check the URL and try again.',
          HttpStatus.NOT_FOUND,
        );
      }

      throw new HttpException(
        `Failed to connect Airbnb profile: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get all Airbnb accounts connected to Beds24
   */
  async getBeds24AirbnbAccounts(): Promise<any> {
    this.logger.log('Fetching Airbnb accounts connected to Beds24...');
    
    try {
      const response = await this.beds24Client.getAirbnbUsers();
      return {
        success: true,
        count: response.count,
        accounts: response.data.map((wrapper) => wrapper.airbnbUser),
      };
    } catch (error) {
      this.logger.error(`Failed to fetch Beds24 Airbnb accounts: ${error.message}`);
      throw new HttpException(
        `Failed to fetch Airbnb accounts from Beds24: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async saveAirbnbHostId(
    userId: string,
    airbnbHostId: string,
    beds24User?: { firstName: string; picture: string },
  ) {
    this.logger.log(`Saving Airbnb host ID ${airbnbHostId} for user ${userId}`);

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { airbnbHostId },
    });

    return {
      success: true,
      message: 'Airbnb profile connected successfully',
      airbnbHostId,
      beds24User: beds24User || null,
      user,
    };
  }

  /**
   * Get sync status for a user
   */
  async getSyncStatus(userId: string): Promise<{
    syncStatus: string;
    syncStartedAt: Date | null;
    syncCompletedAt: Date | null;
    syncError: string | null;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        syncStatus: true,
        syncStartedAt: true,
        syncCompletedAt: true,
        syncError: true,
      },
    });

    if (!user) {
      return {
        syncStatus: 'idle',
        syncStartedAt: null,
        syncCompletedAt: null,
        syncError: null,
      };
    }

    return {
      syncStatus: user.syncStatus,
      syncStartedAt: user.syncStartedAt,
      syncCompletedAt: user.syncCompletedAt,
      syncError: user.syncError,
    };
  }

  /**
   * Handle Supabase "Before User Created" webhook
   * This is called by Supabase BEFORE a user is created in auth.users
   * We validate the signup AND create the user profile in public.users
   */
  async handleBeforeUserCreated(
    payload: SupabaseBeforeUserCreatedDto,
    signature?: string,
  ): Promise<any> {
    this.logger.log('Received Before User Created webhook', {
      userId: payload.user.id,
      email: payload.user.email,
      metadata: payload.metadata,
    });

    try {
      // Verify webhook signature
      const webhookSecret = process.env.SUPABASE_WEBHOOK_SECRET;
      if (webhookSecret && signature) {
        this.verifyWebhookSignature(JSON.stringify(payload), signature, webhookSecret);
      }

      // Validate the user data
      const validationResult = await this.validateUserSignup(payload);
      
      if (!validationResult.allowed) {
        this.logger.warn(`User signup rejected: ${validationResult.reason}`, {
          email: payload.user.email,
        });
        
        // Return error to block signup
        return {
          error: {
            http_code: validationResult.httpCode || 403,
            message: validationResult.reason || 'Signup not allowed',
          },
        };
      }

      this.logger.log('User signup validation passed', { email: payload.user.email });

      // Create user profile in public.users
      try {
        // Check if user already exists (in case of webhook retry)
        const existingUser = await this.findOne(payload.user.id);
        
        if (!existingUser) {
          const user = await this.create({
            id: payload.user.id,
            email: payload.user.email!,
            name: payload.user.user_metadata?.full_name || null,
            role: 'user',
          });

          this.logger.log('User profile created successfully in public.users', {
            userId: user.id,
            email: user.email,
          });
        } else {
          this.logger.log('User profile already exists (webhook retry)', {
            userId: payload.user.id,
          });
        }
      } catch (createError) {
        this.logger.error('Failed to create user profile in public.users', createError);
        // We don't want to block the signup if profile creation fails
        // The user can still be created in auth.users and profile can be fixed later
      }

      // Allow the signup by returning empty object
      return {};
    } catch (error) {
      this.logger.error('Error processing webhook', error);
      
      // On error, we'll allow to prevent blocking legitimate signups
      // Better to have users in auth.users without profile than to block signups
      return {};
    }
  }

  /**
   * Handle user profile creation after Supabase creates the auth user
   * This should be called by your frontend or a Supabase Edge Function
   * after successful signup
   */
  async handleAfterUserCreated(
    payload: SupabaseBeforeUserCreatedDto,
    signature?: string,
  ): Promise<any> {
    this.logger.log('Creating user profile after signup', {
      userId: payload.user.id,
      email: payload.user.email,
    });

    try {
      // Verify webhook signature
      const webhookSecret = process.env.SUPABASE_WEBHOOK_SECRET;
      if (webhookSecret && signature) {
        this.verifyWebhookSignature(JSON.stringify(payload), signature, webhookSecret);
      }

      // Check if user already exists
      const existingUser = await this.findOne(payload.user.id);
      if (existingUser) {
        this.logger.log('User profile already exists', { userId: payload.user.id });
        return existingUser;
      }

      // Create user profile in public.users
      const user = await this.create({
        id: payload.user.id,
        email: payload.user.email!,
        name: payload.user.user_metadata?.full_name || null,
        role: 'user',
      });

      this.logger.log('User profile created successfully', {
        userId: user.id,
        email: user.email,
      });

      return user;
    } catch (error) {
      this.logger.error('Error creating user profile', error);
      throw new HttpException(
        'Failed to create user profile',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Verify webhook signature from Supabase
   */
  private verifyWebhookSignature(
    payload: string,
    signature: string,
    secret: string,
  ): void {
    // Extract the actual secret (remove v1,whsec_ prefix if present)
    const secretValue = secret.replace(/^v1,whsec_/, '');
    
    // Compute HMAC
    const hmac = crypto
      .createHmac('sha256', secretValue)
      .update(payload)
      .digest('base64');

    const expectedSignature = `v1,${hmac}`;

    if (signature !== expectedSignature) {
      throw new HttpException(
        'Invalid webhook signature',
        HttpStatus.UNAUTHORIZED,
      );
    }
  }

  /**
   * Validate user signup based on custom rules
   * You can add custom validation logic here:
   * - Block disposable email domains
   * - Restrict by IP address
   * - Require specific email domains
   * - Check against blocklists
   */
  private async validateUserSignup(
    payload: SupabaseBeforeUserCreatedDto,
  ): Promise<{ allowed: boolean; reason?: string; httpCode?: number }> {
    const { user, metadata } = payload;
    const email = user.email?.toLowerCase();

    // Example: Block disposable email domains
    const disposableDomains = [
      'tempmail.com',
      'guerrillamail.com',
      'mailinator.com',
      '10minutemail.com',
      'throwaway.email',
    ];

    if (email) {
      const domain = email.split('@')[1];
      if (disposableDomains.includes(domain)) {
        return {
          allowed: false,
          reason: 'Signups from disposable email providers are not allowed.',
          httpCode: 403,
        };
      }
    }

    // Example: Block specific IP addresses (if needed)
    // const blockedIps = ['192.168.1.1'];
    // if (blockedIps.includes(metadata.ip_address)) {
    //   return {
    //     allowed: false,
    //     reason: 'Signups from this IP address are not allowed.',
    //     httpCode: 403,
    //   };
    // }

    // Example: Require specific email domain (uncomment if needed)
    // if (email && !email.endsWith('@yourdomain.com')) {
    //   return {
    //     allowed: false,
    //     reason: 'Only company emails are allowed to sign up.',
    //     httpCode: 403,
    //   };
    // }

    // All checks passed
    return { allowed: true };
  }
}

