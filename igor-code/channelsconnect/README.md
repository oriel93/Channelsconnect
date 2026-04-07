# Channels Connect

A comprehensive property management and channel management platform built with NestJS, Prisma, PostgreSQL, and Supabase.

## Overview

Channels Connect is a full-stack application for managing vacation rentals across multiple booking channels. It provides calendar management, rate optimization, booking tracking, and multi-channel distribution.

## Architecture

- **Frontend**: React + Vite + TailwindCSS
- **Backend**: NestJS + Prisma + PostgreSQL
- **Authentication**: Supabase Auth (Google OAuth, Email/Password)
- **Database**: PostgreSQL with Prisma ORM
- **API Documentation**: Swagger/OpenAPI

## Quick Start

### Option 1: Docker (Recommended)

```bash
# 1. Configure environment
# Create .env file in root with your Supabase credentials

# 2. Start everything
docker-compose up -d

# 3. Access
# Frontend: http://localhost
# API: http://localhost:3001
# Docs: http://localhost:3001/api/docs
```

### Option 2: Local Development

```bash
# 1. Setup Supabase at https://supabase.com

# 2. Install backend dependencies
cd api
npm install
createdb channelsconnect
npx prisma migrate dev

# 3. Install frontend dependencies
cd ../app
npm install

# 4. Run services (in separate terminals)
# Terminal 1: cd api && npm run start:dev
# Terminal 2: cd app && npm run dev
```

See [QUICKSTART.md](QUICKSTART.md) or [DOCKER_GUIDE.md](DOCKER_GUIDE.md) for detailed setup.

Access:
- Frontend: http://localhost:5173 (dev) or http://localhost (prod)
- Backend: http://localhost:3001
- API Docs: http://localhost:3001/api/docs

## Project Structure

```
/
├── api/                    # NestJS Backend
│   ├── src/               # Source code
│   ├── test/              # E2E tests
│   ├── prisma/            # Database
│   ├── Dockerfile         # Production
│   ├── Dockerfile.dev     # Development
│   ├── package.json       # Backend dependencies
│   └── README.md          # Backend docs
│
├── app/                    # React Frontend
│   ├── components/        # UI components
│   ├── pages/             # Routes
│   ├── lib/               # Services & API client
│   ├── scripts/           # Build scripts
│   ├── Dockerfile         # Production
│   ├── Dockerfile.dev     # Development
│   ├── index.html         # Entry point
│   ├── vite.config.js     # Vite config
│   ├── package.json       # Frontend dependencies
│   └── README.md          # Frontend docs
│
├── docker-compose.yml      # Production compose
├── docker-compose.dev.yml  # Development compose
├── README.md               # This file
├── QUICKSTART.md           # Quick setup
├── DOCKER_GUIDE.md         # Docker guide
└── FINAL_SUMMARY.md        # Complete summary
```

## Features

### Core Features
- ✅ Property/Listing Management
- ✅ Booking Management
- ✅ Multi-Channel Distribution
- ✅ Calendar & Rate Management
- ✅ iCal Sync
- ✅ Dashboard & Analytics
- ✅ Supabase Authentication
- ✅ REST API with Swagger Docs

### Developer Features
- ✅ Docker Support (Production & Dev)
- ✅ Comprehensive E2E Tests
- ✅ Auto-Generated TypeScript Types
- ✅ Separate Package Management
- ✅ Hot Reload in Development

### Coming Soon
- 🚧 Image Management
- 🚧 Excel Import/Export
- 🚧 PriceLabs Integration
- 🚧 Beds24 Integration

## Documentation

- **[QUICKSTART.md](QUICKSTART.md)** - Get started in 5 minutes
- **[DOCKER_GUIDE.md](DOCKER_GUIDE.md)** - Complete Docker guide
- **[FINAL_SUMMARY.md](FINAL_SUMMARY.md)** - Implementation summary
- **[MIGRATION_README.md](MIGRATION_README.md)** - Full documentation
- **[api/README.md](api/README.md)** - Backend documentation
- **[app/README.md](app/README.md)** - Frontend documentation
- **API Docs** - http://localhost:3001/api/docs (when running)

## Development

### Backend Development

```bash
cd api
npm install
npm run start:dev   # Watch mode
npm test            # Run tests
npm run test:e2e    # E2E tests
npx prisma studio   # Database GUI
```

### Frontend Development

```bash
cd app
npm install
npm run dev                    # Dev server
npm run build                  # Build
npm run generate-api-types     # Generate types from API
```

### Docker Development

```bash
# Start development environment with hot reload
docker-compose -f docker-compose.dev.yml up

# Run tests in container
docker-compose exec api npm run test:e2e

# View logs
docker-compose logs -f api
docker-compose logs -f app

# Stop everything
docker-compose down
```

