-- Migration: Minimal Change Tracking
-- 1. Add briefing_inicial to cards
ALTER TABLE public.cards 
ADD COLUMN IF NOT EXISTS briefing_inicial JSONB;

-- 2. Add started_at to tarefas
ALTER TABLE public.tarefas 
ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;

-- 3. Function to snapshot briefing
CREATE OR REPLACE FUNCTION public.snapshot_briefing_inicial()
RETURNS TRIGGER AS $$
BEGIN
    -- Trigger on specific stage: Viagem Aprovada (ID: 6bf4eddc-831a-4a6a-915c-98ca4e422bfc)
    -- Only snapshot if briefing_inicial is empty to avoid overwriting if moved back and forth
    IF NEW.pipeline_stage_id = '6bf4eddc-831a-4a6a-915c-98ca4e422bfc' AND OLD.pipeline_stage_id != '6bf4eddc-831a-4a6a-915c-98ca4e422bfc' THEN
        IF NEW.briefing_inicial IS NULL THEN
            NEW.briefing_inicial := NEW.produto_data;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Trigger definition
DROP TRIGGER IF EXISTS trg_snapshot_briefing ON public.cards;
CREATE TRIGGER trg_snapshot_briefing
BEFORE UPDATE ON public.cards
FOR EACH ROW
EXECUTE FUNCTION public.snapshot_briefing_inicial();
