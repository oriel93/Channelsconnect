-- ============================================
-- SUPABASE USER MANAGEMENT SETUP
-- ============================================
-- This script sets up automatic user profile creation
-- and Row Level Security (RLS) policies
-- Run this in your Supabase SQL Editor
-- ============================================

-- 1️⃣ DROP EXISTING TRIGGER AND FUNCTION (if exists)
-- ============================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS auth.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- 2️⃣ CREATE FUNCTION TO AUTO-CREATE USER PROFILE
-- ============================================
-- This function runs whenever a new user signs up via Supabase Auth
-- Function is created in auth schema to have proper access to auth.users
CREATE OR REPLACE FUNCTION auth.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert a new user profile automatically
  INSERT INTO public.users (id, email, name, role, "createdAt", "updatedAt")
  VALUES (
    NEW.id,                              -- Same UUID as auth.users
    NEW.email,                           -- Email from auth
    NEW.raw_user_meta_data->>'full_name', -- Extract name from metadata
    'user',                              -- Default role
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;           -- Prevent duplicates
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3️⃣ CREATE TRIGGER ON AUTH.USERS
-- ============================================
-- Trigger fires AFTER a new user is inserted into auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION auth.handle_new_user();

-- 4️⃣ DISABLE ROW LEVEL SECURITY (RLS)
-- ============================================
-- RLS is disabled - all authenticated users have full access
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Service role can do anything" ON public.users;

-- 5️⃣ CREATE INDEX FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- 6️⃣ DISABLE RLS ON RELATED TABLES
-- ============================================
-- RLS is disabled - all authenticated users have full access
ALTER TABLE public.listings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view own listings" ON public.listings;
DROP POLICY IF EXISTS "Users can manage own listings" ON public.listings;
DROP POLICY IF EXISTS "Service role can do anything on listings" ON public.listings;

DROP POLICY IF EXISTS "Users can view own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can manage own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Service role can do anything on bookings" ON public.bookings;

-- 7️⃣ GRANT NECESSARY PERMISSIONS
-- ============================================
-- Allow authenticated users full access to all tables
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.listings TO authenticated;
GRANT ALL ON public.bookings TO authenticated;

-- Allow service role full access
GRANT ALL ON public.users TO service_role;
GRANT ALL ON public.listings TO service_role;
GRANT ALL ON public.bookings TO service_role;

-- ============================================
-- VERIFICATION QUERIES (Run these to test)
-- ============================================

-- Check if trigger exists:
-- SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';

-- Check if function exists:
-- SELECT routine_name, routine_schema FROM information_schema.routines 
-- WHERE routine_name = 'handle_new_user';
-- Should show: handle_new_user | auth

-- Check RLS status (should be disabled):
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';

-- Test user creation (should auto-create profile):
-- SELECT * FROM auth.users;
-- SELECT * FROM public.users;

COMMENT ON FUNCTION auth.handle_new_user() IS 
'Automatically creates a user profile in public.users when a new user signs up via Supabase Auth';

COMMENT ON TABLE public.users IS 
'User profiles table - automatically populated via trigger when users sign up. No RLS restrictions.';

