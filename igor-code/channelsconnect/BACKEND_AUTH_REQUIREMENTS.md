# Backend Authentication Requirements

## Current Architecture Analysis

### What's Currently "Mocked Up" on Frontend (Direct Supabase Calls)

The frontend currently makes **7 direct authentication calls** to Supabase without going through your backend API:

#### 1. **User Signup** (`authHelpers.signUp`)
```javascript
// app/lib/supabase.js
await supabase.auth.signUp({ email, password, options: { data: additionalData } })
```
- ❌ **No backend validation**
- ❌ **No user syncing to your database**
- ❌ **No post-signup workflows**
- ❌ **No audit logging**

#### 2. **User Login** (`authHelpers.signIn`)
```javascript
await supabase.auth.signInWithPassword({ email, password })
```
- ❌ **No backend login tracking**
- ❌ **No user sync on login**
- ❌ **No rate limiting**
- ❌ **No audit logging**

#### 3. **Google OAuth** (`authHelpers.signInWithGoogle`)
```javascript
await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } })
```
- ❌ **No backend callback handler**
- ❌ **No user creation in your database**
- ❌ **No OAuth event logging**

#### 4. **Password Reset Request** (`authHelpers.resetPasswordRequest`)
```javascript
await supabase.auth.resetPasswordForEmail(email, { redirectTo })
```
- ❌ **No backend validation**
- ❌ **No rate limiting**
- ❌ **No audit logging**
- ❌ **No custom email handling**

#### 5. **Password Reset** (`authHelpers.resetPassword`)
```javascript
await supabase.auth.updateUser({ password: newPassword })
```
- ❌ **No backend validation**
- ❌ **No password change logging**
- ❌ **No notification to user**

#### 6. **Get Current User** (`authHelpers.getUser`)
```javascript
await supabase.auth.getUser()
```
- ⚠️ **Partially handled** - Frontend calls `/users/me` afterward
- ⚠️ **Two separate calls** instead of one

#### 7. **Sign Out** (`authHelpers.signOut`)
```javascript
await supabase.auth.signOut()
```
- ❌ **No backend logout tracking**
- ❌ **No session cleanup**
- ❌ **No audit logging**

---

## What Backend Currently Has

### ✅ Existing Backend Auth Infrastructure

#### 1. **SupabaseService** (`api/src/auth/supabase.service.ts`)
```typescript
- verifyToken(token: string) // Validates JWT tokens
- getClient() // Returns Supabase client
```

#### 2. **SupabaseAuthGuard** (`api/src/auth/guards/supabase-auth.guard.ts`)
```typescript
- Validates Authorization header
- Extracts JWT token
- Verifies token with Supabase
- Attaches user to request object
```

#### 3. **UsersService** (`api/src/users/users.service.ts`)
```typescript
- findOrCreate(supabaseId, email, name) // Syncs users
- findBySupabaseId(supabaseId)
- findByEmail(email)
- update(id, updateUserDto)
```

#### 4. **UsersController** (`api/src/users/users.controller.ts`)
```typescript
GET /users/me // Returns current user (calls findOrCreate)
```

### ⚠️ What's Missing from Backend

#### Missing Auth Endpoints:
- ❌ `POST /auth/signup` - Signup endpoint
- ❌ `POST /auth/login` - Login endpoint
- ❌ `POST /auth/google` - Google OAuth callback
- ❌ `POST /auth/forgot-password` - Password reset request
- ❌ `POST /auth/reset-password` - Password reset
- ❌ `POST /auth/logout` - Logout endpoint
- ❌ `GET /auth/me` - Get current user (unified)
- ❌ `POST /auth/refresh` - Token refresh

---

## Recommended Backend Implementation

### Phase 1: Essential Auth Endpoints (High Priority)

#### 1. **Auth Controller** (`api/src/auth/auth.controller.ts`)

