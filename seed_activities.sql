
-- Insert fake activities for the specific card
INSERT INTO atividades (card_id, tipo, titulo, descricao, created_at, created_by)
VALUES 
  ('e40f8070-5ab1-4ffb-a5b6-b259dd6a7e59', 'whatsapp', 'Conversa inicial', 'Cliente interessado em pacote para Europa em Julho.', NOW() - INTERVAL '5 days', 'auth-user-id'),
  ('e40f8070-5ab1-4ffb-a5b6-b259dd6a7e59', 'ligacao', 'Qualificação', 'Alinhamento de expectativas e budget. Cliente prefere hotéis 4 estrelas.', NOW() - INTERVAL '4 days', 'auth-user-id'),
  ('e40f8070-5ab1-4ffb-a5b6-b259dd6a7e59', 'email', 'Envio de Cotação', 'Primeira versão do roteiro enviada por email.', NOW() - INTERVAL '3 days', 'auth-user-id'),
  ('e40f8070-5ab1-4ffb-a5b6-b259dd6a7e59', 'whatsapp', 'Dúvidas sobre roteiro', 'Cliente perguntou sobre passeios em Roma.', NOW() - INTERVAL '2 days', 'auth-user-id'),
  ('e40f8070-5ab1-4ffb-a5b6-b259dd6a7e59', 'reuniao', 'Apresentação de Proposta', 'Reunião agendada para fechar detalhes.', NOW() - INTERVAL '1 day', 'auth-user-id');
