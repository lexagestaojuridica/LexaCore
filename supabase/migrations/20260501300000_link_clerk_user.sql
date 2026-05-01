-- Link Clerk User ID to Master Profile
-- Updating the existing master profile to use the actual Clerk User ID found in logs

UPDATE public.profiles
SET user_id = 'user_3AgIeqQ4KZLup7dAK15lC7FPGvu'
WHERE full_name = 'Master Lexa' OR user_id = 'd60d2651-3d8c-4d7a-bc56-39161592243a';

-- Ensure user_roles is also updated if it exists
UPDATE public.user_roles
SET user_id = 'user_3AgIeqQ4KZLup7dAK15lC7FPGvu'
WHERE user_id = 'd60d2651-3d8c-4d7a-bc56-39161592243a';
