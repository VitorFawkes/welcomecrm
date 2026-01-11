-- Auto-map Pipelines
INSERT INTO integration_router_config (integration_id, external_pipeline_id, ac_pipeline_id, pipeline_id, business_unit, is_active)
VALUES 
    ('a2141b92-561f-4514-92b4-9412a068d236', '8', '8', 'c8022522-4a1d-411c-9387-efe03ca725ee', 'TRIPS', true),
    ('a2141b92-561f-4514-92b4-9412a068d236', '6', '6', 'c8022522-4a1d-411c-9387-efe03ca725ee', 'TRIPS', true)
ON CONFLICT (ac_pipeline_id) DO UPDATE 
SET pipeline_id = EXCLUDED.pipeline_id, integration_id = EXCLUDED.integration_id, external_pipeline_id = EXCLUDED.external_pipeline_id, is_active = true;

-- Auto-map User
INSERT INTO integration_user_map (integration_id, external_user_id, internal_user_id, updated_at)
VALUES 
    ('a2141b92-561f-4514-92b4-9412a068d236', '50', 'dfdc4512-d842-4487-be80-11df91f24057', NOW())
ON CONFLICT (integration_id, external_user_id) DO UPDATE 
SET internal_user_id = EXCLUDED.internal_user_id;

-- Auto-map Stages (Pipeline 8 - SDR Trips)
INSERT INTO integration_stage_map (integration_id, pipeline_id, external_stage_id, external_stage_name, internal_stage_id, updated_at)
VALUES
    -- 1º Contato -> Novo Lead
    ('a2141b92-561f-4514-92b4-9412a068d236', '8', '42', '1º Contato', '46c2cc2e-e9cb-4255-b889-3ee4d1248ba9', NOW()),
    -- Tentativa de contato -> Tentativa de Contato
    ('a2141b92-561f-4514-92b4-9412a068d236', '8', '59', 'Tentativa de contato', 'f5df9be4-882f-4e54-b8f9-49782889b63e', NOW()),
    -- Pagou a Taxa -> Taxa Paga
    ('a2141b92-561f-4514-92b4-9412a068d236', '8', 'seed_p8_pagou', 'Pagou a Taxa', '084c9f49-731e-43cb-8e21-2e7e84eff15c', NOW())
ON CONFLICT (integration_id, pipeline_id, external_stage_id) DO UPDATE
SET internal_stage_id = EXCLUDED.internal_stage_id;

-- Auto-map Stages (Pipeline 6 - Travel Planner Trips)
INSERT INTO integration_stage_map (integration_id, pipeline_id, external_stage_id, external_stage_name, internal_stage_id, updated_at)
VALUES
    -- Oportunidade -> Novo Lead
    ('a2141b92-561f-4514-92b4-9412a068d236', '6', 'seed_p6_oportunidade', 'Oportunidade', '46c2cc2e-e9cb-4255-b889-3ee4d1248ba9', NOW()),
    -- Em contato -> Tentativa de Contato
    ('a2141b92-561f-4514-92b4-9412a068d236', '6', 'seed_p6_em_contato', 'Em contato', 'f5df9be4-882f-4e54-b8f9-49782889b63e', NOW()),
    -- Ganhou -> Viagem Confirmada (Ganho)
    ('a2141b92-561f-4514-92b4-9412a068d236', '6', 'seed_p6_ganhou', 'Ganhou', 'cba42c81-7a3e-40bf-bf66-990d9c09b8d3', NOW()),
    -- Reservas/Fechamento -> Reservas em Andamento
    ('a2141b92-561f-4514-92b4-9412a068d236', '6', 'seed_p6_reservas', 'Reservas/Fechamento', 'c81c09a0-cf3b-482d-81a8-9541b6470c5a', NOW())
ON CONFLICT (integration_id, pipeline_id, external_stage_id) DO UPDATE
SET internal_stage_id = EXCLUDED.internal_stage_id;
