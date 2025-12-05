-- Phase 3: User Management

-- 1. Add Active Status
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;

-- 2. Update Helper Functions to check Active status
-- This ensures inactive users effectively lose all access immediately

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'::public.app_role
    AND active = true
  );
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_gestor()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin'::public.app_role, 'gestor'::public.app_role)
    AND active = true
  );
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_operational()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN (
        'admin'::public.app_role, 
        'gestor'::public.app_role, 
        'sdr'::public.app_role, 
        'vendas'::public.app_role, 
        'pos_venda'::public.app_role, 
        'concierge'::public.app_role
    )
    AND active = true
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- 3. Policy for User Management (Admins can edit profiles)
-- Existing policy "Profiles update own or admin" might be loose.
-- Let's tighten it.

DROP POLICY IF EXISTS "Profiles update own or admin" ON public.profiles;

CREATE POLICY "Admins can update any profile" ON public.profiles
    FOR UPDATE
    USING (public.is_admin());

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE
    USING (auth.uid() = id);

-- Ensure Admins can view all profiles (usually covered by 'viewable by authenticated' but let's be sure)
-- Existing: "Profiles viewable by authenticated" -> OK.
