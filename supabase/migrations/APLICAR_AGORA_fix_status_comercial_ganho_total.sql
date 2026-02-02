-- ============================================================================
-- APLICAR MANUALMENTE NO SUPABASE DASHBOARD -> SQL EDITOR
-- Este SQL corrige cards em Pós-venda que estão marcados como "ganho"
-- mas NÃO estão em etapas com is_won = true
--
-- REGRA: status_comercial = "ganho" APENAS em etapas com is_won = true
--        (ex: "Viagem Concluída" em Pós-venda)
-- ============================================================================

-- 1. VERIFICAR QUANTOS CARDS SERÃO AFETADOS (rodar primeiro)
SELECT
    c.id,
    c.titulo,
    c.status_comercial,
    s.nome as etapa,
    s.fase,
    s.is_won
FROM cards c
JOIN pipeline_stages s ON c.pipeline_stage_id = s.id
WHERE s.fase = 'Pós-venda'
  AND COALESCE(s.is_won, false) = false
  AND c.status_comercial = 'ganho'
  AND c.deleted_at IS NULL;

-- 2. ATUALIZAR CARDS: resetar para "aberto"
UPDATE cards c
SET
    status_comercial = 'aberto',
    updated_at = now()
FROM pipeline_stages s
WHERE c.pipeline_stage_id = s.id
  AND s.fase = 'Pós-venda'
  AND COALESCE(s.is_won, false) = false
  AND c.status_comercial = 'ganho'
  AND c.deleted_at IS NULL;

-- 3. VERIFICAR RESULTADO (confirmar que foram atualizados)
SELECT
    c.id,
    c.titulo,
    c.status_comercial,
    s.nome as etapa,
    s.fase
FROM cards c
JOIN pipeline_stages s ON c.pipeline_stage_id = s.id
WHERE s.fase = 'Pós-venda'
  AND c.deleted_at IS NULL
ORDER BY s.ordem;

-- ============================================================================
-- NOTA: O trigger handle_card_status_automation já cuida de NOVOS movimentos:
-- - Mover para etapa com is_won = true → status_comercial = 'ganho'
-- - Mover para etapa sem is_won → status_comercial = 'aberto' (se antes era ganho)
--
-- Esta migration apenas corrige cards EXISTENTES que estavam incorretos.
-- ============================================================================
