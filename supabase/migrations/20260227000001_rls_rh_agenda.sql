-- ╔═══════════════════════════════════════════════════════════════════╗
-- ║  LEXA Nova — RLS Policies for rh_colaboradores + ponto + recruit ║
-- ║  Ensures all new RH tables use get_user_organization_id()        ║
-- ╚═══════════════════════════════════════════════════════════════════╝

-- ─── rh_colaboradores ────────────────────────────────────────────────
ALTER TABLE public.rh_colaboradores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rh_colaboradores_org_select" ON public.rh_colaboradores;
DROP POLICY IF EXISTS "rh_colaboradores_org_insert" ON public.rh_colaboradores;
DROP POLICY IF EXISTS "rh_colaboradores_org_update" ON public.rh_colaboradores;
DROP POLICY IF EXISTS "rh_colaboradores_org_delete" ON public.rh_colaboradores;

CREATE POLICY "rh_colaboradores_org_select"
  ON public.rh_colaboradores FOR SELECT
  USING (organization_id = public.get_user_organization_id());

CREATE POLICY "rh_colaboradores_org_insert"
  ON public.rh_colaboradores FOR INSERT
  WITH CHECK (organization_id = public.get_user_organization_id());

CREATE POLICY "rh_colaboradores_org_update"
  ON public.rh_colaboradores FOR UPDATE
  USING (organization_id = public.get_user_organization_id())
  WITH CHECK (organization_id = public.get_user_organization_id());

CREATE POLICY "rh_colaboradores_org_delete"
  ON public.rh_colaboradores FOR DELETE
  USING (organization_id = public.get_user_organization_id());

-- ─── rh_ponto_registros ──────────────────────────────────────────────
ALTER TABLE public.rh_ponto_registros ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rh_ponto_org" ON public.rh_ponto_registros;

CREATE POLICY "rh_ponto_org"
  ON public.rh_ponto_registros FOR ALL
  USING (organization_id = public.get_user_organization_id())
  WITH CHECK (organization_id = public.get_user_organization_id());

-- ─── rh_recrutamento_vagas ───────────────────────────────────────────
ALTER TABLE public.rh_recrutamento_vagas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rh_vagas_org" ON public.rh_recrutamento_vagas;

CREATE POLICY "rh_vagas_org"
  ON public.rh_recrutamento_vagas FOR ALL
  USING (organization_id = public.get_user_organization_id())
  WITH CHECK (organization_id = public.get_user_organization_id());

-- ─── rh_recrutamento_candidatos ──────────────────────────────────────
ALTER TABLE public.rh_recrutamento_candidatos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rh_candidatos_org" ON public.rh_recrutamento_candidatos;

CREATE POLICY "rh_candidatos_org"
  ON public.rh_recrutamento_candidatos FOR ALL
  USING (organization_id = public.get_user_organization_id())
  WITH CHECK (organization_id = public.get_user_organization_id());

-- ─── eventos_agenda ──────────────────────────────────────────────────
-- Ensure organization-level isolation for agenda events
ALTER TABLE public.eventos_agenda ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "eventos_agenda_org" ON public.eventos_agenda;

CREATE POLICY "eventos_agenda_org"
  ON public.eventos_agenda FOR ALL
  USING (organization_id = public.get_user_organization_id())
  WITH CHECK (organization_id = public.get_user_organization_id());

-- ─── INDEXES for performance ─────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_rh_colaboradores_org ON public.rh_colaboradores(organization_id);
CREATE INDEX IF NOT EXISTS idx_rh_ponto_org ON public.rh_ponto_registros(organization_id);
CREATE INDEX IF NOT EXISTS idx_rh_vagas_org ON public.rh_recrutamento_vagas(organization_id);
CREATE INDEX IF NOT EXISTS idx_rh_candidatos_org ON public.rh_recrutamento_candidatos(organization_id);
CREATE INDEX IF NOT EXISTS idx_eventos_agenda_org ON public.eventos_agenda(organization_id);
