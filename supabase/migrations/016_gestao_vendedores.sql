ALTER TABLE users ADD COLUMN IF NOT EXISTS status_trabalho TEXT DEFAULT 'ativo'
  CHECK (status_trabalho IN ('ativo','ferias','folga','atestado','desligado'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS ausencia_inicio DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ausencia_fim DATE;