```typescript
import { Controller, Post, Body, Get, Req } from '@nestjs/common';
import { ApiTags, ApiOkResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { AuthService } from './auth.service';

@Controller('auth')
@ApiTags('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('signup')
  @ApiOkResponse({ description: 'User registered successfully' })
  async signup(@Body() signupDto: SignupDto) {
    return this.authService.signup(signupDto);
  }

  @Public()
  @Post('login')
  @ApiOkResponse({ description: 'User logged in successfully' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Public()
  @Post('google/callback')
  @ApiOkResponse({ description: 'Google OAuth completed' })
  async googleCallback(@Body() googleDto: GoogleCallbackDto) {
    return this.authService.handleGoogleCallback(googleDto);
  }

  @Public()
  @Post('forgot-password')
  @ApiOkResponse({ description: 'Password reset email sent' })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Public()
  @Post('reset-password')
  @ApiOkResponse({ description: 'Password reset successfully' })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @Post('logout')
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'User logged out successfully' })
  async logout(@CurrentUser() user: CurrentUserData) {
    return this.authService.logout(user);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'Current user info' })
  async getMe(@CurrentUser() user: CurrentUserData) {
    return this.authService.getMe(user);
  }

  @Post('refresh')
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'Token refreshed' })
  async refresh(@Req() request) {
    return this.authService.refreshToken(request);
  }
}
```

#### 2. **Auth Service** (`api/src/auth/auth.service.ts`)

```typescript
import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { SupabaseService } from './supabase.service';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private supabase: SupabaseService,
    private users: UsersService,
    private prisma: PrismaService,
  ) {}

  async signup(dto: SignupDto) {
    // 1. Create user in Supabase
    const { data, error } = await this.supabase
      .getClient()
      .auth.signUp({
        email: dto.email,
        password: dto.password,
        options: {
          data: {
            full_name: dto.fullName,
          },
        },
      });

    if (error) {
      throw new BadRequestException(error.message);
    }

    // 2. Create user in your database
    if (data.user) {
      await this.users.findOrCreate(
        data.user.id,
        data.user.email,
        dto.fullName,
      );

      // 3. Log signup event
      await this.logAuthEvent('signup', data.user.id, dto.email);
    }

    return {
      success: true,
      message: 'Please check your email to verify your account',
      user: data.user,
    };
  }

  async login(dto: LoginDto) {
    // 1. Authenticate with Supabase
    const { data, error } = await this.supabase
      .getClient()
      .auth.signInWithPassword({
        email: dto.email,
        password: dto.password,
      });

    if (error) {
      throw new UnauthorizedException(error.message);
    }

    // 2. Sync user to database
    if (data.user) {
      await this.users.findOrCreate(
        data.user.id,
        data.user.email,
        data.user.user_metadata?.full_name,
      );

      // 3. Log login event
      await this.logAuthEvent('login', data.user.id, dto.email);
    }

    return {
      success: true,
      user: data.user,
      session: data.session,
    };
  }

  async handleGoogleCallback(dto: GoogleCallbackDto) {
    // 1. Verify OAuth token
    const { data, error } = await this.supabase
      .getClient()
      .auth.getUser(dto.accessToken);

    if (error || !data.user) {
      throw new UnauthorizedException('Invalid OAuth token');
    }

    // 2. Create/update user in database
    await this.users.findOrCreate(
      data.user.id,
      data.user.email,
      data.user.user_metadata?.full_name || data.user.user_metadata?.name,
    );

    // 3. Log OAuth event
    await this.logAuthEvent('oauth_google', data.user.id, data.user.email);

    return {
      success: true,
      user: data.user,
    };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    // 1. Validate email exists
    const user = await this.users.findByEmail(dto.email);
    
    // Don't reveal if email exists (security best practice)
    // But log the attempt
    if (user) {
      await this.logAuthEvent('password_reset_request', user.supabaseId, dto.email);
    }

    // 2. Request password reset from Supabase
    const { error } = await this.supabase
      .getClient()
      .auth.resetPasswordForEmail(dto.email, {
        redirectTo: dto.redirectTo || `${process.env.FRONTEND_URL}/reset-password`,
      });

    if (error) {
      throw new BadRequestException(error.message);
    }

    return {
      success: true,
      message: 'If the email exists, a password reset link has been sent',
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    // 1. Update password in Supabase
    const { data, error } = await this.supabase
      .getClient()
      .auth.updateUser({
        password: dto.newPassword,
      });

    if (error) {
      throw new BadRequestException(error.message);
    }

    // 2. Log password change
    if (data.user) {
      await this.logAuthEvent('password_reset_complete', data.user.id, data.user.email);
    }

    return {
      success: true,
      message: 'Password updated successfully',
    };
  }

  async logout(user: CurrentUserData) {
    // 1. Log logout event
    await this.logAuthEvent('logout', user.supabaseId, user.email);

    // 2. Invalidate session in Supabase
    // Note: JWT token will still be valid until expiry
    // Consider implementing token blacklist if needed

    return {
      success: true,
      message: 'Logged out successfully',
    };
  }

  async getMe(user: CurrentUserData) {
    // Get full user data from database
    const dbUser = await this.users.findOrCreate(
      user.supabaseId,
      user.email,
    );

    return dbUser;
  }

  async refreshToken(request: any) {
    // Extract refresh token and get new access token
    const refreshToken = request.body.refreshToken;

    const { data, error } = await this.supabase
      .getClient()
      .auth.refreshSession({ refresh_token: refreshToken });

    if (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return {
      success: true,
      session: data.session,
    };
  }

  private async logAuthEvent(action: string, userId: string, email: string) {
    // Log to your audit log table
    await this.prisma.calendarAuditLog.create({
      data: {
        userId,
        action,
        entityType: 'auth',
        entityId: 0, // Auth events don't have entity ID
        changes: {
          email,
          timestamp: new Date(),
        },
      },
    });
  }
}
```

