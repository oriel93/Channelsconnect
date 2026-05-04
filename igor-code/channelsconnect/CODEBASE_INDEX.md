# Channels Connect PMS — Codebase Documentation Index

**Generated**: 2026-04-30  
**Analysis Scope**: NestJS Backend + React/Vite Frontend  
**Status**: ✅ Complete

---

## 📚 Primary Documentation (New)

### 1. **CODEBASE_ANALYSIS.md** ⭐ START HERE
**Size**: 35KB | **Lines**: 1,133  
**Scope**: Comprehensive deep-dive analysis of entire codebase

**Covers**:
- Frontend Architecture (React, Vite, Auth, Pages, Components)
- Backend Architecture (NestJS, Prisma, Modules)
- Authentication & Authorization (Frontend/Backend flows)
- Image Management System (Canvas conversion, Supabase Storage, Database)
- Listings Management (CRUD endpoints, safe defaults, certification)
- Channex Integration (HTTP client, rate limiting, OAuth flows)
- Dependencies (Backend & Frontend packages)
- Key Design Patterns (Multi-tenancy, Safe defaults, Token bucket, etc.)
- Database Schema (Inferred from code)
- Security & Multi-tenancy analysis
- Code locations & quick references

**Best For**: Understanding the full picture, architectural decisions, design patterns

---

### 2. **QUICK_REFERENCE.md** ⭐ FOR LOOKUP
**Size**: 12KB | **Lines**: 350+  
**Scope**: At-a-glance reference guide

**Covers**:
- Directory structure (folder tree)
- Key technologies & versions
- Authentication flow (Frontend & Backend)
- Main API endpoints (Listings, Certification, Channex)
- Image management pipeline
- Channex integration summary
- Security & Multi-tenancy
- Certification endpoints
- Dependencies summary
- Database schema (quick view)
- Development workflow (npm commands)
- Important constants
- Design patterns (10 patterns identified)
- Known limitations
- Health observations

**Best For**: Quick lookups, API reference, constants, commands

---

## 🔍 File-Specific Analysis

### Frontend Files

#### **authContext.jsx** (95 lines)
- **Location**: `app/lib/authContext.jsx`
- **Purpose**: React Context for authentication + user profile
- **Key Points**:
  - Listens to Supabase auth state changes
  - Fetches user DB profile on signin (includes role)
  - Provides: `session`, `user`, `isAdmin`, `isAuthenticated`, `signOut()`, `refreshProfile()`
  - Never redirects on 403 (handled by apiClient)

#### **Login.jsx** (437 lines)
- **Location**: `app/pages/Login.jsx`
- **Purpose**: Unified sign-in/sign-up UI with Google OAuth
- **Key Points**:
  - Email/password validation with regex
  - Consent checkbox for ToS acceptance
  - Google OAuth with redirect handling
  - Fire-and-forget consent recording
  - Success message with 3s auto-redirect

#### **Listings.jsx** (136 lines)
- **Location**: `app/pages/Listings.jsx`
- **Purpose**: Grid display of user properties
- **Key Points**:
  - Fetches from `Listing.find()`
  - Responsive grid (2-4 columns)
  - CSV export + import CTA buttons
  - "Channels Connect" sync badge
  - Empty state with CTA

#### **ImageManager.jsx** (183 lines)
- **Location**: `app/pages/ImageManager.jsx`
- **Purpose**: Property selector + image upload orchestrator
- **Key Points**:
  - Dropdown to select property
  - Auto-selects first property
  - Property details card
  - Delegates to CloudinaryImageManager component

#### **CloudinaryImageManager.jsx** (437 lines)
- **Location**: `app/components/dashboard/CloudinaryImageManager.jsx`
- **Purpose**: Multi-image upload with OTA conversion
- **Key Points**:
  - Drag-drop or click file selection
  - Canvas-based image conversion (2048-4096px, JPEG 92%)
  - Upload progress tracking (0→100%)
  - Supabase Storage bucket: `property-media`
  - Gallery with reorder/delete/cover controls
  - Toast notifications for feedback

#### **imageUpload.js** (218 lines)
- **Location**: `app/lib/imageUpload.js`
- **Purpose**: Image conversion & upload utilities
- **Key Functions**:
  - `convertToOtaResolution(file)` — Canvas conversion to OTA spec
  - `uploadImageToSupabase({ file, listingId, onProgress })` — Upload + URL retrieval
  - `saveImageRecord(...)` — Insert to property_images table
  - `fetchListingImages(listingId)` — Load from DB
  - `updateImageRecord(imageId, fields)` — Update (cover, order)
  - `deleteImageRecord(imageId, storagePath)` — Delete from DB + storage

---

### Backend Files

