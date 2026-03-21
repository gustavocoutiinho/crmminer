-- Fase 3: Motor Anti-Spam / Contatos Log
CREATE TABLE IF NOT EXISTS contatos_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marca_id UUID NOT NULL REFERENCES marcas(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  vendedor_id UUID NOT NULL REFERENCES users(id),
  tipo TEXT NOT NULL CHECK (tipo IN ('whatsapp','ligacao','email','presencial','sms')),
  observacao TEXT,
  override BOOLEAN DEFAULT FALSE,
  override_motivo TEXT,
  override_por UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contatos_log_cliente ON contatos_log(cliente_id);
CREATE INDEX IF NOT EXISTS idx_contatos_log_vendedor ON contatos_log(vendedor_id);

-- Ensure columns exist on clientes
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS ultimo_contato TIMESTAMPTZ;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS proximo_contato_permitido TIMESTAMPTZ;
