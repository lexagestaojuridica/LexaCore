
-- Role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'advogado', 'estagiario', 'financeiro');

-- Organizations
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Profiles (linked to auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User roles (separate table for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'advogado',
  UNIQUE(user_id, organization_id)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Plans
CREATE TABLE public.plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price_cents INTEGER NOT NULL DEFAULT 0,
  features JSONB DEFAULT '[]',
  max_users INTEGER NOT NULL DEFAULT 1,
  max_processes INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

-- Subscriptions
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.plans(id),
  status TEXT NOT NULL DEFAULT 'trial',
  trial_ends_at TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Clients
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  document TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Legal processes
CREATE TABLE public.processos_juridicos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  responsible_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  number TEXT,
  title TEXT NOT NULL,
  court TEXT,
  subject TEXT,
  estimated_value NUMERIC(15,2),
  status TEXT NOT NULL DEFAULT 'ativo',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.processos_juridicos ENABLE ROW LEVEL SECURITY;

-- Calendar events
CREATE TABLE public.eventos_agenda (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  process_id UUID REFERENCES public.processos_juridicos(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'compromisso',
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.eventos_agenda ENABLE ROW LEVEL SECURITY;

-- Accounts payable
CREATE TABLE public.contas_pagar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount NUMERIC(15,2) NOT NULL,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente',
  category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.contas_pagar ENABLE ROW LEVEL SECURITY;

-- Accounts receivable
CREATE TABLE public.contas_receber (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  process_id UUID REFERENCES public.processos_juridicos(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  amount NUMERIC(15,2) NOT NULL,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente',
  category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.contas_receber ENABLE ROW LEVEL SECURITY;

-- Documents
CREATE TABLE public.documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  process_id UUID REFERENCES public.processos_juridicos(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.documentos ENABLE ROW LEVEL SECURITY;

-- AI conversations
CREATE TABLE public.conversas_ia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  process_id UUID REFERENCES public.processos_juridicos(id) ON DELETE SET NULL,
  role TEXT NOT NULL DEFAULT 'user',
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.conversas_ia ENABLE ROW LEVEL SECURITY;

-- Audit logs
CREATE TABLE public.logs_auditoria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.logs_auditoria ENABLE ROW LEVEL SECURITY;

-- Helper function: get user's org ID
CREATE OR REPLACE FUNCTION public.get_user_org_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM public.profiles WHERE user_id = _user_id LIMIT 1;
$$;

-- Helper function: get user role in org
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID, _org_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id AND organization_id = _org_id LIMIT 1;
$$;

-- Helper: check membership
CREATE OR REPLACE FUNCTION public.is_member_of_org(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = _user_id AND organization_id = _org_id);
$$;

-- Helper: has_role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Apply updated_at triggers
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_processos_updated_at BEFORE UPDATE ON public.processos_juridicos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies

-- Plans: publicly readable
CREATE POLICY "Plans are publicly readable" ON public.plans FOR SELECT USING (true);

-- Organizations: members can read
CREATE POLICY "Members can read own org" ON public.organizations FOR SELECT USING (
  public.is_member_of_org(auth.uid(), id)
);

-- Profiles: users can read/update own, org members can read
CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT USING (
  user_id = auth.uid() OR public.is_member_of_org(auth.uid(), organization_id)
);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (user_id = auth.uid());

-- User roles: org members can read
CREATE POLICY "Members can read org roles" ON public.user_roles FOR SELECT USING (
  public.is_member_of_org(auth.uid(), organization_id)
);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (
  public.has_role(auth.uid(), 'admin') AND public.is_member_of_org(auth.uid(), organization_id)
);

-- Subscriptions
CREATE POLICY "Members can read subscriptions" ON public.subscriptions FOR SELECT USING (
  public.is_member_of_org(auth.uid(), organization_id)
);

-- Clients: org members can read, admin/advogado can write
CREATE POLICY "Members can read clients" ON public.clients FOR SELECT USING (
  public.is_member_of_org(auth.uid(), organization_id)
);
CREATE POLICY "Admin/Advogado can manage clients" ON public.clients FOR ALL USING (
  public.is_member_of_org(auth.uid(), organization_id) AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'advogado'))
);

-- Processos: org members can read
CREATE POLICY "Members can read processos" ON public.processos_juridicos FOR SELECT USING (
  public.is_member_of_org(auth.uid(), organization_id)
);
CREATE POLICY "Admin/Advogado can manage processos" ON public.processos_juridicos FOR ALL USING (
  public.is_member_of_org(auth.uid(), organization_id) AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'advogado'))
);

-- Eventos: org members can read
CREATE POLICY "Members can read eventos" ON public.eventos_agenda FOR SELECT USING (
  public.is_member_of_org(auth.uid(), organization_id)
);
CREATE POLICY "Members can manage own eventos" ON public.eventos_agenda FOR ALL USING (
  user_id = auth.uid() AND public.is_member_of_org(auth.uid(), organization_id)
);

-- Contas pagar: admin/financeiro
CREATE POLICY "Admin/Financeiro can read contas_pagar" ON public.contas_pagar FOR SELECT USING (
  public.is_member_of_org(auth.uid(), organization_id) AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'financeiro'))
);
CREATE POLICY "Admin can manage contas_pagar" ON public.contas_pagar FOR ALL USING (
  public.is_member_of_org(auth.uid(), organization_id) AND public.has_role(auth.uid(), 'admin')
);

-- Contas receber: admin/financeiro
CREATE POLICY "Admin/Financeiro can read contas_receber" ON public.contas_receber FOR SELECT USING (
  public.is_member_of_org(auth.uid(), organization_id) AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'financeiro'))
);
CREATE POLICY "Admin can manage contas_receber" ON public.contas_receber FOR ALL USING (
  public.is_member_of_org(auth.uid(), organization_id) AND public.has_role(auth.uid(), 'admin')
);

