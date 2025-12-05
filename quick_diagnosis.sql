-- ============================================
-- SCRIPT MINI - Diagnóstico Rápido (3 queries)
-- ============================================

-- Query 1: Ver profiles existentes
SELECT 
  'PROFILES' as section,
  id, 
  nome, 
  email, 
  role
FROM profiles
ORDER BY role, nome;

-- Query 2: Ver cards com dono_atual_nome da view
SELECT 
  'CARDS VIA VIEW' as section,
  titulo,
  dono_atual_nome,
  pessoa_nome,
  etapa_nome
FROM view_cards_detalhes
ORDER BY titulo;

-- Query 3: Ver integridade direta cards <-> profiles
SELECT 
  'CARDS DIRETO' as section,
  c.titulo,
  c.dono_atual_id as card_dono_id,
  p.id as profile_id,
  p.nome as profile_nome,
  CASE 
    WHEN c.dono_atual_id IS NULL THEN 'SEM DONO'
    WHEN p.id IS NULL THEN 'DONO INVÁLIDO'
    ELSE 'OK'
  END as status
FROM cards c
LEFT JOIN profiles p ON c.dono_atual_id = p.id
ORDER BY c.titulo;
