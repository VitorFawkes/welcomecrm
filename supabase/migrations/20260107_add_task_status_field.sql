-- Migration: add_task_status_field
-- Description: Adiciona o campo virtual 'task_status' aos campos do sistema
-- Date: 2026-01-07

INSERT INTO system_fields (key, label, type, active, description)
VALUES (
    'task_status',
    '🚦 Status da Tarefa',
    'virtual',
    true,
    'Indicador visual se a próxima tarefa está atrasada, em dia ou pendente.'
)
ON CONFLICT (key) DO UPDATE 
SET 
    label = '🚦 Status da Tarefa',
    active = true,
    description = 'Indicador visual se a próxima tarefa está atrasada, em dia ou pendente.';
