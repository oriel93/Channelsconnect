# Calendar Cache Implementation

## Overview

Implemented a calendar caching system that stores calendar data from Beds24 locally for improved performance and reduced API calls. The system automatically syncs calendar data for the next 1 year and refreshes the cache whenever rates are updated.

## Database Schema

### `calendar` Table

Stores cached calendar data from Beds24 for each listing:

```sql
CREATE TABLE "calendar" (
    "id" SERIAL PRIMARY KEY,
    "listingId" INTEGER NOT NULL,
    "roomId" INTEGER NOT NULL,        -- Beds24 room ID
    "date" DATE NOT NULL,
    "price" DECIMAL(10,2),
    "numAvail" INTEGER,               -- Number available
    "minStay" INTEGER,                -- Minimum stay nights
    "maxStay" INTEGER,                -- Maximum stay nights
    "override" TEXT,                  -- none, open, closed
    "rawData" JSONB,                  -- Full calendar entry from Beds24
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    
    CONSTRAINT "calendar_listingId_date_key" UNIQUE ("listingId", "date"),
    FOREIGN KEY ("listingId") REFERENCES "listings"("id") ON DELETE CASCADE
);

CREATE INDEX "calendar_listingId_idx" ON "calendar"("listingId");
CREATE INDEX "calendar_date_idx" ON "calendar"("date");
```

## Service Methods

### `syncCalendarFromBeds24(listingId: number)`

Fetches and caches calendar data from Beds24 for the next 1 year.

**Process:**
1. Fetches listing with `beds24RoomId`
2. Calculates date range (today to +365 days)
3. Fetches calendar from Beds24 API
4. Clears existing cached data
5. Stores new calendar entries in database
6. Returns summary of cached data

**Returns:**
```typescript
{
  success: true,
  message: "Cached X calendar days",
  listingId: number,
  roomId: number,
  cachedDays: number,
  dateRange: { startDate: string, endDate: string }
}
```

### `clearCalendarCache(listingId: number)`

Removes all cached calendar entries for a listing.

**Returns:** Count of deleted entries

### `getCachedCalendar(listingId, startDate, endDate)`

Retrieves cached calendar data for a specific date range.

**Returns:** Array of cached calendar entries

### `updateRateAndSync(updateRateDto)`

Updates a single rate in Beds24 and automatically refreshes the cache.

**Process:**
1. Updates rate in Beds24 via API
2. Clears existing cache for the listing
3. Fetches fresh calendar data for next 1 year
4. Stores in cache

**DTO:**
```typescript
{
  listingId: number,
  date: string,        // YYYY-MM-DD
  price?: number,
  minStay?: number,
  available?: boolean
}
```

### `bulkUpdateRatesAndSync(bulkUpdateRatesDto)`

Updates rates for a date range in Beds24 and refreshes the cache.

**DTO:**
```typescript
{
  listingId: number,
  startDate: string,   // YYYY-MM-DD
  endDate: string,     // YYYY-MM-DD
  price?: number,
  minStay?: number,
  available?: boolean
}
```

### `getRates(listingId, startDate, endDate)`

**Modified behavior:**
1. First tries to return data from cache
2. Falls back to `Rate` table if cache is empty
3. Transforms cached data to match Rate model format

## API Endpoints

### `POST /calendar/sync/:listingId`

Triggers calendar sync from Beds24 for a specific listing.

**Example:**
```bash
curl -X POST http://localhost:3001/calendar/sync/832 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "message": "Cached 365 calendar days",
  "listingId": 832,
  "roomId": 634468,
  "cachedDays": 365,
  "dateRange": {
    "startDate": "2025-12-11",
    "endDate": "2026-12-11"
  }
}
```

### `GET /calendar/cached?listingId=X&startDate=Y&endDate=Z`

Returns cached calendar data for a date range.

**Example:**
```bash
curl "http://localhost:3001/calendar/cached?listingId=832&startDate=2025-12-01&endDate=2025-12-31" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### `DELETE /calendar/cache/:listingId`

Clears cached calendar data for a listing.

**Example:**
```bash
curl -X DELETE http://localhost:3001/calendar/cache/832 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### `POST /calendar/rates` (Updated)

