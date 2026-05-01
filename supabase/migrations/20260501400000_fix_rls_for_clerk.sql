-- Fix RLS for Clerk Authentication
-- Re-defining get_user_org_id to use auth.jwt() -> 'sub' which is where Clerk ID resides
-- Also updating core table policies to use this instead of auth.uid()

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
