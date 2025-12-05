-- ===================================================================
-- DEEP ANALYSIS SCRIPT - Database Structure and Data Validation
-- ===================================================================

-- 1. VERIFICAR ESTRUTURA DE PIPELINES
SELECT 'PIPELINES STRUCTURE' as analysis_section;
SELECT 
  p.produto,
  p.nome,
  p.ativo,
  (SELECT COUNT(*) FROM pipeline_stages WHERE pipeline_id = p.id) as num_stages
FROM pipelines p
ORDER BY p.produto;

-- 2. VERIFICAR PIPELINE_STAGES
SELECT 'PIPELINE_STAGES STRUCTURE' as analysis_section;
SELECT 
  p.produto,
  ps.ordem,
  ps.nome,
  ps.fase,
  ps.tipo_responsavel,
  ps.ativo
FROM pipeline_stages ps
JOIN pipelines p ON ps.pipeline_id = p.id
WHERE p.produto = 'TRIPS'
ORDER BY ps.ordem;

-- 3. VERIFICAR CARDS E INTEGRIDADE
SELECT 'CARDS DATA INTEGRITY' as analysis_section;
SELECT 
  c.id,
  c.titulo,
  c.produto,
  p.produto as pipeline_produto_check, -- Deve ser igual a c.produto
  ps.nome as stage_nome,
  ps.fase,
  c.pipeline_stage_id IS NOT NULL as has_stage,
  c.pipeline_id IS NOT NULL as has_pipeline,
  c.dono_atual_id IS NOT NULL as has_owner,
  jsonb_typeof(c.produto_data) as produto_data_type,
  c.cliente_recorrente
FROM cards c
LEFT JOIN pipelines p ON c.pipeline_id = p.id
LEFT JOIN pipeline_stages ps ON c.pipeline_stage_id = ps.id
ORDER BY ps.ordem;

-- 4. VERIFICAR PRODUTO_DATA JSONB
SELECT 'PRODUTO_DATA VALIDATION' as analysis_section;
SELECT 
  c.id,
  c.titulo,
  c.produto_data ? 'destinos' as has_destinos,
  c.produto_data ? 'epoca_viagem' as has_epoca,
  c.produto_data ? 'pessoas' as has_pessoas,
  c.produto_data ? 'orcamento' as has_orcamento,
  c.produto_data ? 'taxa_planejamento' as has_taxa,
  c.produto_data->'taxa_planejamento'->>'status' as taxa_status,
  c.produto_data->'taxa_planejamento'->>'valor' as taxa_valor
FROM cards c
WHERE c.produto = 'TRIPS';

-- 5. VERIFICAR VIEW_CARDS_DETALHES
SELECT 'VIEW_CARDS_DETALHES CHECK' as analysis_section;
SELECT 
  id,
  titulo,
  produto,
  pipeline_nome,
  etapa_nome,
  etapa_fase,
  dono_atual_nome,
  pessoa_nome,
  valor_estimado,
  produto_data ? 'taxa_planejamento' as has_taxa_in_view
FROM view_cards_detalhes
ORDER BY etapa_ordem;

-- 6. VERIFICAR FOREIGN KEYS E CONSTRAINTS
SELECT 'FOREIGN KEY CONSTRAINTS' as analysis_section;
SELECT
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name IN ('cards', 'pipeline_stages', 'pipeline_config')
ORDER BY tc.table_name, kcu.column_name;

-- 7. VERIFICAR RLS POLICIES
SELECT 'RLS POLICIES' as analysis_section;
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  CASE 
    WHEN length(qual::text) > 50 THEN substring(qual::text, 1, 50) || '...'
    ELSE qual::text
  END as condition_preview
FROM pg_policies
WHERE tablename IN ('cards', 'pipeline_stages', 'pipelines', 'pipeline_config', 'pessoas')
ORDER BY tablename, policyname;

-- 8. VERIFICAR FUNÇÃO MOVER_CARD
SELECT 'MOVER_CARD FUNCTION' as analysis_section;
SELECT 
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments,
  pg_get_functiondef(p.oid) LIKE '%pipeline_stage_id%' as uses_new_column
FROM pg_proc p
WHERE p.proname = 'mover_card';

-- 9. VERIFICAR TRIGGERS
SELECT 'TRIGGERS' as analysis_section;
SELECT 
  t.tgname as trigger_name,
  c.relname as table_name,
  p.proname as function_name,
  CASE t.tgtype::integer & 1
    WHEN 1 THEN 'ROW'
    ELSE 'STATEMENT'
  END as trigger_level,
  CASE t.tgtype::integer & 66
    WHEN 2 THEN 'BEFORE'
    WHEN 64 THEN 'INSTEAD OF'
    ELSE 'AFTER'
  END as trigger_timing
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE c.relname IN ('cards', 'pipeline_stages')
  AND NOT t.tgisinternal
ORDER BY c.relname, t.tgname;

-- 10. VERIFICAR INDEXES
SELECT 'INDEXES' as analysis_section;
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename IN ('cards', 'pipeline_stages', 'pipelines', 'pipeline_config')
ORDER BY tablename, indexname;

-- 11. VERIFICAR DADOS ÓRFÃOS
SELECT 'ORPHAN DATA CHECK' as analysis_section;

-- Cards sem pipeline
SELECT 'Cards sem pipeline' as issue, COUNT(*) as count
FROM cards
WHERE pipeline_id IS NULL;

-- Cards sem stage
SELECT 'Cards sem stage' as issue, COUNT(*) as count
FROM cards
WHERE pipeline_stage_id IS NULL;

-- Cards com pipeline incompatível
SELECT 'Cards com pipeline incompatível' as issue, COUNT(*) as count
FROM cards c
JOIN pipelines p ON c.pipeline_id = p.id
WHERE c.produto != p.produto;

-- Stages sem pipeline
SELECT 'Stages sem pipeline' as issue, COUNT(*) as count
FROM pipeline_stages
WHERE pipeline_id IS NULL;

-- 12. VERIFICAR PROFILES/USERS
SELECT 'USERS AND PROFILES' as analysis_section;
SELECT 
  p.id,
  p.nome,
  p.email,
  p.role,
  (SELECT COUNT(*) FROM cards WHERE dono_atual_id = p.id) as cards_owned,
  (SELECT COUNT(*) FROM cards WHERE sdr_owner_id = p.id) as cards_as_sdr,
  (SELECT COUNT(*) FROM cards WHERE vendas_owner_id = p.id) as cards_as_planner
FROM profiles p
ORDER BY p.role, p.nome;
