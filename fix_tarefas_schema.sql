-- Fix Tarefas Table Schema
-- Adds missing columns that are expected by the application

DO $$
BEGIN
    -- Add 'tipo' column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tarefas' AND column_name = 'tipo') THEN
        ALTER TABLE public.tarefas ADD COLUMN tipo text CHECK (tipo IN ('ligacao', 'whatsapp', 'email', 'reuniao', 'enviar_proposta', 'followup', 'cobrar_taxa', 'outro')) DEFAULT 'outro';
    END IF;

    -- Add 'prioridade' column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tarefas' AND column_name = 'prioridade') THEN
        ALTER TABLE public.tarefas ADD COLUMN prioridade text CHECK (prioridade IN ('baixa', 'media', 'alta')) DEFAULT 'media';
    END IF;

    -- Add 'concluida' column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tarefas' AND column_name = 'concluida') THEN
        ALTER TABLE public.tarefas ADD COLUMN concluida boolean DEFAULT false;
    END IF;

    -- Add 'concluida_em' column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tarefas' AND column_name = 'concluida_em') THEN
        ALTER TABLE public.tarefas ADD COLUMN concluida_em timestamptz;
    END IF;

    -- Add 'data_vencimento' column if it doesn't exist (it should, but just in case)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tarefas' AND column_name = 'data_vencimento') THEN
        ALTER TABLE public.tarefas ADD COLUMN data_vencimento timestamptz;
    END IF;

END $$;
