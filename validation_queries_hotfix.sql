-- Verify participantes_externos column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'tarefas' 
AND column_name = 'participantes_externos';

-- Verify it is an array of text
-- Should return 'ARRAY' or 'text[]' depending on the driver, but data_type usually says 'ARRAY' and udt_name '_text'
SELECT udt_name FROM information_schema.columns 
WHERE table_name = 'tarefas' 
AND column_name = 'participantes_externos';
