-- Create view_cards_acoes
-- This view aggregates card data with task information and other related details

DROP VIEW IF EXISTS public.view_cards_acoes;

CREATE VIEW public.view_cards_acoes AS
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
    
    -- Person info
    pe.nome as pessoa_nome,
    
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
    
    -- Calculated fields (placeholders for now or simple logic)
    EXTRACT(DAY FROM NOW() - c.updated_at) as tempo_sem_contato,
    
    -- Product specific extractions (safe json extraction)
    c.produto_data->'taxa_planejamento' as status_taxa,
    
    CASE 
        WHEN c.data_viagem_inicio IS NOT NULL THEN 
            EXTRACT(DAY FROM c.data_viagem_inicio::timestamp - NOW())
        ELSE NULL
    END as dias_ate_viagem,
    
    -- Urgency calculations (example logic)
    CASE 
        WHEN c.data_viagem_inicio IS NOT NULL AND EXTRACT(DAY FROM c.data_viagem_inicio::timestamp - NOW()) < 30 THEN 100
        ELSE 0
    END as urgencia_viagem,
    
    EXTRACT(DAY FROM NOW() - c.updated_at) as tempo_etapa_dias,
    0 as urgencia_tempo_etapa, -- Placeholder
    
    c.produto_data->'destinos' as destinos,
    c.produto_data->'orcamento' as orcamento

FROM
    public.cards c
    LEFT JOIN public.pipeline_stages s ON c.pipeline_stage_id = s.id
    LEFT JOIN public.pipelines p ON c.pipeline_id = p.id
    LEFT JOIN public.pessoas pe ON c.pessoa_principal_id = pe.id
    LEFT JOIN public.profiles pr ON c.dono_atual_id = pr.id;
