-- ============================================
-- Kanban Configuration & Cleanup Migration
-- ============================================

-- 1. Cleanup duplicates
-- We want to keep the rows that have 'destinos' in campos_visiveis as they match our current implementation
-- and remove the legacy/other ones.

DELETE FROM public.pipeline_card_settings
WHERE NOT (campos_visiveis::text LIKE '%destinos%');

-- 2. Add Kanban columns if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pipeline_card_settings' AND column_name = 'campos_kanban') THEN
        ALTER TABLE public.pipeline_card_settings 
        ADD COLUMN campos_kanban JSONB NOT NULL DEFAULT '[]'::jsonb;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pipeline_card_settings' AND column_name = 'ordem_kanban') THEN
        ALTER TABLE public.pipeline_card_settings 
        ADD COLUMN ordem_kanban JSONB NOT NULL DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- 3. Seed default Kanban settings (subset of detail fields)
-- Update existing rows to have some default kanban fields

-- SDR: Show destinos, epoca_viagem, orcamento
UPDATE public.pipeline_card_settings
SET 
    campos_kanban = '["destinos", "epoca_viagem", "orcamento"]'::jsonb,
    ordem_kanban = '["destinos", "epoca_viagem", "orcamento"]'::jsonb
WHERE fase = 'SDR' AND campos_kanban = '[]'::jsonb;

-- Planner: Show destinos, epoca_viagem, orcamento, taxa_planejamento
UPDATE public.pipeline_card_settings
SET 
    campos_kanban = '["destinos", "epoca_viagem", "orcamento", "taxa_planejamento"]'::jsonb,
    ordem_kanban = '["destinos", "epoca_viagem", "orcamento", "taxa_planejamento"]'::jsonb
WHERE fase = 'Planner' AND campos_kanban = '[]'::jsonb;

-- Pós-venda: Show destinos, epoca_viagem
UPDATE public.pipeline_card_settings
SET 
    campos_kanban = '["destinos", "epoca_viagem"]'::jsonb,
    ordem_kanban = '["destinos", "epoca_viagem"]'::jsonb
WHERE fase = 'Pós-venda' AND campos_kanban = '[]'::jsonb;

-- 4. Ensure UNIQUE constraint exists (re-apply if missing/broken)
-- First drop if exists to be safe, then recreate
ALTER TABLE public.pipeline_card_settings DROP CONSTRAINT IF EXISTS pipeline_card_settings_fase_usuario_id_key;
ALTER TABLE public.pipeline_card_settings ADD CONSTRAINT pipeline_card_settings_fase_usuario_id_key UNIQUE (fase, usuario_id);
