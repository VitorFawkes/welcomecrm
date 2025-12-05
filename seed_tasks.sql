-- Seed Tasks for existing cards
-- This script finds existing cards and adds tasks to them
-- Updated to include responsavel_id which is required

DO $$
DECLARE
    v_card_id uuid;
    v_responsavel_id uuid;
BEGIN
    -- 1. Find a card with an owner and add an OVERDUE task
    SELECT id, dono_atual_id INTO v_card_id, v_responsavel_id 
    FROM public.cards 
    WHERE dono_atual_id IS NOT NULL 
    LIMIT 1;
    
    IF v_card_id IS NOT NULL THEN
        INSERT INTO public.tarefas (card_id, titulo, tipo, data_vencimento, prioridade, concluida, responsavel_id)
        VALUES (
            v_card_id, 
            'Ligar para confirmar interesse', 
            'ligacao', 
            (NOW() - INTERVAL '2 days'), -- Overdue
            'alta',
            false,
            v_responsavel_id
        );
    END IF;

    -- 2. Find another card (or same) and add a task for TODAY
    SELECT id, dono_atual_id INTO v_card_id, v_responsavel_id 
    FROM public.cards 
    WHERE dono_atual_id IS NOT NULL 
    OFFSET 1 LIMIT 1;
    
    IF v_card_id IS NULL THEN
        SELECT id, dono_atual_id INTO v_card_id, v_responsavel_id 
        FROM public.cards 
        WHERE dono_atual_id IS NOT NULL 
        LIMIT 1;
    END IF;

    IF v_card_id IS NOT NULL THEN
        INSERT INTO public.tarefas (card_id, titulo, tipo, data_vencimento, prioridade, concluida, responsavel_id)
        VALUES (
            v_card_id, 
            'Enviar apresentação comercial', 
            'email', 
            (NOW() + INTERVAL '2 hours'), -- Today
            'media',
            false,
            v_responsavel_id
        );
    END IF;

    -- 3. Find another card and add a FUTURE task
    SELECT id, dono_atual_id INTO v_card_id, v_responsavel_id 
    FROM public.cards 
    WHERE dono_atual_id IS NOT NULL 
    OFFSET 2 LIMIT 1;
    
    IF v_card_id IS NULL THEN
        SELECT id, dono_atual_id INTO v_card_id, v_responsavel_id 
        FROM public.cards 
        WHERE dono_atual_id IS NOT NULL 
        LIMIT 1;
    END IF;

    IF v_card_id IS NOT NULL THEN
        INSERT INTO public.tarefas (card_id, titulo, tipo, data_vencimento, prioridade, concluida, responsavel_id)
        VALUES (
            v_card_id, 
            'Reunião de alinhamento', 
            'reuniao', 
            (NOW() + INTERVAL '3 days'), -- Future
            'baixa',
            false,
            v_responsavel_id
        );
    END IF;

    -- 4. Add a COMPLETED task (History)
    IF v_card_id IS NOT NULL THEN
        INSERT INTO public.tarefas (card_id, titulo, tipo, data_vencimento, prioridade, concluida, concluida_em, responsavel_id)
        VALUES (
            v_card_id, 
            'Primeiro contato realizado', 
            'whatsapp', 
            (NOW() - INTERVAL '5 days'), 
            'media',
            true,
            (NOW() - INTERVAL '5 days'),
            v_responsavel_id
        );
    END IF;

END $$;
