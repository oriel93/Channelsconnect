import { IsString, IsObject, IsEmail, IsOptional, IsBoolean, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for Supabase "Before User Created" auth hook
 * https://supabase.com/docs/guides/auth/auth-hooks/before-user-created
 */

class WebhookMetadata {
  @IsString()
  uuid: string;

  @IsString()
  time: string;

  @IsString()
  name: string;

  @IsString()
  ip_address: string;
}

class UserIdentity {
  @IsString()
  id: string;

  @IsString()
  user_id: string;

  @IsObject()
  identity_data: Record<string, any>;

  @IsString()
  provider: string;

  @IsString()
  @IsOptional()
  last_sign_in_at?: string;

  @IsString()
  @IsOptional()
  created_at?: string;

  @IsString()
  @IsOptional()
  updated_at?: string;
}

class WebhookUser {
  @IsString()
  id: string;

  @IsString()
  aud: string;

  @IsString()
  role: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsObject()
  app_metadata: {
    provider: string;
    providers: string[];
  };

  @IsObject()
  user_metadata: Record<string, any>;

  @IsOptional()
  identities?: UserIdentity[];

  @IsString()
  created_at: string;

  @IsString()
  updated_at: string;

  @IsBoolean()
  is_anonymous: boolean;
}

export class SupabaseBeforeUserCreatedDto {
  @ValidateNested()
  @Type(() => WebhookMetadata)
  metadata: WebhookMetadata;

  @ValidateNested()
  @Type(() => WebhookUser)
  user: WebhookUser;
}

/**
 * Response for allowing the signup
 */
export class WebhookSuccessResponse {
  // Empty object or 204 No Content
}

/**
 * Response for rejecting the signup
 */
export class WebhookErrorResponse {
  error: {
    http_code: number;
    message: string;
  };
}
