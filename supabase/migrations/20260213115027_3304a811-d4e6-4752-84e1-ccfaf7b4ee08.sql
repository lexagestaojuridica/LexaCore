
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
