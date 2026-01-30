-- ================================================
-- FIX: Workflow Duplicates & INSERT Trigger
-- Data: 2026-01-30
-- Bugs corrigidos:
--   1. Trigger não dispara em INSERT de cards
--   2. Tarefas duplicadas (sem idempotência)
--   3. Queue items duplicados
--   4. Race condition no processamento
--   5. Limpeza de dados corrompidos
-- ================================================

-- 1. RPC para claim com lock (evita race condition)
CREATE OR REPLACE FUNCTION claim_workflow_queue_items(max_items INT DEFAULT 50)
RETURNS SETOF workflow_queue AS $$
BEGIN
    RETURN QUERY
    UPDATE workflow_queue
    SET status = 'processing', attempts = attempts + 1
    WHERE id IN (
        SELECT id FROM workflow_queue
        WHERE status = 'pending'
          AND execute_at <= now()
          AND attempts < 3
        ORDER BY priority DESC, execute_at ASC
        LIMIT max_items
        FOR UPDATE SKIP LOCKED
    )
    RETURNING *;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Index UNIQUE para evitar queue items duplicados (pending)
-- Nota: Precisamos primeiro limpar duplicados existentes antes de criar o index
DO $$
BEGIN
    -- Limpar duplicados primeiro
    WITH dups AS (
        SELECT id,
               ROW_NUMBER() OVER (
                   PARTITION BY instance_id, node_id
                   ORDER BY created_at ASC
               ) as rn
        FROM workflow_queue
        WHERE status = 'pending'
    )
    DELETE FROM workflow_queue WHERE id IN (SELECT id FROM dups WHERE rn > 1);

    -- Agora criar o index
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'idx_workflow_queue_no_duplicates'
    ) THEN
        CREATE UNIQUE INDEX idx_workflow_queue_no_duplicates
        ON workflow_queue(instance_id, node_id)
        WHERE status = 'pending';
    END IF;
END $$;

-- 3. Corrigir trigger para INSERT + UPDATE
CREATE OR REPLACE FUNCTION trigger_workflow_on_stage_change()
RETURNS TRIGGER AS $$
DECLARE
    v_workflow RECORD;
    v_trigger_node RECORD;
    v_instance_id UUID;
    v_old_stage_id UUID;
BEGIN
    -- Para INSERT, OLD é NULL
    v_old_stage_id := CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE OLD.pipeline_stage_id END;

    -- Só processa se stage mudou (ou é INSERT com stage definido)
    IF v_old_stage_id IS DISTINCT FROM NEW.pipeline_stage_id AND NEW.pipeline_stage_id IS NOT NULL THEN
        FOR v_workflow IN
            SELECT w.id, w.trigger_config
            FROM workflows w
            WHERE w.is_active = true
              AND w.trigger_type = 'stage_enter'
              AND (w.trigger_config->>'stage_id')::UUID = NEW.pipeline_stage_id
              AND (w.pipeline_id IS NULL OR w.pipeline_id = NEW.pipeline_id)
        LOOP
            -- Verificar se já existe instance ativa para este workflow/card
            IF NOT EXISTS (
                SELECT 1 FROM workflow_instances
                WHERE workflow_id = v_workflow.id
                  AND card_id = NEW.id
                  AND status IN ('running', 'waiting')
            ) THEN
                -- Encontrar o trigger node
                SELECT * INTO v_trigger_node
                FROM workflow_nodes
                WHERE workflow_id = v_workflow.id
                  AND node_type = 'trigger'
                LIMIT 1;

                IF v_trigger_node.id IS NOT NULL THEN
                    -- Criar nova instance
                    INSERT INTO workflow_instances (
                        workflow_id, card_id, current_node_id, status, context
                    ) VALUES (
                        v_workflow.id, NEW.id, v_trigger_node.id, 'running',
                        jsonb_build_object(
                            'trigger_stage_id', NEW.pipeline_stage_id,
                            'trigger_stage_from', v_old_stage_id,
                            'card_owner_id', COALESCE(NEW.dono_atual_id, NEW.sdr_owner_id, NEW.created_by)
                        )
                    ) RETURNING id INTO v_instance_id;

                    -- Adicionar à fila
                    INSERT INTO workflow_queue (instance_id, execute_at, node_id, priority)
                    VALUES (v_instance_id, now(), v_trigger_node.id, 10);

                    -- Log
                    INSERT INTO workflow_log (instance_id, workflow_id, card_id, event_type, node_id)
                    VALUES (v_instance_id, v_workflow.id, NEW.id, 'started', v_trigger_node.id);
                END IF;
            END IF;
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Definir search_path para segurança
ALTER FUNCTION trigger_workflow_on_stage_change() SET search_path = '';

-- 4. Recriar trigger para INSERT + UPDATE
DROP TRIGGER IF EXISTS trg_workflow_stage_change ON cards;
CREATE TRIGGER trg_workflow_stage_change
    AFTER INSERT OR UPDATE OF pipeline_stage_id ON cards
    FOR EACH ROW
    EXECUTE FUNCTION trigger_workflow_on_stage_change();

-- 5. Limpeza: Soft delete tarefas duplicadas (manter apenas a mais antiga)
WITH duplicates AS (
    SELECT id,
           ROW_NUMBER() OVER (
               PARTITION BY card_id, titulo, metadata->>'workflow_id'
               ORDER BY created_at ASC
           ) as rn
    FROM tarefas
    WHERE metadata->>'created_by_workflow' = 'true'
      AND deleted_at IS NULL
)
UPDATE tarefas
SET deleted_at = now()
WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);

-- 6. Limpeza: Queue items órfãos (de instances já finalizadas)
DELETE FROM workflow_queue wq
WHERE wq.status = 'pending'
  AND EXISTS (
      SELECT 1 FROM workflow_instances wi
      WHERE wi.id = wq.instance_id
        AND wi.status IN ('completed', 'cancelled', 'failed')
  );

-- 7. Resetar instances presas há mais de 24h
UPDATE workflow_instances
SET status = 'failed',
    error_message = 'Auto-cancelled: stuck in running state for >24h',
    completed_at = now()
WHERE status = 'running'
  AND started_at < now() - interval '24 hours';

-- 8. Resetar queue items stuck em 'processing' há mais de 1h
UPDATE workflow_queue
SET status = 'pending',
    last_error = 'Reset: stuck in processing for >1h'
WHERE status = 'processing'
  AND processed_at IS NULL
  AND created_at < now() - interval '1 hour';

-- 9. Log da limpeza
DO $$
DECLARE
    v_tarefas_deleted INT;
    v_queue_deleted INT;
    v_instances_reset INT;
BEGIN
    SELECT COUNT(*) INTO v_tarefas_deleted FROM tarefas
    WHERE deleted_at >= now() - interval '1 minute'
      AND metadata->>'created_by_workflow' = 'true';

    GET DIAGNOSTICS v_queue_deleted = ROW_COUNT;

    RAISE NOTICE 'Workflow cleanup complete: % duplicate tasks soft-deleted', v_tarefas_deleted;
END $$;
