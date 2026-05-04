# Channels Connect PMS - Codebase Structure Analysis

**Project**: Channels Connect PMS (Property Management System)
**Stack**: NestJS API + React/Vite Frontend
**Date Analyzed**: 2026-04-30

---

## 📋 TABLE OF CONTENTS

1. [Frontend Architecture](#frontend-architecture)
2. [Backend Architecture](#backend-architecture)
3. [Authentication & Authorization](#authentication--authorization)
4. [Image Management System](#image-management-system)
5. [Listings Management](#listings-management)
6. [Channex Integration](#channex-integration)
7. [Dependencies](#dependencies)
8. [Key Design Patterns](#key-design-patterns)

---

## 🎨 FRONTEND ARCHITECTURE

### Tech Stack
- **Framework**: React 18.2.0 with Vite 6.1.0
- **UI Components**: shadcn/ui (Radix UI based) + Lucide Icons
- **State Management**: React Context API (AuthContext)
- **Form Handling**: React Hook Form + Zod validation
- **Styling**: TailwindCSS 3.4.17
- **HTTP Client**: Axios with custom interceptors
- **Auth**: Supabase JWT-based authentication
- **Routing**: React Router DOM 7.2.0

### File Structure

```
app/
├── lib/
│   ├── authContext.jsx         # Auth state provider + user profile fetching
│   ├── supabase.js            # Supabase client initialization
│   ├── apiClient.js           # Axios instance with interceptors
│   └── imageUpload.js         # Image conversion & upload utilities
├── pages/
│   ├── index.jsx              # Route registry (40+ pages)
│   ├── Login.jsx              # Auth UI (sign in/up with Google OAuth)
│   ├── Listings.jsx           # Property grid display
│   └── ImageManager.jsx       # Property image upload orchestrator
├── components/
│   ├── auth/NewLoginRequired  # Auth guard wrapper
│   ├── app/AppLayout          # Dashboard layout
│   └── dashboard/CloudinaryImageManager.jsx  # Multi-image upload with conversion
└── package.json
```

### Key Pages

#### **1. Login.jsx (Lines 1-437)**
- **Purpose**: Unified sign-in/sign-up with email, password, and Google OAuth
- **Features**:
  - Form validation (email regex, password strength, match confirmation)
  - Consent checkbox for Terms of Service acceptance
  - Legal consent audit trail via `api.recordConsent()`
  - Success message with 3s redirect delay
  - Google OAuth integration with redirect URL handling
- **Auth Flow**:
  1. User submits email + password OR clicks "Continue with Google"
  2. `authHelpers.signIn()` or `authHelpers.signUp()` calls Supabase
  3. On signup: fires `api.recordConsent()` (fire-and-forget)
  4. Redirects to `/dashboard` or query param `?redirect=`

#### **2. Listings.jsx (Lines 1-136)**
- **Purpose**: Display user's properties in a responsive grid
- **Features**:
  - Fetches `Listing.find()` from API
  - Responsive grid: 2-3 columns on tablet, 4 on desktop
  - Export to CSV button
  - Link to ImportListings page
  - Badge for "Channels Connect" synced properties
  - Status badge (Active/Inactive)
  - "No properties" empty state with CTA
- **Data Model**: `Listing` entity with: `id`, `title`, `city`, `state`, `country`, `maxGuests`, `beds24RoomId`, `isActive`

#### **3. ImageManager.jsx (Lines 1-183)**
- **Purpose**: Orchestrator page for selecting property + uploading images
- **Features**:
  - Lists all user properties in dropdown
  - Auto-selects first property on mount
  - Property details card (address, type, beds, max guests)
  - Delegates to `CloudinaryImageManager` component
  - Handles loading/error states

#### **4. CloudinaryImageManager.jsx (Lines 1-437)**
- **Purpose**: Multi-image upload with OTA hi-res conversion
- **Features**:
  - **File Queue**: Drag-drop or click to select images (PNG, JPG, WebP, up to 50MB each)
  - **Conversion Pipeline**:
    - Reads image dimensions
    - Scales to OTA spec (2048-4096px on longest side, JPEG quality 92%)
    - Uses Canvas API for in-browser conversion
  - **Upload Flow**:
    - 10% progress: conversion start
    - 30% progress: conversion complete
    - 85% progress: Supabase Storage upload done
    - 100% progress: public URL retrieved
  - **Image Management**:
    - Fetch existing images sorted by `sortOrder`
    - Reorder with up/down arrows
    - Set cover photo with star icon
    - Delete with trash icon
    - First image auto-set as cover
  - **Storage**: Direct to Supabase Storage bucket `property-media`
  - **DB**: Persists to `property_images` table via `saveImageRecord()`

### Authentication Context (authContext.jsx)

```javascript
// Shape of AuthContext
{
  session,           // Supabase session object
  user,             // DB user profile from GET /users/me
  isLoadingAuth,    // Boolean during initial load
  isAdmin,          // user?.role?.toLowerCase() === 'admin'
  isAuthenticated,  // !!session
  signOut,          // Clears session + dbUser
  refreshProfile,   // Force-fetches DB profile (e.g., after role change)
}
```

**Key Design**:
- On mount: `supabase.auth.getSession()` → fetch DB profile if session exists
- Subscribe to `onAuthStateChange()` → auto-update user on SIGNED_IN/TOKEN_REFRESHED/SIGNED_OUT
- Never redirects to login on 403 (handled by apiClient interceptor)

---

## 🔧 BACKEND ARCHITECTURE

### Tech Stack
- **Framework**: NestJS 11.1.18 with TypeScript 5.1.3
- **Database ORM**: Prisma 5.22.0 (PostgreSQL)
- **HTTP**: NestJS @nestjs/axios (4.0.1) - **not raw axios**
- **Auth**: Supabase JWT validation
- **Rate Limiting**: Token bucket (in-memory)
- **External APIs**: Channex (PMS integration platform)

### Module Structure

```
api/src/
├── listings/
│   ├── listings.controller.ts      # REST endpoints
│   ├── listings.service.ts         # Business logic
│   ├── listings.module.ts          # Module definition
│   ├── entities/listing.entity.ts
│   └── dto/
│       ├── create-listing.dto.ts
│       └── update-listing.dto.ts
├── services/channex/
│   ├── channex-services.module.ts              # DI module
│   ├── channex-http.client.ts                  # HTTP transport + rate limit
│   ├── channex-whitelabel.controller.ts        # User-facing routes
│   ├── channex-onboarding.service.ts           # Property setup
│   └── channex-deep-sync.service.ts            # Full sync + webhook handling
├── auth/
│   ├── guards/supabase-auth.guard.ts           # JWT validation
│   └── decorators/
│       ├── current-user.decorator.ts
│       └── public.decorator.ts
├── prisma/
│   ├── prisma.service.ts
│   └── prisma.module.ts
└── main.ts
```

---

## 🔐 AUTHENTICATION & AUTHORIZATION

### Frontend Flow

1. **Login Page** (`/login`):
   - Email + password OR Google OAuth
   - `authHelpers.signIn()` or `authHelpers.signUp()` → Supabase
   - On signup: record consent audit trail

2. **AuthContext Initialization**:
   - Fetch Supabase session on app mount
   - Call `GET /users/me` to get DB profile (includes role)
   - Subscribe to Supabase auth state changes
   - Update user state on token refresh / sign out

3. **Route Guards**:
   - `NewLoginRequired` wrapper checks `useAuth()` context
   - Redirects unauthenticated users to `/login` if needed

### Backend Flow

1. **JWT Validation** (`SupabaseAuthGuard`):
   - Extract JWT from `Authorization: Bearer {token}` header
   - Verify signature against Supabase public key
   - Inject user ID into `@CurrentUser()` decorator

2. **Authorization Levels**:
   - **Public Routes**: `@Public()` decorator (no auth required)
   - **Authenticated Routes**: Guard checks JWT valid
   - **Admin Routes**: Check `user.role === 'admin'` in service
   - **Cross-Tenant Protection**: Service methods verify user ownership

### Role-Based Access

```typescript
// In AuthContext:
isAdmin: dbUser?.role?.toLowerCase() === 'admin'

// In Backend:
// Users can only see/edit their own listings
findAll(userId: string) {
  return this.prisma.listing.findMany({ where: { userId } });
}

// Throws ForbiddenException if user doesn't own listing
findOne(id: number, ownerUserId?: string) {
  if (ownerUserId && listing.userId !== ownerUserId) {
    throw new ForbiddenException('You do not have access to this listing');
  }
}
```

### Consent & Audit Trail

- **On Signup**: Checkbox requires ToS acceptance (frontend validation)
- **Post-Signup**: `api.recordConsent()` → `POST /users/consent` (backend audit)
- **Fire-and-Forget**: Consent recording doesn't block signup flow
- **Database**: `tosAcceptedAt` timestamp stored in `public.users`

---

## 🖼️ IMAGE MANAGEMENT SYSTEM

### Architecture

**Frontend Pipeline**:
```
User Selects Images
  ↓
Client-side Validation (mime type, 50MB limit)
  ↓
Canvas Conversion to OTA Spec (2048-4096px, JPEG 92%)
  ↓
Upload to Supabase Storage (`property-media` bucket)
  ↓
Get Public URL
  ↓
Save Metadata to `property_images` Table (via Supabase RLS)
  ↓
Display in Gallery with Reorder/Delete/CoverPhoto Controls
```

### Image Upload Utilities (imageUpload.js)

#### **convertToOtaResolution(file)**
- **Input**: File/Blob
- **Output**: Blob (JPEG)
- **Steps**:
  1. Create Image from File blob
  2. Check dimensions against OTA min (2048px) and max (4096px)
  3. Scale up/down as needed while preserving aspect ratio
  4. Draw to Canvas with `imageSmoothingQuality: 'high'`
  5. Convert to JPEG at quality 0.92
- **Error Handling**: If conversion fails, uses original file (graceful degradation)

#### **uploadImageToSupabase({ file, listingId, onProgress })**
- **Steps**:
  1. Convert to OTA resolution (progress: 10→30%)
  2. Generate storage path: `listings/{listingId}/{timestamp}_{safeName}.jpg`
  3. Upload to Supabase Storage (progress: 30→85%)
  4. Get public URL (progress: 85→100%)
- **Returns**: `{ publicUrl, storagePath }`
- **Error Handling**: Detects "Bucket not found" and suggests admin setup

#### **saveImageRecord({ listingId, filename, url, storagePath, sortOrder, isCover })**
- Inserts row into `property_images` table
- **camelCase columns** match Prisma schema: `listingId`, `userId`, `filename`, `url`, `storagePath`, `sortOrder`, `isCover`
- Auto-sets `isCover=true` if first image

#### **fetchListingImages(listingId)**
- SELECT * FROM `property_images` WHERE listingId = ? ORDER BY sortOrder ASC
- Returns array sorted by display order

#### **updateImageRecord(imageId, fields)**
- UPDATE `property_images` SET fields WHERE id = imageId
- Used for: set cover photo, reorder (update sortOrder)

#### **deleteImageRecord(imageId, storagePath)**
- DELETE from `property_images` WHERE id = imageId
- Best-effort: also deletes from Supabase Storage
- No error thrown if storage delete fails

### CloudinaryImageManager Component State

```javascript
{
  filesToUpload: [          // Queue of pending files
    {
      file,                 // File object
      id,                   // UUID
      preview,              // Object URL for thumbnail
      status,               // 'pending' | 'uploading' | 'success' | 'error'
      progress,             // 0-100
      error                 // Error message
    }
  ],
  existingImages: [         // From database
    {
      id,                   // UUID
      filename,
      url,                  // Supabase public URL
      storagePath,          // listings/{id}/{timestamp}_{name}.jpg
      sortOrder,            // Display order
      isCover,              // Boolean
      created_at            // ISO timestamp
    }
  ],
  uploadStatus,             // 'idle' | 'uploading' | 'completed'
  uploadStats,              // { total, completed, failed }
  deletingId,               // ID of image being deleted (for UI disable)
}
```

### Database Schema (Inferred)

```sql
CREATE TABLE property_images (
  id UUID PRIMARY KEY,
  listingId INTEGER NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  userId UUID NOT NULL,
  filename TEXT,
  url TEXT NOT NULL,                    -- Supabase public URL
  storagePath TEXT,                     -- listings/{id}/{timestamp}_{name}.jpg
  sortOrder INTEGER DEFAULT 0,
  isCover BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  created_date TIMESTAMP,               -- Alternative timestamp field
);
```

---

## 📍 LISTINGS MANAGEMENT

### API Endpoints

#### **Authenticated Endpoints**

```typescript
POST   /listings                    // Create listing
GET    /listings                    // Get all user listings
GET    /listings/active            // Get active listings only
GET    /listings/my-listings       // Alias for GET /listings
GET    /listings/:id               // Get single listing with related data
PATCH  /listings/:id               // Update listing
DELETE /listings/:id               // Delete listing
```

#### **Public Endpoints (Certification/Import)**

```typescript
POST   /listings/import/airbnb     // Capture from Airbnb URL (CERT_USER_ID)
POST   /listings/manual            // Create test property (CERT_USER_ID)
POST   /listings/:id/rates         // Push rate sync to Channex (CERT_USER_ID)
```

### ListingsController (Lines 1-219)

**Key Methods**:

1. **POST /listings** (line 39-46)
   - Creates new listing for authenticated user
   - Safe-defaults applied in service

2. **POST /listings/import/airbnb** (line 54-85)
   - Public, no auth required
   - Parses Airbnb URL for room ID: `/rooms/{airbnbId}`
   - Creates listing under `CERT_USER_ID = '1d63e070-dbff-48b8-ba2a-be8ba3a41ae8'`
   - Sets: `title`, `description`, `currency`, `isActive`, `airbnbListingId`, `captureUrl`, `source`
   - Returns: `{ success, data: { id, title, airbnbListingId, source }, message }`

3. **POST /listings/manual** (line 92-107)
   - Public, certification helper
   - Creates dummy property under CERT_USER_ID
   - Input: `{ title? }` (defaults to "Channex Cert Villa")

4. **POST /listings/:id/rates** (line 120-170)
   - Public, certification helper
   - Synchronously pushes rate to Channex
   - Input: `{ rate: number, date?, minStay? }`
   - Returns: `{ success, taskId, task_id, listingId, date, rate }`
   - **Error Handling**: Returns 200 (not 500) for `MappingMissingError`
     - Occurs when no Channex property linked yet
     - Message: "Channex mapping not yet created for this listing"

5. **GET /listings** (line 172-176)
   - Returns all listings for authenticated user

6. **GET /listings/active** (line 178-182)
   - Returns only active listings

7. **GET /listings/:id** (line 190-198)
   - Single listing with related data: `roomTypes`, `propertyImages`
   - Throws 403 if user doesn't own listing

8. **PATCH /listings/:id** (line 200-208)
   - Updates listing fields
   - Whitelist filters to known schema fields (189 known fields)

9. **DELETE /listings/:id** (line 210-217)
   - Soft delete actually deletes from DB
   - Cascades to `roomTypes`, `propertyImages`, etc.

### ListingsService (Lines 1-242)

**Key Features**:

1. **Safe Defaults Factory** (lines 19-57)
   - Merges DTO fields with safe defaults
   - Schema-level defaults (currency='USD', minNights=1, isActive=true, source='channex') handled by Prisma
   - Fills undefined fields: title → 'Channels Connect Property'
   - All optional fields default to `null`

2. **ensureUserExists()** (lines 70-83)
   - Creates placeholder user row if not in DB
   - **Why**: Listing has FK → users.id with onDelete: Cascade
   - Prevents foreign-key constraint violation for cert users

3. **create()** (lines 85-131)
   - Ensures user exists
   - Applies safe defaults
   - Creates listing via Prisma
   - Logs: `[Listings] Created listing id={id} title="{title}"`

4. **findAll(userId)** (lines 139-144)
   - Returns user's listings sorted by createdAt DESC
   - Multi-tenancy: never crosses users

5. **findOne(id, ownerUserId?)** (lines 158-174)
   - Includes: `roomTypes`, `propertyImages`
   - Optional ownership check (admin bypass possible)

6. **update()** (lines 179-207)
   - Ownership check (403 if not owner)
   - Whitelist filters to 28+ known schema fields
   - Strips unknown fields (security)

7. **remove()** (lines 212-222)
   - Ownership check (403 if not owner)
   - Deletes from DB (cascade deletes relations)

8. **findAllGlobal()** (lines 227-232)
   - Admin-only: all listings with user info
   - **No tenant filter** — admin use only

### Listing Entity Schema

```typescript
{
  id: number;                    // Primary key (autoincrement)
  userId: string;                // FK to users.id
  title: string;                 // Required, defaults to 'Channels Connect Property'
  description?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postalCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  propertyType?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  beds?: number | null;
  maxGuests?: number | null;
  basePrice?: number | null;
  currency: string;              // Default: 'USD'
  amenities?: string | null;
  houseRules?: string | null;
  cancellationPolicy?: string | null;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  minNights: number;             // Default: 1
  maxNights?: number | null;
  isActive: boolean;             // Default: true
  beds24PropId?: string | null;
  beds24RoomId?: string | null;
  airbnbListingId?: string | null;
  captureUrl?: string | null;    // Import source URL
  source: string;                // Default: 'channex'
  createdAt: Date;
  updatedAt: Date;
  // Relations:
  user?: User;
  roomTypes?: RoomType[];
  propertyImages?: PropertyImage[];
}
```

---

## 🔗 CHANNEX INTEGRATION

### Overview

**Channex** = Cloud PMS aggregator that syncs rates & availability to OTA channels (Airbnb, Booking.com, Expedia, etc.)

Channels Connect acts as a **whitelabel interface** to Channex. All branding is "Channels Connect" — no "Channex" in user-facing responses.

### Rate Limiting & Transport

**channex-http.client.ts** (Lines 1-300)

- **Transport**: NestJS `@nestjs/axios` (HttpService)
  - ✅ Works in ECS VPC (correct DNS resolution)
  - ❌ Raw `axios.create()` and native `fetch` both fail in this environment
  
- **Base URL**: `https://staging.channex.io/api/v1`
- **Timeout**: 15 seconds
- **Authentication**: `user-api-key: {CHANNEX_API_KEY}` header

- **Rate Limiter** (Token Bucket):
  - **Limit**: ≤ 20 ARI (Availability & Rate) updates per minute **per property**
  - **Window**: 60 seconds sliding window
  - **Behavior**: 
    - Each property has a bucket with 20 tokens
    - Tokens refill every 60 seconds
    - If bucket empty: worker pauses until window resets
    - Log: `[Rate Limit Hit] Property {id} — bucket exhausted...`

- **Retry Logic**:
  - Up to 3 attempts with exponential backoff: 500ms / 1000ms / 2000ms
  - No retry on 4xx auth/validation errors (fail fast)
  - Respects `Retry-After` header on 429 (Source 19)
  - **[CHANNEX_CERT_LOG]** task_id logging for PMS Certification

#### **Method Signatures** (inferred from code lines 123-149)

```typescript
async request<T = any>(
  method: string,           // 'GET', 'POST', 'PUT', etc.
  path: string,             // '/ari/bulk_update', '/properties', etc.
  apiKey: string,           // CHANNEX_API_KEY
  body?: object,            // POST body
  attempt?: number          // Retry counter (1, 2, 3)
): Promise<T>

private async acquireToken(propertyId: string): Promise<void>
// Blocks until rate-limit token available for this property

private buildHeaders(apiKey: string): Record<string, string>
// Returns { 'Content-Type': 'application/json', 'user-api-key': apiKey }

private extractPropertyId(path: string, body?: object): string
// Extracts Channex property ID from URL or body for per-property rate limiting
```

### Whitelabel Controller (channex-whitelabel.controller.ts)

**Route Prefix**: `/connect` (all routes scoped under `/connect/*`)

All routes are user-facing and require authentication (except OAuth callback).

#### **Onboarding**

```typescript
POST /connect/onboard
// Input:
{
  propertyTitle?: string,
  currency?: string,
  email?: string,
  country?: string,
  city?: string,
  address?: string,
  zipCode?: string,
  timezone?: string,
}

// Output:
{
  success: true,
  message: "Property connected successfully to Channels Connect.",
  data: {
    id: listingId,                      // Frontend checks this first
    listingId: number,
    channexPropertyId: string,
  }
}
```

#### **Status**

```typescript
GET /connect/status
// Output:
{
  success: true,
  data: {
    hasProperty: boolean,               // User has a property created
    hasChannel: boolean,                // Channel (Airbnb/Booking) connected
    syncStatus: string | null,          // 'pending' | 'syncing' | 'complete' | null
    channexPropertyId: string | null,   // Channex side property ID
    listingId: number | null,           // Our side listing ID
  }
}

// Public fallback: returns all false/null if not authenticated
```

#### **OAuth Bridge**

```typescript
GET /connect/oauth-link
  ?channel=airbnb (default) | booking_com
// Output:
{
  success: true,
  data: {
    link: string,                       // Branded OTA OAuth URL
  }
}

// This redirects to Channex which redirects back to:
GET /connect/oauth-callback
  ?state={state}
  &code={code}
  &returnUrl={optional_url}
  
// Response: HTML page with postMessage to opener (popup flow) OR redirect (full-page flow)
```

#### **Deep Sync**

```typescript
POST /connect/sync
// Initiates full sync: fetch all OTA listings, pull rates/avail, push to Channex

GET /connect/sync/:id/progress
// Poll sync progress: { progress: 0-100, status: 'pending|syncing|complete', errors: [] }
```

#### **PMS Certification Endpoints**

```typescript
POST /connect/booking/:id/ack
// Cert #11: Acknowledge a booking in the OTA channel

POST /connect/ari/full
// Cert: Push 500-day availability + rates (2 separate API calls)

POST /connect/ari/update
// Cert: Single or multi-date availability/rate update
```

### Services Module

**channex-services.module.ts**

```typescript
@Module({
  imports: [HttpModule, PrismaModule],
  controllers: [ChannexWhitelabelController],
  providers: [
    ChannexHttpClient,           // HTTP transport + rate limiting
    ChannexOnboardingService,    // Property setup & OAuth
    ChannexDeepSyncService,      // Full sync + webhook handling
    PrismaService,
  ],
  exports: [ChannexHttpClient, ChannexOnboardingService, ChannexDeepSyncService],
})
export class ChannexServicesModule {}
```

### Key Services (Not Fully Detailed)

1. **ChannexHttpClient**
   - Core HTTP transport with rate limiting & retry

2. **ChannexOnboardingService** (30KB)
   - Handles: property creation, OAuth link generation, state/code exchange
   - Keeps user and Channex states in sync

3. **ChannexDeepSyncService** (30KB)
   - Fetches all OTA listings from Channex
   - Syncs rates & availability from OTA → Channels Connect DB
   - Handles webhook notifications from Channex

---

## 📦 DEPENDENCIES

### Backend (api/package.json)

**Key Dependencies**:
```json
{
  "@nestjs/common": "^11.1.18",
  "@nestjs/axios": "^4.0.1",        // HTTP client (REQUIRED for ECS)
  "@nestjs/config": "^4.0.2",
  "@nestjs/core": "^11.1.18",
  "@nestjs/event-emitter": "^3.0.1",
  "@nestjs/schedule": "^6.1.1",
  "@nestjs/swagger": "^11.2.7",
  "@prisma/client": "^5.22.0",      // ORM
  "@supabase/supabase-js": "^2.38.0",
  "axios": "^1.15.0",               // Used directly in some legacy places
  "class-validator": "^0.14.0",
  "jose": "^6.1.3",                 // JWT validation
  "sharp": "^0.34.5",               // Image processing (server-side)
  "sst": "^4.7.2",                  // AWS CDK abstraction
}
```

**Dev Dependencies**: Jest, TypeScript, ESLint, Prettier, ts-node

### Frontend (app/package.json)

**Key Dependencies**:
```json
{
  "@supabase/supabase-js": "^2.103.0",
  "@radix-ui/react-*": "^1.x",       // 20+ Radix UI components
  "axios": "^1.12.2",
  "react": "^18.2.0",
  "react-router-dom": "^7.2.0",
  "react-hook-form": "^7.54.2",
  "recharts": "^2.15.1",             // Charts
  "lucide-react": "^0.475.0",        // Icons
  "sonner": "^2.0.1",                // Toast notifications
  "tailwindcss": "^3.4.17",
  "zod": "^3.24.2",                  // Schema validation
  "vite": "^6.1.0",
}
```

**Dev Dependencies**: ESLint, TypeScript, Tailwind, PostCSS, Autoprefixer

---

## 🎯 KEY DESIGN PATTERNS

### 1. **Multi-Tenancy**

- Every listing, image, and user relation is scoped by `userId`
- Service methods filter by `userId` in WHERE clauses
- **No cross-tenant data leakage** — verified at service layer
- Admin endpoints check `role === 'admin'` before allowing unfiltered queries

### 2. **Safe Defaults for Certification**

```typescript
// Cert endpoints accept sparse DTOs and apply safe defaults:
const listing = await listingsService.create(CERT_USER_ID, {
  title: 'From Airbnb URL',  // Only title provided
  // Everything else gets safe defaults:
  // currency: 'USD'
  // minNights: 1
  // isActive: true
  // source: 'channex'
  // All optional fields: null
});
```

**Why**: Certification requires quick property setup without full data.

### 3. **Fire-and-Forget Consent Recording**

```typescript
// In Login.jsx:
try {
  if (data.session) {
    await api.recordConsent();  // Fire-and-forget
  }
} catch (consentErr) {
  console.warn('[Consent] Could not record immediately:', consentErr?.message);
  // Don't block signup — consent might be recorded later
}
```

**Why**: Improves UX — signup doesn't wait for database write.

### 4. **Canvas-Based Image Conversion**

```typescript
// In imageUpload.js:
const canvas = document.createElement('canvas');
canvas.width = width;   // Scaled to OTA spec
canvas.height = height;
const ctx = canvas.getContext('2d');
ctx.imageSmoothingQuality = 'high';
ctx.drawImage(img, 0, 0, width, height);
canvas.toBlob((blob) => { /* upload blob */ }, 'image/jpeg', 0.92);
```

**Why**:
- Converts on client (reduces server load)
- Meets OTA channel specs (2048-4096px, JPEG 92%)
- Gracefully falls back to original if conversion fails

### 5. **Token-Bucket Rate Limiting**

```typescript
// In channex-http.client.ts:
const bucket = { tokens: 20, windowStart: now };  // Refills every 60s
if (bucket.tokens > 0) {
  bucket.tokens--;  // Consume token
} else {
  await this.sleep(RATE_LIMIT_WINDOW_MS - elapsed);  // Wait for reset
}
```

**Why**: Prevents hitting Channex API limit (≤20 updates/min/property).

### 6. **Ownership Verification Before DB Write**

```typescript
// In listings.service.ts:
async update(id: number, updateListingDto, ownerUserId?: string) {
  if (ownerUserId) {
    const existing = await this.prisma.listing.findUnique({ where: { id } });
    if (existing.userId !== ownerUserId) {
      throw new ForbiddenException('You do not have permission to update this listing');
    }
  }
  // Only then proceed with update
}
```

**Why**: Prevent TOCTOU (Time-of-Check-Time-of-Use) vulnerability.

### 7. **Graceful Error Responses in Certification**

```typescript
// In listings.controller.ts POST /listings/:id/rates:
if (err instanceof MappingMissingError) {
  return {
    success: false,
    taskId: null,
    error: 'Channex mapping not yet created for this listing.',
    hint: 'Use POST /connect/sync after connecting your Airbnb channel.',
  };  // Returns 200, not 500
}
throw err;  // Other errors → 500
```

**Why**: Certification dashboard distinguishes between "not synced yet" (200) and "actual error" (500).

### 8. **Whitelist-Based Field Filtering**

```typescript
// In listings.service.ts update():
const schemaFields = new Set([
  'title', 'description', 'address', ..., 'source'
]);
const filteredData = Object.fromEntries(
  Object.entries(updateListingDto).filter(([key]) => schemaFields.has(key))
);
```

**Why**: Prevents injection of unknown columns (e.g., someone trying to set `userId` directly).

---

## 🚀 DEPLOYMENT & RUNTIME

### Environment Variables (Inferred)

**Backend**:
- `CHANNEX_API_KEY` — API key for Channex staging
- `DATABASE_URL` — PostgreSQL connection
- `SUPABASE_URL` — Supabase instance URL
- `SUPABASE_KEY` — Supabase public/anon key
- Database connection pooling (Prisma)

**Frontend**:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_API_BASE_URL` — Backend API endpoint

### Build Commands

**Backend**:
```bash
npm run build        # Compiles TypeScript → dist/
npm start            # Runs server
npm run start:dev    # Watch mode
npm test             # Jest suite
npm run generate:swagger  # OpenAPI docs
```

**Frontend**:
```bash
npm run dev          # Vite dev server
npm run build        # Vite production build
npm run lint         # ESLint check
npm run generate-api-types  # Generate TS types from OpenAPI
```

---

## 📊 DATA FLOW SUMMARY

### User Registration & Login

```
User fills form (Login.jsx)
  ↓
Clicks "Sign In" or "Sign Up"
  ↓
authHelpers.signIn/signUp (Supabase)
  ↓
[On Success] Supabase issues JWT
  ↓
AuthContext subscribes to onAuthStateChange
  ↓
Calls GET /users/me (authenticated)
  ↓
Fetches DB profile (role, tosAcceptedAt, etc.)
  ↓
useAuth() hook now has: session, user, isAdmin, isAuthenticated
  ↓
[On Signup] Calls api.recordConsent() (fire-and-forget)
  ↓
Redirects to /dashboard (or ?redirect= param)
```

### Image Upload & Management

```
User navigates to /ImageManager
  ↓
Fetches Listing.find() (all user properties)
  ↓
Selects property from dropdown
  ↓
CloudinaryImageManager mounts with listingId
  ↓
Fetches existing images from DB
  ↓
User selects image(s) via drag-drop or click
  ↓
Converts in-browser: Canvas → OTA spec (2048-4096px, JPEG 92%)
  ↓
Uploads blob to Supabase Storage (`property-media` bucket)
  ↓
Gets public URL
  ↓
Saves metadata to property_images table
  ↓
Refreshes gallery display
  ↓
User can reorder, set cover, or delete
```

### Property Listing

```
User navigates to /Listings
  ↓
Calls Listing.find() → GET /listings (authenticated)
  ↓
Service filters by user.id
  ↓
Includes relations: roomTypes, propertyImages
  ↓
Frontend renders responsive grid
  ↓
Each card shows: image, title, location, guest count, status badge
  ↓
Click card → navigates to ListingDetail page
```

### Channex Integration (Onboarding)

```
User clicks "Connect Channel"
  ↓
Frontend calls GET /connect/oauth-link
  ↓
Backend generates Channex OAuth URL with state
  ↓
Redirects to Channex (Airbnb/Booking OAuth page)
  ↓
User authorizes channel access
  ↓
Channex redirects to GET /connect/oauth-callback with code
  ↓
Backend exchanges code for access token (via ChannexOnboardingService)
  ↓
Creates Channex property (property-id) and maps to listing
  ↓
Returns success → frontend redirects to dashboard
  ↓
User can now push rates via POST /connect/ari/update
```

---

## 🔍 NOTABLE CODE LOCATIONS

| Feature | File | Lines |
|---------|------|-------|
| Auth Context | authContext.jsx | 1-95 |
| Login Page | Login.jsx | 1-437 |
| Listings Grid | Listings.jsx | 1-136 |
| Image Manager Page | ImageManager.jsx | 1-183 |
| Image Upload UI | CloudinaryImageManager.jsx | 1-437 |
| Image Upload Utils | imageUpload.js | 1-218 |
| Listings Controller | listings.controller.ts | 1-219 |
| Listings Service | listings.service.ts | 1-242 |
| Channex HTTP Client | channex-http.client.ts | 1-300+ |
| Channex Routes | channex-whitelabel.controller.ts | 1-300+ |
| Channex Services Module | channex-services.module.ts | 1-17 |

---

## ✅ CODEBASE HEALTH OBSERVATIONS

### Strengths
✅ Multi-tenancy properly enforced at service layer
✅ Safe defaults applied to certification endpoints
✅ Rate limiting prevents Channex API abuse
✅ Image conversion on client reduces server load
✅ JWT validation on every protected route
✅ Graceful error handling for certification workflows
✅ Comprehensive logging with [Tag] prefixes
✅ Modular NestJS structure (separate services module)

### Areas for Enhancement
⚠️ `CERT_USER_ID` hardcoded (could move to env var)
⚠️ Error messages could be more granular (e.g., distinguish "user not found" from "DB error")
⚠️ Image deletion is "best-effort" on storage side (could have orphaned files)
⚠️ No request logging middleware (could add for audit trail)
⚠️ Rate limiter is in-memory (resets on server restart)

---

## 📚 SCHEMA ENTITIES (Inferred from Code)

### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE,
  name TEXT,
  role TEXT DEFAULT 'user',        -- 'user' | 'admin'
  tosAcceptedAt TIMESTAMP,          -- Consent audit trail
  created_at TIMESTAMP DEFAULT NOW(),
);
```

### Listings Table
```sql
CREATE TABLE listings (
  id SERIAL PRIMARY KEY,
  userId UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Channels Connect Property',
  description TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT,
  postalCode TEXT,
  latitude DECIMAL,
  longitude DECIMAL,
  propertyType TEXT,
  bedrooms INTEGER,
  bathrooms INTEGER,
  beds INTEGER,
  maxGuests INTEGER,
  basePrice DECIMAL,
  currency TEXT DEFAULT 'USD',
  amenities TEXT,
  houseRules TEXT,
  cancellationPolicy TEXT,
  checkInTime TEXT,
  checkOutTime TEXT,
  minNights INTEGER DEFAULT 1,
  maxNights INTEGER,
  isActive BOOLEAN DEFAULT TRUE,
  beds24PropId TEXT,
  beds24RoomId TEXT,
  airbnbListingId TEXT,
  captureUrl TEXT,                 -- Import source URL
  source TEXT DEFAULT 'channex',
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW(),
);
```

### PropertyImages Table
```sql
CREATE TABLE property_images (
  id UUID PRIMARY KEY,
  listingId INTEGER NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  userId UUID NOT NULL,
  filename TEXT,
  url TEXT NOT NULL,                -- Supabase public URL
  storagePath TEXT,                 -- listings/{id}/{timestamp}_{name}.jpg
  sortOrder INTEGER DEFAULT 0,
  isCover BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  created_date TIMESTAMP,
);
```

### Channex Mapping (Inferred)
```sql
-- Likely table: channex_property_mappings
CREATE TABLE channex_properties (
  id SERIAL PRIMARY KEY,
  listingId INTEGER NOT NULL REFERENCES listings(id),
  userId UUID NOT NULL REFERENCES users(id),
  channexPropertyId TEXT UNIQUE,    -- From Channex API
  channexChannel TEXT,              -- 'airbnb' | 'booking_com'
  oauthToken TEXT,                  -- Encrypted OTA access token
  syncStatus TEXT,                  -- 'pending' | 'syncing' | 'complete'
  lastSyncAt TIMESTAMP,
  createdAt TIMESTAMP DEFAULT NOW(),
);
```

---

**End of Codebase Analysis**
Generated: 2026-04-30
