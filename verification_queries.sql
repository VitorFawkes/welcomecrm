-- 4. Validação pós-migração (Smoke Tests)

-- 4.1 A view existe e retorna dados?
SELECT count(*) as total_items FROM view_agenda;
SELECT * FROM view_agenda ORDER BY data DESC LIMIT 20;

-- 4.2 A view cobre todos os tipos esperados?
SELECT entity_type, count(*) 
FROM view_agenda 
GROUP BY entity_type;

-- 4.3 Status e defaults corretos?
-- Verificar se existem status inválidos (deve retornar vazio ou apenas status permitidos)
SELECT status, count(*) 
FROM view_agenda 
GROUP BY status;

-- 4.4 Teste de Triggers (Executar um por um e verificar)
-- Inserir Tarefa
INSERT INTO tarefas (card_id, titulo, tipo, data_vencimento, status, responsavel_id, created_by)
VALUES ('[CARD_ID_VALIDO]', 'Teste Trigger Tarefa', 'todo', NOW(), 'pendente', auth.uid(), auth.uid());

-- Inserir Reunião
INSERT INTO reunioes (card_id, titulo, data_inicio, responsavel_id, status, created_by)
VALUES ('[CARD_ID_VALIDO]', 'Teste Trigger Reunião', NOW(), auth.uid(), 'agendada', auth.uid());

-- Inserir Proposta
INSERT INTO proposals (card_id, status, created_by, valid_until)
VALUES ('[CARD_ID_VALIDO]', 'enviada', auth.uid(), NOW() + interval '7 days');

-- Verificar se apareceram na view
SELECT * FROM view_agenda WHERE titulo LIKE 'Teste Trigger%';

-- Verificar se gerou logs na activities
SELECT * FROM activities WHERE descricao LIKE '%Teste Trigger%' OR descricao LIKE '%Proposta criada%' ORDER BY created_at DESC LIMIT 5;
