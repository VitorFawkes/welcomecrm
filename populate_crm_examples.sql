DO $$
DECLARE
    -- Stage IDs
    v_stage_novo_lead uuid := '46c2cc2e-e9cb-4255-b889-3ee4d1248ba9';
    v_stage_briefing_realizado uuid := '6240003e-f899-40ad-82e4-8d09a0626c9a';
    v_stage_proposta_enviada uuid := '2d655aa0-ab05-46e5-997c-70f949b79c15';
    v_stage_viagem_aprovada uuid := '6bf4eddc-831a-4a6a-915c-98ca4e422bfc';
    v_stage_ganho uuid := 'cba42c81-7a3e-40bf-bf66-990d9c09b8d3';
    
    -- Pipeline ID
    v_pipeline_id uuid := 'c8022522-4a1d-411c-9387-efe03ca725ee';

    -- User ID (Existing)
    v_admin_id uuid := '5d84c022-9dae-45d0-9d2f-1e1ea479d4df';
    
    -- Variables for new IDs
    v_card_id uuid;
    v_contact_id_1 uuid;
    v_contact_id_2 uuid;
    v_contact_id_3 uuid;
BEGIN
    ---------------------------------------------------------------------------
    -- CARD 1: Family Trip to Disney (Stage: Proposta Enviada)
    ---------------------------------------------------------------------------
    -- Create Principal Contact
    INSERT INTO contatos (nome, email, telefone, tipo_pessoa)
    VALUES ('Roberto Carlos', 'roberto.carlos@email.com', '11999998888', 'adulto')
    RETURNING id INTO v_contact_id_1;

    -- Create Card
    INSERT INTO cards (titulo, pipeline_stage_id, pipeline_id, status_comercial, valor_estimado, data_viagem_inicio, pessoa_principal_id, produto, produto_data)
    VALUES ('Férias Disney 2024', v_stage_proposta_enviada, v_pipeline_id, 'aberto', 45000, '2024-07-10', v_contact_id_1, 'TRIPS', '{"destino": "Orlando, USA", "data_viagem_fim": "2024-07-25"}')
    RETURNING id INTO v_card_id;

    -- Create Companions (Wife + Child)
    INSERT INTO contatos (nome, tipo_pessoa) VALUES ('Maria Carlos', 'adulto') RETURNING id INTO v_contact_id_2;
    INSERT INTO contatos (nome, tipo_pessoa) VALUES ('Pedrinho Carlos', 'crianca') RETURNING id INTO v_contact_id_3;

    -- Link Companions
    INSERT INTO cards_contatos (card_id, contato_id, tipo_viajante, ordem) VALUES (v_card_id, v_contact_id_2, 'acompanhante', 1);
    INSERT INTO cards_contatos (card_id, contato_id, tipo_viajante, ordem) VALUES (v_card_id, v_contact_id_3, 'acompanhante', 2);

    -- Add Activity
    INSERT INTO activities (card_id, tipo, descricao, created_by)
    VALUES (v_card_id, 'proposal_created', 'Proposta V1 enviada com hotéis Disney All-Star.', v_admin_id);

    ---------------------------------------------------------------------------
    -- CARD 2: Honeymoon in Paris (Stage: Ganho)
    ---------------------------------------------------------------------------
    INSERT INTO contatos (nome, email, telefone, tipo_pessoa)
    VALUES ('Fernanda Lima', 'fernanda.lima@email.com', '21988887777', 'adulto')
    RETURNING id INTO v_contact_id_1;

    INSERT INTO cards (titulo, pipeline_stage_id, pipeline_id, status_comercial, valor_final, data_viagem_inicio, pessoa_principal_id, produto, produto_data)
    VALUES ('Lua de Mel Paris', v_stage_ganho, v_pipeline_id, 'ganho', 32000, '2024-05-01', v_contact_id_1, 'TRIPS', '{"destino": "Paris, França", "data_viagem_fim": "2024-05-10"}')
    RETURNING id INTO v_card_id;

    INSERT INTO contatos (nome, tipo_pessoa) VALUES ('Rodrigo Hilbert', 'adulto') RETURNING id INTO v_contact_id_2;
    INSERT INTO cards_contatos (card_id, contato_id, tipo_viajante, ordem) VALUES (v_card_id, v_contact_id_2, 'acompanhante', 1);

    INSERT INTO activities (card_id, tipo, descricao, created_by)
    VALUES (v_card_id, 'contract_signed', 'Contrato assinado e pagamento confirmado.', v_admin_id);

    ---------------------------------------------------------------------------
    -- CARD 3: Business Trip NY (Stage: Novo Lead)
    ---------------------------------------------------------------------------
    INSERT INTO contatos (nome, email, telefone, tipo_pessoa)
    VALUES ('João Silva Corp', 'joao@corp.com', '11977776666', 'adulto')
    RETURNING id INTO v_contact_id_1;

    INSERT INTO cards (titulo, pipeline_stage_id, pipeline_id, status_comercial, valor_estimado, data_viagem_inicio, pessoa_principal_id, produto, produto_data)
    VALUES ('Business Trip NY', v_stage_novo_lead, v_pipeline_id, 'aberto', 15000, '2024-03-15', v_contact_id_1, 'TRIPS', '{"destino": "New York, USA"}')
    RETURNING id INTO v_card_id;

    INSERT INTO activities (card_id, tipo, descricao, created_by)
    VALUES (v_card_id, 'card_created', 'Lead recebido via Site.', v_admin_id);

    ---------------------------------------------------------------------------
    -- CARD 4: Solo Trip Japan (Stage: Briefing Realizado)
    ---------------------------------------------------------------------------
    INSERT INTO contatos (nome, email, telefone, tipo_pessoa)
    VALUES ('Akira Toriyama', 'akira@manga.com', '11966665555', 'adulto')
    RETURNING id INTO v_contact_id_1;

    INSERT INTO cards (titulo, pipeline_stage_id, pipeline_id, status_comercial, valor_estimado, data_viagem_inicio, pessoa_principal_id, produto, produto_data)
    VALUES ('Expedição Japão', v_stage_briefing_realizado, v_pipeline_id, 'aberto', 28000, '2024-10-01', v_contact_id_1, 'TRIPS', '{"destino": "Tokyo, Kyoto, Osaka", "data_viagem_fim": "2024-10-20"}')
    RETURNING id INTO v_card_id;

    INSERT INTO activities (card_id, tipo, descricao, created_by)
    VALUES (v_card_id, 'meeting_created', 'Briefing realizado. Cliente quer foco em gastronomia e animes.', v_admin_id);

    ---------------------------------------------------------------------------
    -- CARD 5: Group Trip Patagonia (Stage: Viagem Aprovada)
    ---------------------------------------------------------------------------
    INSERT INTO contatos (nome, email, telefone, tipo_pessoa)
    VALUES ('Grupo Aventureiros', 'contato@grupo.com', '41955554444', 'adulto')
    RETURNING id INTO v_contact_id_1;

    INSERT INTO cards (titulo, pipeline_stage_id, pipeline_id, status_comercial, valor_final, data_viagem_inicio, pessoa_principal_id, produto, produto_data)
    VALUES ('Trekking Patagônia', v_stage_viagem_aprovada, v_pipeline_id, 'ganho', 65000, '2024-12-01', v_contact_id_1, 'TRIPS', '{"destino": "Patagônia Chilena", "data_viagem_fim": "2024-12-15"}')
    RETURNING id INTO v_card_id;

    -- Add 3 friends
    INSERT INTO contatos (nome, tipo_pessoa) VALUES ('Amigo 1', 'adulto') RETURNING id INTO v_contact_id_2;
    INSERT INTO contatos (nome, tipo_pessoa) VALUES ('Amigo 2', 'adulto') RETURNING id INTO v_contact_id_3;
    
    INSERT INTO cards_contatos (card_id, contato_id, tipo_viajante, ordem) VALUES (v_card_id, v_contact_id_2, 'acompanhante', 1);
    INSERT INTO cards_contatos (card_id, contato_id, tipo_viajante, ordem) VALUES (v_card_id, v_contact_id_3, 'acompanhante', 2);

    INSERT INTO activities (card_id, tipo, descricao, created_by)
    VALUES (v_card_id, 'status_changed', 'Viagem aprovada! Iniciando reservas.', v_admin_id);

END $$;
