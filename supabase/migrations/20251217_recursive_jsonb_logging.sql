-- Expert Recursive JSONB Diff Logging
-- This approach flattens the JSON structure to find the exact "leaf" node that changed.

-- Helper type to store diff results
DROP TYPE IF EXISTS jsonb_diff_record CASCADE;
CREATE TYPE jsonb_diff_record AS (
    path text,
    old_value text,
    new_value text
);

-- Recursive function to find differences
CREATE OR REPLACE FUNCTION find_jsonb_diffs(
    p_path text,
    p_old jsonb,
    p_new jsonb
) RETURNS SETOF jsonb_diff_record AS $$
DECLARE
    _key text;
    _value jsonb;
    _old_val jsonb;
    _new_val jsonb;
    _new_path text;
BEGIN
    -- If both are null, no diff
    IF p_old IS NULL AND p_new IS NULL THEN
        RETURN;
    END IF;

    -- If one is null and other isn't, or types are different (and not both objects), it's a direct change
    IF (p_old IS NULL OR p_new IS NULL) OR (jsonb_typeof(p_old) != jsonb_typeof(p_new)) THEN
        -- Return the diff immediately
        RETURN NEXT ROW(
            p_path, 
            CASE WHEN p_old IS NULL THEN 'vazio' ELSE replace(p_old::text, '"', '') END, 
            CASE WHEN p_new IS NULL THEN 'vazio' ELSE replace(p_new::text, '"', '') END
        );
        RETURN;
    END IF;

    -- If both are objects, recurse
    IF jsonb_typeof(p_old) = 'object' THEN
        -- Loop through union of keys
        FOR _key IN SELECT DISTINCT key FROM (SELECT key FROM jsonb_each(p_old) UNION ALL SELECT key FROM jsonb_each(p_new)) t LOOP
            _old_val := p_old -> _key;
            _new_val := p_new -> _key;
            
            _new_path := CASE WHEN p_path = '' THEN initcap(replace(_key, '_', ' ')) ELSE p_path || ' > ' || initcap(replace(_key, '_', ' ')) END;
            
            -- Recurse
            RETURN QUERY SELECT * FROM find_jsonb_diffs(_new_path, _old_val, _new_val);
        END LOOP;
        RETURN;
    END IF;

    -- If primitive values are different
    IF p_old IS DISTINCT FROM p_new THEN
        RETURN NEXT ROW(
            p_path, 
            replace(p_old::text, '"', ''), 
            replace(p_new::text, '"', '')
        );
    END IF;

    RETURN;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Updated Trigger Function
CREATE OR REPLACE FUNCTION log_card_update_activity()
RETURNS TRIGGER AS $$
DECLARE
    v_old_stage_name text;
    v_new_stage_name text;
    r_diff jsonb_diff_record;
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

    -- 7. RECURSIVE DYNAMIC JSONB DIFF for produto_data
    IF OLD.produto_data IS DISTINCT FROM NEW.produto_data THEN
        FOR r_diff IN SELECT * FROM find_jsonb_diffs('', OLD.produto_data, NEW.produto_data)
        LOOP
            -- Insert log for each leaf change
            INSERT INTO activities (card_id, tipo, descricao, metadata, created_by)
            VALUES (
                NEW.id,
                'updated',
                'Alterou ' || r_diff.path || ' de ' || r_diff.old_value || ' para ' || r_diff.new_value,
                jsonb_build_object(
                    'field', r_diff.path,
                    'old_value', r_diff.old_value,
                    'new_value', r_diff.new_value
                ),
                auth.uid()
            );
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
