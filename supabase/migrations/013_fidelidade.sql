CREATE TABLE IF NOT EXISTS fidelidade_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marca_id UUID NOT NULL UNIQUE REFERENCES marcas(id) ON DELETE CASCADE,
  programa_nome TEXT DEFAULT 'Programa de Fidelidade',
  ativo BOOLEAN DEFAULT FALSE,
  pontos_por_real NUMERIC(6,2) DEFAULT 1,
  pontos_por_indicacao INT DEFAULT 200,
  pontos_por_review INT DEFAULT 50,
  niveis JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE clientes ADD COLUMN IF NOT EXISTS pontos_fidelidade INT DEFAULT 0;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS nivel_fidelidade TEXT DEFAULT 'Bronze';

CREATE TABLE IF NOT EXISTS indicacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marca_id UUID NOT NULL REFERENCES marcas(id) ON DELETE CASCADE,
  indicador_id UUID NOT NULL REFERENCES clientes(id),
  indicado_nome TEXT NOT NULL,
  indicado_email TEXT,
  indicado_telefone TEXT,
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente','convertida','expirada')),
  pontos_creditados INT DEFAULT 0,
  receita_gerada NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pontos_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marca_id UUID NOT NULL REFERENCES marcas(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('ganhou','resgatou','expirou','ajuste')),
  motivo TEXT,
  pontos INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_indicacoes_marca ON indicacoes(marca_id);
CREATE INDEX IF NOT EXISTS idx_indicacoes_indicador ON indicacoes(indicador_id);
CREATE INDEX IF NOT EXISTS idx_pontos_hist_cliente ON pontos_historico(cliente_id);
