-- Migration: Restore RLS Policies after Clerk Standardization
-- The clerk_id_standardization migration dropped ALL policies and replaced them
-- with Clerk JWT-based policies. This project uses Supabase Auth, not Clerk.
-- This migration restores correct policies using auth.uid() and profiles lookup.

-- Helper: get current user's organization_id from profiles (TEXT type after standardization)
CREATE OR REPLACE FUNCTION public.get_user_org_id()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM public.profiles WHERE user_id = (auth.jwt() ->> 'sub') LIMIT 1;
$$;

-- ─── organizations ────────────────────────────────────────────
DROP POLICY IF EXISTS "Members can read own organization" ON public.organizations;
DROP POLICY IF EXISTS "Users can read their organization" ON public.organizations;
CREATE POLICY "Users can read their organization" ON public.organizations
  FOR SELECT USING (id = get_user_org_id());

-- ─── profiles ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can read their own profile" ON public.profiles;
CREATE POLICY "Users can read their own profile" ON public.profiles
  FOR SELECT USING (user_id = (auth.jwt() ->> 'sub'));

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (user_id = (auth.jwt() ->> 'sub'));

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (user_id = (auth.jwt() ->> 'sub'));

-- ─── clients ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "Members manage clients" ON public.clients;
CREATE POLICY "Members manage clients" ON public.clients
  FOR ALL USING (organization_id = get_user_org_id());

-- ─── processos_juridicos ──────────────────────────────────────
DROP POLICY IF EXISTS "Members manage processes" ON public.processos_juridicos;
CREATE POLICY "Members manage processes" ON public.processos_juridicos
  FOR ALL USING (organization_id = get_user_org_id());

-- ─── timesheet_entries ────────────────────────────────────────
DROP POLICY IF EXISTS "Users manage their own timesheet" ON public.timesheet_entries;
CREATE POLICY "Users manage their own timesheet" ON public.timesheet_entries
  FOR ALL USING (organization_id = get_user_org_id());

-- ─── contas_receber ───────────────────────────────────────────
DROP POLICY IF EXISTS "Members manage contas_receber" ON public.contas_receber;
CREATE POLICY "Members manage contas_receber" ON public.contas_receber
  FOR ALL USING (organization_id = get_user_org_id());

-- ─── contas_pagar ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Members manage contas_pagar" ON public.contas_pagar;
CREATE POLICY "Members manage contas_pagar" ON public.contas_pagar
  FOR ALL USING (organization_id = get_user_org_id());

-- ─── eventos_agenda ───────────────────────────────────────────
DROP POLICY IF EXISTS "Members manage agenda" ON public.eventos_agenda;
CREATE POLICY "Members manage agenda" ON public.eventos_agenda
  FOR ALL USING (organization_id = get_user_org_id());

-- ─── documentos ───────────────────────────────────────────────
DROP POLICY IF EXISTS "Members manage documentos" ON public.documentos;
CREATE POLICY "Members manage documentos" ON public.documentos
  FOR ALL USING (organization_id = get_user_org_id());

-- ─── user_roles ───────────────────────────────────────────────
DROP POLICY IF EXISTS "Members can view user_roles" ON public.user_roles;
CREATE POLICY "Members can view user_roles" ON public.user_roles
  FOR SELECT USING (organization_id = get_user_org_id());

-- ─── google_calendar_tokens ───────────────────────────────────
DROP POLICY IF EXISTS "Users manage own google tokens" ON public.google_calendar_tokens;
CREATE POLICY "Users manage own google tokens" ON public.google_calendar_tokens
  FOR ALL USING (user_id = (auth.jwt() ->> 'sub'));

-- ─── microsoft_calendar_tokens ────────────────────────────────
DROP POLICY IF EXISTS "Users manage own microsoft tokens" ON public.microsoft_calendar_tokens;
CREATE POLICY "Users manage own microsoft tokens" ON public.microsoft_calendar_tokens
  FOR ALL USING (user_id = (auth.jwt() ->> 'sub'));

-- ─── apple_calendar_tokens ────────────────────────────────────
DROP POLICY IF EXISTS "Users manage own apple tokens" ON public.apple_calendar_tokens;
CREATE POLICY "Users manage own apple tokens" ON public.apple_calendar_tokens
  FOR ALL USING (user_id = (auth.jwt() ->> 'sub'));

-- ─── custom_roles ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Members view custom_roles" ON public.custom_roles;
CREATE POLICY "Members view custom_roles" ON public.custom_roles
  FOR SELECT USING (organization_id = get_user_org_id());

-- ─── audit_logs ───────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view audit logs" ON public.audit_logs
  FOR SELECT USING (organization_id = get_user_org_id());

-- ─── document_embeddings ──────────────────────────────────────
DROP POLICY IF EXISTS "Usuários veem vetores da sua própria organização" ON public.document_embeddings;
CREATE POLICY "Usuários veem vetores da sua própria organização" ON public.document_embeddings
  FOR SELECT USING (organization_id = get_user_org_id());

-- ─── orcamentos ───────────────────────────────────────────────
DROP POLICY IF EXISTS "read_orcamentos" ON public.orcamentos;
DROP POLICY IF EXISTS "manage_orcamentos" ON public.orcamentos;
CREATE POLICY "read_orcamentos" ON public.orcamentos
  FOR SELECT USING (organization_id = get_user_org_id());
CREATE POLICY "manage_orcamentos" ON public.orcamentos
  FOR ALL USING (organization_id = get_user_org_id());
