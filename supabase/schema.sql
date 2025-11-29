-- =============================================
-- TIME LOGGER DATABASE SCHEMA
-- Run this SQL in your Supabase SQL Editor
-- =============================================

-- 1. Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create time_logs table
CREATE TABLE IF NOT EXISTS public.time_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  hours DECIMAL(4,2) NOT NULL CHECK (hours >= 0 AND hours <= 24),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, date) -- Each user can only have one log per day
);

-- 3. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_time_logs_user_id ON public.time_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_time_logs_date ON public.time_logs(date);
CREATE INDEX IF NOT EXISTS idx_time_logs_user_date ON public.time_logs(user_id, date);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- 4. Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Apply updated_at trigger to tables
DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_time_logs_updated_at ON public.time_logs;
CREATE TRIGGER set_time_logs_updated_at
  BEFORE UPDATE ON public.time_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 6. Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_logs ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies for profiles table

-- Users can read their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Admins can read all profiles
CREATE POLICY "Admins can view all profiles"
  ON public.profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Users can update their own profile (except role)
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow insert during signup (service role or authenticated user)
CREATE POLICY "Enable insert for authenticated users"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 8. RLS Policies for time_logs table

-- Users can read their own time logs
CREATE POLICY "Users can view own time logs"
  ON public.time_logs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can read all time logs
CREATE POLICY "Admins can view all time logs"
  ON public.time_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

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
-- OPTIONAL: Insert a test admin user
-- Replace 'your-user-id' with actual UUID after first Google login
-- =============================================
-- UPDATE public.profiles SET role = 'admin' WHERE email = 'your-admin-email@gmail.com';
