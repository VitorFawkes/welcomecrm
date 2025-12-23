-- MIGRATION SCRIPT: TASK MODULE REBUILD
-- Safe, Idempotent, Transactional

BEGIN;

-- 0. Backup (Snapshot Lógico)
-- Cria tabelas de backup se não existirem (idempotente)
CREATE TABLE IF NOT EXISTS tarefas_backup_20251223 AS SELECT * FROM tarefas;
-- Verifica se reunioes existe antes de fazer backup
DO $$ 
BEGIN 
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'reunioes') THEN
        CREATE TABLE IF NOT EXISTS reunioes_backup_20251223 AS SELECT * FROM reunioes;
    END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'proposals') THEN
        CREATE TABLE IF NOT EXISTS proposals_backup_20251223 AS SELECT * FROM proposals;
    END IF;
END $$;


-- 1. Sanitização e Migração de Dados (Idempotente)
-- Usa INSERT ... ON CONFLICT DO NOTHING ou verificação de existência para evitar duplicatas se rodar 2x

-- Mover Reuniões mal alocadas
INSERT INTO reunioes (card_id, titulo, data_inicio, responsavel_id, status, created_by)
SELECT 
    t.card_id, 
    t.titulo, 
    t.data_vencimento, 
    t.responsavel_id, 
    CASE 
        WHEN t.status = 'pendente' THEN 'agendada'
        WHEN t.status = 'concluida' THEN 'realizada'
        ELSE 'agendada'
    END,
    t.created_by
FROM tarefas t
WHERE t.tipo = 'reuniao'
AND NOT EXISTS (
    SELECT 1 FROM reunioes r 
    WHERE r.card_id = t.card_id 
    AND r.titulo = t.titulo 
    AND r.data_inicio = t.data_vencimento
);

-- Mover Propostas mal alocadas
INSERT INTO proposals (card_id, status, created_by, created_at)
SELECT 
    t.card_id, 
    'enviada', 
    t.created_by, 
    t.created_at
FROM tarefas t
WHERE t.tipo = 'proposta'
AND NOT EXISTS (
    SELECT 1 FROM proposals p
    WHERE p.card_id = t.card_id
    AND p.created_at = t.created_at
);

-- Limpeza da tabela tarefas (agora só terá tarefas reais)
DELETE FROM tarefas WHERE tipo IN ('reuniao', 'proposta');


-- 2. Criação da View Unificada (view_agenda)
CREATE OR REPLACE VIEW view_agenda AS
SELECT
  id,
  'tarefa'::text as entity_type,
  titulo,
  data_vencimento as data,
  status,
  card_id,
  responsavel_id,
  created_at
FROM tarefas
UNION ALL
SELECT
  id,
  'reuniao'::text as entity_type,
  titulo,
  data_inicio as data,
  status,
  card_id,
  responsavel_id,
  created_at
FROM reunioes
UNION ALL
SELECT
  id,
  'proposta'::text as entity_type,
  'Proposta' as titulo,
  created_at as data,
  status,
  card_id,
  created_by as responsavel_id,
  created_at
FROM proposals;


-- 3. Automação de Logs (Triggers)
CREATE OR REPLACE FUNCTION log_activity()
RETURNS TRIGGER AS $$
DECLARE
    activity_type TEXT;
    activity_desc TEXT;
    user_id UUID;
    card_uuid UUID;
BEGIN
    user_id := auth.uid();
    
    -- Determinar tipo e descrição baseada na tabela
    IF TG_TABLE_NAME = 'tarefas' THEN
        card_uuid := NEW.card_id;
        IF TG_OP = 'INSERT' THEN
            activity_type := 'task_created';
            activity_desc := 'Nova tarefa criada: ' || NEW.titulo;
        ELSIF TG_OP = 'UPDATE' AND NEW.concluida = true AND OLD.concluida = false THEN
            activity_type := 'task_completed';
            activity_desc := 'Tarefa concluída: ' || NEW.titulo;
        ELSE
            RETURN NEW;
        END IF;
    ELSIF TG_TABLE_NAME = 'reunioes' THEN
        card_uuid := NEW.card_id;
        IF TG_OP = 'INSERT' THEN
            activity_type := 'meeting_created';
            activity_desc := 'Reunião agendada: ' || NEW.titulo;
        ELSE
            RETURN NEW;
        END IF;
    ELSIF TG_TABLE_NAME = 'proposals' THEN
        card_uuid := NEW.card_id;
        IF TG_OP = 'INSERT' THEN
            activity_type := 'proposal_created';
            activity_desc := 'Proposta criada/enviada';
        ELSE
            RETURN NEW;
        END IF;
    END IF;

    -- Inserir na tabela activities (se user_id for nulo, tenta pegar do registro)
    IF user_id IS NULL THEN
        user_id := NEW.created_by::uuid;
    END IF;

    INSERT INTO activities (card_id, tipo, descricao, created_by)
    VALUES (card_uuid, activity_type, activity_desc, user_id);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recriar Triggers (Idempotente)
DROP TRIGGER IF EXISTS log_tarefas_trigger ON tarefas;
CREATE TRIGGER log_tarefas_trigger
AFTER INSERT OR UPDATE ON tarefas
FOR EACH ROW EXECUTE FUNCTION log_activity();

DROP TRIGGER IF EXISTS log_reunioes_trigger ON reunioes;
CREATE TRIGGER log_reunioes_trigger
AFTER INSERT OR UPDATE ON reunioes
FOR EACH ROW EXECUTE FUNCTION log_activity();

DROP TRIGGER IF EXISTS log_proposals_trigger ON proposals;
CREATE TRIGGER log_proposals_trigger
AFTER INSERT OR UPDATE ON proposals
FOR EACH ROW EXECUTE FUNCTION log_activity();

COMMIT;
