# Beds24 Integration Guide

## Overview

This integration allows syncing Airbnb listings to Beds24 channel manager automatically.

## Features

✅ **Automatic Property Creation** - Creates properties in Beds24 if they don't exist
✅ **Room Management** - Creates and updates room types based on Airbnb listings
✅ **Content Sync** - Syncs descriptions, images, and amenities
✅ **Rate & Availability Sync** - Updates pricing and availability calendars
✅ **Host-based Organization** - Properties are organized by Airbnb host ID

---

## Setup Instructions

### 1. Get Your Beds24 API Key

1. Log in to your Beds24 account
2. Go to **Settings** → **Account Settings**
3. Find the **API Key** section
4. Copy your API key

### 2. Add API Key to Environment

Add this line to `/api/.env`:

```env
BEDS24_API_KEY=your_beds24_api_key_here
```

### 3. Restart Backend Server

```bash
cd api
npm run start:dev
```

---

## How It Works

### Property Key Structure

Properties in Beds24 are identified by: `airbnb_{hostId}`

Example: `airbnb_12345678`

### Sync Flow

1. **User clicks "Sync to Beds24"** in the frontend
2. **Check if property exists** in Beds24
   - If not, create new property
3. **Check if room exists** for this listing
   - If not, create new room type
4. **Update room details** (size, guests, fees)
5. **Update content** (descriptions, images, amenities)
6. **Update rates** (pricing and availability)

---

## API Endpoints

### POST `/beds24/sync-airbnb`

Sync an Airbnb listing to Beds24.

**Request Body:**
```json
{
  "airbnbHostId": "12345678",
  "listingId": "listing_123",
  "name": "Beautiful Beach House",
  "description": "Amazing property description",
  "images": [
    "https://example.com/image1.jpg",
    "https://example.com/image2.jpg"
  ],
  "maxGuests": 6,
  "sqM2": 120,
  "minStay": 2,
  "cleaningFee": 100,
  "taxPercent": 10,
  "securityDeposit": 500,
  "availableDates": {
    "20240101": { "p1": 15000, "i": 1 },
    "20240102": { "p1": 15000, "i": 1 }
  }
}
```

**Response:**
```json
{
  "success": true,
  "propKey": "airbnb_12345678",
  "propId": 123456,
  "roomId": 789012,
  "message": "Listing successfully synced to Beds24"
}
```

### GET `/beds24/properties/:airbnbHostId`

Get all Beds24 properties for an Airbnb host.

**Response:**
```json
[
  {
    "propId": 123456,
    "name": "My Airbnb Property",
    "roomTypes": [
      {
        "roomId": 789012,
        "name": "Beautiful Beach House",
        "maxPeople": 6
      }
    ]
  }
]
```

### GET `/beds24/property/:propKey`

Get specific property details from Beds24.

---

## Frontend Integration

### Import the functions

```javascript
import { syncAirbnbToBeds24, getBeds24PropertiesByHostId } from '@/api/functions';
```

### Sync a listing

```javascript
const handleSync = async () => {
  try {
    const result = await syncAirbnbToBeds24({
      airbnbHostId: '12345678',
      listingId: listing.id,
      name: listing.name,
      description: listing.description,
      images: listing.images,
      maxGuests: listing.maxGuests,
      sqM2: listing.sqM2,
      minStay: listing.minStay,
      cleaningFee: listing.cleaningFee,
      taxPercent: listing.taxPercent,
      securityDeposit: listing.securityDeposit,
      availableDates: listing.availableDates,
    });

    console.log('Sync successful:', result);
    toast.success('Property synced to Beds24!');
  } catch (error) {
    console.error('Sync failed:', error);
    toast.error('Failed to sync property');
  }
};
```

### Get host properties

```javascript
const getHostProperties = async () => {
  try {
    const properties = await getBeds24PropertiesByHostId('12345678');
    console.log('Host properties:', properties);
  } catch (error) {
    console.error('Failed to get properties:', error);
  }
};
```

---

## Date Format

Dates must be in **YYYYMMDD** format:

```javascript
{
  "20240101": { "p1": 15000, "i": 1 },  // Jan 1, 2024 - $150.00, available
  "20240102": { "p1": 15000, "i": 1 },  // Jan 2, 2024 - $150.00, available
  "20240103": { "p1": 0, "i": 0 }       // Jan 3, 2024 - blocked
}
```

- `p1`: Price in cents (15000 = $150.00)
- `i`: Availability (1 = available, 0 = blocked)

---

## Pricing Notes

- All prices in Beds24 API are in **cents**
- Example: $150.00 = 15000
- Example: $99.50 = 9950

---

## Error Handling

The API will return appropriate HTTP status codes:

- `200 OK` - Success
- `400 Bad Request` - Invalid data or Beds24 API error
- `401 Unauthorized` - Not authenticated
- `404 Not Found` - Property not found
- `500 Internal Server Error` - Server error

---

## Testing

### Using the Swagger UI

1. Go to http://localhost:3001/api/docs
2. Authorize with your JWT token
3. Find the **Beds24** section
4. Try the `/beds24/sync-airbnb` endpoint

### Using Postman or cURL

```bash
curl -X POST http://localhost:3001/beds24/sync-airbnb \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "airbnbHostId": "12345678",
    "listingId": "listing_123",
    "name": "Test Property",
    "description": "Test description",
    "maxGuests": 4,
    "minStay": 2
  }'
```

---

## Troubleshooting

### "BEDS24_API_KEY is not configured"

- Check that the API key is added to `/api/.env`
- Restart the backend server

### "Property not found"

- The property doesn't exist in Beds24
- The sync endpoint will automatically create it

### "API Error"

- Check the Beds24 API key is valid
- Check the Beds24 service is online
- Review the error message in the response

---

## Files Created

### Backend:
- `/api/src/beds24/beds24.service.ts` - Main service with all Beds24 API logic
- `/api/src/beds24/beds24.controller.ts` - REST API controller
- `/api/src/beds24/beds24.module.ts` - NestJS module
- `/api/src/beds24/dto/*.ts` - Data Transfer Objects

### Frontend:
- Updated `/app/lib/apiClient.js` - Added Beds24 API client
- Updated `/app/api/functions.js` - Added helper functions

---

## Next Steps

1. **Add to UI** - Add "Sync to Beds24" button in the listings page
2. **Auto-sync** - Automatically sync when Airbnb data changes
3. **Batch sync** - Sync multiple listings at once
4. **Sync status** - Show sync status for each listing
5. **Error notifications** - Display sync errors to users

---

## Support

For Beds24 API documentation, visit:
https://www.beds24.com/api/

For issues with this integration, check the backend logs:
```bash
cd api
npm run start:dev
```

Look for `[Beds24Service]` log messages.

