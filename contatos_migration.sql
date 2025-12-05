-- ===================================================================
-- MIGRATION: Contatos and Cards-Contatos Tables
-- Description: Create contact management system for trip travelers
-- ===================================================================

-- Create enum for tipo_pessoa
CREATE TYPE tipo_pessoa_enum AS ENUM ('adulto', 'crianca');

-- Create enum for tipo_viajante
CREATE TYPE tipo_viajante_enum AS ENUM ('titular', 'acompanhante');

-- ===================================================================
-- Table: contatos
-- Stores all contacts (adults and children) with full information
-- ===================================================================
CREATE TABLE IF NOT EXISTS contatos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    email TEXT,
    telefone TEXT,
    data_nascimento DATE,
    cpf TEXT,
    passaporte TEXT,
    tipo_pessoa tipo_pessoa_enum NOT NULL DEFAULT 'adulto',
    responsavel_id UUID REFERENCES contatos(id) ON DELETE SET NULL,
    endereco JSONB,
    observacoes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Constraints
    CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' OR email IS NULL),
    CONSTRAINT unique_email UNIQUE (email)
);

-- ===================================================================
-- Table: cards_contatos
-- Many-to-many relationship between cards and contacts
-- ===================================================================
CREATE TABLE IF NOT EXISTS cards_contatos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    contato_id UUID NOT NULL REFERENCES contatos(id) ON DELETE CASCADE,
    tipo_viajante tipo_viajante_enum NOT NULL DEFAULT 'acompanhante',
    ordem INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Constraints
    CONSTRAINT unique_card_contato UNIQUE (card_id, contato_id)
);

-- ===================================================================
-- Indexes for Performance
-- ===================================================================

-- Contatos indexes
CREATE INDEX IF NOT EXISTS idx_contatos_email ON contatos(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contatos_nome ON contatos(nome);
CREATE INDEX IF NOT EXISTS idx_contatos_data_nascimento ON contatos(data_nascimento) WHERE data_nascimento IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contatos_tipo_pessoa ON contatos(tipo_pessoa);
CREATE INDEX IF NOT EXISTS idx_contatos_responsavel ON contatos(responsavel_id) WHERE responsavel_id IS NOT NULL;

-- Cards_contatos indexes
CREATE INDEX IF NOT EXISTS idx_cards_contatos_card_id ON cards_contatos(card_id);
CREATE INDEX IF NOT EXISTS idx_cards_contatos_contato_id ON cards_contatos(contato_id);
CREATE INDEX IF NOT EXISTS idx_cards_contatos_ordem ON cards_contatos(card_id, ordem);

-- ===================================================================
-- Triggers for Updated_at
-- ===================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_contatos_updated_at
    BEFORE UPDATE ON contatos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ===================================================================
-- Function: Auto-calculate tipo_pessoa based on data_nascimento
-- ===================================================================

CREATE OR REPLACE FUNCTION calculate_tipo_pessoa()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.data_nascimento IS NOT NULL THEN
        IF EXTRACT(YEAR FROM age(NEW.data_nascimento)) < 18 THEN
            NEW.tipo_pessoa := 'crianca';
        ELSE
            NEW.tipo_pessoa := 'adulto';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_calculate_tipo_pessoa
    BEFORE INSERT OR UPDATE OF data_nascimento ON contatos
    FOR EACH ROW
    EXECUTE FUNCTION calculate_tipo_pessoa();

-- ===================================================================
-- RLS Policies
-- ===================================================================

-- Enable RLS
ALTER TABLE contatos ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards_contatos ENABLE ROW LEVEL SECURITY;

-- Contatos policies
CREATE POLICY "Usuarios autenticados podem ver todos os contatos"
    ON contatos FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Usuarios autenticados podem criar contatos"
    ON contatos FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Usuarios autenticados podem atualizar contatos"
    ON contatos FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Usuarios autenticados podem deletar contatos"
    ON contatos FOR DELETE
    TO authenticated
    USING (true);

-- Cards_contatos policies
CREATE POLICY "Usuarios autenticados podem ver cards_contatos"
    ON cards_contatos FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Usuarios autenticados podem criar cards_contatos"
    ON cards_contatos FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Usuarios autenticados podem atualizar cards_contatos"
    ON cards_contatos FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Usuarios autenticados podem deletar cards_contatos"
    ON cards_contatos FOR DELETE
    TO authenticated
    USING (true);

-- ===================================================================
-- Helper View: Cards with Contact Summary
-- ===================================================================

CREATE OR REPLACE VIEW view_cards_contatos_summary AS
SELECT 
    c.id as card_id,
    COUNT(DISTINCT cc.contato_id) as total_viajantes,
    COUNT(DISTINCT CASE WHEN ct.tipo_pessoa = 'adulto' THEN cc.contato_id END) as total_adultos,
    COUNT(DISTINCT CASE WHEN ct.tipo_pessoa = 'crianca' THEN cc.contato_id END) as total_criancas,
    json_agg(
        json_build_object(
            'id', ct.id,
            'nome', ct.nome,
            'email', ct.email,
            'telefone', ct.telefone,
            'tipo_pessoa', ct.tipo_pessoa,
            'tipo_viajante', cc.tipo_viajante,
            'idade', CASE 
                WHEN ct.data_nascimento IS NOT NULL 
                THEN EXTRACT(YEAR FROM age(ct.data_nascimento))::integer
                ELSE NULL
            END,
            'ordem', cc.ordem
        ) ORDER BY cc.ordem
    ) as contatos
FROM cards c
LEFT JOIN cards_contatos cc ON c.id = cc.card_id
LEFT JOIN contatos ct ON cc.contato_id = ct.id
GROUP BY c.id;

-- ===================================================================
-- Comments for Documentation
-- ===================================================================

COMMENT ON TABLE contatos IS 'Stores all contacts (travelers, clients, etc.) with full information';
COMMENT ON TABLE cards_contatos IS 'Many-to-many relationship between cards and contacts';
COMMENT ON COLUMN contatos.tipo_pessoa IS 'Auto-calculated from data_nascimento: crianca if < 18 years old';
COMMENT ON COLUMN contatos.responsavel_id IS 'Reference to parent/guardian contact for children';
COMMENT ON COLUMN cards_contatos.tipo_viajante IS 'Distinguishes between primary traveler (titular) and companions';
COMMENT ON COLUMN cards_contatos.ordem IS 'Display order of travelers in the trip';
