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
} from '@nestjs/common';
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

    const dbUser = await this.usersService.findOne(user.id);

    if (!dbUser) {
      throw new UnauthorizedException(`User not found in database: ${user.id}`);
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

