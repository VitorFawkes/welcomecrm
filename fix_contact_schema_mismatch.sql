-- ===================================================================
-- MIGRATION: Fix Contact Schema Mismatch
-- Description: Align cards table and views to use 'contatos' instead of 'pessoas'
-- ===================================================================

-- 1. Migrate data from 'pessoas' to 'contatos' (if any)
-- We only migrate if the email doesn't already exist in contatos to avoid duplicates
-- 1. Migrate data from 'pessoas' to 'contatos' (SKIPPED - table does not exist)
-- INSERT INTO contatos ...

-- 2. Drop the old view that depends on 'pessoas' (CASCADE to drop dependent views)
DROP VIEW IF EXISTS public.view_cards_acoes CASCADE;

-- 3. Update 'cards' table foreign key
-- First drop the old constraint
ALTER TABLE cards DROP CONSTRAINT IF EXISTS cards_pessoa_principal_id_fkey;

-- Add the new constraint referencing 'contatos'
-- We use ON DELETE SET NULL to keep the card even if contact is deleted
ALTER TABLE cards 
ADD CONSTRAINT cards_pessoa_principal_id_fkey 
FOREIGN KEY (pessoa_principal_id) 
REFERENCES contatos(id) 
ON DELETE SET NULL;

-- 4. Recreate the view 'view_cards_acoes' using 'contatos'
CREATE OR REPLACE VIEW public.view_cards_acoes AS
SELECT
    c.id,
    c.titulo,
    c.produto,
    c.pipeline_id,
    c.pipeline_stage_id,
    c.pessoa_principal_id,
    c.valor_estimado,
    c.dono_atual_id,
    c.status_comercial,
    c.produto_data,
    c.cliente_recorrente,
    c.prioridade,
    c.data_viagem_inicio,
    c.created_at,
    c.updated_at,
    
    -- Stage info
    s.fase,
    s.nome as etapa_nome,
    s.ordem as etapa_ordem,
    
    -- Pipeline info
    p.nome as pipeline_nome,
    
    -- Person info (NOW FROM CONTATOS)
    ct.nome as pessoa_nome,
    ct.email as pessoa_email,
    ct.telefone as pessoa_telefone,
    
    -- Owner info
    pr.nome as dono_atual_nome,
    pr.email as dono_atual_email,
    
    -- Task Aggregations
    (
        SELECT row_to_json(t)
        FROM (
            SELECT id, titulo, data_vencimento, prioridade, tipo
            FROM public.tarefas
            WHERE card_id = c.id AND concluida = false
            ORDER BY data_vencimento ASC
            LIMIT 1
        ) t
    ) as proxima_tarefa,
    
    (
        SELECT count(*)
        FROM public.tarefas
        WHERE card_id = c.id AND concluida = false
    ) as tarefas_pendentes,
    
    (
        SELECT row_to_json(t)
        FROM (
            SELECT id, titulo, concluida_em as data, tipo
            FROM public.tarefas
            WHERE card_id = c.id AND concluida = true
            ORDER BY concluida_em DESC
            LIMIT 1
        ) t
    ) as ultima_interacao,
    
    -- Calculated fields
    EXTRACT(DAY FROM NOW() - c.updated_at) as tempo_sem_contato,
    
    -- Product specific extractions
    c.produto_data->'taxa_planejamento' as status_taxa,
    
    CASE 
        WHEN c.data_viagem_inicio IS NOT NULL THEN 
            EXTRACT(DAY FROM c.data_viagem_inicio::timestamp - NOW())
        ELSE NULL
    END as dias_ate_viagem,
    
    -- Urgency calculations
    CASE 
        WHEN c.data_viagem_inicio IS NOT NULL AND EXTRACT(DAY FROM c.data_viagem_inicio::timestamp - NOW()) < 30 THEN 100
        ELSE 0
    END as urgencia_viagem,
    
    EXTRACT(DAY FROM NOW() - c.updated_at) as tempo_etapa_dias,
    0 as urgencia_tempo_etapa,
    
    c.produto_data->'destinos' as destinos,
    c.produto_data->'orcamento' as orcamento,
    
    -- Missing columns restored
    c.valor_final,
    c.origem,
    c.external_id,
    c.campaign_id,
    c.moeda,
    c.condicoes_pagamento,
    c.forma_pagamento,
    c.estado_operacional,
    
    -- Additional owner names
    sdr.nome AS sdr_nome,
    vendas.nome AS vendas_nome

FROM
    public.cards c
    LEFT JOIN public.pipeline_stages s ON c.pipeline_stage_id = s.id
    LEFT JOIN public.pipelines p ON c.pipeline_id = p.id
    LEFT JOIN public.contatos ct ON c.pessoa_principal_id = ct.id -- CHANGED FROM pessoas TO contatos
    LEFT JOIN public.profiles pr ON c.dono_atual_id = pr.id
    LEFT JOIN public.profiles sdr ON c.sdr_owner_id = sdr.id
    LEFT JOIN public.profiles vendas ON c.vendas_owner_id = vendas.id;

-- 5. Recreate dependent view 'view_dashboard_funil'
CREATE OR REPLACE VIEW public.view_dashboard_funil AS
SELECT 
    etapa_nome,
    etapa_ordem,
    produto,
    count(*) AS total_cards,
    sum(valor_estimado) AS total_valor_estimado,
    sum(valor_final) AS total_valor_final
FROM view_cards_acoes
GROUP BY etapa_nome, etapa_ordem, produto;

-- 6. Grant permissions
GRANT SELECT ON public.view_cards_acoes TO authenticated;
GRANT SELECT ON public.view_dashboard_funil TO authenticated;