-- Documentos: org members can read
CREATE POLICY "Members can read documentos" ON public.documentos FOR SELECT USING (
  public.is_member_of_org(auth.uid(), organization_id)
);
CREATE POLICY "Admin/Advogado can manage documentos" ON public.documentos FOR ALL USING (
  public.is_member_of_org(auth.uid(), organization_id) AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'advogado'))
);

-- Conversas IA: user can read own, admin can read all org
CREATE POLICY "Users can read own conversas" ON public.conversas_ia FOR SELECT USING (
  user_id = auth.uid() AND public.is_member_of_org(auth.uid(), organization_id)
);
CREATE POLICY "Users can insert own conversas" ON public.conversas_ia FOR INSERT WITH CHECK (
  user_id = auth.uid() AND public.is_member_of_org(auth.uid(), organization_id)
);

-- Logs: admin can read, system can insert
CREATE POLICY "Admin can read audit logs" ON public.logs_auditoria FOR SELECT USING (
  public.is_member_of_org(auth.uid(), organization_id) AND public.has_role(auth.uid(), 'admin')
);
CREATE POLICY "Authenticated can insert logs" ON public.logs_auditoria FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
);

-- Seed default plans
INSERT INTO public.plans (name, price_cents, max_users, max_processes, features) VALUES
  ('Básico', 12000, 1, 50, '["Gestão de até 50 processos","Agenda integrada","Calculadora jurídica","ARUNA — 50 consultas/mês","1 usuário incluso"]'),
  ('PRO', 39000, 3, NULL, '["Processos ilimitados","Integração com tribunais","Financeiro completo","ARUNA — ilimitado","CRM jurídico","3 usuários inclusos","Relatórios avançados"]'),
  ('Business', 60000, 5, NULL, '["Tudo do PRO","BI completo e dashboards","Suporte prioritário","API aberta","5 usuários inclusos","Treinamento dedicado","SLA garantido"]');
