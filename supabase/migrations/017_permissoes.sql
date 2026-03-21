CREATE TABLE IF NOT EXISTS permissoes_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marca_id UUID NOT NULL REFERENCES marcas(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin','gerente','vendedor')),
  permissoes JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(marca_id, role)
);
