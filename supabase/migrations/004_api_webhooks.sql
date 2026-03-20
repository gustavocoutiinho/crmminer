-- API Keys
CREATE TABLE IF NOT EXISTS api_keys (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marca_id    UUID NOT NULL REFERENCES marcas(id) ON DELETE CASCADE,
  nome        TEXT NOT NULL,
  key_hash    TEXT NOT NULL,
  key_prefix  TEXT NOT NULL,
  permissions TEXT[] DEFAULT '{read}',
  ativo       BOOLEAN DEFAULT TRUE,
  last_used   TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS webhooks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marca_id    UUID NOT NULL REFERENCES marcas(id) ON DELETE CASCADE,
  nome        TEXT NOT NULL,
  url         TEXT NOT NULL,
  eventos     TEXT[] DEFAULT '{}',
  secret      TEXT,
  ativo       BOOLEAN DEFAULT TRUE,
  ultimo_envio TIMESTAMPTZ,
  ultimo_status INT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_marca ON api_keys(marca_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_marca ON webhooks(marca_id);
