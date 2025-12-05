-- Create card owner history table
CREATE TABLE IF NOT EXISTS public.card_owner_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    card_id uuid NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
    owner_id uuid NOT NULL REFERENCES public.profiles(id),
    fase text NOT NULL,
    started_at timestamptz NOT NULL DEFAULT now(),
    ended_at timestamptz,
    transfer_reason text,
    transferred_by uuid REFERENCES public.profiles(id),
    created_at timestamptz DEFAULT now()
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_owner_history_card_id ON public.card_owner_history(card_id);
CREATE INDEX IF NOT EXISTS idx_owner_history_owner_id ON public.card_owner_history(owner_id);
CREATE INDEX IF NOT EXISTS idx_owner_history_started_at ON public.card_owner_history(started_at DESC);

-- RLS Policies
ALTER TABLE public.card_owner_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view owner history"
    ON public.card_owner_history FOR SELECT
    USING (true);

CREATE POLICY "Users can insert owner history"
    ON public.card_owner_history FOR INSERT
    WITH CHECK (auth.uid() = transferred_by OR transferred_by IS NULL);

-- Function to automatically log owner changes
CREATE OR REPLACE FUNCTION log_owner_change()
RETURNS TRIGGER AS $$
DECLARE
    current_fase text;
BEGIN
    -- Get current fase from pipeline_stages
    SELECT ps.fase INTO current_fase
    FROM pipeline_stages ps
    WHERE ps.id = NEW.pipeline_stage_id;

    -- If owner changed
    IF (TG_OP = 'UPDATE' AND OLD.dono_atual_id IS DISTINCT FROM NEW.dono_atual_id) OR TG_OP = 'INSERT' THEN
        -- Close previous owner record if exists
        IF OLD.dono_atual_id IS NOT NULL AND TG_OP = 'UPDATE' THEN
            UPDATE card_owner_history
            SET ended_at = now()
            WHERE card_id = NEW.id
              AND owner_id = OLD.dono_atual_id
              AND ended_at IS NULL;
        END IF;

        -- Create new owner record if new owner exists
        IF NEW.dono_atual_id IS NOT NULL THEN
            INSERT INTO card_owner_history (
                card_id,
                owner_id,
                fase,
                started_at,
                transfer_reason
            ) VALUES (
                NEW.id,
                NEW.dono_atual_id,
                current_fase,
                now(),
                CASE 
                    WHEN TG_OP = 'INSERT' THEN 'Card criado'
                    WHEN OLD.pipeline_stage_id != NEW.pipeline_stage_id THEN 'Mudança de etapa'
                    ELSE 'Transferência manual'
                END
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on cards table
DROP TRIGGER IF EXISTS cards_owner_change_trigger ON public.cards;
CREATE TRIGGER cards_owner_change_trigger
    AFTER INSERT OR UPDATE OF dono_atual_id, pipeline_stage_id ON public.cards
    FOR EACH ROW
    EXECUTE FUNCTION log_owner_change();

-- Backfill existing cards (one-time operation)
-- This creates initial owner history for cards that already have owners
INSERT INTO card_owner_history (card_id, owner_id, fase, started_at, transfer_reason)
SELECT 
    c.id,
    c.dono_atual_id,
    ps.fase,
    c.created_at,
    'Dados históricos'
FROM cards c
JOIN pipeline_stages ps ON ps.id = c.pipeline_stage_id
WHERE c.dono_atual_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM card_owner_history coh 
      WHERE coh.card_id = c.id
  );
