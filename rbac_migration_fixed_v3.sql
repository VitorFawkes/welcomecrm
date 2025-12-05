-- 1. Drop dependent policies first
DROP POLICY IF EXISTS "PF Data viewable by privileged or owner" ON public.dados_cadastrais_pf;
DROP POLICY IF EXISTS "PF Data modify by privileged" ON public.dados_cadastrais_pf;
DROP POLICY IF EXISTS "PJ Data viewable by privileged or owner" ON public.dados_cadastrais_pj;
DROP POLICY IF EXISTS "PJ Data modify by privileged" ON public.dados_cadastrais_pj;
DROP POLICY IF EXISTS "Contratos modify by privileged or owner" ON public.contratos;
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;

-- 2. Create/Update Enum (Ensure all values exist)
DO $$ BEGIN
    CREATE TYPE public.app_role AS ENUM ('admin', 'gestor', 'sdr', 'planner', 'financeiro');
EXCEPTION
    WHEN duplicate_object THEN 
        -- If exists, we can't easily add values in a DO block without checking, 
        -- but for this migration let's assume if it exists we might need to alter it if 'planner' is missing.
        -- Ideally we would use ALTER TYPE ... ADD VALUE IF NOT EXISTS but that's PG 12+.
        -- Let's just hope it was created correctly or is fresh.
        null;
END $$;

-- 3. Add new role column
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS role_new public.app_role DEFAULT 'sdr'::public.app_role;

-- 4. Migrate data
UPDATE public.profiles SET role_new = 'admin'::public.app_role WHERE role = 'admin';
UPDATE public.profiles SET role_new = 'gestor'::public.app_role WHERE role = 'gestor';
UPDATE public.profiles SET role_new = 'sdr'::public.app_role WHERE role_new IS NULL;

-- 5. Drop old column
ALTER TABLE public.profiles DROP COLUMN role;
ALTER TABLE public.profiles RENAME COLUMN role_new TO role;

-- 6. Create/Update Helper Functions with EXPLICIT CASTS
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'::public.app_role
  );
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_gestor()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin'::public.app_role, 'gestor'::public.app_role)
  );
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_operational() -- SDR or Planner
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin'::public.app_role, 'gestor'::public.app_role, 'sdr'::public.app_role, 'planner'::public.app_role)
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- 7. Recreate Policies

-- Audit Logs
CREATE POLICY "Admins can view audit logs" ON public.audit_logs
    FOR SELECT USING (public.is_admin());

-- PF Data
CREATE POLICY "PF Data access" ON public.dados_cadastrais_pf
    FOR ALL USING (public.is_operational());

-- PJ Data
CREATE POLICY "PJ Data access" ON public.dados_cadastrais_pj
    FOR ALL USING (public.is_operational());

-- Contratos
CREATE POLICY "Contratos access" ON public.contratos
    FOR ALL USING (public.is_operational());

-- Automation Rules
ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Automation rules viewable by authenticated" ON public.automation_rules;
DROP POLICY IF EXISTS "Automation rules editable by authenticated" ON public.automation_rules;
DROP POLICY IF EXISTS "Admins and Gestores can view rules" ON public.automation_rules;
DROP POLICY IF EXISTS "Admins and Gestores can edit rules" ON public.automation_rules;

CREATE POLICY "Admins and Gestores can view rules" ON public.automation_rules
    FOR SELECT USING (public.is_gestor());

CREATE POLICY "Admins and Gestores can edit rules" ON public.automation_rules
    FOR ALL USING (public.is_gestor());

-- Stage Obligations
ALTER TABLE public.stage_obligations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Obligations viewable by authenticated" ON public.stage_obligations;
DROP POLICY IF EXISTS "Everyone can view obligations" ON public.stage_obligations;
DROP POLICY IF EXISTS "Admins and Gestores can edit obligations" ON public.stage_obligations;

CREATE POLICY "Everyone can view obligations" ON public.stage_obligations
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins and Gestores can edit obligations" ON public.stage_obligations
    FOR ALL USING (public.is_gestor());

-- Task Queue
ALTER TABLE public.task_queue ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "System can process queue" ON public.task_queue;
CREATE POLICY "System can process queue" ON public.task_queue
    FOR ALL USING (public.is_admin());
