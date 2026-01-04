-- Add briefing_inicial and marketing_data to view_cards_acoes
-- Based on fix_view_cards_acoes_hotfix.sql to ensure compatibility
-- Appended to the end to allow CREATE OR REPLACE VIEW without dropping

CREATE OR REPLACE VIEW view_cards_acoes AS
 SELECT c.id,
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
    sdr.nome AS sdr_owner_nome,
    sdr.email AS sdr_owner_email,
    ( SELECT row_to_json(t.*) AS row_to_json
           FROM ( SELECT va.id,
                    va.titulo,
                    va.data AS data_vencimento,
                    NULL::text AS prioridade,
                    va.entity_type AS tipo
                   FROM view_agenda va
                  WHERE va.card_id = c.id
                  -- We don't strictly need status filter here if view_agenda already does it,
                  -- but keeping it for safety if view_agenda changes.
                  -- Crucially, view_agenda NOW excludes completed/deleted.
                  ORDER BY va.data ASC
                 LIMIT 1) t) AS proxima_tarefa,
    ( SELECT count(*) AS count
           FROM view_agenda va
          WHERE va.card_id = c.id) AS tarefas_pendentes,
    ( SELECT count(*) AS count
           FROM view_agenda va
          WHERE va.card_id = c.id AND va.data < CURRENT_DATE) AS tarefas_atrasadas,
    ( SELECT row_to_json(t.*) AS row_to_json
           FROM ( SELECT a.id,
                    a.created_at,
                    a.descricao AS titulo,
                    a.tipo
                   FROM activities a
                  WHERE a.card_id = c.id
                  ORDER BY a.created_at DESC
                 LIMIT 1) t) AS ultima_interacao,
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
    vendas.nome AS vendas_nome,
    c.briefing_inicial, -- Appended
    c.marketing_data    -- Appended
   FROM cards c
     LEFT JOIN pipeline_stages s ON c.pipeline_stage_id = s.id
     LEFT JOIN pipelines p ON c.pipeline_id = p.id
     LEFT JOIN contatos pe ON c.pessoa_principal_id = pe.id
     LEFT JOIN profiles pr ON c.dono_atual_id = pr.id
     LEFT JOIN profiles sdr ON c.sdr_owner_id = sdr.id
     LEFT JOIN profiles vendas ON c.vendas_owner_id = vendas.id;
