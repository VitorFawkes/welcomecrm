-- Create Audit Logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    record_id UUID,
    operation TEXT NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
    old_data JSONB,
    new_data JSONB,
    changed_by UUID REFERENCES auth.users(id),
    changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on audit_logs (read-only for admins, insert only via trigger/system)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Only Admins can view audit logs
CREATE POLICY "Admins can view audit logs" ON public.audit_logs
    FOR SELECT
    USING (public.is_admin());

-- Policy: No one can update/delete audit logs (immutable)
-- (No policy for UPDATE/DELETE implies deny all)

-- Trigger Function to log changes
CREATE OR REPLACE FUNCTION public.log_changes()
RETURNS TRIGGER AS $$
DECLARE
    v_old_data JSONB;
    v_new_data JSONB;
    v_record_id UUID;
BEGIN
    IF (TG_OP = 'INSERT') THEN
        v_new_data = to_jsonb(NEW);
        v_record_id = NEW.id;
    ELSIF (TG_OP = 'UPDATE') THEN
        v_old_data = to_jsonb(OLD);
        v_new_data = to_jsonb(NEW);
        v_record_id = NEW.id;
    ELSIF (TG_OP = 'DELETE') THEN
        v_old_data = to_jsonb(OLD);
        v_record_id = OLD.id;
    END IF;

    INSERT INTO public.audit_logs (
        table_name,
        record_id,
        operation,
        old_data,
        new_data,
        changed_by
    ) VALUES (
        TG_TABLE_NAME,
        v_record_id,
        TG_OP,
        v_old_data,
        v_new_data,
        auth.uid()
    );

    RETURN NULL; -- Result is ignored since this is an AFTER trigger
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply Triggers to Critical Tables

-- Cards
DROP TRIGGER IF EXISTS audit_cards_changes ON public.cards;
CREATE TRIGGER audit_cards_changes
AFTER INSERT OR UPDATE OR DELETE ON public.cards
FOR EACH ROW EXECUTE FUNCTION public.log_changes();

-- Profiles (User changes)
DROP TRIGGER IF EXISTS audit_profiles_changes ON public.profiles;
CREATE TRIGGER audit_profiles_changes
AFTER INSERT OR UPDATE OR DELETE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.log_changes();

-- Automation Rules (Config changes)
DROP TRIGGER IF EXISTS audit_automation_rules_changes ON public.automation_rules;
CREATE TRIGGER audit_automation_rules_changes
AFTER INSERT OR UPDATE OR DELETE ON public.automation_rules
FOR EACH ROW EXECUTE FUNCTION public.log_changes();

-- Stage Obligations (Config changes)
DROP TRIGGER IF EXISTS audit_stage_obligations_changes ON public.stage_obligations;
CREATE TRIGGER audit_stage_obligations_changes
AFTER INSERT OR UPDATE OR DELETE ON public.stage_obligations
FOR EACH ROW EXECUTE FUNCTION public.log_changes();

-- Tarefas (Task changes)
DROP TRIGGER IF EXISTS audit_tarefas_changes ON public.tarefas;
CREATE TRIGGER audit_tarefas_changes
AFTER INSERT OR UPDATE OR DELETE ON public.tarefas
FOR EACH ROW EXECUTE FUNCTION public.log_changes();
