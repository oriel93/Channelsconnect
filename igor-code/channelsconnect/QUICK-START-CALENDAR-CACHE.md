# Calendar Cache - Quick Start Guide

## What Was Built

A caching system that stores Beds24 calendar data locally for the next 1 year, reducing API calls and improving performance.

## Quick Setup

### 1. Database is Ready ✓
The `calendar` table has been created with all necessary fields and indexes.

### 2. Import Properties - Calendar Auto-Syncs! ✓

When you import listings from Beds24, their calendars are automatically synced:

```bash
POST /beds24/sync-properties
```

This now:
- Imports listings from Beds24
- Automatically fetches and caches 1 year of calendar data for each listing
- No manual calendar sync needed!

### 3. Use as Normal

All existing code continues to work:

```bash
# Get rates (now uses cache automatically)
GET /calendar/rates?listingId=X&startDate=Y&endDate=Z

# Update rate (automatically refreshes cache)
POST /calendar/rates
{
  "listingId": 832,
  "date": "2025-12-15",
  "price": 450,
  "minStay": 3
}
```

## Key Changes

### Before
- Every `getRates()` call went to database `Rate` table
- Rate updates only touched local database
- No Beds24 calendar data stored locally

### After
- `getRates()` uses cached Beds24 calendar data (1 year)
- Rate updates → Update Beds24 → Auto-refresh cache
- All calendar data for next year stored locally

## New Endpoints

```bash
# Sync calendar from Beds24 (1 year)
POST /calendar/sync/:listingId

# Get cached calendar directly
GET /calendar/cached?listingId=X&startDate=Y&endDate=Z

# Clear cache for a listing
DELETE /calendar/cache/:listingId
```

## Data Structure

```typescript
Calendar {
  id: number
  listingId: number
  roomId: number          // Beds24 room ID
  date: Date
  price: Decimal
  numAvail: number        // Availability
  minStay: number         // Min nights
  maxStay: number         // Max nights
  override: string        // "none" | "open" | "closed"
  rawData: JSON           // Full Beds24 entry
  createdAt: Date
  updatedAt: Date
}
```

## Example: Complete Workflow

```bash
# 1. Import listings from Beds24 - Calendar is auto-synced! ✅
POST /beds24/sync-properties

# Response now includes calendar sync info:
{
  "success": true,
  "summary": {
    "listingsCreated": 3,
    "listingsUpdated": 0,
    "bookingsCreated": 5,
    "calendarsSynced": 3,  # ← Calendars automatically synced!
    "calendarSyncErrors": 0
  },
  "properties": [...]
}

# 2. Get rates for December (uses cache)
GET /calendar/rates?listingId=832&startDate=2025-12-01&endDate=2025-12-31

# 3. Update a rate (updates Beds24 + refreshes cache)
POST /calendar/rates
{
  "listingId": 832,
  "date": "2025-12-25",
  "price": 600,
  "minStay": 3
}

# Response:
{
  "success": true,
  "message": "Rate updated in Beds24 and cache refreshed",
  "listingId": 832,
  "date": "2025-12-25"
}
```

## Testing

```bash
# Test with existing listing
cd api
node test-calendar-cache.js
```

## Benefits Summary

✅ **Fast**: Milliseconds vs seconds for calendar queries  
✅ **Cost-effective**: Fewer Beds24 API calls  
✅ **Always fresh**: Auto-refresh on updates  
✅ **Long-term**: 1 year of data cached  
✅ **Compatible**: Existing code works without changes  

## Files Modified

- `api/prisma/schema.prisma` - Added `Calendar` model
- `api/src/calendar/calendar.service.ts` - Added caching methods
- `api/src/calendar/calendar.controller.ts` - Added sync endpoints
- `api/src/calendar/calendar.module.ts` - Added Beds24Module import

## Next Steps

1. Sync calendar for all existing listings
2. Set up periodic cache refresh (optional)
3. Monitor cache hit rates
4. Consider adding cache expiration (optional)
