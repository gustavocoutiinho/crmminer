CREATE TABLE IF NOT EXISTS contatos_agendados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marca_id UUID NOT NULL REFERENCES marcas(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  vendedor_id UUID NOT NULL REFERENCES users(id),
  data DATE NOT NULL,
  hora TIME,
  tipo TEXT NOT NULL CHECK (tipo IN ('whatsapp','ligacao','email')),
  observacao TEXT,
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente','realizado','reagendado','atrasado')),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_agendados_vendedor ON contatos_agendados(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_agendados_data ON contatos_agendados(data);
CREATE INDEX IF NOT EXISTS idx_agendados_cliente ON contatos_agendados(cliente_id);
