-- ============================================================================
-- CRM Miner — Standalone Postgres Schema
-- Adaptado do 001 (Supabase) para Postgres puro
-- ============================================================================

-- Extensões
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. TABELAS
-- ============================================================================

-- 1.1 Marcas (tenants)
CREATE TABLE IF NOT EXISTS marcas (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome        TEXT NOT NULL,
  segmento    TEXT,
  cnpj        TEXT UNIQUE,
  plano       TEXT DEFAULT 'starter' CHECK (plano IN ('starter','pro','enterprise')),
  status      TEXT DEFAULT 'trial' CHECK (status IN ('ativo','inativo','trial')),
  lojas       INT DEFAULT 1,
  responsavel TEXT,
  email       TEXT,
  cidade      TEXT,
  estado      CHAR(2),
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- 1.2 Users (auth próprio)
CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  nome        TEXT NOT NULL,
  role        TEXT DEFAULT 'vendedor' CHECK (role IN ('miner','admin','gerente','vendedor')),
  marca_id    UUID REFERENCES marcas(id) ON DELETE SET NULL,
  loja        TEXT,
  status      TEXT DEFAULT 'ativo' CHECK (status IN ('ativo','inativo')),
  meta_mensal NUMERIC(12,2) DEFAULT 0,
  avatar_url  TEXT,
  last_login  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- 1.3 Sessions (auth tokens)
CREATE TABLE IF NOT EXISTS sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token       TEXT NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- 1.4 Clientes
CREATE TABLE IF NOT EXISTS clientes (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marca_id       UUID NOT NULL REFERENCES marcas(id) ON DELETE CASCADE,
  shopify_id     BIGINT,
  nome           TEXT NOT NULL,
  email          TEXT,
  telefone       TEXT,
  segmento_rfm   TEXT CHECK (segmento_rfm IN ('campiao','fiel','potencial','em_risco','inativo')),
  recencia_dias  INT DEFAULT 0,
  total_pedidos  INT DEFAULT 0,
  receita_total  NUMERIC(12,2) DEFAULT 0,
  vendedor_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  tags           TEXT[] DEFAULT '{}',
  notas          TEXT,
  suri_contact_id TEXT,
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now()
);

-- 1.5 Pedidos
CREATE TABLE IF NOT EXISTS pedidos (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marca_id     UUID NOT NULL REFERENCES marcas(id) ON DELETE CASCADE,
  cliente_id   UUID REFERENCES clientes(id) ON DELETE SET NULL,
  vendedor_id  UUID REFERENCES users(id) ON DELETE SET NULL,
  shopify_id   BIGINT,
  valor        NUMERIC(12,2) NOT NULL,
  status       TEXT DEFAULT 'pendente' CHECK (status IN ('pendente','aprovado','cancelado','entregue')),
  origem       TEXT DEFAULT 'manual',
  external_id  TEXT,
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

-- 1.6 Campanhas
CREATE TABLE IF NOT EXISTS campanhas (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marca_id       UUID NOT NULL REFERENCES marcas(id) ON DELETE CASCADE,
  nome           TEXT NOT NULL,
  tipo           TEXT CHECK (tipo IN ('whatsapp','email','sms','push')),
  status         TEXT DEFAULT 'rascunho' CHECK (status IN ('rascunho','ativa','pausada','concluida')),
  segmento_alvo  TEXT,
  mensagem       TEXT,
  enviados       INT DEFAULT 0,
  abertos        INT DEFAULT 0,
  convertidos    INT DEFAULT 0,
  receita        NUMERIC(12,2) DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT now()
);

-- 1.7 Tarefas
CREATE TABLE IF NOT EXISTS tarefas (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marca_id        UUID NOT NULL REFERENCES marcas(id) ON DELETE CASCADE,
  responsavel_id  UUID REFERENCES users(id),
  cliente_id      UUID REFERENCES clientes(id) ON DELETE SET NULL,
  titulo          TEXT NOT NULL,
  descricao       TEXT,
  tipo            TEXT DEFAULT 'geral',
  data_limite     TIMESTAMPTZ,
  concluida       BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- 1.8 Timeline (eventos do cliente)
CREATE TABLE IF NOT EXISTS timeline (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marca_id    UUID NOT NULL REFERENCES marcas(id) ON DELETE CASCADE,
  cliente_id  UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  tipo        TEXT NOT NULL, -- 'pedido', 'whatsapp', 'email', 'nota', 'campanha', 'atendimento'
  titulo      TEXT NOT NULL,
  descricao   TEXT,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- 1.9 Mensagens (inbox/Suri)
CREATE TABLE IF NOT EXISTS mensagens (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marca_id     UUID NOT NULL REFERENCES marcas(id) ON DELETE CASCADE,
  cliente_id   UUID REFERENCES clientes(id) ON DELETE SET NULL,
  canal        TEXT NOT NULL, -- 'whatsapp', 'email', 'sms', 'chat'
  direcao      TEXT NOT NULL CHECK (direcao IN ('entrada','saida')),
  conteudo     TEXT NOT NULL,
  status       TEXT DEFAULT 'enviada',
  agente_id    UUID REFERENCES users(id),
  suri_msg_id  TEXT,
  metadata     JSONB DEFAULT '{}',
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- 1.10 Conexões externas
CREATE TABLE IF NOT EXISTS conexoes_externas (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marca_id     UUID NOT NULL REFERENCES marcas(id) ON DELETE CASCADE,
  tipo         TEXT NOT NULL CHECK (tipo IN ('shopify','suri','whatsapp','instagram','google_analytics','meta_ads')),
  status       TEXT DEFAULT 'desconectado' CHECK (status IN ('conectado','desconectado','erro')),
  config       JSONB DEFAULT '{}',
  ultimo_sync  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 2. INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_marca ON users(marca_id);
CREATE INDEX IF NOT EXISTS idx_clientes_marca ON clientes(marca_id);
CREATE INDEX IF NOT EXISTS idx_clientes_shopify ON clientes(shopify_id);
CREATE INDEX IF NOT EXISTS idx_clientes_email ON clientes(email);
CREATE INDEX IF NOT EXISTS idx_clientes_rfm ON clientes(segmento_rfm);
CREATE INDEX IF NOT EXISTS idx_clientes_suri ON clientes(suri_contact_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_marca ON pedidos(marca_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_cliente ON pedidos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_shopify ON pedidos(shopify_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_created ON pedidos(created_at);
CREATE INDEX IF NOT EXISTS idx_campanhas_marca ON campanhas(marca_id);
CREATE INDEX IF NOT EXISTS idx_tarefas_marca ON tarefas(marca_id);
CREATE INDEX IF NOT EXISTS idx_tarefas_resp ON tarefas(responsavel_id);
CREATE INDEX IF NOT EXISTS idx_timeline_cliente ON timeline(cliente_id);
CREATE INDEX IF NOT EXISTS idx_timeline_created ON timeline(created_at);
CREATE INDEX IF NOT EXISTS idx_mensagens_cliente ON mensagens(cliente_id);
CREATE INDEX IF NOT EXISTS idx_mensagens_marca ON mensagens(marca_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- ============================================================================
-- 3. TRIGGERS
-- ============================================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION trigger_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_marcas_updated BEFORE UPDATE ON marcas FOR EACH ROW EXECUTE FUNCTION trigger_updated_at();
CREATE TRIGGER trg_clientes_updated BEFORE UPDATE ON clientes FOR EACH ROW EXECUTE FUNCTION trigger_updated_at();
CREATE TRIGGER trg_pedidos_updated BEFORE UPDATE ON pedidos FOR EACH ROW EXECUTE FUNCTION trigger_updated_at();

-- Auto-classify RFM
CREATE OR REPLACE FUNCTION classificar_rfm()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.recencia_dias <= 30 AND NEW.total_pedidos >= 20 AND NEW.receita_total >= 5000 THEN
    NEW.segmento_rfm := 'campiao';
  ELSIF NEW.recencia_dias <= 60 AND NEW.total_pedidos >= 10 THEN
    NEW.segmento_rfm := 'fiel';
  ELSIF NEW.recencia_dias <= 60 AND NEW.total_pedidos < 10 THEN
    NEW.segmento_rfm := 'potencial';
  ELSIF NEW.recencia_dias > 60 AND NEW.recencia_dias <= 120 THEN
    NEW.segmento_rfm := 'em_risco';
  ELSE
    NEW.segmento_rfm := 'inativo';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_clientes_rfm BEFORE INSERT OR UPDATE OF recencia_dias, total_pedidos, receita_total ON clientes FOR EACH ROW EXECUTE FUNCTION classificar_rfm();

-- ============================================================================
-- 4. SEED DATA
-- ============================================================================

-- Marca PRLS
INSERT INTO marcas (id, nome, segmento, plano, status, lojas, responsavel, email, cidade, estado)
VALUES ('a0000000-0000-0000-0000-000000000001', 'PRLS Calçados', 'Moda / Calçados', 'pro', 'ativo', 1, 'Leonardo Umbelino', 'leonardo@prls.com.br', 'Fortaleza', 'CE')
ON CONFLICT DO NOTHING;

-- Users
INSERT INTO users (id, email, password_hash, nome, role, marca_id)
VALUES
  ('b0000000-0000-0000-0000-000000000001', 'gustavo@minerbz.com.br', crypt('miner2026', gen_salt('bf')), 'Gustavo Coutinho', 'miner', NULL),
  ('b0000000-0000-0000-0000-000000000002', 'leonardo@prls.com.br', crypt('prls2026', gen_salt('bf')), 'Leonardo Umbelino', 'admin', 'a0000000-0000-0000-0000-000000000001'),
  ('b0000000-0000-0000-0000-000000000003', 'squad@minerbz.com.br', crypt('squad2026', gen_salt('bf')), 'Squad Miner', 'gerente', 'a0000000-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;

-- Conexão Shopify
INSERT INTO conexoes_externas (marca_id, tipo, status, config)
VALUES ('a0000000-0000-0000-0000-000000000001', 'shopify', 'conectado', '{"store":"prlsteste.myshopify.com"}')
ON CONFLICT DO NOTHING;
