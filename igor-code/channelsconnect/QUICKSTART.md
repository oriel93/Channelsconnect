# Quick Start Guide

## Prerequisites

- Node.js 18+ installed
- PostgreSQL installed (or Docker)
- Supabase account (free tier works)

## Setup in 5 Minutes

### 1. Setup Supabase (2 min)

1. Go to https://supabase.com and create a new project
2. Enable Google OAuth in Authentication > Providers
3. Copy your credentials from Settings > API:
   - Project URL
   - Anon/Public Key
   - JWT Secret (from JWT Settings)

### 2. Configure Environment Variables (1 min)

Create `api/.env`:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/channelsconnect"
SUPABASE_URL="<your-supabase-url>"
SUPABASE_ANON_KEY="<your-anon-key>"
SUPABASE_JWT_SECRET="<your-jwt-secret>"
PORT=3001
```

Create `.env` in root:
```env
VITE_SUPABASE_URL=<your-supabase-url>
VITE_SUPABASE_ANON_KEY=<your-anon-key>
VITE_API_URL=http://localhost:3001
```

### 3. Setup Database (1 min)

```bash
# Install backend dependencies
cd api
npm install

# Create database
createdb channelsconnect

# Run migrations
npx prisma migrate dev

# Go back to root
cd ..
```

### 4. Start Development (1 min)

Terminal 1 - Start Backend:
```bash
cd api
npm run start:dev
```

Terminal 2 - Start Frontend:
```bash
npm run dev
```

## Access Points

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001
- **API Documentation**: http://localhost:3001/api/docs

## First Login

1. Open http://localhost:5173
2. Click "Continue with Google"
3. Sign in with your Google account
4. You'll be redirected back and logged in!

## Troubleshooting

### Backend won't start
- Check PostgreSQL is running: `pg_isready`
- Check DATABASE_URL in api/.env
- Check Supabase credentials

### Frontend shows connection errors
- Check backend is running on port 3001
- Check VITE_API_URL in .env
- Check browser console for specific errors

### Authentication not working
- Verify Supabase credentials are correct
- Check Google OAuth is enabled in Supabase
- Check redirect URLs are configured in Supabase

### Database errors
- Run migrations: `cd api && npx prisma migrate dev`
- Reset database: `npx prisma migrate reset` (warning: deletes all data)
- Check Prisma schema: `npx prisma studio` (opens visual database browser)

## What's Next?

1. **Explore API**: Visit http://localhost:3001/api/docs to see all endpoints
2. **Add Listings**: Create your first property listing
3. **Test Calendar**: Try blocking dates and updating rates
4. **Connect Channels**: Configure channel connections

## Need Help?

Check the full documentation in MIGRATION_README.md

