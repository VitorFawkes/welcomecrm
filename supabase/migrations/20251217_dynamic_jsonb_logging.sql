-- Advanced Dynamic JSONB Diff Logging
-- This function recursively compares two JSONB objects and logs changes for each field.

CREATE OR REPLACE FUNCTION log_card_update_activity()
RETURNS TRIGGER AS $$
DECLARE
    v_old_stage_name text;
    v_new_stage_name text;
    
    -- Variables for JSON iteration
    _key text;
    _value jsonb;
    _old_value jsonb;
    _new_value jsonb;
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

    -- 7. DYNAMIC JSONB DIFF for produto_data
    -- Iterate over all keys in NEW.produto_data
    FOR _key, _value IN SELECT * FROM jsonb_each(NEW.produto_data)
    LOOP
        _old_value := OLD.produto_data -> _key;
        _new_value := _value;

        -- Check if value changed
        IF _old_value IS DISTINCT FROM _new_value THEN
            
            -- Special handling for nested objects (like 'orcamento', 'epoca_viagem')
            -- If both are objects, we could recurse, but for now let's just log the top-level key change
            -- to avoid spamming 10 logs if a whole object is replaced.
            -- Or, we can be smart: if it's a small object (like budget), log the sub-keys.
            
            -- Strategy:
            -- 1. If it's a simple value (text, number, boolean), log it directly.
            -- 2. If it's an object/array, log "Alterou [Key]" and show preview.
            
            -- Clean up quotes for display
            DECLARE
                v_display_key text := initcap(replace(_key, '_', ' '));
                v_display_old text := CASE WHEN jsonb_typeof(_old_value) IN ('object', 'array') THEN '...' ELSE replace(_old_value::text, '"', '') END;
                v_display_new text := CASE WHEN jsonb_typeof(_new_value) IN ('object', 'array') THEN '...' ELSE replace(_new_value::text, '"', '') END;
                v_desc text;
            BEGIN
                -- Customize display names for known keys
                IF _key = 'observacoes' THEN v_display_key := 'Observações'; END IF;
                IF _key = 'observacoes_criticas' THEN v_display_key := 'Informações Importantes'; END IF;
                IF _key = 'orcamento' THEN v_display_key := 'Orçamento'; END IF;
                IF _key = 'destinos' THEN v_display_key := 'Destinos'; END IF;
                
                -- Construct description
                IF _old_value IS NULL THEN
                    v_desc := v_display_key || ' definido como ' || v_display_new;
                ELSE
                    v_desc := 'Alterou ' || v_display_key;
                    -- Only add "from X to Y" if it's not a complex object
                    IF jsonb_typeof(_new_value) NOT IN ('object', 'array') THEN
                        v_desc := v_desc || ' de ' || v_display_old || ' para ' || v_display_new;
                    END IF;
                END IF;

                INSERT INTO activities (card_id, tipo, descricao, metadata, created_by)
                VALUES (
                    NEW.id,
                    'updated', -- Generic updated type
                    v_desc,
                    jsonb_build_object(
                        'field', _key,
                        'old_value', _old_value,
                        'new_value', _new_value
                    ),
                    auth.uid()
                );
            END;
        END IF;
    END LOOP;
    
    -- Check for keys that were REMOVED (exist in OLD but not in NEW)
    FOR _key, _value IN SELECT * FROM jsonb_each(OLD.produto_data)
    LOOP
        IF NOT (NEW.produto_data ? _key) THEN
             INSERT INTO activities (card_id, tipo, descricao, metadata, created_by)
            VALUES (
                NEW.id,
                'updated',
                'Removeu ' || initcap(replace(_key, '_', ' ')),
                jsonb_build_object(
                    'field', _key,
                    'old_value', _value,
                    'new_value', null
                ),
                auth.uid()
            );
        END IF;
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
