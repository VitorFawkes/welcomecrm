-- No new schema changes for this phase, but we can verify the existing structure again.
-- Verify participantes_externos column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'tarefas' 
AND column_name = 'participantes_externos';
