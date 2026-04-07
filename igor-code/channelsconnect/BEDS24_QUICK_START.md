# Beds24 Integration - Quick Start

## ✅ Implementation Complete!

The Beds24 API integration is now fully implemented and ready to use!

---

## 🚀 Quick Setup (2 Steps)

### 1. Add Your Beds24 API Key

Edit `/api/.env` and add:

```env
BEDS24_API_KEY=your_beds24_api_key_here
```

### 2. Restart Backend

```bash
cd api
npm run start:dev
```

Done! Your API is ready to sync Airbnb listings to Beds24.

---

## 📝 Usage Example (Frontend)

```javascript
import { syncAirbnbToBeds24 } from '@/api/functions';

// When user clicks "Sync to Beds24" button
const handleSyncToBeds24 = async (airbnbHostId, listing) => {
  try {
    const result = await syncAirbnbToBeds24({
      airbnbHostId: airbnbHostId, // e.g., "12345678"
      listingId: listing.id,
      name: listing.name,
      description: listing.description,
      images: listing.images,
      maxGuests: listing.maxGuests,
      sqM2: listing.sqM2,
      minStay: listing.minStay || 2,
      cleaningFee: listing.cleaningFee,
      taxPercent: listing.taxPercent,
      securityDeposit: listing.securityDeposit,
      availableDates: listing.availableDates,
    });

    toast.success('✅ Synced to Beds24!');
    console.log('Beds24 sync result:', result);
    // result.propId, result.roomId, result.propKey
  } catch (error) {
    toast.error('Failed to sync to Beds24');
    console.error(error);
  }
};
```

---

## 🔌 API Endpoints

All endpoints require authentication (JWT token).

### POST `/beds24/sync-airbnb`
Sync Airbnb listing to Beds24

### GET `/beds24/properties/:airbnbHostId`
Get Beds24 properties for host

### GET `/beds24/property/:propKey`
Get specific property details

---

## 📊 What Gets Synced

✅ **Property Details**
- Name
- Description
- Room size
- Max guests
- Min stay

✅ **Financial**
- Cleaning fee
- Tax percentage
- Security deposit

✅ **Content**
- Images (up to 99)
- Descriptions
- Amenities

✅ **Calendar**
- Rates (prices)
- Availability

---

## 🏗️ Files Created

### Backend (NestJS):
```
api/src/beds24/
├── beds24.service.ts          # Main API logic
├── beds24.controller.ts       # REST endpoints
├── beds24.module.ts           # Module configuration
└── dto/
    ├── beds24-auth.dto.ts
    ├── get-property.dto.ts
    ├── set-property.dto.ts
    ├── set-property-content.dto.ts
    ├── set-room-dates.dto.ts
    ├── sync-airbnb.dto.ts
    └── index.ts
```

### Frontend:
```
app/lib/apiClient.js         # Added beds24 API endpoints
app/api/functions.js         # Added helper functions
```

---

## 🧪 Test It

### Using Swagger UI:
1. Go to http://localhost:3001/api/docs
2. Authorize with JWT token
3. Find **Beds24** section
4. Try `/beds24/sync-airbnb`

### Using cURL:
```bash
curl -X POST http://localhost:3001/beds24/sync-airbnb \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "airbnbHostId": "12345678",
    "listingId": "listing_123",
    "name": "Beach House",
    "maxGuests": 4,
    "minStay": 2
  }'
```

---

## 📖 Full Documentation

See [BEDS24_INTEGRATION.md](./BEDS24_INTEGRATION.md) for:
- Detailed API documentation
- Complete field reference
- Error handling
- Date format specifications
- Troubleshooting guide

---

## ⚡ Next Steps

1. **Add UI Button** - Add "Sync to Beds24" in listings page
2. **Show Status** - Display sync status per listing
3. **Auto-sync** - Automatically sync on updates
4. **Batch Sync** - Sync multiple listings at once

---

## 🎯 How It Works

```
User Action → Frontend → Backend API → Beds24 API
                                      ↓
                    ✅ Property Created/Updated
```

**Property Organization:**
- Each Airbnb host gets one property in Beds24
- Property Key: `airbnb_{hostId}`
- Each listing becomes a "room type" in that property

---

## 💡 Tips

1. **First Sync** - Takes longer (creates property + room)
2. **Subsequent Syncs** - Faster (updates existing)
3. **Images** - Supports up to 99 images per listing
4. **Dates** - Only future dates are synced (past dates ignored)
5. **Prices** - All prices in cents (15000 = $150.00)

---

## 🔒 Security

- ✅ All endpoints require authentication
- ✅ API key stored securely in .env
- ✅ JWT token validation on every request
- ✅ Users can only sync their own listings

---

## 📞 Support

**Beds24 API Docs:** https://www.beds24.com/api/

**Check Backend Logs:**
```bash
cd api
npm run start:dev
```

Look for `[Beds24Service]` messages.

---

**Integration Status:** ✅ **READY TO USE!**

