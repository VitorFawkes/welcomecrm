-- ============================================================================
-- BASELINE METRICS - PRE-FIX
-- Date: 2025-12-23 13:28 BRT
-- Purpose: Capture current state before applying fix
-- ============================================================================

-- Save this output for comparison after deployment

-- 1. Overall Cards Statistics
SELECT 
    'TOTAL CARDS' as metric,
    count(*) as value
FROM view_cards_acoes

UNION ALL

SELECT 
    'CARDS WITH PENDING TASKS' as metric,
    count(*) FILTER (WHERE tarefas_pendentes > 0) as value
FROM view_cards_acoes

UNION ALL

SELECT 
    'BROKEN CARDS (BUG)' as metric,
    count(*) FILTER (WHERE tarefas_pendentes > 0 AND proxima_tarefa IS NULL) as value
FROM view_cards_acoes

UNION ALL

SELECT 
    'AVG PENDING PER CARD' as metric,
    round(avg(tarefas_pendentes)::numeric, 2) as value
FROM view_cards_acoes;

-- 2. Detailed Broken Cards (if any)
SELECT 
    id,
    titulo,
    tarefas_pendentes,
    proxima_tarefa
FROM view_cards_acoes
WHERE tarefas_pendentes > 0 
  AND proxima_tarefa IS NULL
ORDER BY tarefas_pendentes DESC
LIMIT 10;

-- 3. Current Index Status
SELECT 
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes
WHERE tablename = 'tarefas'
ORDER BY indexname;

-- ============================================================================
-- INSTRUCTIONS:
-- 1. Run this query now and save the output
-- 2. After applying migrations, run again and compare
-- 3. Expected changes:
--    - BROKEN CARDS should go from N to 0
--    - New indexes should appear in index list
--    - Other metrics should remain similar
-- ============================================================================
