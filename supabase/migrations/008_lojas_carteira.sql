-- Fase 3: Lojas e Carteira de Clientes
CREATE TABLE IF NOT EXISTS lojas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marca_id UUID NOT NULL REFERENCES marcas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  cidade TEXT,
  estado CHAR(2),
  gerente_id UUID REFERENCES users(id),
  status TEXT DEFAULT 'ativo',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS loja_id UUID REFERENCES lojas(id);
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS loja_id UUID;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS ultimo_contato TIMESTAMPTZ;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS proximo_contato_permitido TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_lojas_marca ON lojas(marca_id);
CREATE INDEX IF NOT EXISTS idx_clientes_loja ON clientes(loja_id);
CREATE INDEX IF NOT EXISTS idx_clientes_vendedor ON clientes(vendedor_id);
