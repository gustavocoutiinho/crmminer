-- ============================================================
-- CRM MINER — Migration 001: Schema Inicial
-- Sistema multi-tenant SaaS para gestão de clientes e vendas
-- Stack: Supabase (Postgres + Auth + RLS)
-- ============================================================

-- ============================================================
-- 1. EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 2. TABELAS
-- ============================================================

-- ------------------------------------------------------------
-- 2.1 marcas (tenants/empresas)
-- ------------------------------------------------------------
CREATE TABLE public.marcas (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome        TEXT NOT NULL,
  segmento    TEXT,
  cnpj        TEXT UNIQUE,
  plano       TEXT NOT NULL DEFAULT 'starter'
              CHECK (plano IN ('starter','pro','enterprise')),
  status      TEXT NOT NULL DEFAULT 'trial'
              CHECK (status IN ('ativo','inativo','trial')),
  lojas       INT NOT NULL DEFAULT 1,
  responsavel TEXT,
  email       TEXT,
  cidade      TEXT,
  estado      TEXT CHECK (char_length(estado) = 2),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.marcas IS 'Tenants — cada marca é uma empresa cliente do CRM Miner';

-- ------------------------------------------------------------
-- 2.2 profiles (extensão do auth.users)
-- ------------------------------------------------------------
CREATE TABLE public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome        TEXT NOT NULL,
  email       TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'vendedor'
              CHECK (role IN ('owner','admin','supervisor','vendedor')),
  marca_id    UUID REFERENCES public.marcas(id) ON DELETE SET NULL,
  loja        TEXT,
  status      TEXT NOT NULL DEFAULT 'ativo'
              CHECK (status IN ('ativo','inativo')),
  meta_mensal NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.profiles IS 'Perfil do usuário — vincula auth.users a uma marca com role';

-- ------------------------------------------------------------
-- 2.3 clientes
-- ------------------------------------------------------------
CREATE TABLE public.clientes (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marca_id       UUID NOT NULL REFERENCES public.marcas(id) ON DELETE CASCADE,
  nome           TEXT NOT NULL,
  email          TEXT,
  telefone       TEXT,
  segmento_rfm   TEXT CHECK (segmento_rfm IN ('campiao','fiel','potencial','em_risco','inativo')),
  recencia_dias  INT NOT NULL DEFAULT 0,
  total_pedidos  INT NOT NULL DEFAULT 0,
  receita_total  NUMERIC(12,2) NOT NULL DEFAULT 0,
  vendedor_id    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.clientes IS 'Clientes de cada marca com métricas RFM';

-- ------------------------------------------------------------
-- 2.4 pedidos
-- ------------------------------------------------------------
CREATE TABLE public.pedidos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marca_id    UUID NOT NULL REFERENCES public.marcas(id) ON DELETE CASCADE,
  cliente_id  UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  vendedor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  valor       NUMERIC(12,2) NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pendente'
              CHECK (status IN ('pendente','aprovado','cancelado','entregue')),
  origem      TEXT NOT NULL DEFAULT 'manual',
  external_id TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.pedidos IS 'Pedidos/vendas vinculados a cliente e vendedor';

-- ------------------------------------------------------------
-- 2.5 campanhas
-- ------------------------------------------------------------
CREATE TABLE public.campanhas (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marca_id       UUID NOT NULL REFERENCES public.marcas(id) ON DELETE CASCADE,
  nome           TEXT NOT NULL,
  tipo           TEXT CHECK (tipo IN ('whatsapp','email','sms','push')),
  status         TEXT NOT NULL DEFAULT 'rascunho'
                 CHECK (status IN ('rascunho','ativa','pausada','concluida')),
  segmento_alvo  TEXT,
  mensagem       TEXT,
  enviados       INT NOT NULL DEFAULT 0,
  abertos        INT NOT NULL DEFAULT 0,
  convertidos    INT NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.campanhas IS 'Campanhas de marketing segmentadas por marca';

-- ------------------------------------------------------------
-- 2.6 tarefas
-- ------------------------------------------------------------
CREATE TABLE public.tarefas (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marca_id        UUID NOT NULL REFERENCES public.marcas(id) ON DELETE CASCADE,
  responsavel_id  UUID REFERENCES public.profiles(id),
  cliente_id      UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  titulo          TEXT NOT NULL,
  descricao       TEXT,
  data_limite     TIMESTAMPTZ,
  concluida       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.tarefas IS 'Tarefas/atividades atribuídas a vendedores';

-- ------------------------------------------------------------
-- 2.7 api_keys
-- ------------------------------------------------------------
CREATE TABLE public.api_keys (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marca_id    UUID NOT NULL REFERENCES public.marcas(id) ON DELETE CASCADE,
  nome        TEXT NOT NULL,
  key_hash    TEXT NOT NULL,
  key_prefix  TEXT NOT NULL,
  tipo        TEXT NOT NULL DEFAULT 'live'
              CHECK (tipo IN ('live','test')),
  ativo       BOOLEAN NOT NULL DEFAULT TRUE,
  ultimo_uso  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.api_keys IS 'Chaves de API por marca (armazena apenas hash)';

-- ------------------------------------------------------------
-- 2.8 webhooks
-- ------------------------------------------------------------
CREATE TABLE public.webhooks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marca_id        UUID NOT NULL REFERENCES public.marcas(id) ON DELETE CASCADE,
  url             TEXT NOT NULL,
  eventos         TEXT[] NOT NULL,
  status          TEXT NOT NULL DEFAULT 'ativo'
                  CHECK (status IN ('ativo','inativo')),
  secret          TEXT NOT NULL,
  ultimo_disparo  TIMESTAMPTZ,
  sucessos        INT NOT NULL DEFAULT 0,
  erros           INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.webhooks IS 'Endpoints de webhook configurados por marca';

-- ------------------------------------------------------------
-- 2.9 conexoes_externas
-- ------------------------------------------------------------
CREATE TABLE public.conexoes_externas (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marca_id    UUID NOT NULL REFERENCES public.marcas(id) ON DELETE CASCADE,
  tipo        TEXT NOT NULL
              CHECK (tipo IN ('shopify','whatsapp','instagram','google_analytics','meta_ads')),
  status      TEXT NOT NULL DEFAULT 'desconectado'
              CHECK (status IN ('conectado','desconectado','erro')),
  config      JSONB NOT NULL DEFAULT '{}',
  ultimo_sync TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.conexoes_externas IS 'Integrações externas (Shopify, WhatsApp, etc.)';


-- ============================================================
-- 3. INDEXES
-- ============================================================

-- marcas
CREATE INDEX idx_marcas_status     ON public.marcas(status);
CREATE INDEX idx_marcas_created_at ON public.marcas(created_at);

-- profiles
CREATE INDEX idx_profiles_marca_id   ON public.profiles(marca_id);
CREATE INDEX idx_profiles_role       ON public.profiles(role);
CREATE INDEX idx_profiles_status     ON public.profiles(status);

-- clientes
CREATE INDEX idx_clientes_marca_id     ON public.clientes(marca_id);
CREATE INDEX idx_clientes_vendedor_id  ON public.clientes(vendedor_id);
CREATE INDEX idx_clientes_segmento_rfm ON public.clientes(segmento_rfm);
CREATE INDEX idx_clientes_created_at   ON public.clientes(created_at);

-- pedidos
CREATE INDEX idx_pedidos_marca_id    ON public.pedidos(marca_id);
CREATE INDEX idx_pedidos_cliente_id  ON public.pedidos(cliente_id);
CREATE INDEX idx_pedidos_vendedor_id ON public.pedidos(vendedor_id);
CREATE INDEX idx_pedidos_status      ON public.pedidos(status);
CREATE INDEX idx_pedidos_created_at  ON public.pedidos(created_at);

-- campanhas
CREATE INDEX idx_campanhas_marca_id   ON public.campanhas(marca_id);
CREATE INDEX idx_campanhas_status     ON public.campanhas(status);
CREATE INDEX idx_campanhas_created_at ON public.campanhas(created_at);

-- tarefas
CREATE INDEX idx_tarefas_marca_id       ON public.tarefas(marca_id);
CREATE INDEX idx_tarefas_responsavel_id ON public.tarefas(responsavel_id);
CREATE INDEX idx_tarefas_cliente_id     ON public.tarefas(cliente_id);
CREATE INDEX idx_tarefas_concluida      ON public.tarefas(concluida);

-- api_keys
CREATE INDEX idx_api_keys_marca_id  ON public.api_keys(marca_id);
CREATE INDEX idx_api_keys_key_prefix ON public.api_keys(key_prefix);

-- webhooks
CREATE INDEX idx_webhooks_marca_id ON public.webhooks(marca_id);

-- conexoes_externas
CREATE INDEX idx_conexoes_externas_marca_id ON public.conexoes_externas(marca_id);
CREATE INDEX idx_conexoes_externas_tipo     ON public.conexoes_externas(tipo);


-- ============================================================
-- 4. HELPER FUNCTIONS (auth schema)
-- ============================================================

-- Retorna a marca_id do usuário autenticado
CREATE OR REPLACE FUNCTION auth.user_marca_id()
RETURNS UUID AS $$
  SELECT marca_id FROM public.profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Retorna o role do usuário autenticado
CREATE OR REPLACE FUNCTION auth.user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;


-- ============================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Ativar RLS em todas as tabelas
ALTER TABLE public.marcas             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campanhas          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tarefas            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhooks           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conexoes_externas  ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 5.1 MARCAS — Policies
-- ============================================================

-- Owner vê todas as marcas
CREATE POLICY marcas_owner_all ON public.marcas
  FOR ALL USING (auth.user_role() = 'owner')
  WITH CHECK (auth.user_role() = 'owner');

-- Admin/Supervisor/Vendedor vê apenas sua marca
CREATE POLICY marcas_member_select ON public.marcas
  FOR SELECT USING (id = auth.user_marca_id());

-- ============================================================
-- 5.2 PROFILES — Policies
-- ============================================================

-- Owner: acesso total
CREATE POLICY profiles_owner_all ON public.profiles
  FOR ALL USING (auth.user_role() = 'owner')
  WITH CHECK (auth.user_role() = 'owner');

-- Admin: CRUD na sua marca
CREATE POLICY profiles_admin_all ON public.profiles
  FOR ALL USING (
    auth.user_role() = 'admin'
    AND marca_id = auth.user_marca_id()
  )
  WITH CHECK (
    auth.user_role() = 'admin'
    AND marca_id = auth.user_marca_id()
  );

-- Supervisor: ver todos da marca
CREATE POLICY profiles_supervisor_select ON public.profiles
  FOR SELECT USING (
    auth.user_role() = 'supervisor'
    AND marca_id = auth.user_marca_id()
  );

-- Vendedor: ver apenas seu próprio perfil
CREATE POLICY profiles_vendedor_select ON public.profiles
  FOR SELECT USING (id = auth.uid());

-- Qualquer usuário pode atualizar seu próprio perfil (campos básicos)
CREATE POLICY profiles_self_update ON public.profiles
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ============================================================
-- 5.3 CLIENTES — Policies
-- ============================================================

CREATE POLICY clientes_owner_all ON public.clientes
  FOR ALL USING (auth.user_role() = 'owner')
  WITH CHECK (auth.user_role() = 'owner');

CREATE POLICY clientes_admin_all ON public.clientes
  FOR ALL USING (
    auth.user_role() = 'admin'
    AND marca_id = auth.user_marca_id()
  )
  WITH CHECK (
    auth.user_role() = 'admin'
    AND marca_id = auth.user_marca_id()
  );

CREATE POLICY clientes_supervisor_select ON public.clientes
  FOR SELECT USING (
    auth.user_role() = 'supervisor'
    AND marca_id = auth.user_marca_id()
  );

-- Vendedor: apenas seus clientes
CREATE POLICY clientes_vendedor_select ON public.clientes
  FOR SELECT USING (vendedor_id = auth.uid());

CREATE POLICY clientes_vendedor_insert ON public.clientes
  FOR INSERT WITH CHECK (
    auth.user_role() = 'vendedor'
    AND marca_id = auth.user_marca_id()
    AND vendedor_id = auth.uid()
  );

CREATE POLICY clientes_vendedor_update ON public.clientes
  FOR UPDATE USING (vendedor_id = auth.uid())
  WITH CHECK (vendedor_id = auth.uid());

-- ============================================================
-- 5.4 PEDIDOS — Policies
-- ============================================================

CREATE POLICY pedidos_owner_all ON public.pedidos
  FOR ALL USING (auth.user_role() = 'owner')
  WITH CHECK (auth.user_role() = 'owner');

CREATE POLICY pedidos_admin_all ON public.pedidos
  FOR ALL USING (
    auth.user_role() = 'admin'
    AND marca_id = auth.user_marca_id()
  )
  WITH CHECK (
    auth.user_role() = 'admin'
    AND marca_id = auth.user_marca_id()
  );

CREATE POLICY pedidos_supervisor_select ON public.pedidos
  FOR SELECT USING (
    auth.user_role() = 'supervisor'
    AND marca_id = auth.user_marca_id()
  );

CREATE POLICY pedidos_vendedor_select ON public.pedidos
  FOR SELECT USING (vendedor_id = auth.uid());

CREATE POLICY pedidos_vendedor_insert ON public.pedidos
  FOR INSERT WITH CHECK (
    auth.user_role() = 'vendedor'
    AND marca_id = auth.user_marca_id()
    AND vendedor_id = auth.uid()
  );

CREATE POLICY pedidos_vendedor_update ON public.pedidos
  FOR UPDATE USING (vendedor_id = auth.uid())
  WITH CHECK (vendedor_id = auth.uid());

-- ============================================================
-- 5.5 CAMPANHAS — Policies
-- ============================================================

CREATE POLICY campanhas_owner_all ON public.campanhas
  FOR ALL USING (auth.user_role() = 'owner')
  WITH CHECK (auth.user_role() = 'owner');

CREATE POLICY campanhas_admin_all ON public.campanhas
  FOR ALL USING (
    auth.user_role() = 'admin'
    AND marca_id = auth.user_marca_id()
  )
  WITH CHECK (
    auth.user_role() = 'admin'
    AND marca_id = auth.user_marca_id()
  );

CREATE POLICY campanhas_supervisor_select ON public.campanhas
  FOR SELECT USING (
    auth.user_role() = 'supervisor'
    AND marca_id = auth.user_marca_id()
  );

-- Vendedor não acessa campanhas

-- ============================================================
-- 5.6 TAREFAS — Policies
-- ============================================================

CREATE POLICY tarefas_owner_all ON public.tarefas
  FOR ALL USING (auth.user_role() = 'owner')
  WITH CHECK (auth.user_role() = 'owner');

CREATE POLICY tarefas_admin_all ON public.tarefas
  FOR ALL USING (
    auth.user_role() = 'admin'
    AND marca_id = auth.user_marca_id()
  )
  WITH CHECK (
    auth.user_role() = 'admin'
    AND marca_id = auth.user_marca_id()
  );

-- Supervisor: ver tudo da marca + editar tarefas
CREATE POLICY tarefas_supervisor_select ON public.tarefas
  FOR SELECT USING (
    auth.user_role() = 'supervisor'
    AND marca_id = auth.user_marca_id()
  );

CREATE POLICY tarefas_supervisor_update ON public.tarefas
  FOR UPDATE USING (
    auth.user_role() = 'supervisor'
    AND marca_id = auth.user_marca_id()
  )
  WITH CHECK (
    auth.user_role() = 'supervisor'
    AND marca_id = auth.user_marca_id()
  );

CREATE POLICY tarefas_supervisor_insert ON public.tarefas
  FOR INSERT WITH CHECK (
    auth.user_role() = 'supervisor'
    AND marca_id = auth.user_marca_id()
  );

-- Vendedor: apenas suas tarefas
CREATE POLICY tarefas_vendedor_select ON public.tarefas
  FOR SELECT USING (responsavel_id = auth.uid());

CREATE POLICY tarefas_vendedor_update ON public.tarefas
  FOR UPDATE USING (responsavel_id = auth.uid())
  WITH CHECK (responsavel_id = auth.uid());

-- ============================================================
-- 5.7 API_KEYS — Policies
-- ============================================================

CREATE POLICY api_keys_owner_all ON public.api_keys
  FOR ALL USING (auth.user_role() = 'owner')
  WITH CHECK (auth.user_role() = 'owner');

CREATE POLICY api_keys_admin_all ON public.api_keys
  FOR ALL USING (
    auth.user_role() = 'admin'
    AND marca_id = auth.user_marca_id()
  )
  WITH CHECK (
    auth.user_role() = 'admin'
    AND marca_id = auth.user_marca_id()
  );

-- ============================================================
-- 5.8 WEBHOOKS — Policies
-- ============================================================

CREATE POLICY webhooks_owner_all ON public.webhooks
  FOR ALL USING (auth.user_role() = 'owner')
  WITH CHECK (auth.user_role() = 'owner');

CREATE POLICY webhooks_admin_all ON public.webhooks
  FOR ALL USING (
    auth.user_role() = 'admin'
    AND marca_id = auth.user_marca_id()
  )
  WITH CHECK (
    auth.user_role() = 'admin'
    AND marca_id = auth.user_marca_id()
  );

-- ============================================================
-- 5.9 CONEXOES_EXTERNAS — Policies
-- ============================================================

CREATE POLICY conexoes_externas_owner_all ON public.conexoes_externas
  FOR ALL USING (auth.user_role() = 'owner')
  WITH CHECK (auth.user_role() = 'owner');

CREATE POLICY conexoes_externas_admin_all ON public.conexoes_externas
  FOR ALL USING (
    auth.user_role() = 'admin'
    AND marca_id = auth.user_marca_id()
  )
  WITH CHECK (
    auth.user_role() = 'admin'
    AND marca_id = auth.user_marca_id()
  );


-- ============================================================
-- 6. TRIGGERS & FUNCTIONS
-- ============================================================

-- ------------------------------------------------------------
-- 6.1 Trigger: updated_at automático
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar em todas as tabelas que têm updated_at
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.marcas
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.clientes
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.pedidos
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------------------
-- 6.2 Trigger: auto-criar profile ao registrar usuário
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------------------------
-- 6.3 Função RFM: classificar segmento do cliente
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.classificar_rfm(
  p_recencia_dias INT,
  p_total_pedidos INT,
  p_receita_total NUMERIC
)
RETURNS TEXT AS $$
BEGIN
  -- Campeão: recência ≤30, pedidos ≥20, receita ≥5000
  IF p_recencia_dias <= 30 AND p_total_pedidos >= 20 AND p_receita_total >= 5000 THEN
    RETURN 'campiao';
  END IF;

  -- Fiel: recência ≤60, pedidos ≥10
  IF p_recencia_dias <= 60 AND p_total_pedidos >= 10 THEN
    RETURN 'fiel';
  END IF;

  -- Potencial: recência ≤60, pedidos <10
  IF p_recencia_dias <= 60 AND p_total_pedidos < 10 THEN
    RETURN 'potencial';
  END IF;

  -- Em risco: recência 60-120
  IF p_recencia_dias > 60 AND p_recencia_dias <= 120 THEN
    RETURN 'em_risco';
  END IF;

  -- Inativo: recência >120
  RETURN 'inativo';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION public.classificar_rfm IS 'Classifica cliente em segmento RFM baseado em recência, frequência e valor';

-- ------------------------------------------------------------
-- 6.4 Trigger: atualizar segmento_rfm ao alterar métricas do cliente
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_cliente_rfm()
RETURNS TRIGGER AS $$
BEGIN
  NEW.segmento_rfm = public.classificar_rfm(
    NEW.recencia_dias,
    NEW.total_pedidos,
    NEW.receita_total
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_cliente_rfm
  BEFORE INSERT OR UPDATE OF recencia_dias, total_pedidos, receita_total
  ON public.clientes
  FOR EACH ROW EXECUTE FUNCTION public.handle_cliente_rfm();

-- ------------------------------------------------------------
-- 6.5 Função: recalcular métricas RFM de um cliente
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.recalcular_metricas_cliente(p_cliente_id UUID)
RETURNS VOID AS $$
DECLARE
  v_total_pedidos INT;
  v_receita_total NUMERIC(12,2);
  v_ultimo_pedido TIMESTAMPTZ;
  v_recencia_dias INT;
BEGIN
  SELECT
    COUNT(*) FILTER (WHERE status IN ('aprovado','entregue')),
    COALESCE(SUM(valor) FILTER (WHERE status IN ('aprovado','entregue')), 0),
    MAX(created_at) FILTER (WHERE status IN ('aprovado','entregue'))
  INTO v_total_pedidos, v_receita_total, v_ultimo_pedido
  FROM public.pedidos
  WHERE cliente_id = p_cliente_id;

  IF v_ultimo_pedido IS NOT NULL THEN
    v_recencia_dias = EXTRACT(DAY FROM now() - v_ultimo_pedido)::INT;
  ELSE
    v_recencia_dias = 9999;
  END IF;

  UPDATE public.clientes
  SET
    total_pedidos = v_total_pedidos,
    receita_total = v_receita_total,
    recencia_dias = v_recencia_dias
  WHERE id = p_cliente_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.recalcular_metricas_cliente IS 'Recalcula total_pedidos, receita_total e recencia_dias de um cliente com base nos pedidos aprovados/entregues';


-- ============================================================
-- 7. SEED DATA (Demo)
-- ============================================================

-- Marca demo
INSERT INTO public.marcas (id, nome, segmento, cnpj, plano, status, lojas, responsavel, email, cidade, estado)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Loja Demo Fashion', 'Moda', '12.345.678/0001-00', 'pro', 'ativo', 2, 'Ana Silva', 'ana@demofashion.com', 'Fortaleza', 'CE'),
  ('a0000000-0000-0000-0000-000000000002', 'TechStore Brasil', 'Tecnologia', '98.765.432/0001-00', 'starter', 'trial', 1, 'Carlos Tech', 'carlos@techstore.com', 'São Paulo', 'SP'),
  ('a0000000-0000-0000-0000-000000000003', 'Sabor & Saúde', 'Alimentação', '11.222.333/0001-00', 'enterprise', 'ativo', 5, 'Maria Souza', 'maria@saborsaude.com', 'Rio de Janeiro', 'RJ');

-- Clientes demo (Loja Demo Fashion)
INSERT INTO public.clientes (marca_id, nome, email, telefone, recencia_dias, total_pedidos, receita_total)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'João Mendes',     'joao@email.com',     '85999001001', 10, 25, 8500.00),
  ('a0000000-0000-0000-0000-000000000001', 'Maria Clara',     'maria.c@email.com',   '85999002002', 45, 12, 3200.00),
  ('a0000000-0000-0000-0000-000000000001', 'Pedro Santos',    'pedro.s@email.com',   '85999003003', 30,  5, 1500.00),
  ('a0000000-0000-0000-0000-000000000001', 'Carla Oliveira',  'carla.o@email.com',   '85999004004', 90,  8, 2800.00),
  ('a0000000-0000-0000-0000-000000000001', 'Lucas Ferreira',  'lucas.f@email.com',   '85999005005', 150, 3,  900.00);

-- Clientes demo (TechStore)
INSERT INTO public.clientes (marca_id, nome, email, telefone, recencia_dias, total_pedidos, receita_total)
VALUES
  ('a0000000-0000-0000-0000-000000000002', 'Ana Beatriz',   'ana.b@email.com',   '11999006006', 20, 30, 12000.00),
  ('a0000000-0000-0000-0000-000000000002', 'Roberto Lima',  'roberto@email.com', '11999007007', 75,  6,  2100.00);

-- Clientes demo (Sabor & Saúde)
INSERT INTO public.clientes (marca_id, nome, email, telefone, recencia_dias, total_pedidos, receita_total)
VALUES
  ('a0000000-0000-0000-0000-000000000003', 'Fernanda Gomes', 'fer@email.com',    '21999008008', 15, 50, 15000.00),
  ('a0000000-0000-0000-0000-000000000003', 'Thiago Rocha',   'thiago@email.com', '21999009009', 55,  4,   800.00),
  ('a0000000-0000-0000-0000-000000000003', 'Juliana Pires',  'juliana@email.com','21999010010', 200, 1,   150.00);

-- Pedidos demo
INSERT INTO public.pedidos (marca_id, cliente_id, valor, status, origem)
SELECT
  c.marca_id,
  c.id,
  (random() * 500 + 50)::NUMERIC(12,2),
  (ARRAY['aprovado','entregue','pendente'])[floor(random()*3+1)::INT],
  'seed'
FROM public.clientes c
CROSS JOIN generate_series(1, 3);

-- Campanhas demo
INSERT INTO public.campanhas (marca_id, nome, tipo, status, segmento_alvo, mensagem, enviados, abertos, convertidos)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Reativação Inativos',   'whatsapp', 'concluida', 'inativo',    'Sentimos sua falta! 20% OFF pra voltar 🛍️', 150, 89, 12),
  ('a0000000-0000-0000-0000-000000000001', 'Black Friday 2026',     'email',    'rascunho',  'campiao',    NULL, 0, 0, 0),
  ('a0000000-0000-0000-0000-000000000003', 'Promoção Verão',        'sms',      'ativa',     'potencial',  'Aproveite: combos de verão com 30% OFF!', 320, 210, 45);

-- Tarefas demo
INSERT INTO public.tarefas (marca_id, titulo, descricao, data_limite, concluida)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Ligar para clientes em risco',       'Contatar clientes com recência > 60 dias', now() + interval '3 days', FALSE),
  ('a0000000-0000-0000-0000-000000000001', 'Configurar integração WhatsApp',     'Conectar API do WhatsApp Business',        now() + interval '7 days', FALSE),
  ('a0000000-0000-0000-0000-000000000003', 'Preparar campanha dia das mães',     'Segmentar base e criar mensagem',          now() + interval '30 days', FALSE);


-- ============================================================
-- 8. GRANTS (service_role e anon/authenticated)
-- ============================================================

-- O Supabase já configura grants padrão, mas explicitamos para clareza
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;


-- ============================================================
-- FIM DA MIGRAÇÃO 001
-- ============================================================
