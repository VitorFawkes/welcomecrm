-- ============================================================================
-- VALIDATION QUERIES: Final Adjustments
-- ============================================================================

-- 1. Verify 'tarefas' columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'tarefas' 
AND column_name IN ('feedback', 'motivo_cancelamento', 'rescheduled_to_id', 'rescheduled_from_id', 'categoria_outro');

-- 2. Verify 'activity_categories' table
SELECT * FROM activity_categories;

-- 3. Verify 'view_cards_acoes' excludes 'reagendada' from proxima_tarefa
-- Create a test case (requires manual execution or existing data)
-- Assuming we have a card with a 'reagendada' task due today and a 'pendente' task due tomorrow.
-- The view should show the 'pendente' task as proxima_tarefa, NOT the 'reagendada' one.

SELECT 
    c.id, 
    c.titulo, 
    c.proxima_tarefa->>'status' as status_proxima,
    c.proxima_tarefa->>'data_vencimento' as data_proxima
FROM view_cards_acoes c
WHERE EXISTS (
    SELECT 1 FROM tarefas t 
    WHERE t.card_id = c.id 
    AND t.status = 'reagendada'
);

-- 4. Verify RLS on activity_categories
-- (Run as non-admin user)
-- SELECT * FROM activity_categories WHERE visible = false; -- Should return 0 rows
-- SELECT * FROM activity_categories WHERE visible = true; -- Should return rows
