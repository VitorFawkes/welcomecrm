-- 1. Update system_fields constraint to allow new type
ALTER TABLE system_fields DROP CONSTRAINT IF EXISTS system_fields_type_check;
ALTER TABLE system_fields ADD CONSTRAINT system_fields_type_check 
CHECK (type IN ('text', 'textarea', 'number', 'currency', 'currency_range', 'date', 'datetime', 'date_range', 'select', 'multiselect', 'boolean', 'checklist', 'json', 'loss_reason_selector'));

-- 2. Add comment field to cards table
ALTER TABLE cards ADD COLUMN IF NOT EXISTS motivo_perda_comentario TEXT;

-- 3. Register fields in system_fields for Governance (Data Rules)
INSERT INTO system_fields (key, label, type, section, is_system, active)
VALUES 
('motivo_perda_id', 'Motivo de Perda', 'loss_reason_selector', 'loss_reason', true, true),
('motivo_perda_comentario', 'Comentário de Perda', 'textarea', 'loss_reason', true, true)
ON CONFLICT (key) DO UPDATE SET
    active = true,
    is_system = true,
    section = 'loss_reason',
    type = EXCLUDED.type;

-- 4. Update mover_card RPC to accept comment
CREATE OR REPLACE FUNCTION public.mover_card(
    p_card_id uuid, 
    p_nova_etapa_id uuid, 
    p_motivo_perda_id uuid DEFAULT NULL::uuid,
    p_motivo_perda_comentario text DEFAULT NULL::text
)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_old_stage_id UUID;
    v_new_stage_is_won BOOLEAN;
    v_new_stage_is_lost BOOLEAN;
    v_card_title TEXT;
    v_user_id UUID;
BEGIN
    -- Get current stage and info
    SELECT pipeline_stage_id, titulo, dono_atual_id INTO v_old_stage_id, v_card_title, v_user_id
    FROM cards
    WHERE id = p_card_id;

    -- Get new stage info
    SELECT is_won, is_lost INTO v_new_stage_is_won, v_new_stage_is_lost
    FROM pipeline_stages
    WHERE id = p_nova_etapa_id;

    -- Update card
    UPDATE cards
    SET 
        pipeline_stage_id = p_nova_etapa_id,
        motivo_perda_id = CASE 
            WHEN v_new_stage_is_lost THEN p_motivo_perda_id 
            ELSE NULL 
        END,
        motivo_perda_comentario = CASE 
            WHEN v_new_stage_is_lost THEN p_motivo_perda_comentario 
            ELSE NULL 
        END,
        status_comercial = CASE 
            WHEN v_new_stage_is_won THEN 'ganho'
            WHEN v_new_stage_is_lost THEN 'perdido'
            ELSE 'aberto'
        END,
        data_fechamento = CASE 
            WHEN v_new_stage_is_won OR v_new_stage_is_lost THEN NOW()
            ELSE NULL 
        END,
        updated_at = NOW()
    WHERE id = p_card_id;

    -- Log activity (simplified for this migration, assuming log_activity exists or is handled by triggers)
    -- Ideally triggers handle history, but if we need explicit logging:
    -- PERFORM log_card_movement(p_card_id, v_old_stage_id, p_nova_etapa_id, auth.uid());

END;
$function$;
