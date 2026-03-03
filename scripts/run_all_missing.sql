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


-- FILE: 20260213115027_3304a811-d4e6-4752-84e1-ccfaf7b4ee08.sql

-- Update handle_new_user to create org, profile, role, and trial subscription
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _org_id uuid;
  _plan_id uuid;
  _org_name text;
BEGIN
  -- Determine org name from metadata or email
  _org_name := COALESCE(
    NEW.raw_user_meta_data->>'organization_name',
    split_part(NEW.email, '@', 1) || '''s Organization'
  );

  -- Create organization
  INSERT INTO public.organizations (name)
  VALUES (_org_name)
  RETURNING id INTO _org_id;

  -- Create profile linked to org
  INSERT INTO public.profiles (user_id, full_name, phone, organization_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'phone',
    _org_id
  );

  -- Assign admin role
  INSERT INTO public.user_roles (user_id, organization_id, role)
  VALUES (NEW.id, _org_id, 'admin');

  -- Get the basic plan for trial
  SELECT id INTO _plan_id FROM public.plans WHERE name = 'Básico' LIMIT 1;

  -- Create trial subscription (7 days)
  IF _plan_id IS NOT NULL THEN
    INSERT INTO public.subscriptions (organization_id, plan_id, status, trial_ends_at, current_period_start, current_period_end)
    VALUES (_org_id, _plan_id, 'trial', now() + interval '7 days', now(), now() + interval '7 days');
  END IF;

  RETURN NEW;
END;
$$;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- FILE: 20260213161810_6490c124-b555-4f3c-9720-ad517240361f.sql

-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public) VALUES ('documentos', 'documentos', false);

-- RLS: Members can read documents from their org
CREATE POLICY "Members can read org documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'documentos'
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND p.organization_id::text = (storage.foldername(name))[1]
  )
);

-- RLS: Admin/Advogado can upload documents
CREATE POLICY "Admin/Advogado can upload documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'documentos'
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND p.organization_id::text = (storage.foldername(name))[1]
  )
  AND (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'advogado')
  )
);

-- RLS: Admin/Advogado can delete documents
CREATE POLICY "Admin/Advogado can delete documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'documentos'
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND p.organization_id::text = (storage.foldername(name))[1]
  )
  AND (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'advogado')
  )
);


-- FILE: 20260213162606_93cc4980-dbf8-4a2d-88a2-d17326aaa1c9.sql
CREATE POLICY "Users can delete own conversas"
ON public.conversas_ia
FOR DELETE
USING (user_id = auth.uid() AND is_member_of_org(auth.uid(), organization_id));

-- FILE: 20260213193541_bb58a867-181e-462c-b2e6-1a80c289aec7.sql

-- Table to store Google Calendar OAuth tokens per user
CREATE TABLE public.google_calendar_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  calendar_id TEXT DEFAULT 'primary',
  sync_enabled BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.google_calendar_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own tokens"
ON public.google_calendar_tokens FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own tokens"
ON public.google_calendar_tokens FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own tokens"
ON public.google_calendar_tokens FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete own tokens"
ON public.google_calendar_tokens FOR DELETE
USING (user_id = auth.uid());

CREATE TRIGGER update_google_calendar_tokens_updated_at
BEFORE UPDATE ON public.google_calendar_tokens
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- FILE: 20260213224656_0487fd43-32f5-43f8-a24e-5dc7c6889a0a.sql

-- Add more fields to clients table for a complete registration form
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS client_type text DEFAULT 'pessoa_fisica',
  ADD COLUMN IF NOT EXISTS rg text,
  ADD COLUMN IF NOT EXISTS birth_date date,
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS marital_status text,
  ADD COLUMN IF NOT EXISTS nationality text DEFAULT 'Brasileira',
  ADD COLUMN IF NOT EXISTS profession text,
  ADD COLUMN IF NOT EXISTS address_street text,
  ADD COLUMN IF NOT EXISTS address_number text,
  ADD COLUMN IF NOT EXISTS address_complement text,
  ADD COLUMN IF NOT EXISTS address_neighborhood text,
  ADD COLUMN IF NOT EXISTS address_city text,
  ADD COLUMN IF NOT EXISTS address_state text,
  ADD COLUMN IF NOT EXISTS address_zip text,
  ADD COLUMN IF NOT EXISTS secondary_phone text,
  ADD COLUMN IF NOT EXISTS secondary_email text,
  ADD COLUMN IF NOT EXISTS company_name text,
  ADD COLUMN IF NOT EXISTS company_position text;


-- FILE: 20260219000000_orcamentos.sql
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


-- FILE: 20260220000001_timesheet_entries.sql
-- Migration: Timesheet entries table
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS timesheet_entries (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id   uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id           uuid NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  process_id        uuid REFERENCES processos_juridicos(id) ON DELETE SET NULL,
  description       text,
  started_at        timestamptz NOT NULL,
  ended_at          timestamptz,
  duration_minutes  integer,
  hourly_rate       numeric(10,2),
  billing_status    text NOT NULL DEFAULT 'pendente'
    CHECK (billing_status IN ('pendente','faturado','pago','nao_faturavel')),
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_timesheet_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS timesheet_updated_at ON timesheet_entries;
CREATE TRIGGER timesheet_updated_at
  BEFORE UPDATE ON timesheet_entries
  FOR EACH ROW EXECUTE FUNCTION update_timesheet_updated_at();

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_timesheet_org ON timesheet_entries(organization_id);
CREATE INDEX IF NOT EXISTS idx_timesheet_user ON timesheet_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_timesheet_process ON timesheet_entries(process_id);
CREATE INDEX IF NOT EXISTS idx_timesheet_started ON timesheet_entries(started_at DESC);

-- Row-Level Security
ALTER TABLE timesheet_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own timesheet entries"
  ON timesheet_entries FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE user_id = auth.uid()
    )
  );


-- FILE: 20260220000002_wiki_juridica.sql
-- Migration: Wiki Jurídica table
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS wiki_juridica (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id   uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id           uuid NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  title             text NOT NULL,
  content           text NOT NULL,
  category          text NOT NULL DEFAULT 'outro'
    CHECK (category IN ('tese','modelo','procedimento','jurisprudencia','dica','outro')),
  tags              text[] NOT NULL DEFAULT '{}',
  is_pinned         boolean NOT NULL DEFAULT false,
  is_public         boolean NOT NULL DEFAULT false,
  views             integer NOT NULL DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION update_wiki_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS wiki_updated_at ON wiki_juridica;
CREATE TRIGGER wiki_updated_at
  BEFORE UPDATE ON wiki_juridica
  FOR EACH ROW EXECUTE FUNCTION update_wiki_updated_at();

CREATE INDEX IF NOT EXISTS idx_wiki_org ON wiki_juridica(organization_id);
CREATE INDEX IF NOT EXISTS idx_wiki_category ON wiki_juridica(category);
CREATE INDEX IF NOT EXISTS idx_wiki_pinned ON wiki_juridica(is_pinned) WHERE is_pinned = true;

ALTER TABLE wiki_juridica ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their org wiki"
  ON wiki_juridica FOR ALL
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid()));


-- FILE: 20260220000003_units_chat.sql
-- Migration: Units (Franquias/Unidades)
-- Modelo escalável multi-escritório

CREATE TABLE IF NOT EXISTS units (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id   uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name              text NOT NULL,
  slug              text NOT NULL,
  address           text,
  city              text,
  state             text,
  phone             text,
  email             text,
  manager_id        uuid REFERENCES profiles(user_id) ON DELETE SET NULL,
  is_headquarters   boolean NOT NULL DEFAULT false,
  is_active         boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, slug)
);

CREATE OR REPLACE FUNCTION update_units_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS units_updated_at ON units;
CREATE TRIGGER units_updated_at
  BEFORE UPDATE ON units
  FOR EACH ROW EXECUTE FUNCTION update_units_updated_at();

CREATE INDEX IF NOT EXISTS idx_units_org ON units(organization_id);
CREATE INDEX IF NOT EXISTS idx_units_active ON units(is_active) WHERE is_active = true;

ALTER TABLE units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their org units"
  ON units FOR ALL
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid()));

-- Chat channels
CREATE TABLE IF NOT EXISTS chat_channels (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id   uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name              text NOT NULL,
  type              text NOT NULL DEFAULT 'general'
    CHECK (type IN ('general','process','direct','unit')),
  process_id        uuid REFERENCES processos_juridicos(id) ON DELETE SET NULL,
  unit_id           uuid REFERENCES units(id) ON DELETE SET NULL,
  is_archived       boolean NOT NULL DEFAULT false,
  created_by        uuid REFERENCES profiles(user_id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_channels_org ON chat_channels(organization_id);
ALTER TABLE chat_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their org channels"
  ON chat_channels FOR ALL
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid()));

-- Chat messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id        uuid NOT NULL REFERENCES chat_channels(id) ON DELETE CASCADE,
  user_id           uuid NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  content           text NOT NULL,
  reply_to          uuid REFERENCES chat_messages(id) ON DELETE SET NULL,
  is_edited         boolean NOT NULL DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_msg_channel ON chat_messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_chat_msg_created ON chat_messages(created_at DESC);
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Messages readable by org members (via channel)
CREATE POLICY "Users manage their org messages"
  ON chat_messages FOR ALL
  USING (channel_id IN (
    SELECT id FROM chat_channels WHERE organization_id IN (
      SELECT organization_id FROM profiles WHERE user_id = auth.uid()
    )
  ))
  WITH CHECK (channel_id IN (
    SELECT id FROM chat_channels WHERE organization_id IN (
      SELECT organization_id FROM profiles WHERE user_id = auth.uid()
    )
  ));

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;


-- FILE: 20260220000004_unified_all.sql
-- ╔═══════════════════════════════════════════════════════════════╗
-- ║  LEXA Nova — Script Unificado de Migrations + Segurança     ║
-- ║  Execute este arquivo INTEIRO no SQL Editor do Supabase      ║
-- ╚═══════════════════════════════════════════════════════════════╝

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- PARTE 1: CORREÇÕES DE SEGURANÇA (RLS)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- 1A. CLIENTES: restringir SELECT para admin/advogado apenas
--     (antes: qualquer membro da org via SELECT ver todos os dados)
DROP POLICY IF EXISTS "Members can read clients" ON public.clients;
CREATE POLICY "Members can read clients" ON public.clients
  FOR SELECT USING (
    public.is_member_of_org(auth.uid(), organization_id)
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'advogado')
      OR public.has_role(auth.uid(), 'financeiro')
    )
  );

-- 1B. EVENTOS_AGENDA: restringir SELECT para eventos próprios
--     (antes: qualquer membro via SELECT ver todos os eventos da org)
DROP POLICY IF EXISTS "Members can read eventos" ON public.eventos_agenda;
CREATE POLICY "Members can read eventos" ON public.eventos_agenda
  FOR SELECT USING (
    public.is_member_of_org(auth.uid(), organization_id)
    AND (
      user_id = auth.uid()
      OR public.has_role(auth.uid(), 'admin')
    )
  );

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- PARTE 2: TABELA TIMESHEET_ENTRIES
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS timesheet_entries (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id   uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id           uuid NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  process_id        uuid REFERENCES processos_juridicos(id) ON DELETE SET NULL,
  description       text,
  started_at        timestamptz NOT NULL,
  ended_at          timestamptz,
  duration_minutes  integer,
  hourly_rate       numeric(10,2),
  billing_status    text NOT NULL DEFAULT 'pendente'
    CHECK (billing_status IN ('pendente','faturado','pago','nao_faturavel')),
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION update_timesheet_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS timesheet_updated_at ON timesheet_entries;
CREATE TRIGGER timesheet_updated_at
  BEFORE UPDATE ON timesheet_entries
  FOR EACH ROW EXECUTE FUNCTION update_timesheet_updated_at();

CREATE INDEX IF NOT EXISTS idx_timesheet_org ON timesheet_entries(organization_id);
CREATE INDEX IF NOT EXISTS idx_timesheet_user ON timesheet_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_timesheet_process ON timesheet_entries(process_id);
CREATE INDEX IF NOT EXISTS idx_timesheet_started ON timesheet_entries(started_at DESC);

ALTER TABLE timesheet_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own timesheet entries" ON timesheet_entries;
CREATE POLICY "Users can manage their own timesheet entries"
  ON timesheet_entries FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- PARTE 3: TABELA WIKI_JURIDICA
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS wiki_juridica (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id   uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id           uuid NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  title             text NOT NULL,
  content           text NOT NULL,
  category          text NOT NULL DEFAULT 'outro'
    CHECK (category IN ('tese','modelo','procedimento','jurisprudencia','dica','outro')),
  tags              text[] NOT NULL DEFAULT '{}',
  is_pinned         boolean NOT NULL DEFAULT false,
  is_public         boolean NOT NULL DEFAULT false,
  views             integer NOT NULL DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION update_wiki_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS wiki_updated_at ON wiki_juridica;
CREATE TRIGGER wiki_updated_at
  BEFORE UPDATE ON wiki_juridica
  FOR EACH ROW EXECUTE FUNCTION update_wiki_updated_at();

CREATE INDEX IF NOT EXISTS idx_wiki_org ON wiki_juridica(organization_id);
CREATE INDEX IF NOT EXISTS idx_wiki_category ON wiki_juridica(category);
CREATE INDEX IF NOT EXISTS idx_wiki_pinned ON wiki_juridica(is_pinned) WHERE is_pinned = true;

ALTER TABLE wiki_juridica ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their org wiki" ON wiki_juridica;
CREATE POLICY "Users manage their org wiki"
  ON wiki_juridica FOR ALL
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid()));

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- PARTE 4: TABELAS UNITS + CHAT
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS units (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id   uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name              text NOT NULL,
  slug              text NOT NULL,
  address           text,
  city              text,
  state             text,
  phone             text,
  email             text,
  manager_id        uuid REFERENCES profiles(user_id) ON DELETE SET NULL,
  is_headquarters   boolean NOT NULL DEFAULT false,
  is_active         boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, slug)
);

CREATE OR REPLACE FUNCTION update_units_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS units_updated_at ON units;
CREATE TRIGGER units_updated_at
  BEFORE UPDATE ON units
  FOR EACH ROW EXECUTE FUNCTION update_units_updated_at();

CREATE INDEX IF NOT EXISTS idx_units_org ON units(organization_id);
CREATE INDEX IF NOT EXISTS idx_units_active ON units(is_active) WHERE is_active = true;

ALTER TABLE units ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their org units" ON units;
CREATE POLICY "Users manage their org units"
  ON units FOR ALL
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid()));

-- Chat channels
CREATE TABLE IF NOT EXISTS chat_channels (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id   uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name              text NOT NULL,
  type              text NOT NULL DEFAULT 'general'
    CHECK (type IN ('general','process','direct','unit')),
  process_id        uuid REFERENCES processos_juridicos(id) ON DELETE SET NULL,
  unit_id           uuid REFERENCES units(id) ON DELETE SET NULL,
  is_archived       boolean NOT NULL DEFAULT false,
  created_by        uuid REFERENCES profiles(user_id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_channels_org ON chat_channels(organization_id);
ALTER TABLE chat_channels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their org channels" ON chat_channels;
CREATE POLICY "Users manage their org channels"
  ON chat_channels FOR ALL
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid()));

-- Chat messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id        uuid NOT NULL REFERENCES chat_channels(id) ON DELETE CASCADE,
  user_id           uuid NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  content           text NOT NULL,
  reply_to          uuid REFERENCES chat_messages(id) ON DELETE SET NULL,
  is_edited         boolean NOT NULL DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_msg_channel ON chat_messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_chat_msg_created ON chat_messages(created_at DESC);
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their org messages" ON chat_messages;
CREATE POLICY "Users manage their org messages"
  ON chat_messages FOR ALL
  USING (channel_id IN (
    SELECT id FROM chat_channels WHERE organization_id IN (
      SELECT organization_id FROM profiles WHERE user_id = auth.uid()
    )
  ))
  WITH CHECK (channel_id IN (
    SELECT id FROM chat_channels WHERE organization_id IN (
      SELECT organization_id FROM profiles WHERE user_id = auth.uid()
    )
  ));

-- Enable realtime for chat messages
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
  END IF;
END $$;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- PRONTO! Todas as tabelas e políticas de segurança foram criadas.
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


-- FILE: 20260220000005_processos_juridicos_fields.sql
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


-- FILE: 20260220000006_crm_workflow_minutas.sql
-- ═══════════════════════════════════════════════════════════════
-- Migration: CRM, Workflow and Minutas tables
-- Date: 2026-02-20
-- ═══════════════════════════════════════════════════════════════

-- ─── CRM ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS crm_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  email TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  type TEXT DEFAULT 'pessoa_fisica',
  company TEXT DEFAULT '',
  city TEXT DEFAULT '',
  state TEXT DEFAULT '',
  tags TEXT[] DEFAULT '{}',
  score INT DEFAULT 1,
  notes TEXT DEFAULT '',
  source TEXT DEFAULT 'manual',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE crm_contacts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "crm_contacts_org" ON crm_contacts;
CREATE POLICY "crm_contacts_org" ON crm_contacts
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid()));

CREATE TABLE IF NOT EXISTS crm_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  contact_id UUID REFERENCES crm_contacts(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  contact_name TEXT DEFAULT '',
  value NUMERIC DEFAULT 0,
  priority TEXT DEFAULT 'media',
  date DATE DEFAULT CURRENT_DATE,
  notes TEXT DEFAULT '',
  stage_id TEXT DEFAULT 'novo_lead',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE crm_leads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "crm_leads_org" ON crm_leads;
CREATE POLICY "crm_leads_org" ON crm_leads
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid()));

CREATE TABLE IF NOT EXISTS crm_deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  contact_id UUID REFERENCES crm_contacts(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  contact_name TEXT DEFAULT '',
  value NUMERIC DEFAULT 0,
  probability INT DEFAULT 50,
  stage TEXT DEFAULT 'Qualificação',
  due_date DATE,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE crm_deals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "crm_deals_org" ON crm_deals;
CREATE POLICY "crm_deals_org" ON crm_deals
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid()));

CREATE TABLE IF NOT EXISTS crm_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  contact_id UUID REFERENCES crm_contacts(id) ON DELETE SET NULL,
  type TEXT NOT NULL DEFAULT 'tarefa',
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  contact_name TEXT DEFAULT '',
  date DATE DEFAULT CURRENT_DATE,
  time TEXT DEFAULT '09:00',
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE crm_activities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "crm_activities_org" ON crm_activities;
CREATE POLICY "crm_activities_org" ON crm_activities
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid()));

-- ─── WORKFLOW ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS workflow_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  template_id TEXT DEFAULT '',
  template_name TEXT NOT NULL,
  template_emoji TEXT DEFAULT '📋',
  sector_id TEXT DEFAULT '',
  assigned_to TEXT DEFAULT '',
  assigned_to_name TEXT DEFAULT '',
  priority TEXT DEFAULT 'media',
  deadline DATE,
  status TEXT DEFAULT 'pendente',
  created_by TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE workflow_instances ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "workflow_instances_org" ON workflow_instances;
CREATE POLICY "workflow_instances_org" ON workflow_instances
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid()));

CREATE TABLE IF NOT EXISTS workflow_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflow_instances(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  completed BOOLEAN DEFAULT false,
  due_date DATE,
  notes TEXT DEFAULT '',
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE workflow_steps ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "workflow_steps_org" ON workflow_steps;
CREATE POLICY "workflow_steps_org" ON workflow_steps
  USING (workflow_id IN (SELECT id FROM workflow_instances WHERE organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid())));

-- ─── MINUTAS ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS minutas_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  title TEXT NOT NULL,
  category TEXT DEFAULT 'outros',
  content TEXT DEFAULT '',
  variables JSONB DEFAULT '[]',
  tags TEXT[] DEFAULT '{}',
  favorite BOOLEAN DEFAULT false,
  usage_count INT DEFAULT 0,
  source TEXT DEFAULT 'manual',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE minutas_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "minutas_documents_org" ON minutas_documents;
CREATE POLICY "minutas_documents_org" ON minutas_documents
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid()));

CREATE TABLE IF NOT EXISTS minutas_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES minutas_documents(id) ON DELETE CASCADE,
  content TEXT DEFAULT '',
  label TEXT DEFAULT '',
  saved_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE minutas_versions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "minutas_versions_org" ON minutas_versions;
CREATE POLICY "minutas_versions_org" ON minutas_versions
  USING (document_id IN (SELECT id FROM minutas_documents WHERE organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid())));


-- FILE: 20260220000007_agenda_recurrence.sql
-- Add recurrence_rule to eventos_agenda
ALTER TABLE public.eventos_agenda
ADD COLUMN recurrence_rule TEXT DEFAULT NULL;

COMMENT ON COLUMN public.eventos_agenda.recurrence_rule IS 'Rule for recurring events (e.g. daily, weekly, monthly, yearly)';


-- FILE: 20260220000008_ged_storage.sql
-- Criar bucket para os documentos caso não exista
INSERT INTO storage.buckets (id, name, public) 
VALUES ('documentos', 'documentos', false)
ON CONFLICT (id) DO NOTHING;

-- Policies de storage
CREATE POLICY "Acesso aos documentos restrito a usuários autenticados"
ON storage.objects FOR SELECT
TO authenticated
USING ( bucket_id = 'documentos' );

CREATE POLICY "Upload permitido a usuários autenticados"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'documentos' );

CREATE POLICY "Deleção permitida ao próprio dono ou admin"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'documentos' );

-- Adicionar colunas adicionais em documentos para o GED caso não existam
ALTER TABLE public.documentos ADD COLUMN IF NOT EXISTS size INTEGER DEFAULT 0;
ALTER TABLE public.documentos ADD COLUMN IF NOT EXISTS folder_path TEXT DEFAULT '/';


-- FILE: 20260220000009_portal_cliente.sql
-- 1. Permite o app_role 'cliente'
-- Como Supabase executa dentro de uma transação, precisamos dar o commit antes para o ALTER TYPE ADD VALUE funcionar.
COMMIT;
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'cliente';

-- 2. Vincula o cliente do CRM ao user real logado (para uso de RLS e JWT)
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 3. Políticas de RLS para o Portal do Cliente (Leitura estrita de dados onde ele é o client_id)
-- Eles são aditivos. Se uma política anterior concedeu acesso ao advogado, ela continua valendo, e essa soma-se permitindo o cliente.

-- Processos
CREATE POLICY "Clientes podem ler seus próprios processos" ON public.processos_juridicos
FOR SELECT USING (
  client_id IN (SELECT id FROM public.clients WHERE auth_user_id = auth.uid())
);

-- Faturas (Contas a Receber)
CREATE POLICY "Clientes podem ver suas faturas" ON public.contas_receber
FOR SELECT USING (
  client_id IN (SELECT id FROM public.clients WHERE auth_user_id = auth.uid())
);

-- Documentos (Apenas os atrelados ao cliente)
CREATE POLICY "Clientes podem ler seus documentos" ON public.documentos
FOR SELECT USING (
  client_id IN (SELECT id FROM public.clients WHERE auth_user_id = auth.uid())
);

-- Eventos / Agenda (Apenas os que têm o processo atrelado ao cliente)
CREATE POLICY "Clientes podem ver eventos de seus processos" ON public.eventos_agenda
FOR SELECT USING (
  process_id IN (
    SELECT id FROM public.processos_juridicos 
    WHERE client_id IN (SELECT id FROM public.clients WHERE auth_user_id = auth.uid())
  )
);


-- FILE: 20260220000010_document_signatures.sql
-- Tabela de assinaturas de documentos
CREATE TABLE public.document_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES public.documentos(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  
  -- Informações de Contato / Controle do Signatário
  signer_name TEXT NOT NULL,
  signer_email TEXT NOT NULL,
  signer_document TEXT, -- CPF, Passaporte
  
  -- Estado da Assinatura
  status TEXT NOT NULL DEFAULT 'pendente', -- pendente, visualizado, assinado, recusado, expirado
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'), -- URL Segura
  
  -- Evidências Legais (Preenchidos na hora do aceite)
  signed_at TIMESTAMPTZ,
  ip_address TEXT,
  user_agent TEXT,
  location_data JSONB, -- Opcional
  signature_hash TEXT, -- SHA-256 gerado do arquivo misturado com IP e Timestamp
  
  -- Controle de Vida Útil
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.document_signatures ENABLE ROW LEVEL SECURITY;

-- Políticas
-- Administradores e Advogados enxergam as assinaturas do seu escritório
CREATE POLICY "Membros da org gerenciam assinaturas" ON public.document_signatures
FOR ALL USING (
  organization_id = (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid())
);

-- Signatários Externos (Não-Autenticados, mas possuem o Token Secreto)
-- Precisamos liberar acesso as assinaturas via Supabase Anon Key desde que a edge function repasse, OU criar uma policy para select via token.
CREATE POLICY "Signatários acessam com token" ON public.document_signatures
FOR SELECT USING (true); -- Controle feito via Rota do Frontend com match no Token.

CREATE POLICY "Signatários atualizam status usando token na Edge Function / API" ON public.document_signatures
FOR UPDATE USING (true);


-- FILE: 20260220000011_recebimentos_gateway.sql
-- Tabela de Recebimentos: Suporte a Gateways (Asaas/Stripe/MercadoPago)
ALTER TABLE public.contas_receber
ADD COLUMN gateway_id TEXT,
ADD COLUMN payment_link TEXT,
ADD COLUMN pix_code TEXT,
ADD COLUMN pix_qr_code_base64 TEXT;

-- Index para agilizar a busca pelo Webhook
CREATE INDEX IF NOT EXISTS idx_contas_receber_gateway_id ON public.contas_receber(gateway_id);


-- FILE: 20260220000012_whatsapp_integration.sql
-- Tabela de Organizações: Campos de Integração WhatsApp (Z-API / Evolution)
ALTER TABLE public.organizations
ADD COLUMN whatsapp_instance_id TEXT,
ADD COLUMN whatsapp_token TEXT,
ADD COLUMN whatsapp_enabled BOOLEAN DEFAULT false;


-- FILE: 20260220000013_whatsapp_triggers.sql
-- Ativar extensão pg_net para fazer requisições HTTP a partir do banco (já nativo na cloud da Supabase)
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Criação da função de disparo para Assinaturas Pendentes
CREATE OR REPLACE FUNCTION public.trigger_whatsapp_signature()
RETURNS TRIGGER AS $$
DECLARE
  org_record record;
  webhook_url text;
  req_body jsonb;
BEGIN
  -- Se o webhook url for fixo (sua edge function URL), defina-o aqui.
  webhook_url := current_setting('app.settings.whatsapp_edge_url', true);
  
  -- Para segurança local / fallback url mockada
  IF webhook_url IS NULL OR webhook_url = '' THEN
    webhook_url := 'https://[YOUR_SUPABASE_REF].functions.supabase.co/whatsapp-sender';
  END IF;

  -- Checar se a org ativou o zap
  SELECT whatsapp_enabled INTO org_record FROM public.organizations WHERE id = NEW.organization_id;

  IF org_record.whatsapp_enabled = true AND NEW.status = 'pendente' THEN
    req_body := jsonb_build_object(
      'organization_id', NEW.organization_id,
      'phone', '5511999999999', -- Idealmente pegar o fone da tabela clients, usando NEW.client_id
      'message', format('Olá %s! A Lexa Nova informa que há um novo documento solicitando sua Assinatura Eletrônica. Acesse seu portal ou e-mail para validar. Obrigado.', NEW.signer_name)
    );

    -- Dispara requisição HTTP POST assíncrona usando pg_net
    PERFORM extensions.http_post(
      url := webhook_url,
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := req_body
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para tabela document_signatures
DROP TRIGGER IF EXISTS trg_whatsapp_doc_signatures ON public.document_signatures;
CREATE TRIGGER trg_whatsapp_doc_signatures
  AFTER INSERT ON public.document_signatures
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_whatsapp_signature();


-- Criação da função de disparo para Faturas (Contas a Receber)
CREATE OR REPLACE FUNCTION public.trigger_whatsapp_invoice()
RETURNS TRIGGER AS $$
DECLARE
  org_record record;
  client_record record;
  webhook_url text;
  req_body jsonb;
BEGIN
  -- O mesmo fallback URL
  webhook_url := 'https://[YOUR_SUPABASE_REF].functions.supabase.co/whatsapp-sender';

  -- Checar se a org ativou o zap
  SELECT whatsapp_enabled INTO org_record FROM public.organizations WHERE id = NEW.organization_id;

  IF org_record.whatsapp_enabled = true AND NEW.status = 'pendente' AND NEW.client_id IS NOT NULL THEN
    -- Pegar telefone do cliente
    SELECT phone INTO client_record FROM public.clients WHERE id = NEW.client_id;
    
    IF client_record.phone IS NOT NULL THEN
      -- Constrói payload JSON
      req_body := jsonb_build_object(
        'organization_id', NEW.organization_id,
        'phone', client_record.phone,
        'message', format('Olá! A fatura "%s" no valor de R$ %s foi gerada e está pendente de pagamento.', NEW.description, NEW.amount::numeric)
      );

      PERFORM extensions.http_post(
        url := webhook_url,
        headers := '{"Content-Type": "application/json"}'::jsonb,
        body := req_body
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para tabela contas_receber
DROP TRIGGER IF EXISTS trg_whatsapp_invoice ON public.contas_receber;
CREATE TRIGGER trg_whatsapp_invoice
  AFTER INSERT ON public.contas_receber
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_whatsapp_invoice();


-- FILE: 20260220000014_capture_robots.sql
-- Módulo de Robôs de Captura (Jusbrasil/Escavador)

-- 1. Adicionar credenciais na tabela organizations
ALTER TABLE public.organizations
ADD COLUMN jusbrasil_token TEXT,
ADD COLUMN escavador_token TEXT;

-- 2. Permitir ativar/desativar captura automática por processo
ALTER TABLE public.processos_juridicos
ADD COLUMN auto_capture_enabled BOOLEAN DEFAULT false;

-- 3. Tabela de Andamentos Capturados pelos Robôs
CREATE TABLE IF NOT EXISTS public.process_captures (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  process_id uuid NOT NULL REFERENCES public.processos_juridicos(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('Jusbrasil', 'Escavador', 'Outro')),
  capture_date TIMESTAMP WITH TIME ZONE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.process_captures ENABLE ROW LEVEL SECURITY;

-- Setup RLS para process_captures (Acesso através do processo)
CREATE POLICY "Users can view captures for their organization's processes"
ON public.process_captures
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.processos_juridicos pj
    WHERE pj.id = process_captures.process_id
    AND pj.organization_id = (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid())
  )
);

CREATE POLICY "Service Role can manage process captures"
ON public.process_captures
FOR ALL
USING (auth.uid() IS NULL); -- Permitir Edge Functions


-- FILE: 20260220000015_workflow_automations.sql
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

CREATE POLICY "Users can view automation logs for their organization"
ON public.automation_logs
FOR SELECT
USING (organization_id = (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Service Role can manage automation logs"
ON public.automation_logs
FOR ALL
USING (auth.uid() IS NULL);


-- FILE: 20260220000016_rbac_roles.sql
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


-- FILE: 20260220000018_add_google_event_id.sql
-- Add google_event_id to eventos_agenda
ALTER TABLE IF EXISTS public.eventos_agenda
ADD COLUMN IF NOT EXISTS google_event_id TEXT;

-- Add a unique constraint to prevent duplicates during sync
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'unique_google_event_per_user'
    ) THEN
        ALTER TABLE public.eventos_agenda
        ADD CONSTRAINT unique_google_event_per_user UNIQUE (user_id, google_event_id);
    END IF;
END $$;


-- FILE: 20260223000001_timesheet_timer_logs.sql
-- Migration: Timesheet timer logs (pause/resume tracking)

CREATE TABLE IF NOT EXISTS timesheet_timer_logs (
  id                  uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  timesheet_entry_id  uuid NOT NULL REFERENCES timesheet_entries(id) ON DELETE CASCADE,
  action              text NOT NULL CHECK (action IN ('start','pause','resume','stop')),
  logged_at           timestamptz NOT NULL DEFAULT now(),
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_timer_logs_entry ON timesheet_timer_logs(timesheet_entry_id);
CREATE INDEX IF NOT EXISTS idx_timer_logs_logged ON timesheet_timer_logs(logged_at DESC);

ALTER TABLE timesheet_timer_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage timer logs via org"
  ON timesheet_timer_logs FOR ALL
  USING (
    timesheet_entry_id IN (
      SELECT id FROM timesheet_entries
      WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    timesheet_entry_id IN (
      SELECT id FROM timesheet_entries
      WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE user_id = auth.uid()
      )
    )
  );


-- FILE: 20260223000002_subscription_plans.sql
-- Migration: Subscription plans and organization subscriptions

CREATE TABLE IF NOT EXISTS subscription_plans (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name            text NOT NULL,
  slug            text NOT NULL UNIQUE,
  price_monthly   numeric(10,2) NOT NULL DEFAULT 0,
  price_yearly    numeric(10,2) NOT NULL DEFAULT 0,
  max_users       integer NOT NULL DEFAULT 1,
  max_processes   integer NOT NULL DEFAULT 50,
  features        jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active       boolean NOT NULL DEFAULT true,
  sort_order      integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS organization_subscriptions (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plan_id         uuid NOT NULL REFERENCES subscription_plans(id) ON DELETE RESTRICT,
  status          text NOT NULL DEFAULT 'active' CHECK (status IN ('active','trialing','past_due','cancelled')),
  started_at      timestamptz NOT NULL DEFAULT now(),
  expires_at      timestamptz,
  billing_cycle   text NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly','yearly')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Seed default plans
INSERT INTO subscription_plans (name, slug, price_monthly, price_yearly, max_users, max_processes, features, sort_order)
VALUES
  ('Free', 'free', 0, 0, 2, 10,
   '["Processos básicos", "Agenda simples", "1 unidade"]'::jsonb, 0),
  ('Pro', 'pro', 197, 1970, 10, 500,
   '["Processos ilimitados", "Timesheet completo", "BI & Relatórios", "Workflow", "5 unidades", "Integrações"]'::jsonb, 1),
  ('Enterprise', 'enterprise', 497, 4970, 999, 99999,
   '["Tudo do Pro", "Unidades ilimitadas", "API completa", "SSO/SAML", "Suporte prioritário", "SLA garantido"]'::jsonb, 2)
ON CONFLICT (slug) DO NOTHING;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_org_sub_org ON organization_subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_sub_plan ON organization_subscriptions(plan_id);

-- RLS
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can read plans" ON subscription_plans FOR SELECT USING (true);

CREATE POLICY "Org members can manage subscriptions" ON organization_subscriptions FOR ALL
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid()));


-- FILE: 20260223000003_custom_options.sql
-- Migration: Custom options per module (customizable dropdowns)

CREATE TABLE IF NOT EXISTS custom_options (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  module          text NOT NULL CHECK (module IN ('processos','clientes','financeiro','agenda','timesheet','crm','geral')),
  field_name      text NOT NULL,
  label           text NOT NULL,
  value           text NOT NULL,
  color           text DEFAULT NULL,
  icon            text DEFAULT NULL,
  sort_order      integer NOT NULL DEFAULT 0,
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, module, field_name, value)
);

CREATE INDEX IF NOT EXISTS idx_custom_options_org ON custom_options(organization_id);
CREATE INDEX IF NOT EXISTS idx_custom_options_module ON custom_options(organization_id, module);

ALTER TABLE custom_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their org custom options"
  ON custom_options FOR ALL
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid()));


-- FILE: 20260223000004_employees.sql
-- Migration: Employees table

CREATE TABLE IF NOT EXISTS employees (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         uuid REFERENCES profiles(user_id) ON DELETE SET NULL,
  full_name       text NOT NULL,
  email           text,
  phone           text,
  oab_number      text,
  department      text,
  position        text,
  hire_date       date,
  hourly_rate     numeric(10,2),
  unit_id         uuid REFERENCES units(id) ON DELETE SET NULL,
  is_active       boolean NOT NULL DEFAULT true,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_employees_org ON employees(organization_id);
CREATE INDEX IF NOT EXISTS idx_employees_unit ON employees(unit_id);
CREATE INDEX IF NOT EXISTS idx_employees_user ON employees(user_id);

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their org employees"
  ON employees FOR ALL
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid()));


-- FILE: 20260224000000_optimize_rls_performance.sql
-- ╔═══════════════════════════════════════════════════════════════╗
-- ║  LEXA Nova — Otimização de Performance em RLS               ║
-- ║  Evita subqueries repetitivas na tabela de 'profiles'       ║
-- ╚═══════════════════════════════════════════════════════════════╝

-- 1. Função de Cache Local (Security Definer)
-- Essa função consulta o perfil do usuário logado uma única vez
-- por chamada (ou o banco consegue otimizar no plano de execução)
CREATE OR REPLACE FUNCTION public.get_user_organization_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id 
  FROM profiles 
  WHERE user_id = auth.uid() 
  LIMIT 1;
$$;

-- 2. Atualização das Políticas RLS para tabelas pesadas (Chats, Log, Processos, etc)

-- TIMESHEET_ENTRIES
DROP POLICY IF EXISTS "Users can manage their own timesheet entries" ON timesheet_entries;
CREATE POLICY "Users can manage their own timesheet entries"
  ON timesheet_entries FOR ALL
  USING (organization_id = public.get_user_organization_id())
  WITH CHECK (organization_id = public.get_user_organization_id());

-- WIKI_JURIDICA
DROP POLICY IF EXISTS "Users manage their org wiki" ON wiki_juridica;
CREATE POLICY "Users manage their org wiki"
  ON wiki_juridica FOR ALL
  USING (organization_id = public.get_user_organization_id())
  WITH CHECK (organization_id = public.get_user_organization_id());

-- UNITS
DROP POLICY IF EXISTS "Users manage their org units" ON units;
CREATE POLICY "Users manage their org units"
  ON units FOR ALL
  USING (organization_id = public.get_user_organization_id())
  WITH CHECK (organization_id = public.get_user_organization_id());

-- CHAT_CHANNELS
DROP POLICY IF EXISTS "Users manage their org channels" ON chat_channels;
CREATE POLICY "Users manage their org channels"
  ON chat_channels FOR ALL
  USING (organization_id = public.get_user_organization_id())
  WITH CHECK (organization_id = public.get_user_organization_id());

-- CHAT_MESSAGES
-- O chat message não tem organization_id direto, ele depende do channel_id.
-- A função is_member_of_org já existia (criada nas migrations base do projeto), vamos usá-la se possível,
-- ou então fazer um join simplificado de acesso:
DROP POLICY IF EXISTS "Users manage their org messages" ON chat_messages;
CREATE POLICY "Users manage their org messages"
  ON chat_messages FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM chat_channels c 
      WHERE c.id = channel_id 
      AND c.organization_id = public.get_user_organization_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat_channels c 
      WHERE c.id = channel_id 
      AND c.organization_id = public.get_user_organization_id()
    )
  );

-- BÔNUS: Refatorar a política que criamos mais cedo (em 20260220000004_unified_all.sql) se possível.
-- (Deixaremos o `is_member_of_org` como está por agora, pois ele pode ser útil se tiver cache)


-- FILE: 20260224000001_notifications.sql
-- ╔═══════════════════════════════════════════════════════════════╗
-- ║  LEXA Nova — Notificações em Tempo Real                       ║
-- ╚═══════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS public.notifications (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id   uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id           uuid REFERENCES profiles(user_id) ON DELETE CASCADE, -- Se nulo, notificação global da org
  title             text NOT NULL,
  description       text,
  type              text NOT NULL DEFAULT 'info'
    CHECK (type IN ('info', 'warning', 'critical', 'success')),
  link              text,
  is_read           boolean NOT NULL DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION update_notifications_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS notifications_updated_at ON notifications;
CREATE TRIGGER notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW EXECUTE FUNCTION update_notifications_updated_at();

CREATE INDEX IF NOT EXISTS idx_notifications_org ON notifications(organization_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(is_read) WHERE is_read = false;

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own notifications" ON notifications;
CREATE POLICY "Users can read own notifications"
  ON notifications FOR SELECT
  USING (
    organization_id = public.get_user_organization_id()
    AND (user_id = auth.uid() OR user_id IS NULL)
  );

DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (
    organization_id = public.get_user_organization_id()
    AND (user_id = auth.uid() OR user_id IS NULL)
  )
  WITH CHECK (
    organization_id = public.get_user_organization_id()
    AND (user_id = auth.uid() OR user_id IS NULL)
  );

-- Habilitar realtime
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  END IF;
END $$;


-- FILE: 20260224100000_hr_core_schema.sql
-- hr_core_schema.sql
-- Descrição: Estrutura base de tabelas para o Módulo de Recursos Humanos / DHO
-- Tabelas: hr_departments, hr_jobs, hr_employees, hr_contracts

-- Drop tables if they exist (for idempotency during local development)
-- DROP TABLE IF EXISTS public.hr_contracts CASCADE;
-- DROP TABLE IF EXISTS public.hr_employees CASCADE;
-- DROP TABLE IF EXISTS public.hr_jobs CASCADE;
-- DROP TABLE IF EXISTS public.hr_departments CASCADE;

-- 1. Departments
CREATE TABLE IF NOT EXISTS public.hr_departments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    manager_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Gestor do departamento
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(organization_id, name)
);

-- 2. Jobs / Position Titles (Cargos)
CREATE TABLE IF NOT EXISTS public.hr_jobs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    department_id UUID REFERENCES public.hr_departments(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    requirements TEXT,
    base_salary NUMERIC(15, 2), -- Salário base sugerido
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(organization_id, title)
);

-- 3. Employees (Colaboradores / Ficha)
CREATE TABLE IF NOT EXISTS public.hr_employees (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Vínculo opcional se o colab tiver acesso ao sistema
    department_id UUID REFERENCES public.hr_departments(id) ON DELETE SET NULL,
    job_id UUID REFERENCES public.hr_jobs(id) ON DELETE SET NULL,
    manager_id UUID REFERENCES public.hr_employees(id) ON DELETE SET NULL, -- Reporte Direto (Gestor)
    
    -- Dados Pessoais
    full_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    birth_date DATE,
    gender TEXT,
    marital_status TEXT,
    
    -- Documentos
    cpf TEXT,
    rg TEXT,
    pis_pasep TEXT,
    oab_number TEXT,
    oab_uf TEXT,
    
    -- Endereço
    address_street TEXT,
    address_number TEXT,
    address_complement TEXT,
    address_neighborhood TEXT,
    address_city TEXT,
    address_state TEXT,
    address_zip TEXT,
    
    -- Status
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'on_leave', 'terminated')),
    hire_date DATE NOT NULL DEFAULT CURRENT_DATE,
    termination_date DATE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Contracts (Contratos/Remuneração)
CREATE TABLE IF NOT EXISTS public.hr_contracts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
    
    contract_type TEXT NOT NULL CHECK (contract_type IN ('clt', 'pj', 'internship', 'statutory', 'temporary')),
    work_model TEXT DEFAULT 'hybrid' CHECK (work_model IN ('onsite', 'remote', 'hybrid')),
    
    base_salary NUMERIC(15, 2) NOT NULL,
    currency TEXT DEFAULT 'BRL',
    
    weekly_hours NUMERIC(5, 2), -- Carga horária semanal
    start_date DATE NOT NULL,
    end_date DATE, -- Para contratos com prazo determinado (estágio, temp)
    
    benefits JSONB DEFAULT '{}'::jsonb, -- Armazenar Vales, Plano_Saude via JSON flexível
    
    is_active BOOLEAN DEFAULT true, -- Permite histórico guardando contratos antigos passivamente
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =========================================================================
-- INDEXES & PERFORMANCE
-- =========================================================================
CREATE INDEX IF NOT EXISTS idx_hr_dep_org ON public.hr_departments(organization_id);
CREATE INDEX IF NOT EXISTS idx_hr_jobs_org ON public.hr_jobs(organization_id);
CREATE INDEX IF NOT EXISTS idx_hr_emp_org ON public.hr_employees(organization_id);
CREATE INDEX IF NOT EXISTS idx_hr_emp_user ON public.hr_employees(user_id);
CREATE INDEX IF NOT EXISTS idx_hr_contr_emp ON public.hr_contracts(employee_id);

-- =========================================================================
-- REPLICANDO TRIGGERS UPDATED_AT
-- =========================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_hr_deps') THEN
        CREATE TRIGGER set_updated_at_hr_deps BEFORE UPDATE ON public.hr_departments FOR EACH ROW EXECUTE FUNCTION update_modified_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_hr_jobs') THEN
        CREATE TRIGGER set_updated_at_hr_jobs BEFORE UPDATE ON public.hr_jobs FOR EACH ROW EXECUTE FUNCTION update_modified_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_hr_emps') THEN
        CREATE TRIGGER set_updated_at_hr_emps BEFORE UPDATE ON public.hr_employees FOR EACH ROW EXECUTE FUNCTION update_modified_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_hr_contracts') THEN
        CREATE TRIGGER set_updated_at_hr_contracts BEFORE UPDATE ON public.hr_contracts FOR EACH ROW EXECUTE FUNCTION update_modified_column();
    END IF;
END $$;

-- =========================================================================
-- OPTIMIZED ROW LEVEL SECURITY (RLS) POLICIES
-- USING get_user_organization_id() from previous optimization
-- =========================================================================
ALTER TABLE public.hr_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_contracts ENABLE ROW LEVEL SECURITY;

-- 1. Departments Policy
CREATE POLICY "Users can view departments in their org" ON public.hr_departments FOR SELECT
    USING (organization_id = get_user_organization_id());
CREATE POLICY "Full access to departments for org members" ON public.hr_departments FOR ALL
    USING (organization_id = get_user_organization_id());

-- 2. Jobs Policy
CREATE POLICY "Users can view jobs in their org" ON public.hr_jobs FOR SELECT
    USING (organization_id = get_user_organization_id());
CREATE POLICY "Full access to jobs for org members" ON public.hr_jobs FOR ALL
    USING (organization_id = get_user_organization_id());

-- 3. Employees Policy (Everyone sees basic info like directory)
CREATE POLICY "Users can view employees in their org" ON public.hr_employees FOR SELECT
    USING (organization_id = get_user_organization_id());
CREATE POLICY "Full access to employees for org members" ON public.hr_employees FOR ALL
    USING (organization_id = get_user_organization_id());

-- 4. Contracts Policy (Sensitive: only users with role 'admin'/'manager' or the employee themselves)
-- Aqui assumimos uma checagem custom ou, para simplificar e isolar a org, liberamos para o org temporariamente,
-- mas é recomendado usar a role verificada globalmente.
CREATE POLICY "Contracts are isolated by org" ON public.hr_contracts FOR ALL
    USING (organization_id = get_user_organization_id());


-- FILE: 20260224100001_hr_time_tracking.sql
-- hr_time_tracking.sql
-- Descrição: Estrutura para Controle de Ponto Eletrônico e Férias (Adherente ao MTE)
-- Tabelas: hr_time_entries, hr_leave_requests

-- DROP TABLE IF EXISTS public.hr_leave_requests CASCADE;
-- DROP TABLE IF EXISTS public.hr_time_entries CASCADE;

-- 1. Time Entries (Ponto Eletrônico / Registro de Jornada)
-- Para adequação, o registro original não deve ser apagado.
CREATE TABLE IF NOT EXISTS public.hr_time_entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
    
    entry_type TEXT NOT NULL CHECK (entry_type IN ('clock_in', 'break_start', 'break_end', 'clock_out')),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Audit trail & Compliance MTE 671
    ip_address TEXT,
    user_agent TEXT,
    location_lat NUMERIC(10, 8),
    location_lng NUMERIC(11, 8),
    device_id TEXT, -- Para controle via app/web específico
    
    -- Ajustes (Caso o funcionário esqueça de bater e o RH arrume)
    is_manual_adjustment BOOLEAN DEFAULT false,
    adjustment_reason TEXT,
    approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Leave Requests (Afastamentos, Férias, Atestados)
CREATE TABLE IF NOT EXISTS public.hr_leave_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
    
    leave_type TEXT NOT NULL CHECK (leave_type IN ('vacation', 'sick', 'maternity', 'paternity', 'bereavement', 'unpaid', 'other')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    
    reason TEXT,
    attachment_url TEXT, -- Link do Storage para PDF/Foto de Atestado Médico
    
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =========================================================================
-- INDEXES & PERFORMANCE
-- =========================================================================
CREATE INDEX IF NOT EXISTS idx_hr_time_org ON public.hr_time_entries(organization_id);
CREATE INDEX IF NOT EXISTS idx_hr_time_emp ON public.hr_time_entries(employee_id);
CREATE INDEX IF NOT EXISTS idx_hr_time_stamp ON public.hr_time_entries(timestamp);

CREATE INDEX IF NOT EXISTS idx_hr_leave_org ON public.hr_leave_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_hr_leave_emp ON public.hr_leave_requests(employee_id);

-- =========================================================================
-- REPLICANDO TRIGGERS UPDATED_AT
-- =========================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_hr_leaves') THEN
        CREATE TRIGGER set_updated_at_hr_leaves BEFORE UPDATE ON public.hr_leave_requests FOR EACH ROW EXECUTE FUNCTION update_modified_column();
    END IF;
END $$;

-- =========================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =========================================================================
ALTER TABLE public.hr_time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_leave_requests ENABLE ROW LEVEL SECURITY;

-- 1. Time Entries
-- Everyone can insert their own time entries.
CREATE POLICY "Users can insert their own time entries" ON public.hr_time_entries FOR INSERT
    WITH CHECK (organization_id = get_user_organization_id());

-- Users can only view time entries of their org
CREATE POLICY "Users can view time entries in org" ON public.hr_time_entries FOR SELECT
    USING (organization_id = get_user_organization_id());

-- Updates/Deletes ONLY by admins/HR (handled by App logic, but global isolate here)
CREATE POLICY "Updates allowed by org members" ON public.hr_time_entries FOR UPDATE
    USING (organization_id = get_user_organization_id());


-- 2. Leave Requests
CREATE POLICY "Users can insert leave requests" ON public.hr_leave_requests FOR INSERT
    WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can view leave requests in org" ON public.hr_leave_requests FOR SELECT
    USING (organization_id = get_user_organization_id());
    
CREATE POLICY "Updates allowed by org members" ON public.hr_leave_requests FOR UPDATE
    USING (organization_id = get_user_organization_id());


-- FILE: 20260224100002_hr_recruitment_performance.sql
-- hr_recruitment_performance.sql
-- Descrição: Estrutura para Recrutamento (ATS) e Avaliação de Desempenho (360)
-- Tabelas: hr_job_postings, hr_candidates, hr_performance_cycles, hr_performance_reviews

-- DROP TABLE IF EXISTS public.hr_performance_reviews CASCADE;
-- DROP TABLE IF EXISTS public.hr_performance_cycles CASCADE;
-- DROP TABLE IF EXISTS public.hr_candidates CASCADE;
-- DROP TABLE IF EXISTS public.hr_job_postings CASCADE;

-- 1. Job Postings (Vagas/Recrutamento ATS)
CREATE TABLE IF NOT EXISTS public.hr_job_postings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    department_id UUID REFERENCES public.hr_departments(id) ON DELETE SET NULL,
    
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    requirements TEXT,
    benefits TEXT,
    location TEXT,
    work_model TEXT CHECK (work_model IN ('onsite', 'remote', 'hybrid')),
    
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'closed', 'cancelled')),
    open_date DATE,
    close_date DATE,
    
    salary_range_min NUMERIC(15, 2),
    salary_range_max NUMERIC(15, 2),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Candidates (Funil Kanban de Recrutamento)
CREATE TABLE IF NOT EXISTS public.hr_candidates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    job_posting_id UUID REFERENCES public.hr_job_postings(id) ON DELETE CASCADE,
    
    -- Candidate Info
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    linkedin_url TEXT,
    portfolio_url TEXT,
    resume_url TEXT, -- Link do Storage Supabase
    
    -- ATS Pipeline Status
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'screening', 'interview', 'offer', 'hired', 'rejected', 'withdrawn')),
    applied_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    feedback TEXT, -- Notas internas dos recrutadores
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Performance Cycles (Ciclos de Avaliação)
CREATE TABLE IF NOT EXISTS public.hr_performance_cycles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    
    name TEXT NOT NULL, -- ex: "Avaliação Q3 2026"
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed')),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Performance Reviews (A Avaliação propriamente dita)
CREATE TABLE IF NOT EXISTS public.hr_performance_reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    cycle_id UUID NOT NULL REFERENCES public.hr_performance_cycles(id) ON DELETE CASCADE,
    
    employee_id UUID NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
    reviewer_id UUID REFERENCES public.hr_employees(id) ON DELETE SET NULL,
    
    review_type TEXT NOT NULL CHECK (review_type IN ('self', 'manager', 'peer', 'subordinate')),
    
    -- Metricas quantitativas (1 a 5, por exemplo)
    score_goals NUMERIC(3, 1),
    score_values NUMERIC(3, 1),
    score_overall NUMERIC(3, 1),
    
    -- Qualitativo
    strengths TEXT,
    improvements TEXT,
    comments TEXT,
    
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'acknowledged')),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =========================================================================
-- INDEXES & PERFORMANCE
-- =========================================================================
CREATE INDEX IF NOT EXISTS idx_hr_jobposts_org ON public.hr_job_postings(organization_id);
CREATE INDEX IF NOT EXISTS idx_hr_cand_org ON public.hr_candidates(organization_id);
CREATE INDEX IF NOT EXISTS idx_hr_cand_job ON public.hr_candidates(job_posting_id);
CREATE INDEX IF NOT EXISTS idx_hr_pcycles_org ON public.hr_performance_cycles(organization_id);
CREATE INDEX IF NOT EXISTS idx_hr_pfc_org ON public.hr_performance_reviews(organization_id);
CREATE INDEX IF NOT EXISTS idx_hr_pfc_cycle ON public.hr_performance_reviews(cycle_id);
CREATE INDEX IF NOT EXISTS idx_hr_pfc_emp ON public.hr_performance_reviews(employee_id);

-- =========================================================================
-- REPLICANDO TRIGGERS UPDATED_AT
-- =========================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_hr_jobpostings') THEN
        CREATE TRIGGER set_updated_at_hr_jobpostings BEFORE UPDATE ON public.hr_job_postings FOR EACH ROW EXECUTE FUNCTION update_modified_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_hr_candidates') THEN
        CREATE TRIGGER set_updated_at_hr_candidates BEFORE UPDATE ON public.hr_candidates FOR EACH ROW EXECUTE FUNCTION update_modified_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_hr_pfcycles') THEN
        CREATE TRIGGER set_updated_at_hr_pfcycles BEFORE UPDATE ON public.hr_performance_cycles FOR EACH ROW EXECUTE FUNCTION update_modified_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_hr_pfreviews') THEN
        CREATE TRIGGER set_updated_at_hr_pfreviews BEFORE UPDATE ON public.hr_performance_reviews FOR EACH ROW EXECUTE FUNCTION update_modified_column();
    END IF;
END $$;

-- =========================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =========================================================================
ALTER TABLE public.hr_job_postings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_performance_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_performance_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Full access to job postings for org members" ON public.hr_job_postings FOR ALL USING (organization_id = get_user_organization_id());
CREATE POLICY "Full access to candidates for org members" ON public.hr_candidates FOR ALL USING (organization_id = get_user_organization_id());
CREATE POLICY "Full access to performance cycles for org members" ON public.hr_performance_cycles FOR ALL USING (organization_id = get_user_organization_id());
CREATE POLICY "Full access to performance reviews for org members" ON public.hr_performance_reviews FOR ALL USING (organization_id = get_user_organization_id());


-- FILE: 20260224100003_hr_refined_rls_policies.sql
-- ============================================================
-- Migration: HR Refined RLS Policies (Role-Based)
-- Restricts sensitive HR data (salary, CPF, contracts) to admin/manager roles
-- ============================================================

-- ─── Helper: check if current user is admin or manager ──────
CREATE OR REPLACE FUNCTION public.is_hr_admin_or_manager()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND organization_id = get_user_organization_id()
      AND role IN ('admin', 'manager')
  );
$$;

-- ─── Drop overly-permissive "full access" policies on sensitive tables ──

-- hr_employees: remove old full-access and replace with role-differentiated
DROP POLICY IF EXISTS "Full access to employees for org members" ON public.hr_employees;

-- Replace with: SELECT visible to all org members, but INSERT/UPDATE/DELETE restricted to admin/manager
CREATE POLICY "Admins/managers can manage employees"
  ON public.hr_employees FOR ALL
  USING (
    organization_id = get_user_organization_id()
    AND is_hr_admin_or_manager()
  )
  WITH CHECK (
    organization_id = get_user_organization_id()
    AND is_hr_admin_or_manager()
  );

-- hr_contracts: restrict fully to admin/manager
DROP POLICY IF EXISTS "Contracts are isolated by org" ON public.hr_contracts;

CREATE POLICY "Admins/managers can view contracts"
  ON public.hr_contracts FOR SELECT
  USING (
    organization_id = get_user_organization_id()
    AND is_hr_admin_or_manager()
  );

CREATE POLICY "Admins/managers can manage contracts"
  ON public.hr_contracts FOR ALL
  USING (
    organization_id = get_user_organization_id()
    AND is_hr_admin_or_manager()
  )
  WITH CHECK (
    organization_id = get_user_organization_id()
    AND is_hr_admin_or_manager()
  );

-- hr_departments: keep org-level SELECT but restrict mutations to admin/manager
DROP POLICY IF EXISTS "Full access to departments for org members" ON public.hr_departments;

CREATE POLICY "Admins/managers can manage departments"
  ON public.hr_departments FOR ALL
  USING (
    organization_id = get_user_organization_id()
    AND is_hr_admin_or_manager()
  )
  WITH CHECK (
    organization_id = get_user_organization_id()
    AND is_hr_admin_or_manager()
  );

-- hr_jobs: keep org-level SELECT but restrict mutations to admin/manager
DROP POLICY IF EXISTS "Full access to jobs for org members" ON public.hr_jobs;

CREATE POLICY "Admins/managers can manage jobs"
  ON public.hr_jobs FOR ALL
  USING (
    organization_id = get_user_organization_id()
    AND is_hr_admin_or_manager()
  )
  WITH CHECK (
    organization_id = get_user_organization_id()
    AND is_hr_admin_or_manager()
  );

-- hr_performance_reviews: managers can see all; users can only see their own reviews
DROP POLICY IF EXISTS "Full access to performance reviews for org members" ON public.hr_performance_reviews;

CREATE POLICY "Admins/managers can manage performance reviews"
  ON public.hr_performance_reviews FOR ALL
  USING (
    organization_id = get_user_organization_id()
    AND is_hr_admin_or_manager()
  )
  WITH CHECK (
    organization_id = get_user_organization_id()
    AND is_hr_admin_or_manager()
  );

CREATE POLICY "Employees can view their own reviews"
  ON public.hr_performance_reviews FOR SELECT
  USING (
    organization_id = get_user_organization_id()
    AND employee_id IN (
      SELECT id FROM public.hr_employees WHERE user_id = auth.uid()
    )
  );

-- ─── Column-level security via Views (salary masking for non-admins) ────
-- Create a secure view that masks salary for non-admin users

CREATE OR REPLACE VIEW public.hr_employees_safe AS
SELECT
  id,
  organization_id,
  user_id,
  full_name,
  social_name,
  email,
  phone,
  department_id,
  job_id,
  manager_id,
  hire_date,
  status,
  employment_type,
  work_shift,
  CASE WHEN is_hr_admin_or_manager() THEN cpf ELSE '***.***.***-**' END AS cpf,
  CASE WHEN is_hr_admin_or_manager() THEN rg ELSE '**.**' END AS rg,
  CASE WHEN is_hr_admin_or_manager() THEN pis_pasep ELSE '***' END AS pis_pasep,
  CASE WHEN is_hr_admin_or_manager() THEN ctps_number ELSE '***' END AS ctps_number,
  CASE WHEN is_hr_admin_or_manager() THEN ctps_series ELSE '***' END AS ctps_series,
  CASE WHEN is_hr_admin_or_manager() THEN bank_name ELSE NULL END AS bank_name,
  CASE WHEN is_hr_admin_or_manager() THEN bank_agency ELSE NULL END AS bank_agency,
  CASE WHEN is_hr_admin_or_manager() THEN bank_account ELSE NULL END AS bank_account,
  CASE WHEN is_hr_admin_or_manager() THEN bank_pix_key ELSE NULL END AS bank_pix_key,
  created_at,
  updated_at
FROM public.hr_employees;

COMMENT ON VIEW public.hr_employees_safe IS 'Secure view that masks sensitive fields (CPF, RG, banking info) for non-admin/manager users';


-- FILE: 20260224100004_universal_audit_logs.sql
-- ============================================================
-- Migration: Universal Audit Logs
-- Automatic trigger for tracking all INSERT/UPDATE/DELETE operations
-- on master data tables across the entire ERP
-- ============================================================

-- ─── Audit Logs Table ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    table_name      TEXT NOT NULL,
    record_id       TEXT NOT NULL,
    action          TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_data        JSONB,
    new_data        JSONB,
    changed_fields  TEXT[],
    user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    ip_address      INET,
    user_agent      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_org ON public.audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table ON public.audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_record ON public.audit_logs(record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);

-- RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit logs" ON public.audit_logs FOR SELECT
  USING (
    organization_id = get_user_organization_id()
    AND is_hr_admin_or_manager()
  );

-- ─── Universal Audit Trigger Function ────────────────────────
CREATE OR REPLACE FUNCTION public.fn_audit_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _org_id UUID;
    _record_id TEXT;
    _old_data JSONB;
    _new_data JSONB;
    _changed TEXT[];
    _key TEXT;
BEGIN
    -- Extract organization_id from the row (most tables have it)
    IF TG_OP = 'DELETE' THEN
        _org_id := COALESCE(OLD.organization_id, NULL);
        _record_id := OLD.id::TEXT;
        _old_data := to_jsonb(OLD);
        _new_data := NULL;
    ELSIF TG_OP = 'INSERT' THEN
        _org_id := COALESCE(NEW.organization_id, NULL);
        _record_id := NEW.id::TEXT;
        _old_data := NULL;
        _new_data := to_jsonb(NEW);
    ELSIF TG_OP = 'UPDATE' THEN
        _org_id := COALESCE(NEW.organization_id, OLD.organization_id, NULL);
        _record_id := NEW.id::TEXT;
        _old_data := to_jsonb(OLD);
        _new_data := to_jsonb(NEW);

        -- Detect which fields actually changed
        FOR _key IN SELECT jsonb_object_keys(_new_data)
        LOOP
            IF _old_data->_key IS DISTINCT FROM _new_data->_key THEN
                _changed := array_append(_changed, _key);
            END IF;
        END LOOP;
    END IF;

    INSERT INTO public.audit_logs (
        organization_id, table_name, record_id, action,
        old_data, new_data, changed_fields, user_id
    ) VALUES (
        _org_id, TG_TABLE_NAME, _record_id, TG_OP,
        _old_data, _new_data, _changed, auth.uid()
    );

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$;

-- ─── Attach Audit Trigger to All Key Tables ──────────────────

-- HR Module
CREATE TRIGGER audit_hr_employees AFTER INSERT OR UPDATE OR DELETE ON public.hr_employees
    FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

CREATE TRIGGER audit_hr_contracts AFTER INSERT OR UPDATE OR DELETE ON public.hr_contracts
    FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

CREATE TRIGGER audit_hr_departments AFTER INSERT OR UPDATE OR DELETE ON public.hr_departments
    FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

CREATE TRIGGER audit_hr_jobs AFTER INSERT OR UPDATE OR DELETE ON public.hr_jobs
    FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

CREATE TRIGGER audit_hr_time_entries AFTER INSERT OR UPDATE OR DELETE ON public.hr_time_entries
    FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

CREATE TRIGGER audit_hr_leave_requests AFTER INSERT OR UPDATE OR DELETE ON public.hr_leave_requests
    FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

CREATE TRIGGER audit_hr_job_postings AFTER INSERT OR UPDATE OR DELETE ON public.hr_job_postings
    FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

CREATE TRIGGER audit_hr_candidates AFTER INSERT OR UPDATE OR DELETE ON public.hr_candidates
    FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

CREATE TRIGGER audit_hr_performance_reviews AFTER INSERT OR UPDATE OR DELETE ON public.hr_performance_reviews
    FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

-- Core ERP Tables
CREATE TRIGGER audit_clients AFTER INSERT OR UPDATE OR DELETE ON public.clients
    FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

CREATE TRIGGER audit_processos AFTER INSERT OR UPDATE OR DELETE ON public.processos_juridicos
    FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

CREATE TRIGGER audit_contas_receber AFTER INSERT OR UPDATE OR DELETE ON public.contas_receber
    FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

CREATE TRIGGER audit_contas_pagar AFTER INSERT OR UPDATE OR DELETE ON public.contas_pagar
    FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

CREATE TRIGGER audit_organizations AFTER INSERT OR UPDATE OR DELETE ON public.organizations
    FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

CREATE TRIGGER audit_profiles AFTER INSERT OR UPDATE OR DELETE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

COMMENT ON TABLE public.audit_logs IS 'Universal audit log tracking all INSERT, UPDATE, DELETE operations on master data tables';
COMMENT ON FUNCTION public.fn_audit_trigger IS 'Trigger function that automatically records data changes with old/new values and changed fields';


-- FILE: 20260224100005_agenda_status.sql
-- Add status and completion tracking to agenda events
-- Enables real BI metrics for "Deadlines Met"

ALTER TABLE public.eventos_agenda 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'concluido', 'cancelado')),
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Index for BI queries
CREATE INDEX IF NOT EXISTS idx_eventos_status ON public.eventos_agenda(status, organization_id);
CREATE INDEX IF NOT EXISTS idx_eventos_category ON public.eventos_agenda(category, organization_id);


-- FILE: 20260224113334_master_user_setup.sql
-- Migration: Create Master User
-- Email: lexagestaojuridica@gmail.com
-- Password: lexatracomino03

DO $$
DECLARE
    v_user_id UUID := gen_random_uuid();
    v_org_id UUID := gen_random_uuid();
    v_role_id UUID;
BEGIN
    -- 1. Check if user already exists
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'lexagestaojuridica@gmail.com') THEN
        
        -- 2. Insert into auth.users (Supabase Auth)
        -- We use extensions.crypt to hash the password
        INSERT INTO auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            last_sign_in_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at,
            confirmation_token,
            email_change,
            email_change_token_new,
            recovery_token
        ) VALUES (
            '00000000-0000-0000-0000-000000000000',
            v_user_id,
            'authenticated',
            'authenticated',
            'lexagestaojuridica@gmail.com',
            extensions.crypt('lexatracomino03', extensions.gen_salt('bf')),
            now(),
            now(),
            '{"provider":"email","providers":["email"]}',
            '{"full_name":"Master Lexa"}',
            now(),
            now(),
            '',
            '',
            '',
            ''
        );

        -- 3. Insert Identity
        INSERT INTO auth.identities (
            id,
            user_id,
            identity_data,
            provider,
            last_sign_in_at,
            created_at,
            updated_at
        ) VALUES (
            gen_random_uuid(),
            v_user_id,
            format('{"sub":"%s","email":"lexagestaojuridica@gmail.com"}', v_user_id)::jsonb,
            'email',
            now(),
            now(),
            now()
        );

        -- 4. Create Organization
        INSERT INTO public.organizations (id, name)
        VALUES (v_org_id, 'Lexa Gestão Master');

        -- 5. Link Profile to Org (Profile is auto-created by trigger handle_new_user)
        -- We wait a bit or just update it
        UPDATE public.profiles
        SET organization_id = v_org_id,
            full_name = 'Master Lexa'
        WHERE user_id = v_user_id;

        -- 6. Get the 'Sócio Administrador' custom_role_id (created by trigger trg_seed_org_roles)
        SELECT id INTO v_role_id 
        FROM public.custom_roles 
        WHERE organization_id = v_org_id AND name = 'Sócio Administrador' 
        LIMIT 1;

        UPDATE public.profiles
        SET custom_role_id = v_role_id
        WHERE user_id = v_user_id;

        -- 7. Add to legacy user_roles table for compatibility
        INSERT INTO public.user_roles (user_id, organization_id, role)
        VALUES (v_user_id, v_org_id, 'admin');

        RAISE NOTICE 'Master user created successfully.';
    ELSE
        RAISE NOTICE 'User already exists, skipping creation.';
    END IF;
END $$;



