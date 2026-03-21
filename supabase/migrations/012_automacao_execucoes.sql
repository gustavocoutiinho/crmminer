CREATE TABLE IF NOT EXISTS automacao_execucoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marca_id UUID NOT NULL REFERENCES marcas(id) ON DELETE CASCADE,
  automacao_id UUID NOT NULL,
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  canal TEXT NOT NULL CHECK (canal IN ('whatsapp','email','sms','push')),
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente','enviado','falhou','bounce','cancelado')),
  mensagem TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exec_automacao ON automacao_execucoes(automacao_id);
CREATE INDEX IF NOT EXISTS idx_exec_cliente ON automacao_execucoes(cliente_id);
CREATE INDEX IF NOT EXISTS idx_exec_status ON automacao_execucoes(status);
CREATE INDEX IF NOT EXISTS idx_exec_marca ON automacao_execucoes(marca_id);

ALTER TABLE campanhas ADD COLUMN IF NOT EXISTS prioridade INT DEFAULT 5;
