-- Create a Test Group
INSERT INTO cards (
    titulo, 
    produto, 
    status_comercial, 
    pipeline_id, 
    is_group_parent, 
    group_capacity, 
    group_total_pax, 
    data_viagem_inicio, 
    data_viagem_fim, 
    origem
) VALUES (
    'Excursão Teste Disney 2025', 
    'TRIPS', 
    'em_andamento', 
    (SELECT id FROM pipelines WHERE produto = 'TRIPS' LIMIT 1), 
    true, 
    20, 
    0, 
    '2025-07-01', 
    '2025-07-15', 
    'manual'
);

-- Create some loose cards to test linking
INSERT INTO cards (
    titulo, 
    produto, 
    status_comercial, 
    pipeline_id, 
    valor_estimado
) VALUES 
    ('Viajante Solto 1 - Disney', 'TRIPS', 'em_andamento', (SELECT id FROM pipelines WHERE produto = 'TRIPS' LIMIT 1), 5000),
    ('Viajante Solto 2 - Disney', 'TRIPS', 'em_andamento', (SELECT id FROM pipelines WHERE produto = 'TRIPS' LIMIT 1), 5000),
    ('Viajante Solto 3 - Disney', 'TRIPS', 'em_andamento', (SELECT id FROM pipelines WHERE produto = 'TRIPS' LIMIT 1), 5000);

-- Create some contacts to test bulk add
INSERT INTO contatos (nome, email) VALUES 
    ('Contato Teste 1', 'teste1@example.com'),
    ('Contato Teste 2', 'teste2@example.com'),
    ('Contato Teste 3', 'teste3@example.com');
