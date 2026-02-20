-- ============================================================
-- Feature: Desempenho Orçamentário
-- Migration: tabelas orcamentos + orcamentos_log com RLS
-- ============================================================

-- Tabela principal de orçamentos por categoria e período
CREATE TABLE IF NOT EXISTS public.orcamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'despesa' CHECK (type IN ('despesa', 'receita')),
  amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  period_month INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  period_year  INTEGER NOT NULL,
  carry_forward BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, category, type, period_month, period_year)
);

ALTER TABLE public.orcamentos ENABLE ROW LEVEL SECURITY;

-- Trigger updated_at
CREATE TRIGGER update_orcamentos_updated_at
  BEFORE UPDATE ON public.orcamentos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- Log de revisões de orçamento (auditoria de alterações)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.orcamentos_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  orcamento_id UUID REFERENCES public.orcamentos(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  old_amount NUMERIC(15,2),
  new_amount NUMERIC(15,2),
  notes TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.orcamentos_log ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS: orcamentos
-- ============================================================

-- Leitura: admin e financeiro da org
CREATE POLICY "read_orcamentos" ON public.orcamentos
  FOR SELECT USING (
    public.is_member_of_org(auth.uid(), organization_id)
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'financeiro')
    )
  );

-- Escrita (INSERT / UPDATE / DELETE): apenas admin
CREATE POLICY "manage_orcamentos" ON public.orcamentos
  FOR ALL USING (
    public.is_member_of_org(auth.uid(), organization_id)
    AND public.has_role(auth.uid(), 'admin')
  );

-- ============================================================
-- RLS: orcamentos_log
-- ============================================================

CREATE POLICY "read_orcamentos_log" ON public.orcamentos_log
  FOR SELECT USING (
    public.is_member_of_org(auth.uid(), organization_id)
    AND public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "insert_orcamentos_log" ON public.orcamentos_log
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
