-- Phase 2: Data Integrity & Performance Indexes

-- 1. Audit Logs Indexes (Critical for History UI)
CREATE INDEX IF NOT EXISTS idx_audit_logs_lookup 
ON public.audit_logs (table_name, record_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_date 
ON public.audit_logs (changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user 
ON public.audit_logs (changed_by);

-- 2. Task Queue Indexes (Critical for Processor)
CREATE INDEX IF NOT EXISTS idx_task_queue_schedule 
ON public.task_queue (scheduled_for) 
WHERE processed = false; -- Partial index for unprocessed tasks

CREATE INDEX IF NOT EXISTS idx_task_queue_card 
ON public.task_queue (card_id);

-- 3. Automation & Obligations Indexes (Critical for Stage Changes)
CREATE INDEX IF NOT EXISTS idx_automation_rules_stage 
ON public.automation_rules (pipeline_stage_id);

CREATE INDEX IF NOT EXISTS idx_stage_obligations_stage 
ON public.stage_obligations (pipeline_stage_id);

-- 4. Cards Indexes (Critical for CRM Navigation)
CREATE INDEX IF NOT EXISTS idx_cards_pessoa 
ON public.cards (pessoa_principal_id);

-- 5. Foreign Key Indexes (Best Practice)
-- Ensure all FKs have indexes to avoid locking issues during updates/deletes on parent tables
CREATE INDEX IF NOT EXISTS idx_cards_pipeline_id ON public.cards(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_cards_pipeline_stage_id ON public.cards(pipeline_stage_id);
-- (Some might already exist, IF NOT EXISTS handles it)
