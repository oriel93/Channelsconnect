# Channels Connect PMS — Quick Reference Guide

## 🗂️ Directory Structure

```
channelsconnect/
├── api/                           # NestJS Backend
│   ├── src/
│   │   ├── listings/             # Property CRUD
│   │   │   ├── listings.controller.ts
│   │   │   ├── listings.service.ts
│   │   │   ├── dto/              # Data transfer objects
│   │   │   └── entities/
│   │   ├── services/channex/     # Channex PMS integration
│   │   │   ├── channex-http.client.ts          # HTTP + rate limiting
│   │   │   ├── channex-whitelabel.controller.ts # User-facing routes
│   │   │   ├── channex-onboarding.service.ts
│   │   │   ├── channex-deep-sync.service.ts
│   │   │   └── channex-services.module.ts
│   │   ├── auth/                 # JWT validation
│   │   │   ├── guards/supabase-auth.guard.ts
│   │   │   └── decorators/
│   │   ├── prisma/               # ORM
│   │   └── main.ts
│   ├── package.json              # NestJS + Prisma + Axios
│   └── README.md
├── app/                          # React/Vite Frontend
│   ├── lib/
│   │   ├── authContext.jsx       # Auth state provider
│   │   ├── apiClient.js          # Axios instance
│   │   ├── imageUpload.js        # Image conversion (Canvas)
│   │   └── supabase.js           # Supabase client
│   ├── pages/
│   │   ├── index.jsx             # Route registry
│   │   ├── Login.jsx             # Sign in/up page
│   │   ├── Listings.jsx          # Property grid
│   │   └── ImageManager.jsx      # Image upload page
│   ├── components/
│   │   ├── auth/NewLoginRequired.jsx    # Auth guard
│   │   ├── app/AppLayout.jsx            # Dashboard layout
│   │   └── dashboard/CloudinaryImageManager.jsx  # Upload component
│   ├── package.json              # React + Vite + Tailwind
│   └── vite.config.js
└── CODEBASE_ANALYSIS.md          # This document (detailed)
```

---

## 🔑 Key Technologies

| Layer | Tech Stack |
|-------|-----------|
| **Frontend** | React 18 + Vite + TailwindCSS + Radix UI |
| **Backend** | NestJS 11 + TypeScript + Prisma ORM |
| **Database** | PostgreSQL (via Prisma) |
| **Storage** | Supabase Storage (property images) |
| **Auth** | Supabase + JWT |
| **External API** | Channex (PMS aggregator) |
| **Image Processing** | Canvas API (client-side) |

---

## 👤 Authentication Flow

### Frontend
```
Login Page
  ↓
Email/Password OR Google OAuth
  ↓
authHelpers.signIn/signUp (Supabase)
  ↓
AuthContext fetches GET /users/me
  ↓
useAuth() hook provides: { session, user, isAdmin, isAuthenticated }
```

### Backend
```
HTTP Request
  ↓
@Guard SupabaseAuthGuard
  ↓
Verify JWT signature
  ↓
@CurrentUser() decorator injects userId
  ↓
Service layer filters by userId (multi-tenancy)
```

---

## 📍 Main API Endpoints

### Listings CRUD
```
GET    /listings              # All user properties
GET    /listings/:id          # Single property with images
POST   /listings              # Create property
PATCH  /listings/:id          # Update property
DELETE /listings/:id          # Delete property (cascade)
```

### Certification/Testing
```
POST   /listings/import/airbnb  # Capture from Airbnb URL
POST   /listings/manual          # Create test property
POST   /listings/:id/rates       # Push rate to Channex
```

### Channex Integration (User-Facing)
```
POST   /connect/onboard         # Setup property + Channex account
GET    /connect/status          # Check sync progress
GET    /connect/oauth-link      # Get Airbnb/Booking OAuth URL
GET    /connect/oauth-callback  # OAuth return (public)
POST   /connect/sync            # Full sync from OTA
GET    /connect/sync/:id/progress  # Poll sync progress
POST   /connect/ari/update      # Push availability/rates
```

---

## 🖼️ Image Management Pipeline