#### **listings.controller.ts** (219 lines)
- **Location**: `api/src/listings/listings.controller.ts`
- **Purpose**: REST endpoint definitions for property CRUD
- **Key Endpoints**:
  - `POST /listings` — Create property
  - `GET /listings` — All user properties
  - `GET /listings/:id` — Single property with images
  - `PATCH /listings/:id` — Update property
  - `DELETE /listings/:id` — Delete property
  - `POST /listings/import/airbnb` — Capture from URL (public)
  - `POST /listings/manual` — Create test property (public)
  - `POST /listings/:id/rates` — Push rate to Channex (public)

#### **listings.service.ts** (242 lines)
- **Location**: `api/src/listings/listings.service.ts`
- **Purpose**: Business logic for listings
- **Key Features**:
  - Safe-defaults factory (lines 19-57)
  - User existence check (creates placeholder row if needed)
  - Multi-tenancy filtering (WHERE userId = ?)
  - Ownership verification before updates/deletes
  - Field whitelist filtering (security)
  - Admin-only unfiltered queries

#### **channex-http.client.ts** (300+ lines)
- **Location**: `api/src/services/channex/channex-http.client.ts`
- **Purpose**: HTTP transport + rate limiting for Channex API
- **Key Features**:
  - NestJS HttpService (@nestjs/axios) for ECS compatibility
  - Token-bucket rate limiter (20 tokens/60s per property)
  - Exponential backoff retry (3 attempts: 500/1000/2000ms)
  - Per-property rate limit extraction
  - 15s request timeout
  - [CHANNEX_CERT_LOG] task_id logging

#### **channex-whitelabel.controller.ts** (300+ lines)
- **Location**: `api/src/services/channex/channex-whitelabel.controller.ts`
- **Purpose**: User-facing Channex routes (branding: "Channels Connect")
- **Key Routes**:
  - `POST /connect/onboard` — Setup property
  - `GET /connect/status` — Check sync state
  - `GET /connect/oauth-link` — Get OAuth URL
  - `GET /connect/oauth-callback` — OAuth return (public)
  - `POST /connect/sync` — Full sync
  - `GET /connect/sync/:id/progress` — Poll progress
  - `POST /connect/ari/update` — Push availability/rates

#### **channex-services.module.ts** (17 lines)
- **Location**: `api/src/services/channex/channex-services.module.ts`
- **Purpose**: NestJS dependency injection module
- **Exports**:
  - ChannexHttpClient
  - ChannexOnboardingService
  - ChannexDeepSyncService

---

## 🗂️ Directory Structure

```
channelsconnect/
├── api/                                # NestJS Backend
│   ├── src/
│   │   ├── listings/                  # Property CRUD
│   │   │   ├── listings.controller.ts (219 lines)
│   │   │   ├── listings.service.ts    (242 lines)
│   │   │   ├── listings.module.ts
│   │   │   ├── dto/
│   │   │   │   ├── create-listing.dto.ts
│   │   │   │   └── update-listing.dto.ts
│   │   │   └── entities/
│   │   │       └── listing.entity.ts
│   │   ├── services/channex/          # Channex Integration
│   │   │   ├── channex-http.client.ts (300+ lines)
│   │   │   ├── channex-whitelabel.controller.ts (300+ lines)
│   │   │   ├── channex-onboarding.service.ts
│   │   │   ├── channex-deep-sync.service.ts
│   │   │   └── channex-services.module.ts (17 lines)
│   │   ├── auth/                      # JWT Validation
│   │   │   ├── guards/
│   │   │   │   └── supabase-auth.guard.ts
│   │   │   └── decorators/
│   │   │       ├── current-user.decorator.ts
│   │   │       └── public.decorator.ts
│   │   ├── prisma/                    # ORM
│   │   │   ├── prisma.service.ts
│   │   │   └── prisma.module.ts
│   │   └── main.ts
│   ├── package.json
│   └── README.md
├── app/                               # React/Vite Frontend
│   ├── lib/
│   │   ├── authContext.jsx            (95 lines)
│   │   ├── apiClient.js               # Axios instance
│   │   ├── imageUpload.js             (218 lines)
│   │   └── supabase.js                # Supabase client
│   ├── pages/
│   │   ├── index.jsx                  (344 lines) - Route registry
│   │   ├── Login.jsx                  (437 lines)
│   │   ├── Listings.jsx               (136 lines)
│   │   └── ImageManager.jsx           (183 lines)
│   ├── components/
│   │   ├── auth/
│   │   │   └── NewLoginRequired.jsx   # Auth guard
│   │   ├── app/
│   │   │   └── AppLayout.jsx          # Dashboard layout
│   │   └── dashboard/
│   │       └── CloudinaryImageManager.jsx (437 lines)
│   ├── package.json
│   └── vite.config.js
├── CODEBASE_ANALYSIS.md               (1,133 lines) ⭐
├── QUICK_REFERENCE.md                 (350+ lines) ⭐
└── [20+ other documentation files]
```

