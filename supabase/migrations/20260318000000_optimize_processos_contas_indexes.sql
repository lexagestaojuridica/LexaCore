-- Missing indexes for processos_juridicos
CREATE INDEX IF NOT EXISTS idx_processos_org ON public.processos_juridicos(organization_id);
CREATE INDEX IF NOT EXISTS idx_processos_status ON public.processos_juridicos(status);
CREATE INDEX IF NOT EXISTS idx_processos_created ON public.processos_juridicos(created_at DESC);

-- Missing indexes for contas_receber
CREATE INDEX IF NOT EXISTS idx_contas_receber_org ON public.contas_receber(organization_id);
CREATE INDEX IF NOT EXISTS idx_contas_receber_status ON public.contas_receber(status);
CREATE INDEX IF NOT EXISTS idx_contas_receber_due_date ON public.contas_receber(due_date);

-- Tenant Isolation Review:
-- RLS policies on both tables employ `organization_id` checks referencing `profiles`, verifying strict isolation.
