# Implementation Plan - Complete Channels Connect Project

## 📊 Current Status

**Backend:** ✅ 90% Complete
- ✅ NestJS API with Prisma ORM
- ✅ Supabase Authentication
- ✅ Users, Listings, Bookings, Channels modules
- ✅ Calendar & Rate Management
- ✅ iCal Sync
- ✅ Dashboard & Analytics
- ✅ Swagger API Documentation

**Frontend:** ✅ 85% Complete
- ✅ React with Vite & TailwindCSS
- ✅ Authentication flows (Login/Signup on standalone pages)
- ✅ Dashboard & Analytics pages
- ✅ Calendar management UI
- ✅ Listing management UI
- ✅ Channel connections UI

**Database:** ✅ Complete
- ✅ Comprehensive Prisma schema with all models
- ✅ Relations properly configured
- ✅ Migrations ready

**Critical Issue:** ⚠️ Supabase project is PAUSED/INACTIVE
- DNS resolution fails for: `ckulqsxxojpcxwwqaxrw.supabase.co`
- Auth tests show 57.1% pass rate (code works, project paused)
- **PRIORITY:** Restore or create new Supabase project

---

## 🚀 Tomorrow's Implementation Tasks

### **PHASE 1: Fix Supabase & Authentication (30 min)**

#### 1.1 Restore Supabase Project
- [ ] Go to https://app.supabase.com
- [ ] Find project `ckulqsxxojpcxwwqaxrw` or create new one
- [ ] Unpause/restore the project
- [ ] Update credentials in `.env` files if needed
- [ ] Run auth tests again: `node app/test-auth.js`
- [ ] Verify 100% pass rate

#### 1.2 Configure Supabase Auth Settings
- [ ] Enable Email/Password auth
- [ ] Disable email confirmation for development (Settings > Email Auth)
- [ ] Configure Google OAuth callback URLs
- [ ] Set auth redirect URLs to include localhost and production domains

---

### **PHASE 2: Complete Image Management (2-3 hours)**

**Current State:** Frontend exists, backend incomplete

#### 2.1 Backend - Image Upload API
Create new endpoints in `api/src/listings/listings.controller.ts`:

```typescript
// POST /listings/:id/images
async uploadImages(
  @Param('id') listingId: string,
  @Body() imageData: UploadImageDto,
  @CurrentUser() user: any,
) {
  // Save PropertyImage records to database
  // Return created image records
}

// PATCH /listings/:id/images/:imageId
async updateImageMetadata(
  @Param('id') listingId: string,
  @Param('imageId') imageId: string,
  @Body() updateData: UpdateImageDto,
) {
  // Update caption, displayOrder, isPrimary
}

// DELETE /listings/:id/images/:imageId
async deleteImage(
  @Param('id') listingId: string,
  @Param('imageId') imageId: string,
) {
  // Soft delete or hard delete from DB
}

// GET /listings/:id/images
async getListingImages(@Param('id') listingId: string) {
  // Return all images for a listing ordered by displayOrder
}
```

#### 2.2 Image DTOs
Create `api/src/listings/dto/image.dto.ts`:

```typescript
export class UploadImageDto {
  url: string;
  thumbnailUrl?: string;
  caption?: string;
  displayOrder?: number;
  isPrimary?: boolean;
  cloudinaryId?: string;
}

export class UpdateImageDto {
  caption?: string;
  displayOrder?: number;
  isPrimary?: boolean;
}
```

#### 2.3 Update apiClient.js
In `app/lib/apiClient.js`, add:

```javascript
listings: {
  // ... existing methods ...
  uploadImages: (id, data) => apiClient.post(`/listings/${id}/images`, data),
  getImages: (id) => apiClient.get(`/listings/${id}/images`),
  updateImage: (id, imageId, data) => apiClient.patch(`/listings/${id}/images/${imageId}`, data),
  deleteImage: (id, imageId) => apiClient.delete(`/listings/${id}/images/${imageId}`),
}
```

#### 2.4 Update functions.js
Replace placeholder implementations:

```javascript
export const uploadImages = (data) => {
  return api.listings.uploadImages(data.listingId, data).then(res => res.data);
};

export const saveImageMetadata = (data) => {
  return api.listings.updateImage(data.listingId, data.imageId, data).then(res => res.data);
};
```

