-- Fix log_nota_activity to use 'texto' instead of 'conteudo'
CREATE OR REPLACE FUNCTION log_nota_activity()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO activities (card_id, tipo, descricao, metadata, created_by)
        VALUES (
            NEW.card_id,
            'note_created',
            'Nota adicionada',
            jsonb_build_object(
                'note_id', NEW.id,
                'preview', left(NEW.texto, 100) -- Fixed column name
            ),
            coalesce(NEW.created_by, auth.uid())
        );
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO activities (card_id, tipo, descricao, metadata, created_by)
        VALUES (
            NEW.card_id,
            'note_updated',
            'Nota editada',
            jsonb_build_object('note_id', NEW.id, 'preview', left(NEW.texto, 100)),
            auth.uid()
        );
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO activities (card_id, tipo, descricao, metadata, created_by)
        VALUES (
            OLD.card_id,
            'note_deleted',
            'Nota excluída',
            jsonb_build_object('note_id', OLD.id),
            auth.uid()
        );
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure log_card_created exists and is bound
CREATE OR REPLACE FUNCTION log_card_created()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO activities (card_id, tipo, descricao, metadata, created_by)
    VALUES (
        NEW.id,
        'card_created',
        'Card criado: ' || NEW.titulo,
        jsonb_build_object(
            'titulo', NEW.titulo,
            'pipeline_id', NEW.pipeline_id,
            'stage_id', NEW.pipeline_stage_id,
            'produto', NEW.produto
        ),
        coalesce(NEW.created_by, auth.uid())
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS card_created_trigger ON cards;
CREATE TRIGGER card_created_trigger
AFTER INSERT ON cards
FOR EACH ROW EXECUTE FUNCTION log_card_created();

-- Update log_card_update_activity to include Travel Period and Title
CREATE OR REPLACE FUNCTION log_card_update_activity()
RETURNS TRIGGER AS $$
DECLARE
    v_old_stage_name text;
    v_new_stage_name text;
    v_old_obs text;
    v_new_obs text;
    v_old_criticas jsonb;
    v_new_criticas jsonb;
BEGIN
    -- 1. Mudança de Etapa (Movimentação)
    IF OLD.pipeline_stage_id IS DISTINCT FROM NEW.pipeline_stage_id THEN
        BEGIN
            SELECT nome INTO v_old_stage_name FROM pipeline_stages WHERE id = OLD.pipeline_stage_id;
            SELECT nome INTO v_new_stage_name FROM pipeline_stages WHERE id = NEW.pipeline_stage_id;
            
            INSERT INTO activities (card_id, tipo, descricao, metadata, created_by)
            VALUES (
                NEW.id,
                'stage_changed',
                'Card movido de ' || coalesce(v_old_stage_name, 'Etapa anterior') || ' para ' || coalesce(v_new_stage_name, 'Nova etapa'),
                jsonb_build_object(
                    'old_stage_id', OLD.pipeline_stage_id,
                    'new_stage_id', NEW.pipeline_stage_id,
                    'old_stage_name', v_old_stage_name,
                    'new_stage_name', v_new_stage_name
                ),
                auth.uid()
            );
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Erro ao logar mudança de etapa: %', SQLERRM;
        END;
    END IF;

    -- 2. Mudança de Dono
    IF OLD.dono_atual_id IS DISTINCT FROM NEW.dono_atual_id THEN
        INSERT INTO activities (card_id, tipo, descricao, metadata, created_by)
        VALUES (
            NEW.id,
            'owner_changed',
            'Dono alterado',
            jsonb_build_object(
                'old_owner_id', OLD.dono_atual_id,
                'new_owner_id', NEW.dono_atual_id
            ),
            auth.uid()
        );
    END IF;

    -- 3. Mudança de Status Comercial
    IF OLD.status_comercial IS DISTINCT FROM NEW.status_comercial THEN
        INSERT INTO activities (card_id, tipo, descricao, metadata, created_by)
        VALUES (
            NEW.id,
            'status_changed',
            'Status alterado para ' || NEW.status_comercial,
            jsonb_build_object(
                'old_status', OLD.status_comercial,
                'new_status', NEW.status_comercial
            ),
            auth.uid()
        );
    END IF;

    -- 4. Mudança de Valor
    IF OLD.valor_estimado IS DISTINCT FROM NEW.valor_estimado THEN
        INSERT INTO activities (card_id, tipo, descricao, metadata, created_by)
        VALUES (
            NEW.id,
            'value_changed',
            'Valor alterado',
            jsonb_build_object(
                'old_value', OLD.valor_estimado,
                'new_value', NEW.valor_estimado
            ),
            auth.uid()
        );
    END IF;

    -- 5. Mudança de Título
    IF OLD.titulo IS DISTINCT FROM NEW.titulo THEN
        INSERT INTO activities (card_id, tipo, descricao, metadata, created_by)
        VALUES (
            NEW.id,
            'updated',
            'Título alterado para: ' || NEW.titulo,
            jsonb_build_object(
                'old_title', OLD.titulo,
                'new_title', NEW.titulo
            ),
            auth.uid()
        );
    END IF;

    -- 6. Mudança de Período de Viagem (Data Início)
    IF OLD.data_viagem_inicio IS DISTINCT FROM NEW.data_viagem_inicio THEN
        INSERT INTO activities (card_id, tipo, descricao, metadata, created_by)
        VALUES (
            NEW.id,
            'period_changed',
            'Data de viagem alterada',
            jsonb_build_object(
                'old_date', OLD.data_viagem_inicio,
                'new_date', NEW.data_viagem_inicio
            ),
            auth.uid()
        );
    END IF;

    -- 7. Mudança de Observações (dentro de produto_data)
    v_old_obs := (OLD.produto_data->>'observacoes');
    v_new_obs := (NEW.produto_data->>'observacoes');
    
    IF v_old_obs IS DISTINCT FROM v_new_obs THEN
        INSERT INTO activities (card_id, tipo, descricao, metadata, created_by)
        VALUES (
            NEW.id,
            'note_updated',
            'Observações atualizadas',
            jsonb_build_object(
                'old_obs', left(v_old_obs, 100),
                'new_obs', left(v_new_obs, 100)
            ),
            auth.uid()
        );
    END IF;

    -- 8. Mudança de Informações Importantes (dentro de produto_data)
    v_old_criticas := (OLD.produto_data->'observacoes_criticas');
    v_new_criticas := (NEW.produto_data->'observacoes_criticas');
    
    IF v_old_criticas IS DISTINCT FROM v_new_criticas THEN
        INSERT INTO activities (card_id, tipo, descricao, metadata, created_by)
        VALUES (
            NEW.id,
            'note_updated',
            'Informações Importantes atualizadas',
            jsonb_build_object(
                'changes', 'Informações críticas alteradas'
            ),
            auth.uid()
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
