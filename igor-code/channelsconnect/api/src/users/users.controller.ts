import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Headers,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import {
  ApiTags,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserEntity } from './entities/user.entity';
import { CurrentUser, CurrentUserData } from '../auth/decorators/current-user.decorator';
import { SupabaseBeforeUserCreatedDto } from './dto/supabase-webhook.dto';
import { Public } from '../auth/decorators/public.decorator';

@Controller('users')
@ApiTags('users')
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiCreatedResponse({ type: UserEntity })
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @ApiOkResponse({ type: UserEntity, isArray: true })
  findAll() {
    return this.usersService.findAll();
  }

  @Get('me')
  @ApiOkResponse({ type: UserEntity })
  @ApiOperation({
    summary: 'Get current user',
    description: 'Returns the authenticated user data. User ID is extracted from the JWT token.',
  })
  async getMe(@CurrentUser() user: CurrentUserData) {
    if (!user || !user.id) {
      throw new UnauthorizedException('User not authenticated');
    }

    // Auto-create the DB row on first login (DB trigger may not have fired,
    // or user signed up via Supabase dashboard / OAuth before the trigger existed).
    // ensureUserExists() upserts: returns existing row or creates a new one.
    // This prevents the AUTHENTICATED_NO_PROFILE error screen on first visit.
    let dbUser = await this.usersService.ensureUserExists(
      user.id,
      user.email,
      user.name,
    );

    // Super-admin auto-promotion: if this email is the super-admin, ensure role=admin
    // in the DB so the frontend sees isAdmin=true immediately on first login.
    const SUPER_ADMIN_EMAIL = 'oriel@erorentals.com';
    if (
      dbUser &&
      user.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase() &&
      (dbUser.role || 'user').toLowerCase() !== 'admin'
    ) {
      dbUser = await this.usersService.update(user.id, { role: 'admin' } as any);
      console.log(`[Auth] Super-admin ${user.email} auto-promoted to admin`);
    }

    return dbUser;
  }

  @Get('token-info')
  @ApiOkResponse({
    description: 'Returns info extracted from JWT token (for testing)',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'User ID from JWT sub claim' },
        email: { type: 'string' },
        name: { type: 'string' },
        message: { type: 'string' },
      },
    },
  })
  @ApiOperation({
    summary: 'Test JWT token extraction',
    description: 'Returns the user info extracted directly from the JWT token without database lookup.',
  })
  getTokenInfo(@CurrentUser() user: CurrentUserData) {
    if (!user || !user.id) {
      throw new UnauthorizedException('User not authenticated');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      message: 'User ID successfully extracted from JWT token',
    };
  }

  @Patch('me')
  @ApiOkResponse({ type: UserEntity })
  @ApiOperation({
    summary: 'Update current user',
    description: 'Updates the authenticated user data. User ID is extracted from the JWT token.',
  })
  updateMe(@CurrentUser() user: CurrentUserData, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(user.id, updateUserDto);
  }

  /**
   * POST /users/consent
   *
   * Records legal consent (ToS acceptance + distribution authorization) for the
   * authenticated user. Called by the frontend immediately after a successful
   * Supabase signup when the user checks the mandatory consent checkbox.
   *
   * Captures:
   *   - tosAcceptedAt: exact server-side UTC timestamp
   *   - signupIp: real client IP via x-forwarded-for (Cloudflare/ALB) or req.ip
   */
  @Post('consent')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Consent recorded successfully' })
  @ApiOperation({
    summary: 'Record ToS acceptance and channel distribution authorization',
    description:
      'Saves tosAcceptedAt timestamp and signupIp for legal audit trail. ' +
      'Must be called with a valid Bearer token (authenticated user only).',
  })
  async recordConsent(
    @CurrentUser() user: CurrentUserData,
    @Req() req: Request,
  ) {
    // Resolve real client IP: Cloudflare / ALB sets x-forwarded-for
    const forwarded = req.headers['x-forwarded-for'];
    const clientIp = Array.isArray(forwarded)
      ? forwarded[0]
      : forwarded?.split(',')[0]?.trim() || req.ip || 'unknown';

    await this.usersService.recordConsent(user.id, clientIp);

    return {
      success: true,
      message: 'Consent recorded',
      tosAcceptedAt: new Date().toISOString(),
      ip: clientIp,
    };
  }

  @Patch(':id')
  @ApiOkResponse({ type: UserEntity })
  @ApiOperation({
    summary: 'Update user by ID',
    description: 'Updates user data. Only allowed if the authenticated user matches the target user ID.',
  })
  update(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    // Ensure user can only update their own profile
    if (user.id !== id) {
      throw new UnauthorizedException('You can only update your own profile');
    }
    return this.usersService.update(id, updateUserDto);
  }

  @Post('connect-airbnb')
  @ApiOkResponse({ description: 'Airbnb profile connected successfully' })
  connectAirbnb(
    @CurrentUser() user: CurrentUserData,
    @Body() body: { profileUrl: string },
  ) {
    return this.usersService.connectAirbnbProfile(user.id, body.profileUrl);
  }

  @Get('sync-status')
  @ApiOkResponse({ 
    description: 'Get current sync status',
    schema: {
      type: 'object',
      properties: {
        syncStatus: { type: 'string', enum: ['idle', 'syncing', 'completed', 'failed'] },
        syncStartedAt: { type: 'string', format: 'date-time', nullable: true },
        syncCompletedAt: { type: 'string', format: 'date-time', nullable: true },
        syncError: { type: 'string', nullable: true },
      },
    },
  })
  async getSyncStatus(@CurrentUser() user: CurrentUserData) {
    return this.usersService.getSyncStatus(user.id);
  }

  /**
   * Supabase Auth Hook: Before User Created
   * This endpoint is called by Supabase BEFORE a user is created in auth.users
   * We validate the signup AND create the user profile in public.users
   * https://supabase.com/docs/guides/auth/auth-hooks/before-user-created
   */
  @Post('webhooks/before-user-created')
  @Public() // This endpoint doesn't require authentication
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Supabase Before User Created webhook',
    description: 'Called by Supabase Auth before creating a new user. Validates signup and creates user profile in public.users.',
  })
  @ApiHeader({
    name: 'x-webhook-signature',
    description: 'Webhook signature for verification',
    required: false,
  })
  @ApiOkResponse({ 
    description: 'User creation allowed and profile created',
    schema: { type: 'object', properties: {} },
  })
  async handleBeforeUserCreated(
    @Body() payload: SupabaseBeforeUserCreatedDto,
    @Headers('x-webhook-signature') signature?: string,
  ) {
    return this.usersService.handleBeforeUserCreated(payload, signature);
  }
}