**Implementation Files:**
- `api/src/listings/listings.controller.ts` - Add image endpoints
- `api/src/listings/listings.service.ts` - Add image logic
- `api/src/listings/dto/image.dto.ts` - Create DTOs
- `app/lib/apiClient.js` - Add image methods
- `app/api/functions.js` - Update placeholder functions

---

### **PHASE 3: Complete Import Features (3-4 hours)**

**Critical for user onboarding!**

#### 3.1 Excel Import Feature

**Backend:**

Create `api/src/listings/dto/excel-import.dto.ts`:
```typescript
export class ExcelImportDto {
  data: Array<{
    title: string;
    description?: string;
    address?: string;
    bedrooms?: number;
    bathrooms?: number;
    maxGuests?: number;
    basePrice?: number;
    propertyType?: string;
    // ... other fields
  }>;
}
```

Add to `api/src/listings/listings.controller.ts`:
```typescript
// POST /listings/import/excel
@Post('import/excel')
async importFromExcel(
  @Body() importData: ExcelImportDto,
  @CurrentUser() user: any,
) {
  // Validate data
  // Create multiple listings in transaction
  // Return success/error report
  return this.listingsService.bulkCreate(user.id, importData.data);
}
```

**Frontend:**

Update `app/api/functions.js`:
```javascript
export const importExcel = (data) => {
  return api.listings.importExcel(data).then(res => res.data);
};

export const downloadExcelTemplate = () => {
  // Generate Excel template with proper headers
  const headers = ['Title', 'Description', 'Address', 'Bedrooms', 'Bathrooms', 'Max Guests', 'Base Price', 'Property Type'];
  // Create CSV/Excel file and trigger download
  return Promise.resolve({ success: true });
};
```

#### 3.2 PMS Import (Airbnb, Booking.com, etc.)

Create `api/src/integrations` module:

```bash
cd api/src
nest g module integrations
nest g service integrations
nest g controller integrations
```

**Backend Endpoints:**

```typescript
// api/src/integrations/integrations.controller.ts

// POST /integrations/airbnb/connect
async connectAirbnb(@Body() credentials, @CurrentUser() user) {
  // Store Airbnb connection
  // Validate credentials
}

// POST /integrations/airbnb/import
async importAirbnbListings(@CurrentUser() user) {
  // Fetch listings from Airbnb API
  // Create ImportedListing records
  // Return list for user to review
}

// POST /integrations/booking-com/connect
async connectBookingCom(@Body() credentials, @CurrentUser() user) {
  // Similar to Airbnb
}

// POST /integrations/pms/:provider/import
async importFromPMS(
  @Param('provider') provider: string,
  @Body() config: any,
  @CurrentUser() user,
) {
  // Generic PMS import
  // Support multiple providers
}
```

**Frontend:**

Update `app/api/functions.js`:
```javascript
export const importPms = (data) => {
  return api.integrations.importPms(data.provider, data).then(res => res.data);
};

export const airbnbImportListings = (data) => {
  return api.integrations.airbnbImport(data).then(res => res.data);
};

export const importBookingCom = (data) => {
  return api.integrations.bookingComImport(data).then(res => res.data);
};
```

Add to `app/lib/apiClient.js`:
```javascript
// Integrations
integrations: {
  airbnbConnect: (data) => apiClient.post('/integrations/airbnb/connect', data),
  airbnbImport: () => apiClient.post('/integrations/airbnb/import'),
  bookingComConnect: (data) => apiClient.post('/integrations/booking-com/connect', data),
  bookingComImport: () => apiClient.post('/integrations/booking-com/import'),
  importPms: (provider, data) => apiClient.post(`/integrations/pms/${provider}/import`, data),
},
```

**Implementation Files:**
- `api/src/integrations/` - New module
- `api/src/integrations/integrations.module.ts`
- `api/src/integrations/integrations.service.ts`
- `api/src/integrations/integrations.controller.ts`
- `api/src/integrations/dto/import.dto.ts`
- `app/lib/apiClient.js` - Add integrations section
- `app/api/functions.js` - Update import functions

---

### **PHASE 4: Pricing Integrations (2 hours)**

#### 4.1 PriceLabs Integration

**Backend:**

Create `api/src/integrations/pricelabs.service.ts`:
```typescript
@Injectable()
export class PriceLabsService {
  async connect(userId: string, apiKey: string) {
    // Validate PriceLabs API key
    // Store in PriceLabsIntegration table
  }

  async getPricing(listingId: number) {
    // Fetch dynamic pricing from PriceLabs API
    // Return suggested rates
  }

  async syncRates(listingId: number) {
    // Get PriceLabs recommendations
    // Update Rate table
  }
}
```

