-- Diagnostic Query: Investigate "Sem próxima tarefa" bug
-- Run this query to check for problematic data patterns

-- 1. Check if there are multiple pending tasks per card (competing for "proxima_tarefa")
SELECT 
    card_id,
    count(*) as pending_tasks,
    string_agg(titulo || ' (' || data_vencimento::date || ')', ', ' ORDER BY data_vencimento) as tasks_list
FROM tarefas
WHERE concluida = false
GROUP BY card_id
HAVING count(*) > 1
ORDER BY count(*) DESC
LIMIT 10;

-- 2. Check for NULL concluida values (these would be missed by "WHERE concluida = false")
SELECT 
    count(*) as null_concluida_count,
    count(*) FILTER (WHERE concluida IS NULL) as explicitly_null,
    count(*) FILTER (WHERE concluida = false) as explicitly_false,
    count(*) FILTER (WHERE concluida = true) as explicitly_true
FROM tarefas;

-- 3. For a specific problematic card, show all pending tasks ordered as the view does
-- (Replace 'YOUR_CARD_ID' with actual card ID)
/*
SELECT 
    id,
    titulo,
    data_vencimento,
    concluida,
    created_at,
    tipo,
    prioridade,
    CASE 
        WHEN concluida = false THEN '✅ Selected by view'
        WHEN concluida IS NULL THEN '⚠️ NULL (not selected)'
        ELSE '❌ Completed (not selected)'
    END as status
FROM tarefas
WHERE card_id = 'YOUR_CARD_ID'
ORDER BY 
    CASE WHEN concluida = false THEN 0 ELSE 1 END, -- pending first
    data_vencimento ASC;
*/

-- 4. Test what the view returns for problematic cards
-- (Replace 'YOUR_CARD_ID' with actual card ID)
/*
SELECT 
    id,
    titulo,
    proxima_tarefa,
    tarefas_pendentes
FROM view_cards_acoes
WHERE id = 'YOUR_CARD_ID';
*/

-- 5. Check for race condition patterns: Recently created tasks
SELECT 
    t.id,
    t.card_id,
    t.titulo,
    t.data_vencimento,
    t.concluida,
    t.created_at,
    EXTRACT(SECOND FROM now() - t.created_at) as seconds_since_creation
FROM tarefas t
WHERE t.created_at > now() - interval '5 minutes'
ORDER BY t.created_at DESC;
