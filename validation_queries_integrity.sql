-- Verify view_agenda returns correct types
SELECT id, entity_type, titulo FROM view_agenda LIMIT 5;

-- Verify log_tarefa_activity definition
SELECT pg_get_functiondef('log_tarefa_activity'::regproc);
