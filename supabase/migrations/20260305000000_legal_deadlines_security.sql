-- ╔═══════════════════════════════════════════════════════════════╗
-- ║  Módulo de Prazos Processuais (CPC/2015)                     ║
-- ╚═══════════════════════════════════════════════════════════════╝

-- Tabela de Prazos
CREATE TABLE IF NOT EXISTS processos_prazos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  process_id uuid REFERENCES processos_juridicos(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  start_date date NOT NULL,
  days_count integer NOT NULL,
  deadline_type text DEFAULT 'useful_days' CHECK (deadline_type IN ('useful_days', 'calendar_days')),
  fatal_date date,
  internal_date date,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'overdue', 'cancelled')),
  responsible_user_id uuid REFERENCES profiles(user_id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Adicionar campos de controle na tabela de processos
ALTER TABLE processos_juridicos
  ADD COLUMN IF NOT EXISTS segredo_de_justica boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS public_link_password text,
  ADD COLUMN IF NOT EXISTS public_link_expires_at timestamptz;

-- Habilitar RLS
ALTER TABLE processos_prazos ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
CREATE POLICY "Users can view deadlines of their organization"
  ON processos_prazos FOR SELECT
  USING (organization_id IN (SELECT id FROM organizations));

CREATE POLICY "Users can manage deadlines of their organization"
  ON processos_prazos FOR ALL
  USING (organization_id IN (SELECT id FROM organizations));

-- Índices
CREATE INDEX IF NOT EXISTS idx_prazos_process ON processos_prazos(process_id);
CREATE INDEX IF NOT EXISTS idx_prazos_status ON processos_prazos(status);
CREATE INDEX IF NOT EXISTS idx_prazos_fatal ON processos_prazos(fatal_date);
