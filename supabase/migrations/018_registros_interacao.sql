CREATE TABLE IF NOT EXISTS registros_interacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marca_id UUID NOT NULL REFERENCES marcas(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  vendedor_id UUID NOT NULL REFERENCES users(id),
  tipo TEXT NOT NULL CHECK (tipo IN ('observacao','feedback','info','objecao','preferencia')),
  texto TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_registros_cliente ON registros_interacao(cliente_id);
CREATE INDEX IF NOT EXISTS idx_registros_vendedor ON registros_interacao(vendedor_id);
