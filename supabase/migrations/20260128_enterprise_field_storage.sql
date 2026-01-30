-- ═══════════════════════════════════════════════════════════════════════════════
-- MIGRAÇÃO: Sistema Enterprise de Armazenamento de Campos
--
-- OBJETIVO: Tornar o sistema 100% modular e configurável via banco de dados,
-- eliminando QUALQUER lista hardcoded no código.
--
-- COMO FUNCIONA:
-- 1. Cada mapeamento em integration_field_map agora define explicitamente:
--    - storage_location: onde o campo será armazenado (column, produto_data, etc.)
--    - db_column_name: nome real da coluna se storage_location = 'column'
--
-- 2. O código integration-process lê essas configurações e salva automaticamente
--    no lugar correto, sem nenhuma lista hardcoded.
--
-- BENEFÍCIOS:
-- - Adicionar novo campo = apenas INSERT no banco
-- - Mudar destino de um campo = apenas UPDATE no banco
-- - Zero alteração de código para novos campos
-- ═══════════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════════
-- PARTE 1: Adicionar colunas na integration_field_map
-- ═══════════════════════════════════════════════════════════════════════════════

-- Enum para tipos de armazenamento
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'field_storage_location') THEN
        CREATE TYPE field_storage_location AS ENUM (
            'column',           -- Coluna direta na tabela cards
            'produto_data',     -- JSON cards.produto_data
            'marketing_data',   -- JSON cards.marketing_data
            'briefing_inicial'  -- JSON cards.briefing_inicial
        );
    END IF;
END $$;

-- Adicionar coluna storage_location
ALTER TABLE integration_field_map
ADD COLUMN IF NOT EXISTS storage_location field_storage_location;

-- Adicionar coluna db_column_name (nome da coluna real quando storage_location = 'column')
ALTER TABLE integration_field_map
ADD COLUMN IF NOT EXISTS db_column_name VARCHAR(100);

-- Comentários explicativos
COMMENT ON COLUMN integration_field_map.storage_location IS
'Define onde o valor mapeado será armazenado: column (coluna direta), produto_data, marketing_data, ou briefing_inicial (JSONs)';

COMMENT ON COLUMN integration_field_map.db_column_name IS
'Quando storage_location = column, especifica o nome exato da coluna na tabela cards';

-- ═══════════════════════════════════════════════════════════════════════════════
-- PARTE 2: Popular valores baseado nos padrões existentes
-- ═══════════════════════════════════════════════════════════════════════════════

-- Campos que vão para briefing_inicial (prefixo __briefing_inicial__)
UPDATE integration_field_map
SET storage_location = 'briefing_inicial',
    db_column_name = NULL
WHERE local_field_key LIKE '__briefing_inicial__.%';

-- Campos que vão para produto_data (prefixo __produto_data__)
UPDATE integration_field_map
SET storage_location = 'produto_data',
    db_column_name = NULL
WHERE local_field_key LIKE '__produto_data__.%';

-- Campos que vão para marketing_data (prefixo card.mkt_ ou card.)
UPDATE integration_field_map
SET storage_location = 'marketing_data',
    db_column_name = NULL
WHERE local_field_key LIKE 'card.%';

-- ═══════════════════════════════════════════════════════════════════════════════
-- PARTE 3: Configurar campos que devem ir para COLUNAS diretas
-- Baseado nas colunas reais da tabela cards
-- ═══════════════════════════════════════════════════════════════════════════════

-- valor_estimado → coluna cards.valor_estimado
UPDATE integration_field_map
SET storage_location = 'column',
    db_column_name = 'valor_estimado'
WHERE local_field_key = 'valor_estimado'
  AND storage_location IS NULL;

-- origem → coluna cards.origem
UPDATE integration_field_map
SET storage_location = 'column',
    db_column_name = 'origem'
WHERE local_field_key = 'origem'
  AND storage_location IS NULL;

-- prioridade → coluna cards.prioridade
UPDATE integration_field_map
SET storage_location = 'column',
    db_column_name = 'prioridade'
WHERE local_field_key = 'prioridade'
  AND storage_location IS NULL;

-- data_viagem_inicio → coluna cards.data_viagem_inicio
UPDATE integration_field_map
SET storage_location = 'column',
    db_column_name = 'data_viagem_inicio'
WHERE local_field_key = 'data_viagem_inicio'
  AND storage_location IS NULL;

-- data_viagem_fim → coluna cards.data_viagem_fim
UPDATE integration_field_map
SET storage_location = 'column',
    db_column_name = 'data_viagem_fim'
WHERE local_field_key = 'data_viagem_fim'
  AND storage_location IS NULL;

-- forma_pagamento → coluna cards.forma_pagamento
UPDATE integration_field_map
SET storage_location = 'column',
    db_column_name = 'forma_pagamento'
WHERE local_field_key = 'forma_pagamento'
  AND storage_location IS NULL;

-- moeda → coluna cards.moeda
UPDATE integration_field_map
SET storage_location = 'column',
    db_column_name = 'moeda'
WHERE local_field_key = 'moeda'
  AND storage_location IS NULL;

-- ═══════════════════════════════════════════════════════════════════════════════
-- PARTE 4: Todos os campos restantes sem configuração → marketing_data
-- (comportamento padrão seguro)
-- ═══════════════════════════════════════════════════════════════════════════════

UPDATE integration_field_map
SET storage_location = 'marketing_data',
    db_column_name = NULL
WHERE storage_location IS NULL
  AND entity_type = 'deal';

-- ═══════════════════════════════════════════════════════════════════════════════
-- PARTE 5: Índice para performance
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_integration_field_map_storage
ON integration_field_map(storage_location)
WHERE is_active = true;

-- ═══════════════════════════════════════════════════════════════════════════════
-- VERIFICAÇÃO: Mostrar configuração final
-- ═══════════════════════════════════════════════════════════════════════════════

SELECT
    local_field_key,
    storage_location,
    db_column_name,
    section
FROM integration_field_map
WHERE entity_type = 'deal'
  AND is_active = true
ORDER BY storage_location, local_field_key;
