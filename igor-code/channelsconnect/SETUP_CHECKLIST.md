# Setup Checklist

Use this checklist to get your Channels Connect application running.

## ☐ Prerequisites

- [ ] Node.js 18+ installed (`node --version`)
- [ ] PostgreSQL installed OR Docker installed
- [ ] Git installed (optional)

## ☐ Supabase Setup (5 min)

1. [ ] Go to https://supabase.com and sign up/login
2. [ ] Click "New Project"
3. [ ] Fill in project details and wait for setup
4. [ ] Go to Settings > API
5. [ ] Copy these values:
   - [ ] Project URL
   - [ ] anon/public key
6. [ ] Go to Settings > API > JWT Settings
7. [ ] Copy JWT Secret
8. [ ] Go to Authentication > Providers
9. [ ] Enable Google OAuth provider
10. [ ] Add redirect URLs:
    - [ ] `http://localhost:5173`
    - [ ] Your production URL (when ready)

## ☐ Database Setup (5 min)

Choose Option A (Docker) OR Option B (Local PostgreSQL):

### Option A: Using Docker (Recommended)

```bash
# Start PostgreSQL container
docker-compose up -d

# Verify it's running
docker ps
```

### Option B: Using Local PostgreSQL

```bash
# Create database
createdb channelsconnect

# Or using psql:
psql -U postgres
CREATE DATABASE channelsconnect;
\q
```

## ☐ Backend Configuration (10 min)

1. [ ] Create `api/.env` file:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/channelsconnect"
SUPABASE_URL="https://YOUR-PROJECT.supabase.co"
SUPABASE_ANON_KEY="your-anon-key-here"
SUPABASE_JWT_SECRET="your-jwt-secret-here"
PORT=3001
FRONTEND_URL="http://localhost:5173"
```

2. [ ] Install backend dependencies:
```bash
cd api
npm install
```

3. [ ] Generate Prisma Client:
```bash
npx prisma generate
```

4. [ ] Run database migrations:
```bash
npx prisma migrate dev --name init
```

5. [ ] Verify database setup:
```bash
npx prisma studio
# Opens browser at http://localhost:5555
# You should see all your tables
```

## ☐ Frontend Configuration (5 min)

1. [ ] Create `.env` file in project root:

```env
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_API_URL=http://localhost:3001
```

2. [ ] Install frontend dependencies:
```bash
# From project root
npm install
```

## ☐ Start Development Servers (2 min)

### Terminal 1 - Backend
```bash
cd api
npm run start:dev
```

Wait for:
```
✅ Prisma connected to database
🚀 Application is running on: http://localhost:3001
📚 Swagger documentation: http://localhost:3001/api/docs
```

### Terminal 2 - Frontend
```bash
# From project root
npm run dev
```

Wait for:
```
  VITE v6.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
```

## ☐ Test the Application (5 min)

1. [ ] Open browser to http://localhost:5173
2. [ ] Click "Continue with Google"
3. [ ] Sign in with Google account
4. [ ] Should be redirected back and logged in
5. [ ] Check browser console - no errors
6. [ ] Visit http://localhost:3001/api/docs
7. [ ] See Swagger documentation
8. [ ] Test an endpoint (e.g., GET /users/me)

## ☐ Create First Listing (Optional)

1. [ ] In the app, go to "Import Listings" or "My Listings"
2. [ ] Click "Add Listing"
3. [ ] Fill in property details
4. [ ] Save
5. [ ] View in dashboard

## ☐ Troubleshooting

### Backend Issues

**Port 3001 already in use:**
```bash
# Change PORT in api/.env to something else like 3002
# Update VITE_API_URL in .env to match
```

**Database connection failed:**
```bash
# Check PostgreSQL is running
pg_isready

# Or if using Docker:
docker ps

# Test connection:
psql -U postgres -d channelsconnect
```

**Prisma errors:**
```bash
cd api
rm -rf node_modules
npm install
npx prisma generate
npx prisma migrate dev
```

### Frontend Issues

**401 Unauthorized errors:**
- [ ] Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are correct
- [ ] Check you're signed in
- [ ] Check browser console for token errors

**Can't sign in:**
- [ ] Check Google OAuth is enabled in Supabase
- [ ] Check redirect URL is configured in Supabase
- [ ] Check Supabase credentials are correct

**API connection errors:**
- [ ] Check backend is running on http://localhost:3001
- [ ] Check VITE_API_URL in .env
- [ ] Check browser console for CORS errors

### Database Issues

**Migration failed:**
```bash
cd api
npx prisma migrate reset
npx prisma migrate dev --name init
```

**Tables not created:**
```bash
cd api
npx prisma db push
```

## ✅ Success Indicators

You're all set if:
- [ ] Backend running without errors
- [ ] Frontend loads at http://localhost:5173
- [ ] Can sign in with Google
- [ ] Can view Swagger docs at http://localhost:3001/api/docs
- [ ] Dashboard loads with user data
- [ ] No console errors

## 🎉 You're Ready!

Congratulations! Your Channels Connect application is now running.

Next steps:
- Explore the Swagger API documentation
- Create your first property listing
- Test calendar operations
- Configure channel connections

Need help? Check:
- MIGRATION_README.md for detailed documentation
- QUICKSTART.md for quick reference
- Open an issue on GitHub

