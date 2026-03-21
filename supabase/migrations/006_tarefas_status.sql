-- Add status and prioridade to tarefas
ALTER TABLE tarefas ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente','em_andamento','concluida','cancelada'));
ALTER TABLE tarefas ADD COLUMN IF NOT EXISTS prioridade TEXT DEFAULT 'media' CHECK (prioridade IN ('baixa','media','alta','urgente'));

-- Migrate existing data
UPDATE tarefas SET status = CASE WHEN concluida THEN 'concluida' ELSE 'pendente' END WHERE status IS NULL;

CREATE INDEX IF NOT EXISTS idx_tarefas_status ON tarefas(marca_id, status);