#### 3. **DTOs** (Data Transfer Objects)

```typescript
// api/src/auth/dto/signup.dto.ts
export class SignupDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  @IsOptional()
  fullName?: string;
}

// api/src/auth/dto/login.dto.ts
export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}

// api/src/auth/dto/forgot-password.dto.ts
export class ForgotPasswordDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsOptional()
  redirectTo?: string;
}

// api/src/auth/dto/reset-password.dto.ts
export class ResetPasswordDto {
  @IsString()
  @MinLength(6)
  newPassword: string;
}

// api/src/auth/dto/google-callback.dto.ts
export class GoogleCallbackDto {
  @IsString()
  accessToken: string;
}
```

---

## Phase 2: Enhanced Features (Medium Priority)

### 1. **Rate Limiting**
```typescript
// Add rate limiting to auth endpoints
import { Throttle } from '@nestjs/throttler';

@Throttle(5, 60) // 5 requests per minute
@Post('login')
async login(@Body() loginDto: LoginDto) {
  // ...
}
```

### 2. **Email Verification Tracking**
```typescript
async verifyEmail(token: string) {
  // Track email verification
  const { data, error } = await this.supabase
    .getClient()
    .auth.verifyOtp({ token, type: 'email' });
    
  if (data.user) {
    await this.users.update(data.user.id, { emailVerified: true });
  }
}
```

### 3. **Login History**
```typescript
// Add login history table to track user logins
model LoginHistory {
  id         Int      @id @default(autoincrement())
  userId     String
  ipAddress  String?
  userAgent  String?
  loginAt    DateTime @default(now())
  success    Boolean  @default(true)
  
  user User @relation(fields: [userId], references: [id])
  
  @@map("login_history")
}
```

### 4. **Session Management**
```typescript
// Track active sessions
model UserSession {
  id           String   @id @default(uuid())
  userId       String
  accessToken  String   @unique
  refreshToken String?
  expiresAt    DateTime
  createdAt    DateTime @default(now())
  lastActiveAt DateTime @default(now())
  
  user User @relation(fields: [userId], references: [id])
  
  @@map("user_sessions")
}
```

---

## Phase 3: Advanced Features (Lower Priority)

### 1. **Two-Factor Authentication (2FA)**
```typescript
@Post('2fa/enable')
async enable2FA(@CurrentUser() user: CurrentUserData) {
  // Generate TOTP secret
  // Return QR code
}

@Post('2fa/verify')
async verify2FA(@Body() dto: Verify2FADto) {
  // Verify TOTP code
}
```

### 2. **OAuth Provider Management**
```typescript
@Get('providers')
async getConnectedProviders(@CurrentUser() user: CurrentUserData) {
  // List connected OAuth providers (Google, GitHub, etc.)
}

@Post('providers/:provider/connect')
async connectProvider(@Param('provider') provider: string) {
  // Connect additional OAuth provider
}
```

### 3. **Password Policies**
```typescript
// Enforce password complexity
class PasswordValidator {
  validate(password: string): boolean {
    // Min 8 characters
    // At least 1 uppercase
    // At least 1 number
    // At least 1 special character
  }
}
```

### 4. **Account Security Events**
```typescript
@Get('security/events')
async getSecurityEvents(@CurrentUser() user: CurrentUserData) {
  // List login attempts, password changes, etc.
}

@Post('security/suspicious-activity')
async reportSuspiciousActivity(@Body() dto: ReportActivityDto) {
  // Handle suspicious activity reports
}
```

---

## Frontend Updates Required

### Update API Client (`app/lib/apiClient.js`)

