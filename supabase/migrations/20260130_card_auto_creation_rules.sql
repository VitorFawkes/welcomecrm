-- Migration: Criação Automática de Cards
-- Permite configurar regras para criar cards automaticamente
-- quando um card entra em determinada etapa/owner

-- 1. Tabela de regras
CREATE TABLE public.card_auto_creation_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- QUANDO (origem) - ARRAYS para multi-select
    source_pipeline_ids UUID[] NOT NULL,  -- Produtos (TRIPS, WEDDING, CORP via pipeline.id)
    source_stage_ids UUID[] NOT NULL,     -- Qualquer uma dessas etapas
    source_owner_ids UUID[],              -- Qualquer uma dessas pessoas (NULL/vazio = todas)

    -- ENTÃO criar em (destino)
    target_pipeline_id UUID NOT NULL REFERENCES pipelines(id),
    target_stage_id UUID NOT NULL REFERENCES pipeline_stages(id),
    target_owner_mode TEXT NOT NULL DEFAULT 'same_as_source', -- 'same_as_source' | 'specific'
    target_owner_id UUID REFERENCES profiles(id),

    -- Opções
    copy_title BOOLEAN DEFAULT TRUE,
    copy_contacts BOOLEAN DEFAULT TRUE,
    title_prefix TEXT,

    -- Controle
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id)
);

-- 2. Índice GIN para arrays (performance)
CREATE INDEX idx_card_auto_rules_source ON card_auto_creation_rules
    USING GIN (source_pipeline_ids, source_stage_ids);

CREATE INDEX idx_card_auto_rules_active ON card_auto_creation_rules(is_active)
    WHERE is_active = TRUE;

-- 3. RLS
ALTER TABLE card_auto_creation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view rules" ON card_auto_creation_rules
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage rules" ON card_auto_creation_rules
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. Trigger para updated_at
CREATE TRIGGER update_card_auto_creation_rules_updated_at
    BEFORE UPDATE ON card_auto_creation_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. Função que executa a criação automática
CREATE OR REPLACE FUNCTION execute_card_auto_creation()
RETURNS TRIGGER AS $$
DECLARE
    v_rule RECORD;
    v_new_card_id UUID;
    v_target_owner UUID;
    v_new_title TEXT;
BEGIN
    -- Só executa em INSERT ou quando muda de stage
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.pipeline_stage_id IS DISTINCT FROM NEW.pipeline_stage_id) THEN

        -- Buscar regras ativas que correspondem
        FOR v_rule IN
            SELECT * FROM card_auto_creation_rules
            WHERE is_active = TRUE
              AND NEW.pipeline_id = ANY(source_pipeline_ids)
              AND NEW.pipeline_stage_id = ANY(source_stage_ids)
              AND (
                  source_owner_ids IS NULL
                  OR array_length(source_owner_ids, 1) IS NULL
                  OR NEW.dono_atual_id = ANY(source_owner_ids)
              )
        LOOP
            -- Evitar loop infinito: não criar se o card foi criado por uma regra
            IF NEW.metadata->>'created_by_rule' IS NOT NULL THEN
                CONTINUE;
            END IF;

            -- Determinar owner do novo card
            v_target_owner := CASE
                WHEN v_rule.target_owner_mode = 'specific' THEN v_rule.target_owner_id
                ELSE NEW.dono_atual_id
            END;

            -- Montar título
            v_new_title := COALESCE(v_rule.title_prefix, '') ||
                CASE WHEN v_rule.copy_title THEN NEW.titulo ELSE 'Novo Card' END;

            -- Criar novo card
            INSERT INTO cards (
                titulo,
                pipeline_id,
                pipeline_stage_id,
                dono_atual_id,
                pessoa_principal_id,
                produto,
                origem,
                status_comercial,
                moeda,
                metadata
            ) VALUES (
                v_new_title,
                v_rule.target_pipeline_id,
                v_rule.target_stage_id,
                v_target_owner,
                CASE WHEN v_rule.copy_contacts THEN NEW.pessoa_principal_id ELSE NULL END,
                NEW.produto,
                'INDICACAO', -- Origem padrão para cards criados automaticamente
                'EM_NEGOCIACAO',
                'BRL',
                jsonb_build_object(
                    'created_by_rule', v_rule.id::text,
                    'source_card_id', NEW.id::text,
                    'auto_created_at', NOW()::text
                )
            ) RETURNING id INTO v_new_card_id;

            -- Log da criação (activity)
            INSERT INTO activities (card_id, tipo, descricao, metadata)
            VALUES (
                NEW.id,
                'sistema',
                'Card criado automaticamente: ' || v_new_title,
                jsonb_build_object(
                    'new_card_id', v_new_card_id::text,
                    'rule_id', v_rule.id::text,
                    'target_stage_id', v_rule.target_stage_id::text
                )
            );

        END LOOP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Trigger no cards
CREATE TRIGGER trg_card_auto_creation
    AFTER INSERT OR UPDATE OF pipeline_stage_id ON cards
    FOR EACH ROW EXECUTE FUNCTION execute_card_auto_creation();

-- 7. Comentários para documentação
COMMENT ON TABLE card_auto_creation_rules IS 'Regras de criação automática de cards quando um card entra em determinada etapa';
COMMENT ON COLUMN card_auto_creation_rules.source_pipeline_ids IS 'Array de pipeline IDs que disparam a regra (OU lógico)';
COMMENT ON COLUMN card_auto_creation_rules.source_stage_ids IS 'Array de stage IDs que disparam a regra (OU lógico)';
COMMENT ON COLUMN card_auto_creation_rules.source_owner_ids IS 'Array de owner IDs que disparam a regra (OU lógico). NULL = qualquer owner';
COMMENT ON COLUMN card_auto_creation_rules.target_owner_mode IS 'same_as_source = mesmo dono do card original, specific = usar target_owner_id';
