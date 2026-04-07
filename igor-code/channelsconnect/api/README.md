# Channels Connect API

NestJS backend API with Prisma ORM, PostgreSQL, and Supabase authentication.

## Tech Stack

- **Framework**: NestJS 10
- **Database**: PostgreSQL 15
- **ORM**: Prisma 5
- **Authentication**: Supabase JWT
- **Documentation**: Swagger/OpenAPI
- **Testing**: Jest + Supertest
- **Language**: TypeScript

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 15+ (or Docker)
- Supabase account

### Installation

```bash
npm install
```

### Environment Variables

Create a `.env` file:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/channelsconnect"
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_JWT_SECRET="your-jwt-secret"
PORT=3001
FRONTEND_URL="http://localhost:5173"
```

### Database Setup

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate dev

# (Optional) Seed database
npx prisma db seed
```

### Development

```bash
# Start in watch mode
npm run start:dev

# Start in debug mode
npm run start:debug
```

API will be available at:
- **API**: http://localhost:3001
- **Swagger Docs**: http://localhost:3001/api/docs
- **Swagger JSON**: http://localhost:3001/api-json

### Testing

```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov

# Watch mode
npm run test:watch
```

### Production Build

```bash
# Build
npm run build

# Start production server
npm run start:prod
```

## Project Structure

```
api/
├── src/
│   ├── auth/              # Authentication (Supabase JWT)
│   ├── prisma/            # Prisma service & module
│   ├── users/             # Users module
│   ├── listings/          # Listings module
│   ├── bookings/          # Bookings module
│   ├── channels/          # Channels module
│   ├── calendar/          # Calendar operations
│   ├── ical/              # iCal sync
│   ├── dashboard/         # Dashboard endpoints
│   ├── analytics/         # Analytics endpoints
│   ├── app.module.ts      # Root module
│   └── main.ts            # Application entry
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── migrations/        # Database migrations
├── test/
│   └── e2e/              # E2E tests
├── Dockerfile            # Production Dockerfile
├── Dockerfile.dev        # Development Dockerfile
└── package.json
```

## API Modules

### Core Modules

- **AuthModule**: Supabase JWT authentication & authorization
- **PrismaModule**: Database connection & client
- **UsersModule**: User management
- **ListingsModule**: Property listings CRUD
- **BookingsModule**: Booking management
- **ChannelsModule**: Channel management

### Feature Modules

- **CalendarModule**: Calendar operations, rates, blocking
- **IcalModule**: iCal connection & sync management
- **DashboardModule**: Aggregated dashboard data
- **AnalyticsModule**: Analytics & metrics

## API Endpoints

All endpoints are documented in Swagger at `/api/docs`

### Authentication

All endpoints (except health check) require Bearer token:

```
Authorization: Bearer <supabase-jwt-token>
```

### Main Resources

- `GET /users/me` - Get current user
- `GET /listings` - List all listings
- `POST /listings` - Create listing
- `GET /bookings` - List bookings
- `POST /bookings` - Create booking
- `GET /channels` - List channels
- `POST /calendar/rates` - Update rates
- `POST /calendar/block` - Block dates
- `GET /dashboard` - Get dashboard data
- `GET /analytics` - Get analytics

## Database Schema

The Prisma schema includes 20+ models:

- User, Listing, Booking, Channel
- RoomType, Inventory, Rate
- BlockedDate, PricingRule
- PropertyImage, IcalConnection
- CalendarEvent, CalendarAuditLog
- And more...

### View Database

```bash
# Open Prisma Studio
npx prisma studio
```

### Migrations

```bash
# Create migration
npx prisma migrate dev --name description

# Apply migrations in production
npx prisma migrate deploy

# Reset database (warning: deletes all data)
npx prisma migrate reset
```

## Docker

### Development

```bash
# Build
docker build -f Dockerfile.dev -t channelsconnect-api-dev .

# Run
docker run -p 3001:3001 --env-file .env channelsconnect-api-dev
```

### Production

```bash
# Build
docker build -t channelsconnect-api .

# Run
docker run -p 3001:3001 --env-file .env channelsconnect-api
```

## Testing Strategy

### Unit Tests

Located in `src/**/*.spec.ts` files next to the source code.

### E2E Tests

Located in `test/e2e/*.e2e-spec.ts`:

- `users.e2e-spec.ts` - User endpoints
- `listings.e2e-spec.ts` - Listing endpoints
- `bookings.e2e-spec.ts` - Booking endpoints
- `calendar.e2e-spec.ts` - Calendar endpoints
- `channels.e2e-spec.ts` - Channel endpoints
- `dashboard.e2e-spec.ts` - Dashboard endpoints

## Code Style

```bash
# Lint
npm run lint

# Format
npm run format
```

## Swagger Documentation

Swagger UI is automatically generated from decorators:

- `@ApiTags()` - Group endpoints
- `@ApiOkResponse()` - Define success response
- `@ApiCreatedResponse()` - Define creation response
- `@ApiBearerAuth()` - Require authentication

The `swagger.json` is automatically exported on startup for type generation.

## Troubleshooting

### Database Connection Issues

```bash
# Check PostgreSQL is running
pg_isready

# Test connection
psql -U postgres -d channelsconnect
```

### Prisma Issues

```bash
# Regenerate client
npx prisma generate

# Reset and regenerate
rm -rf node_modules/.prisma
npm install
npx prisma generate
```

### Port Already in Use

Change `PORT` in `.env` file.

## Contributing

1. Create feature branch
2. Write tests
3. Ensure all tests pass
4. Submit pull request

## License

Private - All rights reserved