Add endpoints to `api/src/integrations/integrations.controller.ts`:
```typescript
// POST /integrations/pricelabs/connect
async connectPriceLabs(@Body() { apiKey }, @CurrentUser() user) {
  return this.priceLabsService.connect(user.id, apiKey);
}

// GET /integrations/pricelabs/pricing/:listingId
async getPriceLabsPricing(@Param('listingId') listingId: string) {
  return this.priceLabsService.getPricing(+listingId);
}

// POST /integrations/pricelabs/sync/:listingId
async syncPriceLabsRates(@Param('listingId') listingId: string) {
  return this.priceLabsService.syncRates(+listingId);
}
```

**Frontend:**

Update `app/api/functions.js`:
```javascript
export const priceLabsConnect = (data) => {
  return api.integrations.priceLabsConnect(data).then(res => res.data);
};

export const priceLabsGetPricing = (listingId) => {
  return api.integrations.priceLabsGetPricing(listingId).then(res => res.data);
};
```

Add to `app/lib/apiClient.js`:
```javascript
integrations: {
  // ... other integrations ...
  priceLabsConnect: (data) => apiClient.post('/integrations/pricelabs/connect', data),
  priceLabsGetPricing: (listingId) => apiClient.get(`/integrations/pricelabs/pricing/${listingId}`),
  priceLabsSync: (listingId) => apiClient.post(`/integrations/pricelabs/sync/${listingId}`),
},
```

---

### **PHASE 5: Advanced Features (2-3 hours)**

#### 5.1 Enhanced iCal Processing

Update `api/src/ical/ical.service.ts`:
```typescript
async processIcalData(url: string) {
  // Fetch iCal data
  // Parse VEVENT entries
  // Extract bookings, availability, rates
  // Return structured data
}

async debugIcalUrl(url: string) {
  // Validate URL accessibility
  // Parse and return diagnostic info
  // Check for common issues
}
```

#### 5.2 Two-Way Sync Features

Add to `api/src/calendar/calendar.service.ts`:
```typescript
async twoWayUpdateRate(listingId: number, date: Date, price: number) {
  // Update local rate
  // Push to connected channels via API
  // Log sync status
}

async twoWayBlockDate(listingId: number, date: Date) {
  // Block date locally
  // Push to connected channels
  // Update iCal feeds
}
```

#### 5.3 Real-time Features (Optional)

**WebSocket for live updates:**

```typescript
// api/src/events/events.gateway.ts
@WebSocketGateway({ cors: true })
export class EventsGateway {
  @SubscribeMessage('calendar-update')
  handleCalendarUpdate(@MessageBody() data: any) {
    // Broadcast calendar changes to connected clients
  }
}
```

Update `app/api/functions.js`:
```javascript
export const webSocketHandler = (event, data) => {
  // Setup WebSocket connection if not exists
  // Send event and data
  // Return promise that resolves on response
};
```

---

### **PHASE 6: Entity Implementations (1 hour)**

Many entities in `app/api/entities.js` return empty arrays. Implement them:

#### 6.1 Room Types
```javascript
export const RoomType = {
  find: (params) => api.listings.getRoomTypes(params).then(res => res.data),
  create: (data) => api.listings.createRoomType(data).then(res => res.data),
  update: (id, data) => api.listings.updateRoomType(id, data).then(res => res.data),
  delete: (id) => api.listings.deleteRoomType(id).then(res => res.data),
};
```

Add to `api/src/listings/listings.controller.ts`:
```typescript
// GET /listings/:id/room-types
// POST /listings/:id/room-types
// PATCH /listings/:id/room-types/:roomTypeId
// DELETE /listings/:id/room-types/:roomTypeId
```

#### 6.2 Blocked Dates Module

Create proper module:
```bash
cd api/src
nest g module blocked-dates
nest g service blocked-dates
nest g controller blocked-dates
```

Implement CRUD operations for BlockedDate entity.

#### 6.3 Pricing Rules

Similar to blocked dates, create full CRUD for PricingRule.

---

### **PHASE 7: Testing & Polish (1-2 hours)**

#### 7.1 Run Full Test Suite
```bash
# Backend tests
cd api
npm run test:e2e

# Frontend auth tests
cd app
node test-auth.js
```

#### 7.2 API Documentation
- Ensure all new endpoints have Swagger decorators
- Test API docs at http://localhost:3001/api/docs
- Verify all DTOs are properly documented

