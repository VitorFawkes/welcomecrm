-- Debug Script: Luana vs Conversation
DO $$
DECLARE
    v_target_phone text := '11947410960'; -- From screenshot
    v_contact_id uuid;
    v_contact_phones text[];
    v_convo_id uuid;
    v_convo_contact_id uuid;
BEGIN
    RAISE NOTICE '--- DEBUG START ---';

    -- 1. Find Conversation
    SELECT id, contact_id 
    INTO v_convo_id, v_convo_contact_id
    FROM whatsapp_conversations
    WHERE external_conversation_id = v_target_phone OR external_conversation_id = '55' || v_target_phone;

    RAISE NOTICE 'Conversation Found: % (Linked Contact: %)', v_convo_id, v_convo_contact_id;

    -- 2. Find Contact (Luana)
    SELECT id INTO v_contact_id 
    FROM contatos 
    WHERE nome ILIKE '%Luana Damasceno%'
    LIMIT 1;

    RAISE NOTICE 'Luana ID: %', v_contact_id;

    -- 3. Check Contact Phones
    SELECT array_agg(valor) INTO v_contact_phones
    FROM contato_meios 
    WHERE contato_id = v_contact_id;

    RAISE NOTICE 'Luana Phones: %', v_contact_phones;

    -- 4. Test Normalization
    RAISE NOTICE 'Normalized Target (11...): %', public.normalize_phone_robust(v_target_phone);
    RAISE NOTICE 'Normalized Luana Phone: %', public.normalize_phone_robust(v_contact_phones[1]);

    -- 5. Logic Check
    IF v_convo_id IS NOT NULL AND v_contact_id IS NOT NULL THEN
        IF v_convo_contact_id IS NULL THEN
             RAISE NOTICE 'ACTION: Conversation is orphan. Fixing link now...';
             UPDATE whatsapp_conversations SET contact_id = v_contact_id WHERE id = v_convo_id;
             UPDATE contatos SET last_whatsapp_conversation_id = v_target_phone WHERE id = v_contact_id;
             RAISE NOTICE '...FIXED.';
        ELSIF v_convo_contact_id != v_contact_id THEN
             RAISE NOTICE 'ACTION: Conversation linked to WRONG contact (%)! Fixing...', v_convo_contact_id;
             UPDATE whatsapp_conversations SET contact_id = v_contact_id WHERE id = v_convo_id;
             UPDATE contatos SET last_whatsapp_conversation_id = v_target_phone WHERE id = v_contact_id;
             RAISE NOTICE '...FIXED.';
        ELSE
             RAISE NOTICE 'Status: Already correctly linked.';
        END IF;
    ELSE
        RAISE NOTICE 'ERROR: Could not find either the conversation or the contact.';
    END IF;

    RAISE NOTICE '--- DEBUG END ---';
END $$;
