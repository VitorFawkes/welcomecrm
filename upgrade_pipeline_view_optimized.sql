-- 1. Drop the base view and all dependents (view_dashboard_funil)
DROP VIEW IF EXISTS view_cards_acoes CASCADE;

-- 2. Recreate the base view using CTEs for O(1) performance
CREATE VIEW view_cards_acoes AS
WITH task_stats AS (
    SELECT 
        card_id,
        count(*) AS tarefas_pendentes,
        count(*) FILTER (WHERE data < CURRENT_DATE) AS tarefas_atrasadas
    FROM view_agenda
    GROUP BY card_id
),
next_tasks AS (
    SELECT DISTINCT ON (card_id)
        card_id,
        id, titulo, data AS data_vencimento, NULL::text AS prioridade, entity_type AS tipo
    FROM view_agenda
    ORDER BY card_id, data ASC
),
last_activities AS (
    SELECT DISTINCT ON (card_id)
        card_id,
        id, created_at, descricao AS titulo, tipo
    FROM activities
    ORDER BY card_id, created_at DESC
)
SELECT 
    c.id,
    c.titulo,
    c.produto,
    c.pipeline_id,
    c.pipeline_stage_id,
    c.pessoa_principal_id,
    c.valor_estimado,
    c.dono_atual_id,
    c.sdr_owner_id,
    c.vendas_owner_id,
    c.pos_owner_id,
    c.concierge_owner_id,
    c.status_comercial,
    c.produto_data,
    c.cliente_recorrente,
    c.prioridade,
    c.data_viagem_inicio,
    c.created_at,
    c.updated_at,
    s.fase,
    s.nome AS etapa_nome,
    s.ordem AS etapa_ordem,
    p.nome AS pipeline_nome,
    pe.nome AS pessoa_nome,
    pr.nome AS dono_atual_nome,
    pr.email AS dono_atual_email,
    -- FILTERING COLUMNS
    pr.team_id AS owner_team_id,
    pr.department_id AS owner_department_id,
    c.produto_data -> 'tags' AS tags,
    -- JOINED STATS (Set-Based)
    sdr.nome AS sdr_owner_nome,
    sdr.email AS sdr_owner_email,
    (SELECT row_to_json(nt.*) FROM next_tasks nt WHERE nt.card_id = c.id) AS proxima_tarefa,
    COALESCE(ts.tarefas_pendentes, 0) AS tarefas_pendentes,
    COALESCE(ts.tarefas_atrasadas, 0) AS tarefas_atrasadas,
    (SELECT row_to_json(la.*) FROM last_activities la WHERE la.card_id = c.id) AS ultima_interacao,
    EXTRACT(day FROM now() - c.updated_at) AS tempo_sem_contato,
    c.produto_data ->> 'taxa_planejamento'::text AS status_taxa,
        CASE
            WHEN c.data_viagem_inicio IS NOT NULL THEN EXTRACT(day FROM c.data_viagem_inicio - now())
            ELSE NULL::numeric
        END AS dias_ate_viagem,
        CASE
            WHEN c.data_viagem_inicio IS NOT NULL AND EXTRACT(day FROM c.data_viagem_inicio - now()) < 30::numeric THEN 100
            ELSE 0
        END AS urgencia_viagem,
    EXTRACT(day FROM now() - COALESCE(c.stage_entered_at, c.updated_at)) AS tempo_etapa_dias,
        CASE
            WHEN s.sla_hours IS NOT NULL AND (EXTRACT(epoch FROM now() - COALESCE(c.stage_entered_at, c.updated_at)) / 3600::numeric) > s.sla_hours::numeric THEN 1
            ELSE 0
        END AS urgencia_tempo_etapa,
    c.produto_data -> 'destinos'::text AS destinos,
    c.produto_data -> 'orcamento'::text AS orcamento,
    c.valor_final,
    c.origem,
    c.external_id,
    c.campaign_id,
    c.moeda,
    c.condicoes_pagamento,
    c.forma_pagamento,
    c.estado_operacional,
    sdr.nome AS sdr_nome,
    vendas.nome AS vendas_nome
   FROM cards c
     LEFT JOIN pipeline_stages s ON c.pipeline_stage_id = s.id
     LEFT JOIN pipelines p ON c.pipeline_id = p.id
     LEFT JOIN contatos pe ON c.pessoa_principal_id = pe.id
     LEFT JOIN profiles pr ON c.dono_atual_id = pr.id
     LEFT JOIN profiles sdr ON c.sdr_owner_id = sdr.id
     LEFT JOIN profiles vendas ON c.vendas_owner_id = vendas.id
     LEFT JOIN task_stats ts ON c.id = ts.card_id;

-- 3. Recreate the dependent view (view_dashboard_funil)
CREATE VIEW view_dashboard_funil AS
SELECT 
    etapa_nome,
    etapa_ordem,
    produto,
    count(*) AS total_cards,
    sum(valor_estimado) AS total_valor_estimado,
    sum(valor_final) AS total_valor_final
FROM view_cards_acoes
GROUP BY etapa_nome, etapa_ordem, produto;

-- 4. Restore permissions
GRANT SELECT ON view_cards_acoes TO authenticated;
GRANT SELECT ON view_cards_acoes TO service_role;
GRANT SELECT ON view_dashboard_funil TO authenticated;
GRANT SELECT ON view_dashboard_funil TO service_role;
