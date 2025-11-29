-- =============================================
-- AUDIT LOG SCHEMA
-- Run this SQL in your Supabase SQL Editor
-- =============================================

-- 1. Create audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete')),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  old_data JSONB,
  new_data JSONB,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT
);

-- 2. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_record_id ON public.audit_logs(record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_changed_at ON public.audit_logs(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);

-- 3. Enable Row Level Security
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for audit_logs

-- Users can insert their own audit logs
CREATE POLICY "Users can insert own audit logs"
  ON public.audit_logs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can view their own audit logs
CREATE POLICY "Users can view own audit logs"
  ON public.audit_logs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all audit logs
CREATE POLICY "Admins can view all audit logs"
  ON public.audit_logs
  FOR SELECT
  USING (public.is_admin());

-- =============================================
-- OPTIONAL: Auto-create audit log via trigger
-- This is an alternative approach using database triggers
-- =============================================

-- Function to log changes automatically
CREATE OR REPLACE FUNCTION public.log_time_log_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, new_data)
    VALUES (NEW.user_id, 'create', 'time_logs', NEW.id, to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_data, new_data)
    VALUES (NEW.user_id, 'update', 'time_logs', NEW.id, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_data)
    VALUES (OLD.user_id, 'delete', 'time_logs', OLD.id, to_jsonb(OLD));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply trigger to time_logs table
DROP TRIGGER IF EXISTS audit_time_logs ON public.time_logs;
CREATE TRIGGER audit_time_logs
  AFTER INSERT OR UPDATE OR DELETE ON public.time_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.log_time_log_changes();
