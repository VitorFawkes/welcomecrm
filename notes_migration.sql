-- Create notes table for card observations
CREATE TABLE IF NOT EXISTS public.notas (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    card_id uuid NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
    texto text NOT NULL,
    autor_id uuid NOT NULL REFERENCES public.profiles(id),
    pinned boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_notas_card_id ON public.notas(card_id);
CREATE INDEX IF NOT EXISTS idx_notas_created_at ON public.notas(created_at DESC);

-- RLS Policies
ALTER TABLE public.notas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view notes for cards they have access to"
    ON public.notas FOR SELECT
    USING (true);

CREATE POLICY "Users can insert notes"
    ON public.notas FOR INSERT
    WITH CHECK (auth.uid() = autor_id);

CREATE POLICY "Users can update their own notes"
    ON public.notas FOR UPDATE
    USING (auth.uid() = autor_id);

CREATE POLICY "Users can delete their own notes"
    ON public.notas FOR DELETE
    USING (auth.uid() = autor_id);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_notas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notas_updated_at
    BEFORE UPDATE ON public.notas
    FOR EACH ROW
    EXECUTE FUNCTION update_notas_updated_at();
