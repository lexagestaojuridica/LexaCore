-- Módulo de Controle Granular de Permissões (RBAC)
CREATE TABLE IF NOT EXISTS public.custom_roles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- Ex: 'Sócios', 'Estagiários', 'Financeiro'
  description TEXT,
  -- Níveis de Acesso Dinâmicos (JSONB para flexibilidade de módulos)
  permissions JSONB NOT NULL DEFAULT '{"processos": "read", "financeiro": "none", "agenda": "read_write", "crm": "read_write"}'::jsonb,
  is_default BOOLEAN DEFAULT false, -- Impede deleção dos roles essenciais
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.custom_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view and manage roles of their organization"
ON public.custom_roles
FOR ALL
USING (organization_id = (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()));

-- Injetar o campo de role no Profile
ALTER TABLE public.profiles
ADD COLUMN custom_role_id uuid REFERENCES public.custom_roles(id) ON DELETE SET NULL;

-- Gatilho para popular roles padrões de um novo escritório
CREATE OR REPLACE FUNCTION public.seed_default_roles()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.custom_roles (organization_id, name, description, permissions, is_default)
  VALUES 
    (NEW.id, 'Sócio Administrador', 'Acesso total irrestrito.', '{"processos": "all", "financeiro": "all", "agenda": "all", "crm": "all", "configuracoes": "all"}', true),
    (NEW.id, 'Advogado', 'Acesso operacional aos processos e agenda.', '{"processos": "read_write", "financeiro": "none", "agenda": "read_write", "crm": "read_write", "configuracoes": "none"}', true),
    (NEW.id, 'Estagiário', 'Acesso restrito para pesquisas e apoio.', '{"processos": "read", "financeiro": "none", "agenda": "read", "crm": "read", "configuracoes": "none"}', true),
    (NEW.id, 'Financeiro', 'Gestão exclusiva do fluxo de caixa e relatórios.', '{"processos": "read", "financeiro": "read_write", "agenda": "none", "crm": "read", "configuracoes": "none"}', true);
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para tabela organizations (quando uma org nascer, cria os cargos default)
CREATE TRIGGER trg_seed_org_roles
  AFTER INSERT ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.seed_default_roles();
