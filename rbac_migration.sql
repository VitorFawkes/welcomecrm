-- Create Enum for Roles if it doesn't exist
DO $$ BEGIN
    CREATE TYPE public.app_role AS ENUM ('admin', 'gestor', 'sdr', 'planner', 'financeiro');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add strict role column to profiles (migrating from text)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS role_new public.app_role DEFAULT 'sdr';

-- Migrate existing data (assuming 'admin' text exists, others default to sdr)
UPDATE public.profiles SET role_new = 'admin' WHERE role = 'admin';
UPDATE public.profiles SET role_new = 'gestor' WHERE role = 'gestor';
-- Default others to sdr for safety
UPDATE public.profiles SET role_new = 'sdr' WHERE role_new IS NULL;

-- Drop old column and rename new one
ALTER TABLE public.profiles DROP COLUMN role;
ALTER TABLE public.profiles RENAME COLUMN role_new TO role;

-- Helper Functions for RLS
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_gestor()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'gestor')
  );
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_financeiro()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'gestor', 'financeiro')
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- RLS Policies Refactoring (Example: Automation Rules)

-- Enable RLS on automation_rules
ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;

-- Drop old policies if any
DROP POLICY IF EXISTS "Automation rules viewable by authenticated" ON public.automation_rules;
DROP POLICY IF EXISTS "Automation rules editable by authenticated" ON public.automation_rules;

-- New Strict Policies
CREATE POLICY "Admins and Gestores can view rules" ON public.automation_rules
    FOR SELECT USING (public.is_gestor());

CREATE POLICY "Admins and Gestores can edit rules" ON public.automation_rules
    FOR ALL USING (public.is_gestor());

-- Stage Obligations
ALTER TABLE public.stage_obligations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Obligations viewable by authenticated" ON public.stage_obligations;

CREATE POLICY "Everyone can view obligations" ON public.stage_obligations
    FOR SELECT USING (auth.role() = 'authenticated'); -- Everyone needs to see to work

CREATE POLICY "Admins and Gestores can edit obligations" ON public.stage_obligations
    FOR ALL USING (public.is_gestor());

-- Task Queue (System Table)
ALTER TABLE public.task_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "System can process queue" ON public.task_queue
    FOR ALL USING (public.is_admin()); -- Or specific service role, for now admin is safe enough for manual checks
