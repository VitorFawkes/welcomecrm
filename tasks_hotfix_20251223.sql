-- Add deleted_at column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tarefas' AND column_name = 'deleted_at') THEN
        ALTER TABLE tarefas ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;
    END IF;
END $$;

-- Update view_agenda to respect deleted_at
CREATE OR REPLACE VIEW view_agenda AS
 SELECT t.id,
    'tarefa'::text AS entity_type,
    t.titulo,
    t.data_vencimento AS data,
    t.status,
    t.card_id,
    t.responsavel_id,
    t.created_at
   FROM tarefas t
  WHERE t.deleted_at IS NULL;
