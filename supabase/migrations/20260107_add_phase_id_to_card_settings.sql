-- Migration: add_phase_id_to_card_settings (FINAL)
-- Description: Remove constraint restritiva, adiciona phase_id e migra dados
-- Date: 2026-01-07

-- 1. Remover a constraint que limita os nomes das fases (SDR, Planner, Pós-venda)
ALTER TABLE pipeline_card_settings
DROP CONSTRAINT IF EXISTS pipeline_card_settings_fase_check;

-- 2. Adicionar coluna phase_id (nullable por enquanto)
ALTER TABLE pipeline_card_settings
ADD COLUMN IF NOT EXISTS phase_id UUID REFERENCES pipeline_phases(id);

-- 3. Migrar dados existentes: preencher phase_id para registros que já têm fase
UPDATE pipeline_card_settings pcs
SET phase_id = pp.id
FROM pipeline_phases pp
WHERE pcs.fase = pp.name
AND pcs.phase_id IS NULL;

-- 4. Inserir defaults para fases que NÃO têm configuração ainda (ex: Resolução)
INSERT INTO pipeline_card_settings (fase, phase_id, campos_kanban, ordem_kanban)
SELECT 
    pp.name as fase,
    pp.id as phase_id,
    CASE 
        WHEN pp.name ILIKE '%sdr%' OR pp.order_index = 0 THEN 
            '["pessoa_principal", "proxima_tarefa", "prioridade", "destinos", "origem"]'::jsonb
        WHEN pp.name ILIKE '%planner%' OR pp.name ILIKE '%vendas%' THEN 
            '["pessoa_principal", "proxima_tarefa", "orcamento", "epoca_viagem", "destinos", "prioridade"]'::jsonb
        ELSE 
            '["pessoa_principal", "proxima_tarefa", "pessoas", "epoca_viagem", "destinos"]'::jsonb
    END as campos_kanban,
    CASE 
        WHEN pp.name ILIKE '%sdr%' OR pp.order_index = 0 THEN 
            '["pessoa_principal", "proxima_tarefa", "prioridade", "destinos", "origem"]'::jsonb
        WHEN pp.name ILIKE '%planner%' OR pp.name ILIKE '%vendas%' THEN 
            '["pessoa_principal", "proxima_tarefa", "orcamento", "epoca_viagem", "destinos", "prioridade"]'::jsonb
        ELSE 
            '["pessoa_principal", "proxima_tarefa", "pessoas", "epoca_viagem", "destinos"]'::jsonb
    END as ordem_kanban
FROM pipeline_phases pp
WHERE pp.active = true
AND NOT EXISTS (
    SELECT 1 FROM pipeline_card_settings pcs 
    WHERE pcs.phase_id = pp.id 
    AND pcs.usuario_id IS NULL
);

-- 5. Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_pipeline_card_settings_phase_id 
ON pipeline_card_settings(phase_id);

-- 6. Adicionar constraint UNIQUE para evitar duplicatas (se não existir)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'unique_phase_user'
    ) THEN
        ALTER TABLE pipeline_card_settings
        ADD CONSTRAINT unique_phase_user UNIQUE (phase_id, usuario_id);
    END IF;
END $$;
