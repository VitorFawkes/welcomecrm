-- ============================================
-- Pipeline Card Settings Configuration
-- ============================================
-- This script creates the pipeline_card_settings table
-- and seeds default field visibility configurations

-- Create pipeline_card_settings table if not exists
CREATE TABLE IF NOT EXISTS public.pipeline_card_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fase TEXT NOT NULL CHECK (fase IN ('SDR', 'Planner', 'Pós-venda')),
  campos_visiveis JSONB NOT NULL DEFAULT '[]'::jsonb,
  ordem_campos JSONB NOT NULL DEFAULT '[]'::jsonb,
  usuario_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(fase, usuario_id)
);

-- Enable RLS
ALTER TABLE public.pipeline_card_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own settings or default settings"
  ON public.pipeline_card_settings FOR SELECT
  USING (usuario_id = auth.uid() OR usuario_id IS NULL);

CREATE POLICY "Users can insert their own settings"
  ON public.pipeline_card_settings FOR INSERT
  WITH CHECK (usuario_id = auth.uid());

CREATE POLICY "Users can update their own settings"
  ON public.pipeline_card_settings FOR UPDATE
  USING (usuario_id = auth.uid());

-- Insert default configurations (usuario_id = NULL means global default)

-- SDR Phase: Basic qualification fields
INSERT INTO public.pipeline_card_settings (fase, campos_visiveis, ordem_campos, usuario_id)
VALUES (
  'SDR',
  '[
    "destinos",
    "epoca_viagem",
    "pessoas",
    "motivo",
    "orcamento"
  ]'::jsonb,
  '[
    "destinos",
    "epoca_viagem",
    "pessoas",
    "orcamento",
    "motivo"
  ]'::jsonb,
  NULL
) ON CONFLICT (fase, usuario_id) DO NOTHING;

-- Planner Phase: All fields including taxa planejamento
INSERT INTO public.pipeline_card_settings (fase, campos_visiveis, ordem_campos, usuario_id)
VALUES (
  'Planner',
  '[
    "destinos",
    "epoca_viagem",
    "pessoas",
    "motivo",
    "orcamento",
    "taxa_planejamento"
  ]'::jsonb,
  '[
    "destinos",
    "epoca_viagem",
    "pessoas",
    "orcamento",
    "motivo",
    "taxa_planejamento"
  ]'::jsonb,
  NULL
) ON CONFLICT (fase, usuario_id) DO NOTHING;

-- Pós-venda Phase: Read-only view of all fields
INSERT INTO public.pipeline_card_settings (fase, campos_visiveis, ordem_campos, usuario_id)
VALUES (
  'Pós-venda',
  '[
    "destinos",
    "epoca_viagem",
    "pessoas",
    "motivo",
    "orcamento",
    "taxa_planejamento"
  ]'::jsonb,
  '[
    "destinos",
    "epoca_viagem",
    "pessoas",
    "orcamento",
    "motivo",
    "taxa_planejamento"
  ]'::jsonb,
  NULL
) ON CONFLICT (fase, usuario_id) DO NOTHING;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_pipeline_card_settings_fase 
  ON public.pipeline_card_settings(fase);

CREATE INDEX IF NOT EXISTS idx_pipeline_card_settings_usuario 
  ON public.pipeline_card_settings(usuario_id);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.pipeline_card_settings TO authenticated;

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_pipeline_card_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_pipeline_card_settings_updated_at
  BEFORE UPDATE ON public.pipeline_card_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_pipeline_card_settings_updated_at();

-- Verification query
SELECT 
  fase,
  campos_visiveis,
  ordem_campos,
  usuario_id IS NULL as is_default
FROM public.pipeline_card_settings
ORDER BY fase;
