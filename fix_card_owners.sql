-- ============================================
-- FIX: Atribuir Vitor como dono de todos os cards
-- ============================================

DO $$
DECLARE
  v_vitor_id UUID;
BEGIN
  -- Buscar o profile do Vitor
  SELECT id INTO v_vitor_id 
  FROM profiles 
  WHERE email = 'vitor@welcometrips.com.br';
  
  IF v_vitor_id IS NULL THEN
    RAISE EXCEPTION 'Profile do Vitor não encontrado! Email: vitor@welcometrips.com.br';
  END IF;
  
  RAISE NOTICE 'Profile do Vitor encontrado: %', v_vitor_id;
  
  -- Atualizar TODOS os cards para ter Vitor como dono
  UPDATE cards
  SET 
    dono_atual_id = v_vitor_id,
    sdr_owner_id = v_vitor_id,
    vendas_owner_id = v_vitor_id
  WHERE dono_atual_id IS NULL;
  
  RAISE NOTICE '✅ Cards atualizados! Vitor é agora o dono de todos os cards.';
  
END $$;

-- Verificar resultado
SELECT 
  c.titulo,
  ps.fase,
  p.nome as dono_nome,
  p.email as dono_email,
  p.role as dono_role
FROM cards c
JOIN pipeline_stages ps ON c.pipeline_stage_id = ps.id
JOIN profiles p ON c.dono_atual_id = p.id
ORDER BY ps.ordem;
