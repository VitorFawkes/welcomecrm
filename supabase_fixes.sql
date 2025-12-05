-- ============================================
-- SCRIPT 1: Verificar e Corrigir mover_card
-- ============================================

-- DROP todas as versões da função mover_card
DROP FUNCTION IF EXISTS public.mover_card CASCADE;

-- Recriar a função corrigida (versão única)
CREATE OR REPLACE FUNCTION public.mover_card(
  p_card_id UUID,
  p_nova_etapa_id UUID,
  p_motivo_perda_id UUID DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Atualizar card para nova etapa (usando pipeline_stage_id)
  UPDATE public.cards
  SET 
    pipeline_stage_id = p_nova_etapa_id,
    updated_at = NOW(),
    updated_by = auth.uid()
  WHERE id = p_card_id;
  
  -- Se mudou para etapa "Perdido", adicionar motivo
  IF p_motivo_perda_id IS NOT NULL THEN
    UPDATE public.cards
    SET 
      motivo_perda_id = p_motivo_perda_id,
      status_comercial = 'perdido'
    WHERE id = p_card_id;
  END IF;
  
  -- TODO: Verificar se deve disparar handoff automático
  -- baseado em pipeline_config
END;
$$;

-- Grant permissões
GRANT EXECUTE ON FUNCTION public.mover_card TO authenticated;


-- ============================================
-- SCRIPT 2: Seed de Dados de Teste
-- ============================================

DO $$
DECLARE
  v_trips_pipeline_id UUID;
  v_pessoa1_id UUID;
  v_pessoa2_id UUID;
  v_pessoa3_id UUID;
  v_sdr_id UUID;
  v_planner_id UUID;
  v_etapa_novo_lead_id UUID;
  v_etapa_conectado_id UUID;
  v_etapa_briefing_id UUID;
BEGIN
  -- Buscar IDs necessários
  SELECT id INTO v_trips_pipeline_id FROM pipelines WHERE produto = 'TRIPS';
  SELECT id INTO v_sdr_id FROM profiles WHERE role = 'sdr' LIMIT 1;
  SELECT id INTO v_planner_id FROM profiles WHERE role = 'vendas' LIMIT 1;
  
  -- Buscar IDs das etapas
  SELECT id INTO v_etapa_novo_lead_id 
  FROM pipeline_stages 
  WHERE pipeline_id = v_trips_pipeline_id AND ordem = 1;
  
  SELECT id INTO v_etapa_conectado_id 
  FROM pipeline_stages 
  WHERE pipeline_id = v_trips_pipeline_id AND ordem = 3;
  
  SELECT id INTO v_etapa_briefing_id 
  FROM pipeline_stages 
  WHERE pipeline_id = v_trips_pipeline_id AND ordem = 6;
  
  -- Criar ou buscar pessoas de exemplo
  -- Pessoa 1
  SELECT id INTO v_pessoa1_id FROM pessoas WHERE email = 'joao.silva@trips.com';
  IF v_pessoa1_id IS NULL THEN
    INSERT INTO pessoas (nome, email, telefone)
    VALUES ('João Silva', 'joao.silva@trips.com', '+55 11 98765-4321')
    RETURNING id INTO v_pessoa1_id;
  END IF;
  
  -- Pessoa 2
  SELECT id INTO v_pessoa2_id FROM pessoas WHERE email = 'maria.santos@trips.com';
  IF v_pessoa2_id IS NULL THEN
    INSERT INTO pessoas (nome, email, telefone)
    VALUES ('Maria Santos', 'maria.santos@trips.com', '+55 21 99876-5432')
    RETURNING id INTO v_pessoa2_id;
  END IF;
  
  -- Pessoa 3
  SELECT id INTO v_pessoa3_id FROM pessoas WHERE email = 'pedro.oliveira@trips.com';
  IF v_pessoa3_id IS NULL THEN
    INSERT INTO pessoas (nome, email, telefone)
    VALUES ('Pedro Oliveira', 'pedro.oliveira@trips.com', '+55 11 91234-5678')
    RETURNING id INTO v_pessoa3_id;
  END IF;
  
  -- Card 1: Novo Lead (SDR) - Europa - Taxa Pendente
  INSERT INTO cards (
    titulo, produto, pipeline_id, pipeline_stage_id, pessoa_principal_id,
    valor_estimado, dono_atual_id, sdr_owner_id, status_comercial, prioridade,
    cliente_recorrente, produto_data
  ) VALUES (
    'Lua de Mel Europa - João e Ana',
    'TRIPS',
    v_trips_pipeline_id,
    v_etapa_novo_lead_id,
    v_pessoa1_id,
    45000.00,
    v_sdr_id,
    v_sdr_id,
    'em_aberto',
    'alta',
    false,
    '{
      "destinos": ["Paris", "Roma", "Barcelona"],
      "epoca_viagem": {"inicio": "2025-07-01", "fim": "2025-07-15"},
      "pessoas": {"adultos": 2},
      "motivo": "lua_de_mel",
      "orcamento": {"total": 45000.00, "por_pessoa": 22500.00},
      "taxa_planejamento": {
        "ativa": true,
        "status": "pendente",
        "valor": 500.00
      }
    }'::jsonb
  );
  
  -- Card 2: Conectado (SDR) - Japão - Taxa Paga
  INSERT INTO cards (
    titulo, produto, pipeline_id, pipeline_stage_id, pessoa_principal_id,
    valor_estimado, dono_atual_id, sdr_owner_id, status_comercial, prioridade,
    cliente_recorrente, produto_data
  ) VALUES (
    'Viagem Família Japão - Maria',
    'TRIPS',
    v_trips_pipeline_id,
    v_etapa_conectado_id,
    v_pessoa2_id,
    80000.00,
    v_sdr_id,
    v_sdr_id,
    'em_aberto',
    'media',
    false,
    '{
      "destinos": ["Tóquio", "Kyoto", "Osaka"],
      "epoca_viagem": {"inicio": "2025-10-10", "fim": "2025-10-25"},
      "pessoas": {"adultos": 2, "criancas": 2, "idades_criancas": [10, 7]},
      "motivo": "familia",
      "orcamento": {"total": 80000.00, "por_pessoa": 20000.00},
      "taxa_planejamento": {
        "ativa": true,
        "status": "paga",
        "valor": 500.00,
        "data_pagamento": "2025-01-15",
        "meio_pagamento": "pix"
      }
    }'::jsonb
  );
  
  -- Card 3: Aguardando Briefing (Planner) - África - Cortesia
  INSERT INTO cards (
    titulo, produto, pipeline_id, pipeline_stage_id, pessoa_principal_id,
    valor_estimado, dono_atual_id, vendas_owner_id, status_comercial, prioridade,
    cliente_recorrente, produto_data
  ) VALUES (
    'Safari África do Sul - Pedro',
    'TRIPS',
    v_trips_pipeline_id,
    v_etapa_briefing_id,
    v_pessoa3_id,
    55000.00,
    v_planner_id,
    v_planner_id,
    'em_aberto',
    'alta',
    false,
    '{
      "destinos": ["Cape Town", "Kruger Park"],
      "epoca_viagem": {"inicio": "2025-08-15", "fim": "2025-08-28"},
      "pessoas": {"adultos": 2},
      "motivo": "aventura",
      "orcamento": {"total": 55000.00, "por_pessoa": 27500.00},
      "taxa_planejamento": {
        "ativa": true,
        "status": "cortesia",
        "valor": 500.00,
        "data_pagamento": "2025-01-10"
      }
    }'::jsonb
  );
  
  RAISE NOTICE '✅ 3 cards de teste criados com sucesso!';
  
END $$;


-- ============================================
-- SCRIPT 3: Verificar RLS Policies
-- ============================================

-- Ver policies da tabela cards
SELECT 
  schemaname, tablename, policyname, 
  permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'cards'
ORDER BY policyname;

-- Ver policies da tabela pipeline_stages  
SELECT 
  schemaname, tablename, policyname,
  permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename IN ('pipeline_stages', 'etapas_funil')
ORDER BY tablename, policyname;