### Frontend (imageUpload.js)
```
User selects image(s)
  ↓
Validation: mime type, 50MB limit
  ↓
Canvas conversion: 2048-4096px, JPEG quality 92%
  ↓
Upload to Supabase Storage bucket 'property-media'
  ↓
Get public URL
  ↓
Save metadata to property_images table
  ↓
Display in gallery (reorder, set cover, delete)
```

### Database
```sql
property_images:
  id, listingId, userId, filename, url, storagePath, sortOrder, isCover
```

### Functions
- `convertToOtaResolution(file)` — Canvas resize to spec
- `uploadImageToSupabase(file, listingId)` — Upload blob + get URL
- `saveImageRecord(...)` — Insert to DB
- `fetchListingImages(listingId)` — Load from DB
- `updateImageRecord(id, fields)` — Update (cover, order)
- `deleteImageRecord(id, storagePath)` — Delete from DB + storage

---

## 🔗 Channex Integration

### What is Channex?
Cloud PMS aggregator that syncs rates & availability to OTA channels (Airbnb, Booking.com, Expedia, etc.). Channels Connect is a **whitelabel** interface (no "Channex" branding to users).

### Rate Limiting
- **Limit**: ≤20 ARI (Availability & Rate) updates per minute **per property**
- **Implementation**: Token bucket (60s window, 20 tokens)
- **Behavior**: Pauses worker if bucket exhausted, logs `[Rate Limit Hit]`

### Transport
- **Why NestJS HttpService (@nestjs/axios)?**
  - ✅ Works in ECS VPC (correct DNS resolution)
  - ❌ Raw axios and native fetch fail in this environment

### Retry Logic
- Up to 3 attempts with exponential backoff (500ms / 1000ms / 2000ms)
- No retry on 4xx auth errors (fail fast)
- Respects `Retry-After` header on 429

---

## 🛡️ Security & Multi-Tenancy

### Multi-Tenancy
- Every listing filtered by `WHERE userId = ?`
- Service layer checks ownership before update/delete
- Admin queries ignore user filter (explicitly)

### CSRF Protection
- Channex OAuth uses state token (CSRF protection)
- OAuth redirect whitelists: `https://channelsconnect.com` or `http://localhost`

### Field Filtering
- Update endpoint whitelist-filters to known schema fields
- Prevents injection of unknown columns (e.g., `userId`)

### Role-Based Access
```javascript
// Frontend
isAdmin: dbUser?.role?.toLowerCase() === 'admin'

// Backend
// Admin-only endpoints check role before unfiltered queries
```

---

## 🧪 Certification Endpoints (Public)

These endpoints support **PMS Certification** testing without auth:

```typescript
POST /listings/import/airbnb         // Capture from URL
POST /listings/manual                 // Create test property
POST /listings/:id/rates              // Push rate (returns taskId)
POST /connect/ari/full               // 500-day push
POST /connect/ari/update             // Single update
```

All use `CERT_USER_ID = '1d63e070-dbff-48b8-ba2a-be8ba3a41ae8'`

**Error Handling**:
- `MappingMissingError` → returns 200 with message (not yet synced)
- Other errors → returns 500

---

## 📦 Dependencies Summary

### Backend (api/package.json)
- **@nestjs/\***: Core framework + modules
- **@prisma/client**: ORM for PostgreSQL
- **@nestjs/axios**: HTTP client (ECS-compatible)
- **@supabase/supabase-js**: Auth + storage
- **axios**: HTTP library
- **jose**: JWT validation
- **sharp**: Server-side image processing

### Frontend (app/package.json)
- **react**: UI framework
- **react-router-dom**: Client-side routing
- **@supabase/supabase-js**: Auth + storage client
- **@radix-ui/react-\***: Accessible UI components
- **axios**: HTTP client
- **react-hook-form**: Form management
- **zod**: Schema validation
- **tailwindcss**: Utility CSS
- **lucide-react**: Icon library
- **sonner**: Toast notifications
- **vite**: Build tool

---

## 💾 Database Schema (Inferred)

