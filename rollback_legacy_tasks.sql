-- Rollback view_agenda to only point to tarefas (Legacy Mode)
-- This eliminates potential performance issues or locks from reunioes/proposals
-- and ensures the list matches the header (which uses view_cards_acoes -> view_agenda).

CREATE OR REPLACE VIEW view_agenda AS
SELECT
    t.id,
    'tarefa'::text AS entity_type,
    t.titulo,
    t.data_vencimento AS data,
    t.status,
    t.card_id,
    t.responsavel_id,
    t.created_at
FROM tarefas t;

-- Grant permissions to ensure frontend access
GRANT SELECT ON view_agenda TO anon, authenticated, service_role;

-- Note: view_cards_acoes depends on view_agenda, so it will now also only see tasks.
-- This ensures consistency between the header badges and the list.
