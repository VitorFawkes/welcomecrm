-- Script de Verificação Final
-- Execute para confirmar que tudo está OK

-- 1. Verificar pipelines criados
SELECT produto, nome, ativo FROM pipelines ORDER BY produto;

-- 2. Verificar etapas do pipeline Trips
SELECT ps.ordem, ps.nome, ps.fase, ps.tipo_responsavel
FROM pipeline_stages ps
JOIN pipelines p ON ps.pipeline_id = p.id
WHERE p.produto = 'TRIPS'
ORDER BY ps.ordem;

-- 3. Verificar pessoas criadas
SELECT id, nome, email FROM pessoas 
WHERE email LIKE '%@trips.com'
ORDER BY nome;

-- 4. Verificar cards criados
SELECT 
  c.titulo,
  c.produto,
  ps.nome as etapa,
  ps.fase,
  p.nome as pessoa,
  c.valor_estimado,
  c.produto_data->>'destinos' as destinos,
  c.produto_data->'taxa_planejamento'->>'status' as taxa_status
FROM cards c
JOIN pipeline_stages ps ON c.pipeline_stage_id = ps.id
JOIN pessoas p ON c.pessoa_principal_id = p.id
ORDER BY ps.ordem;

-- 5. Verificar função mover_card
SELECT proname, pronargs FROM pg_proc WHERE proname = 'mover_card';
