-- Fase 3: QR Codes do Vendedor
ALTER TABLE users ADD COLUMN IF NOT EXISTS codigo_vendedor TEXT UNIQUE;

CREATE TABLE IF NOT EXISTS qr_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marca_id UUID NOT NULL REFERENCES marcas(id) ON DELETE CASCADE,
  vendedor_id UUID NOT NULL REFERENCES users(id),
  codigo TEXT NOT NULL,
  ip TEXT,
  user_agent TEXT,
  converteu BOOLEAN DEFAULT FALSE,
  pedido_id UUID REFERENCES pedidos(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_qr_scans_vendedor ON qr_scans(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_qr_scans_codigo ON qr_scans(codigo);
