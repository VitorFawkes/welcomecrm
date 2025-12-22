DO $$
DECLARE
    v_contact_id uuid;
    v_card_id uuid := '04a443ea-7f07-48da-aa1c-4162712fae8b'; -- Using the existing card
BEGIN
    -- 1. Create a dummy contact
    INSERT INTO contatos (nome, email, tipo_pessoa)
    VALUES ('Test Ghost Contact', 'ghost@test.com', 'adulto')
    RETURNING id INTO v_contact_id;

    RAISE NOTICE 'Created Contact: %', v_contact_id;

    -- 2. Link as Companion
    INSERT INTO cards_contatos (card_id, contato_id, tipo_viajante, ordem)
    VALUES (v_card_id, v_contact_id, 'acompanhante', 99);

    RAISE NOTICE 'Linked as Companion';

    -- 3. Set as Principal (This triggers cleanup_single_role_cards)
    UPDATE cards
    SET pessoa_principal_id = v_contact_id
    WHERE id = v_card_id;

    RAISE NOTICE 'Set as Principal';

    -- 4. Check if Contact still exists
    IF EXISTS (SELECT 1 FROM contatos WHERE id = v_contact_id) THEN
        RAISE NOTICE 'SUCCESS: Contact still exists.';
    ELSE
        RAISE EXCEPTION 'FAILURE: Contact was DELETED!';
    END IF;

    -- Cleanup
    UPDATE cards SET pessoa_principal_id = NULL WHERE id = v_card_id;
    DELETE FROM contatos WHERE id = v_contact_id;
END $$;
