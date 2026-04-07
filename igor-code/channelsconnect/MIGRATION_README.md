# Channels Connect - Migration Complete

This project has been successfully migrated from base44 BaaS to a custom NestJS + Prisma + Supabase architecture.

## Project Structure

```
/
├── api/                 # NestJS Backend
│   ├── src/
│   │   ├── auth/       # Supabase JWT authentication
│   │   ├── prisma/     # Prisma service & module
│   │   ├── users/      # User management
│   │   ├── listings/   # Property listings
│   │   ├── bookings/   # Booking management
│   │   ├── channels/   # Channel management
│   │   ├── calendar/   # Calendar & rates
│   │   ├── ical/       # iCal sync
│   │   ├── dashboard/  # Dashboard data
│   │   └── analytics/  # Analytics
│   ├── prisma/
│   │   └── schema.prisma
│   └── package.json
│
├── app/                # React Frontend (formerly /src)
│   ├── api/           # API compatibility layer
│   │   ├── entities.js   # Maps base44 entities to new API
│   │   └── functions.js  # Maps base44 functions to new API
│   ├── lib/
│   │   ├── supabase.js   # Supabase auth client
│   │   └── apiClient.js  # Axios API client
│   ├── components/
│   ├── pages/
│   └── ...
│
└── package.json        # Frontend dependencies
```

## Backend Setup (NestJS + Prisma)

### 1. Install Dependencies

```bash
cd api
npm install
```

### 2. Configure Environment Variables

Create `api/.env`:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/channelsconnect"
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_ANON_KEY="your-supabase-anon-key"
SUPABASE_JWT_SECRET="your-jwt-secret"
PORT=3001
FRONTEND_URL="http://localhost:5173"
```

### 3. Setup Database

```bash
# Create PostgreSQL database
createdb channelsconnect

# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init

# (Optional) Seed database
npx prisma db seed
```

### 4. Start Backend

```bash
npm run start:dev
```

Backend will be available at http://localhost:3001
Swagger documentation at http://localhost:3001/api/docs

## Frontend Setup (React + Vite)

### 1. Install Dependencies

```bash
# From root directory
npm install
```

### 2. Configure Environment Variables

Create `.env` in root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_API_URL=http://localhost:3001
```

### 3. Start Frontend

```bash
npm run dev
# or
npm run dev:app
```

Frontend will be available at http://localhost:5173

## Supabase Setup

### 1. Create Supabase Project

1. Go to https://supabase.com
2. Create a new project
3. Get your project URL and anon key from Settings > API

### 2. Configure Authentication

1. Enable Google OAuth in Authentication > Providers
2. Add your redirect URLs:
   - Development: `http://localhost:5173`
   - Production: `https://your-domain.com`

### 3. Get JWT Secret

From Supabase Dashboard > Settings > API > JWT Settings > JWT Secret

## API Architecture

### Authentication Flow

1. User signs in via Supabase (Google OAuth or email/password)
2. Supabase returns JWT access token
3. Frontend stores token and includes in API requests
4. Backend middleware verifies token with Supabase
5. User info extracted and attached to request

### Backend Modules

- **AuthModule**: Supabase JWT verification
- **PrismaModule**: Database access
- **UsersModule**: User management (auto-create from Supabase)
- **ListingsModule**: Property CRUD operations
- **BookingsModule**: Booking management
- **ChannelsModule**: Channel management
- **CalendarModule**: Rates, blocking, calendar data
- **IcalModule**: iCal sync connections
- **DashboardModule**: Dashboard aggregated data
- **AnalyticsModule**: Analytics & metrics

### Compatibility Layer

The `app/api/entities.js` and `app/api/functions.js` files provide a compatibility layer that maps old base44 API calls to the new backend. This means most existing frontend code works without changes.

## Database Schema

The Prisma schema includes 20+ models:

- User (linked to Supabase auth)
- Channel, Listing, Booking
- RoomType, Inventory, Rate
- BlockedDate, PricingRule
- PropertyImage, IcalConnection
- CalendarEvent, CalendarAuditLog
- AirbnbConnection, ChannelConnection
- PropertyConnection, SyncLog
- And more...

## Development Workflow

### Running Both Services

Terminal 1 - Backend:
```bash
cd api
npm run start:dev
```

Terminal 2 - Frontend:
```bash
npm run dev
```

Or use the convenience scripts:
```bash
npm run dev:api   # Start backend
npm run dev:app   # Start frontend
```

### Building for Production

Backend:
```bash
cd api
npm run build
npm run start:prod
```

Frontend:
```bash
npm run build
```

## Migration Changes

### What Changed

1. **Authentication**: base44 auth → Supabase auth
2. **Database**: base44 managed → PostgreSQL + Prisma
3. **API**: base44 functions → NestJS REST API
4. **Structure**: `/src` → `/app` (frontend), new `/api` (backend)

### Backward Compatibility

The compatibility layer in `app/api/` ensures existing components continue to work:

```javascript
// Old code still works:
import { User, Listing, Booking } from '@/api/entities';
import { getDashboardData, blockDate } from '@/api/functions';

const listings = await Listing.find();
const data = await getDashboardData();
```

### Functions Not Yet Implemented

Some specialized functions show console warnings:
- Image upload services
- Excel import/export
- Beds24 integration
- PriceLabs integration
- Advanced iCal processing

These can be implemented as needed.

## API Documentation

Once the backend is running, visit http://localhost:3001/api/docs for full Swagger/OpenAPI documentation.

## Testing

Backend tests:
```bash
cd api
npm test
```

Frontend tests:
```bash
npm test
```

## Deployment

### Backend Deployment

1. Deploy PostgreSQL database (e.g., Railway, Render, AWS RDS)
2. Deploy NestJS app (e.g., Railway, Render, Fly.io)
3. Set environment variables in hosting platform
4. Run migrations: `npx prisma migrate deploy`

### Frontend Deployment

1. Build: `npm run build`
2. Deploy `dist/` folder (e.g., Vercel, Netlify, Cloudflare Pages)
3. Set environment variables in hosting platform

## Support

For issues or questions:
1. Check Swagger docs at http://localhost:3001/api/docs
2. Review Prisma schema in `api/prisma/schema.prisma`
3. Check compatibility layer in `app/api/`

## Next Steps

1. ✅ Backend API with core modules
2. ✅ Frontend compatibility layer
3. ✅ Supabase authentication
4. 🚧 Implement remaining specialized functions
5. 🚧 Add validation & error handling
6. 🚧 Add tests
7. 🚧 Setup CI/CD
8. 🚧 Deploy to production

