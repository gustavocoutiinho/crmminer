-- Pipeline de Vendas
CREATE TABLE IF NOT EXISTS oportunidades (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marca_id        UUID NOT NULL REFERENCES marcas(id) ON DELETE CASCADE,
  cliente_id      UUID REFERENCES clientes(id) ON DELETE SET NULL,
  vendedor_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  titulo          TEXT NOT NULL,
  valor           NUMERIC(12,2) DEFAULT 0,
  etapa           TEXT NOT NULL DEFAULT 'lead' CHECK (etapa IN ('lead','qualificado','proposta','negociacao','fechado_ganho','fechado_perdido')),
  probabilidade   INT DEFAULT 10 CHECK (probabilidade >= 0 AND probabilidade <= 100),
  data_previsao   DATE,
  motivo_perda    TEXT,
  fonte           TEXT,
  notas           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_oportunidades_marca ON oportunidades(marca_id);
CREATE INDEX IF NOT EXISTS idx_oportunidades_etapa ON oportunidades(marca_id, etapa);
CREATE INDEX IF NOT EXISTS idx_oportunidades_vendedor ON oportunidades(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_oportunidades_cliente ON oportunidades(cliente_id);

CREATE TRIGGER trg_oportunidades_updated BEFORE UPDATE ON oportunidades FOR EACH ROW EXECUTE FUNCTION trigger_updated_at();