Add auth endpoints:
```javascript
export const api = {
  auth: {
    signup: (data) => apiClient.post('/auth/signup', data),
    login: (data) => apiClient.post('/auth/login', data),
    googleCallback: (data) => apiClient.post('/auth/google/callback', data),
    forgotPassword: (data) => apiClient.post('/auth/forgot-password', data),
    resetPassword: (data) => apiClient.post('/auth/reset-password', data),
    logout: () => apiClient.post('/auth/logout'),
    me: () => apiClient.get('/auth/me'),
    refresh: (refreshToken) => apiClient.post('/auth/refresh', { refreshToken }),
  },
  // ... existing endpoints
};
```

### Update Auth Helpers (`app/lib/supabase.js`)

Change from direct Supabase calls to backend API calls:
```javascript
export const authHelpers = {
  async signUp(email, password, additionalData = {}) {
    // Option 1: Keep Supabase direct (current)
    const { data, error } = await supabase.auth.signUp({...});
    
    // Option 2: Use backend API (recommended)
    const response = await api.auth.signup({
      email,
      password,
      fullName: additionalData.full_name,
    });
    
    return response;
  },
  
  async signIn(email, password) {
    // Use backend API
    const response = await api.auth.login({ email, password });
    return response;
  },
  
  async resetPasswordRequest(email) {
    // Use backend API
    const response = await api.auth.forgotPassword({ email });
    return response;
  },
  
  // ... other methods
};
```

---

## Migration Strategy

### Option A: Gradual Migration (Recommended)
1. ✅ Keep frontend using Supabase directly
2. ✅ Add backend auth endpoints
3. ✅ Update frontend to use backend endpoints one by one
4. ✅ Monitor and test each change
5. ✅ Eventually phase out direct Supabase calls

### Option B: Big Bang Migration
1. ❌ Create all backend endpoints at once
2. ❌ Update all frontend calls at once
3. ❌ Higher risk, harder to debug
4. ❌ Not recommended

---

## Summary

### Current State
- **7 auth operations** happen directly between frontend and Supabase
- Backend only validates JWT tokens
- No centralized auth logging
- No user sync on auth events
- No rate limiting on auth endpoints

### Recommended Implementation

#### High Priority (Phase 1):
1. **AuthService** - Central auth logic
2. **AuthController** - 8 new endpoints
3. **Update frontend** - Use backend API instead of direct Supabase
4. **Audit logging** - Track all auth events

#### Medium Priority (Phase 2):
5. **Rate limiting** - Prevent brute force
6. **Login history** - Track user logins
7. **Session management** - Active session tracking
8. **Email verification tracking** - Better user management

#### Lower Priority (Phase 3):
9. **2FA** - Enhanced security
10. **Password policies** - Enforce complexity
11. **Multiple OAuth providers** - GitHub, Microsoft, etc.
12. **Security dashboard** - User-facing security info

### Benefits of Backend Implementation

✅ **Centralized Control** - All auth logic in one place  
✅ **Better Logging** - Audit trail for compliance  
✅ **Rate Limiting** - Prevent abuse  
✅ **Data Consistency** - Auto-sync users to database  
✅ **Business Logic** - Add custom workflows  
✅ **Better Error Handling** - Consistent error responses  
✅ **Monitoring** - Track auth metrics  
✅ **Security** - Additional validation layer  

---

## Files to Create/Modify

### Backend Files to Create:
```
api/src/auth/
├── auth.controller.ts     ✨ NEW
├── auth.service.ts        ✨ NEW
├── dto/
│   ├── signup.dto.ts      ✨ NEW
│   ├── login.dto.ts       ✨ NEW
│   ├── forgot-password.dto.ts ✨ NEW
│   ├── reset-password.dto.ts  ✨ NEW
│   └── google-callback.dto.ts ✨ NEW
```

### Backend Files to Modify:
```
api/src/auth/
├── auth.module.ts         🔧 MODIFY (add AuthController, AuthService)
├── supabase.service.ts    🔧 MODIFY (add helper methods)
```

### Frontend Files to Modify:
```
app/lib/
├── apiClient.js          🔧 MODIFY (add auth endpoints)
├── supabase.js           🔧 MODIFY (use backend API)
```

### Database Schema to Add:
```sql
-- Login history
CREATE TABLE login_history (...)

-- User sessions  
CREATE TABLE user_sessions (...)

-- Update users table
ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN last_login_at TIMESTAMP;
```

---

**Recommendation:** Start with Phase 1 (high priority items) and implement gradually while keeping existing direct Supabase calls as fallback. This ensures zero downtime and easy rollback if issues arise.

