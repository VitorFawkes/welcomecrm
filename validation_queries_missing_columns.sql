-- Verify all required columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'tarefas' 
AND column_name IN (
    'categoria_outro', 
    'feedback', 
    'motivo_cancelamento', 
    'resultado', 
    'rescheduled_to_id', 
    'rescheduled_from_id',
    'participantes_externos'
);
