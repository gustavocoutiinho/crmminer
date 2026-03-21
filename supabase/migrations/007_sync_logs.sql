CREATE TABLE IF NOT EXISTS sync_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marca_id    UUID NOT NULL REFERENCES marcas(id) ON DELETE CASCADE,
  tipo        TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running','success','error','partial')),
  clientes_novos INT DEFAULT 0,
  clientes_atualizados INT DEFAULT 0,
  pedidos_novos INT DEFAULT 0,
  pedidos_atualizados INT DEFAULT 0,
  erros       INT DEFAULT 0,
  detalhes    JSONB DEFAULT '{}',
  duracao_ms  INT,
  created_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sync_logs_marca ON sync_logs(marca_id, created_at DESC);
