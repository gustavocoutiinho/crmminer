CREATE TABLE IF NOT EXISTS respostas_rapidas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marca_id UUID NOT NULL REFERENCES marcas(id) ON DELETE CASCADE,
  categoria TEXT NOT NULL CHECK (categoria IN ('saudacao','pos_venda','cobranca','promocao','suporte','geral')),
  titulo TEXT NOT NULL,
  texto TEXT NOT NULL,
  variaveis TEXT[] DEFAULT '{}',
  usos INT DEFAULT 0,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE mensagens ADD COLUMN IF NOT EXISTS sentimento TEXT CHECK (sentimento IN ('positivo','neutro','negativo','urgente'));
ALTER TABLE mensagens ADD COLUMN IF NOT EXISTS intencao TEXT CHECK (intencao IN ('compra','reclamacao','duvida','elogio','cancelamento','geral'));

CREATE INDEX IF NOT EXISTS idx_respostas_marca ON respostas_rapidas(marca_id);
CREATE INDEX IF NOT EXISTS idx_respostas_categoria ON respostas_rapidas(categoria);
