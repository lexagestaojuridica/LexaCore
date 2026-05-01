-- Tabela: workflow_automations (Motor de Automações If/Then)
CREATE TABLE IF NOT EXISTS public.workflow_automations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL, -- Ex: 'process_created', 'invoice_paid', 'document_signed'
  nodes JSONB NOT NULL DEFAULT '[]'::jsonb, -- Nodes do React Flow
  edges JSONB NOT NULL DEFAULT '[]'::jsonb, -- Conexões do React Flow
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS Policies
ALTER TABLE public.workflow_automations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their organization's workflow automations" ON public.workflow_automations;
CREATE POLICY "Users can manage their organization's workflow automations"
ON public.workflow_automations
FOR ALL
USING (organization_id = (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()));

-- Trigger para Updated At
CREATE OR REPLACE FUNCTION public.set_updated_at_workflow_automations()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS handle_updated_at_workflow_automations ON public.workflow_automations;
CREATE TRIGGER handle_updated_at_workflow_automations
  BEFORE UPDATE ON public.workflow_automations
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at_workflow_automations();

-- Histórico de Logs de Execução de Automação
CREATE TABLE IF NOT EXISTS public.automation_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  automation_id uuid NOT NULL REFERENCES public.workflow_automations(id) ON DELETE CASCADE,
  trigger_source TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'error', 'pending')),
  details JSONB,
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view automation logs for their organization" ON public.automation_logs;
CREATE POLICY "Users can view automation logs for their organization"
ON public.automation_logs
FOR SELECT
USING (organization_id = (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Service Role can manage automation logs" ON public.automation_logs;
CREATE POLICY "Service Role can manage automation logs"
ON public.automation_logs
FOR ALL
USING (auth.uid() IS NULL);