### users
- `id` (UUID) — Supabase auth user ID
- `email`, `name`, `role` ('user' | 'admin')
- `tosAcceptedAt` — Consent audit trail
- `createdAt`

### listings
- `id` (int) — Primary key
- `userId` (FK) — Owner
- `title`, `description`, `address`, `city`, `state`, `country`, `postalCode`
- `latitude`, `longitude`
- `propertyType`, `bedrooms`, `bathrooms`, `beds`, `maxGuests`
- `basePrice`, `currency` (default: 'USD')
- `minNights` (default: 1), `maxNights`
- `isActive` (default: true)
- `beds24PropId`, `beds24RoomId` — External integrations
- `airbnbListingId` — From import
- `captureUrl` — Import source
- `source` (default: 'channex')
- `createdAt`, `updatedAt`

### property_images
- `id` (UUID)
- `listingId` (FK)
- `userId`
- `filename`, `url` (Supabase public URL)
- `storagePath` (e.g., `listings/{id}/{timestamp}_{name}.jpg`)
- `sortOrder` — Display order
- `isCover` — Cover photo flag
- `created_at`

### channex_properties (inferred)
- `id`, `listingId` (FK), `userId` (FK)
- `channexPropertyId` — Channex side ID
- `channexChannel` ('airbnb' | 'booking_com')
- `oauthToken` — Encrypted OTA access token
- `syncStatus` ('pending' | 'syncing' | 'complete')
- `lastSyncAt`

---

## 🚀 Development Workflow

### Start Backend
```bash
cd api
npm install
npm run start:dev    # Watch mode on port 3001 (likely)
```

### Start Frontend
```bash
cd app
npm install
npm run dev          # Vite dev server on port 5173 (default)
```

### Build for Production
```bash
npm run build        # Both frontend and backend
```

---

## 🔍 Important Constants

| Constant | Value | Location |
|----------|-------|----------|
| `CERT_USER_ID` | `1d63e070-dbff-48b8-ba2a-be8ba3a41ae8` | listings.service.ts |
| `CHANNEX_BASE` | `https://staging.channex.io/api/v1` | channex-http.client.ts |
| `RATE_LIMIT_MAX` | 20 tokens | channex-http.client.ts |
| `RATE_LIMIT_WINDOW_MS` | 60000 (1 min) | channex-http.client.ts |
| `TIMEOUT_MS` | 15000 (15 sec) | channex-http.client.ts |
| `OTA_MIN_PX` | 2048 | imageUpload.js |
| `OTA_MAX_PX` | 4096 | imageUpload.js |
| `OTA_QUALITY` | 0.92 | imageUpload.js |
| `BUCKET` | `'property-media'` | imageUpload.js |

---

## 🎯 Design Patterns Used

1. **Multi-Tenancy**: Filter by userId at service layer
2. **Safe Defaults**: Apply defaults to sparse DTOs (certification)
3. **Fire-and-Forget**: Consent recording doesn't block signup
4. **Token Bucket**: Rate limiting with in-memory buckets
5. **Graceful Degradation**: Image conversion fails gracefully
6. **Whitelist Filtering**: Only known schema fields in updates
7. **Ownership Verification**: Check before write, not just read
8. **Per-Property Rate Limiting**: Extract property ID from request

---

## 🚨 Known Limitations

⚠️ `CERT_USER_ID` hardcoded (should move to env)
⚠️ Image deletion best-effort on storage (could orphan files)
⚠️ Rate limiter in-memory (resets on server restart)
⚠️ No request logging middleware (audit trail missing)
⚠️ Error messages could be more granular

---

## ✅ Health Observations

✅ Multi-tenancy properly enforced
✅ Safe defaults prevent NULL constraint violations
✅ Rate limiting prevents API abuse
✅ Image conversion on client (server savings)
✅ JWT validation on every protected route
✅ Graceful error responses for certification
✅ Comprehensive [Tag] logging
✅ Modular NestJS structure

---

**Last Updated**: 2026-04-30
**Analysis Tools**: Glob, Read, Bash
**Files Analyzed**: 12 core files + directory listings
**Total Lines of Code**: ~2000+ (read + analyzed)