### Database

```bash
cd api

# Prisma Studio (GUI)
npx prisma studio

# Create migration
npx prisma migrate dev --name description

# Apply migrations (production)
npx prisma migrate deploy

# Reset database (warning: deletes data)
npx prisma migrate reset

# Generate Prisma Client
npx prisma generate
```

## Tech Stack

### Backend
- NestJS 10
- Prisma 5
- PostgreSQL
- Supabase Auth
- Swagger/OpenAPI
- TypeScript

### Frontend
- React 18
- Vite 6
- TailwindCSS
- Radix UI
- Axios
- Supabase JS Client

## Testing

### Backend Tests

```bash
cd api

# Unit tests
npm test

# E2E tests (all endpoints)
npm run test:e2e

# Coverage report
npm run test:cov

# Watch mode
npm run test:watch
```

### Test Files
- `test/e2e/users.e2e-spec.ts` - User endpoints
- `test/e2e/listings.e2e-spec.ts` - Listing CRUD
- `test/e2e/bookings.e2e-spec.ts` - Booking management
- `test/e2e/calendar.e2e-spec.ts` - Calendar operations
- `test/e2e/channels.e2e-spec.ts` - Channel management
- `test/e2e/dashboard.e2e-spec.ts` - Dashboard data

## API Type Generation

The frontend can automatically generate TypeScript types from the backend API:

```bash
# 1. Make sure API is running
cd api
npm run start:dev

# 2. In another terminal, generate types
cd app
npm run generate-api-types

# Generated files:
# - lib/generated/api-types.ts
# - lib/generated/swagger-schema.json
```

Use the generated types:
```typescript
import { ListingEntity, BookingEntity } from '@/lib/generated/api-types';
```

## Docker Commands

### Production Deployment

```bash
# Build and start
docker-compose up -d

# View status
docker-compose ps

# View logs
docker-compose logs -f

# Stop
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

### Development

```bash
# Start with hot reload
docker-compose -f docker-compose.dev.yml up

# Rebuild after changes
docker-compose -f docker-compose.dev.yml up --build

# Run specific service
docker-compose up api
docker-compose up app
```

### Database Management

```bash
# Access PostgreSQL
docker-compose exec postgres psql -U postgres -d channelsconnect

# Run migrations
docker-compose exec api npx prisma migrate deploy

# Prisma Studio
docker-compose exec api npx prisma studio

# Backup database
docker-compose exec postgres pg_dump -U postgres channelsconnect > backup.sql

# Restore database
docker-compose exec -T postgres psql -U postgres channelsconnect < backup.sql
```

## Environment Variables

### Backend (`api/.env`)
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/channelsconnect"
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_JWT_SECRET="your-jwt-secret"
PORT=3001
FRONTEND_URL="http://localhost:5173"
```

### Frontend (`app/.env`)
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_URL=http://localhost:3001
```

### Docker (`.env` in root for docker-compose)
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_JWT_SECRET=your-jwt-secret
```

## Troubleshooting

### Backend Issues
```bash
# Check if running
curl http://localhost:3001/health

# View logs
cd api
npm run start:dev

# In Docker
docker-compose logs api
```

### Frontend Issues
```bash
# Clear cache
cd app
rm -rf node_modules dist .vite
npm install

# Check Vite config
cat vite.config.js
```

### Database Issues
```bash
# Check connection
pg_isready -h localhost -p 5432

# Regenerate Prisma Client
cd api
npx prisma generate

# Reset database
npx prisma migrate reset
```

### Docker Issues
```bash
# Remove all containers
docker-compose down

# Rebuild from scratch
docker-compose build --no-cache

# Check logs
docker-compose logs -f api
docker-compose logs -f app
```

## Production Deployment

See [DOCKER_GUIDE.md](DOCKER_GUIDE.md) for detailed production deployment instructions.

Quick steps:
1. Set up production database (Railway, Render, AWS RDS, etc.)
2. Configure environment variables
3. Deploy API (Railway, Render, Fly.io, etc.)
4. Deploy frontend (Vercel, Netlify, Cloudflare Pages, etc.)
5. Or use Docker Compose for full stack deployment

## Contributing

1. Fork the repository
2. Create a feature branch
3. Write tests for new features
4. Ensure all tests pass
5. Submit a pull request

## Support

For issues or questions:
1. Check documentation in `/docs`
2. Review API docs at http://localhost:3001/api/docs
3. Check Prisma schema in `api/prisma/schema.prisma`
4. Open an issue on GitHub

## License

Private - All rights reserved
