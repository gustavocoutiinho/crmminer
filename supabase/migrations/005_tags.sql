-- Tags gerenciadas
CREATE TABLE IF NOT EXISTS tags (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marca_id    UUID NOT NULL REFERENCES marcas(id) ON DELETE CASCADE,
  nome        TEXT NOT NULL,
  cor         TEXT DEFAULT '#4545F5',
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(marca_id, nome)
);

CREATE INDEX IF NOT EXISTS idx_tags_marca ON tags(marca_id);
