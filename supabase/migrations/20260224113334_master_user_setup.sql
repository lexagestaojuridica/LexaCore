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