Now updates Beds24 and automatically refreshes cache.

**Example:**
```bash
curl -X POST http://localhost:3001/calendar/rates \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "listingId": 832,
    "date": "2025-12-15",
    "price": 450,
    "minStay": 3,
    "available": true
  }'
```

### `POST /calendar/rates/bulk` (Updated)

Now updates Beds24 and automatically refreshes cache.

**Example:**
```bash
curl -X POST http://localhost:3001/calendar/rates/bulk \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "listingId": 832,
    "startDate": "2025-12-20",
    "endDate": "2025-12-27",
    "price": 500,
    "minStay": 5,
    "available": true
  }'
```

### `GET /calendar/rates?listingId=X&startDate=Y&endDate=Z` (Updated)

Now uses cached data when available.

**Example:**
```bash
curl "http://localhost:3001/calendar/rates?listingId=832&startDate=2025-12-01&endDate=2025-12-31" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Workflow

### Initial Setup

1. Sync calendar data after importing listings from Beds24:
   ```bash
   POST /calendar/sync/:listingId
   ```

2. The system will cache 1 year of calendar data (365 days from today)

### Daily Operations

1. **Getting Rates:**
   - Call `GET /calendar/rates` as usual
   - System automatically uses cached data
   - Fast response, no Beds24 API call needed

2. **Updating Rates:**
   - Call `POST /calendar/rates` or `POST /calendar/rates/bulk`
   - System updates Beds24
   - Automatically clears old cache
   - Fetches fresh data for next year
   - Stores in cache

### Cache Maintenance

- **Automatic refresh:** Cache is refreshed whenever rates are updated
- **Manual sync:** Call `POST /calendar/sync/:listingId` to refresh cache
- **Clear cache:** Call `DELETE /calendar/cache/:listingId` to remove cached data

## Benefits

1. **Performance:** Fast retrieval from local database (milliseconds vs seconds)
2. **Reduced API Calls:** Only call Beds24 when syncing or updating rates
3. **Cost Savings:** Fewer API calls = lower Beds24 API costs
4. **Always Fresh:** Cache automatically refreshed after updates
5. **Long-term Storage:** 1 year of calendar data readily available
6. **API Compatibility:** Existing code using `getRates()` works without changes

## Data Flow

### Sync Flow
```
User Request → syncCalendarFromBeds24()
    ↓
Get listing.beds24RoomId
    ↓
Fetch calendar from Beds24 API (1 year)
    ↓
Clear existing cache
    ↓
Parse date ranges into daily entries
    ↓
Store in calendar table
    ↓
Return summary
```

### Update Flow
```
User Request → updateRateAndSync()
    ↓
Update rate in Beds24
    ↓
Clear cache for listing
    ↓
Fetch fresh calendar (1 year)
    ↓
Store in calendar table
    ↓
Return success
```

### Read Flow
```
User Request → getRates()
    ↓
Check calendar table
    ↓
If found → Transform & return
    ↓
If empty → Fall back to Rate table
```

## Example Beds24 Calendar Response

The system processes this data from Beds24:

```json
{
  "roomId": 634468,
  "propertyId": 304420,
  "name": "Cozy Mountain Retreat",
  "calendar": [
    {
      "from": "2025-12-11",
      "to": "2025-12-18",
      "numAvail": 1,
      "minStay": 2,
      "maxStay": 365,
      "override": "none",
      "price1": 377
    },
    {
      "from": "2025-12-19",
      "to": "2025-12-25",
      "numAvail": 1,
      "minStay": 5,
      "maxStay": 365,
      "override": "none",
      "price1": 377
    }
  ]
}
```

Each date range is expanded into individual daily entries in the cache.

## Testing

Run the test script to verify the implementation:

```bash
cd api
node test-calendar-cache.js
```

This will:
- Find a listing with beds24RoomId
- Check for existing cached data
- Show sample cached entries
- Display cache statistics

## Notes

- Cache stores 1 year of data from today's date
- When rates are updated, the entire year's cache is refreshed
- The `rawData` field stores the complete Beds24 calendar entry for reference
- All dates are stored as DATE type (no time component)
- Unique constraint on (listingId, date) prevents duplicates
- Foreign key cascade deletes cache when listing is deleted