---

## 🔑 Key Concepts

### Authentication Flow
1. User logs in via Login.jsx
2. authHelpers calls Supabase auth
3. AuthContext fetches user profile from `/users/me`
4. useAuth() hook provides role-based state
5. Service layer filters by userId (multi-tenancy)

### Image Upload Flow
1. User selects images in CloudinaryImageManager
2. Client-side Canvas conversion to OTA spec
3. Upload to Supabase Storage (`property-media` bucket)
4. Get public URL
5. Save metadata to property_images table
6. Display in gallery with reorder/delete/cover controls

### Channex Integration
1. User connects Airbnb/Booking channel via OAuth
2. Backend exchanges code for access token
3. Creates Channex property and maps to listing
4. Rate limiter prevents > 20 updates/min/property
5. Can push rates/availability via `/connect/ari/update`

---

## 📊 Statistics

### Code Coverage
- **Total Files Analyzed**: 15
- **Total Lines of Code**: ~2,500+
- **Frontend Code**: ~1,800 lines
- **Backend Code**: ~700 lines
- **Dependencies**: 125 packages (80 frontend, 45 backend)

### Module Breakdown
- **Authentication**: 95 lines
- **Listings CRUD**: 461 lines
- **Image Management**: 655 lines
- **Channex Integration**: 600+ lines
- **Supporting Modules**: 200+ lines

---

## 🛡️ Security Features

✅ Multi-tenant filtering at service layer  
✅ JWT validation on every protected route  
✅ Ownership verification before write operations  
✅ Whitelist field filtering in updates  
✅ CSRF protection on OAuth flows  
✅ Role-based access control (admin checks)  
✅ Safe-defaults prevent NULL violations  
✅ Graceful error handling for untapped states  

---

## ⚠️ Known Limitations

❌ CERT_USER_ID hardcoded (should move to env)  
❌ Image deletion best-effort on storage (orphan risk)  
❌ Rate limiter in-memory (resets on server restart)  
❌ No request logging middleware  
❌ Error messages could be more granular  

---

## 🎯 When to Use Which Document

| Need | Document | Why |
|------|----------|-----|
| Full understanding | CODEBASE_ANALYSIS.md | Comprehensive coverage |
| API endpoints | QUICK_REFERENCE.md | Quick lookup |
| Image pipeline | CODEBASE_ANALYSIS.md § Image Management | Detailed walkthrough |
| Auth flow | CODEBASE_ANALYSIS.md § Authentication | Full sequence |
| Channex integration | CODEBASE_ANALYSIS.md § Channex | Complete details |
| Constants/configs | QUICK_REFERENCE.md | All in one table |
| Design patterns | CODEBASE_ANALYSIS.md § Key Design Patterns | 10 patterns documented |
| Database schema | CODEBASE_ANALYSIS.md § Schema | Inferred from code |

---

## 📝 Notes for Developers

### Before Starting Work
1. Read QUICK_REFERENCE.md for overview
2. Check CODEBASE_ANALYSIS.md for your area of focus
3. Review design patterns (Safe defaults, Multi-tenancy, Rate limiting)
4. Understand authentication flow (JWT → DB profile)

### Common Tasks
- **Add new API endpoint**: See listings.controller.ts structure
- **Update listing**: Check service safe-defaults factory
- **Upload image**: Review imageUpload.js functions
- **Check Channex rate limit**: See channex-http.client.ts token bucket
- **Add auth guard**: Check SupabaseAuthGuard + @CurrentUser decorator

### Testing Checklist
- ✅ Verify multi-tenancy (user can only see own listings)
- ✅ Test image conversion (check Canvas quality 92%, 2048-4096px)
- ✅ Validate rate limiting (push > 20 updates/min/property)
- ✅ Check ownership (try accessing another user's property)
- ✅ Test error responses (certification endpoints)

---

## 📞 Contact & Questions

For questions about:
- **Architecture**: See CODEBASE_ANALYSIS.md § Frontend/Backend Architecture
- **Auth**: See CODEBASE_ANALYSIS.md § Authentication & Authorization
- **Images**: See CODEBASE_ANALYSIS.md § Image Management System
- **Listings**: See CODEBASE_ANALYSIS.md § Listings Management
- **Channex**: See CODEBASE_ANALYSIS.md § Channex Integration

---

**Last Updated**: 2026-04-30  
**Total Documentation**: 3 files (CODEBASE_ANALYSIS.md, QUICK_REFERENCE.md, CODEBASE_INDEX.md)  
**Status**: ✅ Complete & Ready for Use
