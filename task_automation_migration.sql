-- 1. Automation Rules Table
CREATE TABLE IF NOT EXISTS public.automation_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pipeline_id UUID NOT NULL, -- References pipelines(id) if exists, or just logical
    stage_id UUID NOT NULL,
    delay_minutes INTEGER DEFAULT 0, -- 0 = immediate
    task_title TEXT NOT NULL,
    task_type TEXT NOT NULL, -- 'ligacao', 'whatsapp', 'email', etc.
    task_priority TEXT DEFAULT 'media',
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Task Queue Table (for delayed tasks)
CREATE TABLE IF NOT EXISTS public.task_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    card_id UUID NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
    rule_id UUID REFERENCES public.automation_rules(id),
    scheduled_for TIMESTAMPTZ NOT NULL,
    processed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    error_message TEXT
);

-- 3. Stage Obligations Table (Configuration)
CREATE TABLE IF NOT EXISTS public.stage_obligations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pipeline_id UUID NOT NULL,
    stage_id UUID NOT NULL,
    title TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('manual_check', 'field_required')),
    config JSONB DEFAULT '{}'::jsonb, -- e.g. {"field": "motivo_viagem"}
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Card Obligations Table (Status for each card)
CREATE TABLE IF NOT EXISTS public.card_obligations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    card_id UUID NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
    obligation_id UUID NOT NULL REFERENCES public.stage_obligations(id),
    completed BOOLEAN DEFAULT false,
    completed_by UUID, -- REFERENCES auth.users(id)
    completed_at TIMESTAMPTZ,
    UNIQUE(card_id, obligation_id)
);

-- 5. Trigger Function to Schedule Tasks
CREATE OR REPLACE FUNCTION public.schedule_tasks_on_stage_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Only run if pipeline_stage_id changed or it's a new card
    IF (TG_OP = 'INSERT') OR (TG_OP = 'UPDATE' AND OLD.pipeline_stage_id IS DISTINCT FROM NEW.pipeline_stage_id) THEN
        
        -- Insert into queue based on rules for the new stage
        INSERT INTO public.task_queue (card_id, rule_id, scheduled_for)
        SELECT 
            NEW.id,
            r.id,
            NOW() + (r.delay_minutes || ' minutes')::INTERVAL
        FROM public.automation_rules r
        WHERE r.stage_id = NEW.pipeline_stage_id
          AND r.active = true;
          
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Attach Trigger to Cards
DROP TRIGGER IF EXISTS trigger_schedule_tasks ON public.cards;
CREATE TRIGGER trigger_schedule_tasks
AFTER INSERT OR UPDATE OF pipeline_stage_id ON public.cards
FOR EACH ROW
EXECUTE FUNCTION public.schedule_tasks_on_stage_change();

-- 7. Function to Process Queue (to be called via Cron or Edge Function)
CREATE OR REPLACE FUNCTION public.process_task_queue()
RETURNS INTEGER AS $$
DECLARE
    r RECORD;
    processed_count INTEGER := 0;
BEGIN
    FOR r IN 
        SELECT q.*, ar.task_title, ar.task_type, ar.task_priority, c.dono_atual_id
        FROM public.task_queue q
        JOIN public.automation_rules ar ON q.rule_id = ar.id
        JOIN public.cards c ON q.card_id = c.id
        WHERE q.processed = false 
          AND q.scheduled_for <= NOW()
        FOR UPDATE SKIP LOCKED -- Prevent concurrency issues
    LOOP
        -- Create the actual task
        INSERT INTO public.tarefas (
            card_id, 
            titulo, 
            tipo, 
            data_vencimento, 
            prioridade, 
            responsavel_id
        ) VALUES (
            r.card_id,
            r.task_title,
            r.task_type,
            NOW(), -- Due now (or we could add another delay logic)
            r.task_priority,
            r.dono_atual_id -- Assign to card owner
        );

        -- Mark as processed
        UPDATE public.task_queue 
        SET processed = true 
        WHERE id = r.id;

        processed_count := processed_count + 1;
    END LOOP;

    RETURN processed_count;
END;
$$ LANGUAGE plpgsql;

-- 8. Seed Data (Example Rules)
-- We need valid stage_ids. Since I don't know them dynamically, I will use a placeholder approach 
-- or try to select them if possible. For now, let's assume the user will configure them or we use a DO block.

DO $$
DECLARE
    v_stage_new UUID;
    v_stage_contact UUID;
    v_pipeline_id UUID;
BEGIN
    -- Try to find 'Novo Lead' stage (adjust name as needed based on your actual data)
    SELECT id, pipeline_id INTO v_stage_new, v_pipeline_id FROM public.stages WHERE name ILIKE '%Novo%' LIMIT 1;
    
    IF v_stage_new IS NOT NULL THEN
        -- Rule: Create 'Entrar em Contato' task 10 mins after entering New Lead
        INSERT INTO public.automation_rules (pipeline_id, stage_id, delay_minutes, task_title, task_type, task_priority)
        VALUES (v_pipeline_id, v_stage_new, 10, 'Entrar em Contato (Automático)', 'ligacao', 'alta');

        -- Obligation: 'Validar Telefone'
        INSERT INTO public.stage_obligations (pipeline_id, stage_id, title, type)
        VALUES (v_pipeline_id, v_stage_new, 'Validar Telefone', 'manual_check');
    END IF;

    -- Try to find 'Tentativa de Contato'
    SELECT id INTO v_stage_contact FROM public.stages WHERE name ILIKE '%Tentativa%' LIMIT 1;
    
    IF v_stage_contact IS NOT NULL THEN
        -- Rule: Create 'Tentar Novamente' task 24h (1440 min) after entering
        INSERT INTO public.automation_rules (pipeline_id, stage_id, delay_minutes, task_title, task_type, task_priority)
        VALUES (v_pipeline_id, v_stage_contact, 1440, 'Tentar Contato Novamente', 'whatsapp', 'media');
        
        -- Obligation: 'Preencher Motivo' (Field check example)
        -- Assuming there is a field called 'motivo_perda' or similar, but let's use a generic one
        INSERT INTO public.stage_obligations (pipeline_id, stage_id, title, type, config)
        VALUES (v_pipeline_id, v_stage_contact, 'Preencher Observações', 'field_required', '{"field": "description"}');
    END IF;

END $$;
