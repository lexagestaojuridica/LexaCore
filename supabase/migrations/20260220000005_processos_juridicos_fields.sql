-- ╔═══════════════════════════════════════════════════════════════╗
-- ║  Campos Jurídicos — processos_juridicos                      ║
-- ╚═══════════════════════════════════════════════════════════════╝

ALTER TABLE processos_juridicos
  ADD COLUMN IF NOT EXISTS area_direito text,
  ADD COLUMN IF NOT EXISTS tipo_acao text,
  ADD COLUMN IF NOT EXISTS parte_contraria text,
  ADD COLUMN IF NOT EXISTS instancia text,
  ADD COLUMN IF NOT EXISTS fase_processual text,
  ADD COLUMN IF NOT EXISTS comarca text,
  ADD COLUMN IF NOT EXISTS uf text,
  ADD COLUMN IF NOT EXISTS data_distribuicao date,
  ADD COLUMN IF NOT EXISTS responsible_user_id uuid REFERENCES profiles(user_id) ON DELETE SET NULL;

-- Índices úteis
CREATE INDEX IF NOT EXISTS idx_processos_area ON processos_juridicos(area_direito);
CREATE INDEX IF NOT EXISTS idx_processos_fase ON processos_juridicos(fase_processual);
CREATE INDEX IF NOT EXISTS idx_processos_responsible ON processos_juridicos(responsible_user_id);
