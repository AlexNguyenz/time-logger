-- =============================================
-- FIX RLS POLICIES - Run this in Supabase SQL Editor
-- =============================================

-- Drop existing policies that cause recursion
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.profiles;

DROP POLICY IF EXISTS "Users can view own time logs" ON public.time_logs;
DROP POLICY IF EXISTS "Admins can view all time logs" ON public.time_logs;
DROP POLICY IF EXISTS "Users can insert own time logs" ON public.time_logs;
DROP POLICY IF EXISTS "Users can update own time logs" ON public.time_logs;
DROP POLICY IF EXISTS "Users can delete own time logs" ON public.time_logs;

-- =============================================
-- NEW PROFILES POLICIES (without recursion)
-- =============================================

-- Allow users to read their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Allow users to insert their own profile during signup
CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- =============================================
-- NEW TIME_LOGS POLICIES
-- =============================================

-- Users can read their own time logs
CREATE POLICY "Users can view own time logs"
  ON public.time_logs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own time logs
CREATE POLICY "Users can insert own time logs"
  ON public.time_logs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own time logs
CREATE POLICY "Users can update own time logs"
  ON public.time_logs
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own time logs
CREATE POLICY "Users can delete own time logs"
  ON public.time_logs
  FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================
-- ADMIN POLICIES using JWT claim (no recursion)
-- We'll use a database function to check admin role
-- =============================================

-- Create a security definer function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin can view all profiles
CREATE POLICY "Admins can view all profiles"
  ON public.profiles
  FOR SELECT
  USING (public.is_admin());

-- Admin can view all time logs
CREATE POLICY "Admins can view all time logs"
  ON public.time_logs
  FOR SELECT
  USING (public.is_admin());
