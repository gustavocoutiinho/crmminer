-- Fase 3: Metas Gamificadas
CREATE TABLE IF NOT EXISTS metas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marca_id UUID NOT NULL REFERENCES marcas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('contatos_diarios','vendas_mensais','ticket_medio','novos_clientes')),
  valor_meta NUMERIC(12,2) NOT NULL,
  valor_atual NUMERIC(12,2) DEFAULT 0,
  periodo TEXT NOT NULL,
  streak INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_metas_user ON metas(user_id);
CREATE INDEX IF NOT EXISTS idx_metas_marca ON metas(marca_id);
CREATE INDEX IF NOT EXISTS idx_metas_periodo ON metas(periodo);
