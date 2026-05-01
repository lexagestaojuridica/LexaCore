-- Sync Clerk IDs with Database
-- This migration updates the master organization and profile to match the actual Clerk IDs

-- 1. Update Organization
-- We use a DO block to handle potential existing record
DO $$
BEGIN
    UPDATE public.organizations
    SET id = 'org_3AoGeqmzo2Gzcw9u8QJp3ZxlcY7'
    WHERE name = 'Lexa Gestão Master' OR id = 'f5ca7592-fea5-4aba-b34b-e5988b5b1436';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Organization update skipped or failed';
END $$;

-- 2. Update Profile
UPDATE public.profiles
SET 
    user_id = 'user_3AgIeqQ4KZLup7dAK15lC7FPGvu',
    organization_id = 'org_3AoGeqmzo2Gzcw9u8QJp3ZxlcY7'
WHERE full_name = 'Master Lexa' OR user_id = 'user_3AgIeqQ4KZLup7dAK15lC7FPGvu';

-- 3. Cleanup user_roles (optional but good for consistency)
DELETE FROM public.user_roles WHERE user_id = 'user_3AgIeqQ4KZLup7dAK15lC7FPGvu' AND organization_id = 'org_3AoGeqmzo2Gzcw9u8QJp3ZxlcY7';
INSERT INTO public.user_roles (user_id, organization_id, role)
VALUES ('user_3AgIeqQ4KZLup7dAK15lC7FPGvu', 'org_3AoGeqmzo2Gzcw9u8QJp3ZxlcY7', 'admin');