#### 7.3 Error Handling
- Add proper error messages for all endpoints
- Implement validation for all DTOs
- Add user-friendly error messages in frontend

#### 7.4 UI Polish
- Ensure all forms have loading states
- Add success/error toasts
- Test responsive design on mobile
- Fix any layout issues

---

## 📋 Implementation Checklist

### Critical Priority (Must Complete)
- [ ] **Restore Supabase project** (blocks everything)
- [ ] Fix authentication completely
- [ ] Image upload API endpoints
- [ ] Excel import/export
- [ ] PMS import (at least Airbnb)

### High Priority (Should Complete)
- [ ] PriceLabs integration
- [ ] Room types CRUD
- [ ] Blocked dates module
- [ ] Pricing rules
- [ ] Enhanced iCal processing

### Medium Priority (Nice to Have)
- [ ] Two-way sync
- [ ] WebSocket real-time updates
- [ ] Advanced analytics
- [ ] Beds24 integration
- [ ] Debug tools

### Low Priority (Future)
- [ ] Email notifications
- [ ] Advanced reporting
- [ ] Multi-language support
- [ ] Mobile app

---

## 🛠️ Technical Implementation Order

### Morning (9 AM - 12 PM): Core Features
1. **Fix Supabase** (30 min)
2. **Image Management Backend** (1.5 hours)
3. **Excel Import** (1.5 hours)

### Afternoon (1 PM - 4 PM): Integrations
4. **PMS Import (Airbnb)** (2 hours)
5. **PriceLabs Integration** (1.5 hours)

### Evening (4 PM - 6 PM): Polish
6. **Entity Implementations** (1 hour)
7. **Testing & Bug Fixes** (1 hour)

---

## 📝 Notes for Implementation

### Code Quality Guidelines
- Follow existing patterns in the codebase
- Add proper TypeScript types
- Include Swagger decorators for all endpoints
- Write descriptive commit messages
- Add error handling and validation

### API Design Principles
- Use consistent endpoint naming
- Return proper HTTP status codes
- Include pagination for list endpoints
- Use DTOs for validation
- Add proper authentication guards

### Database Best Practices
- Use transactions for multi-record operations
- Add proper indexes for performance
- Use cascade deletes where appropriate
- Validate foreign key constraints

### Frontend Best Practices
- Show loading states
- Handle errors gracefully
- Use toast notifications
- Validate forms before submission
- Optimize API calls (caching, debouncing)

---

## 🚀 Quick Start Commands

```bash
# Terminal 1: Start backend
cd api
npm run start:dev

# Terminal 2: Start frontend  
cd app
npm run dev

# Terminal 3: Database GUI (optional)
cd api
npx prisma studio

# Terminal 4: Run tests
cd api
npm run test:e2e
```

---

## 📊 Success Metrics

By end of tomorrow, you should have:

✅ **Authentication:** 100% working (restore Supabase)
✅ **Image Management:** Upload, update, delete images
✅ **Import:** Excel import working
✅ **Import:** At least one PMS import (Airbnb)
✅ **Pricing:** PriceLabs connection working
✅ **Entities:** Room types, blocked dates implemented
✅ **Tests:** All E2E tests passing
✅ **API Docs:** Complete Swagger documentation
✅ **Frontend:** All placeholder functions replaced

---

## 🎯 Definition of "Complete"

The project is complete when:

1. ✅ User can sign up and login
2. ✅ User can create/edit/delete listings
3. ✅ User can upload and manage images
4. ✅ User can import listings from Excel
5. ✅ User can import from at least one PMS
6. ✅ User can manage calendar (rates, availability)
7. ✅ User can connect channels
8. ✅ User can sync iCal
9. ✅ User can view dashboard and analytics
10. ✅ All API endpoints work and are documented
11. ✅ No placeholder functions remain
12. ✅ All tests pass

---

## 💡 Tips for Tomorrow

1. **Start with Supabase** - Nothing works without it
2. **Use existing patterns** - Don't reinvent the wheel
3. **Test as you go** - Don't leave testing for the end
4. **Focus on core value** - Images and imports are critical
5. **Don't over-engineer** - Simple solutions first
6. **Take breaks** - Stay focused and fresh
7. **Commit often** - Small, frequent commits
8. **Document as you code** - Update Swagger docs

---

Good luck! 🚀 You've got a solid foundation. Tomorrow is about filling in the gaps and polishing the experience.

