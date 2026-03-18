-- Migration: Clerk ID Standardization (v3.5)
-- Created: 2026-03-18
-- Description: Converts all user_id and organization_id columns to text and rebuilds RLS using auth.jwt().

BEGIN;

-- 1. Drop Triggers & Policies
DO $$ DECLARE r RECORD; BEGIN
    FOR r IN (SELECT trigger_name, event_object_table FROM information_schema.triggers WHERE event_object_schema = 'public') 
    LOOP EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', r.trigger_name, r.event_object_table); END LOOP;
    FOR r IN (SELECT policyname, tablename, schemaname FROM pg_policies WHERE schemaname IN ('public', 'storage')) 
    LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename); END LOOP;
END $$;

-- 2. Drop Foreign Keys (Public)
DO $$ DECLARE r RECORD; BEGIN
    FOR r IN (SELECT tc.constraint_name, tc.table_name FROM information_schema.table_constraints AS tc JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public' AND (kcu.column_name IN ('user_id', 'organization_id', 'created_by', 'responsible_user_id', 'manager_id'))) 
    LOOP EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I', r.table_name, r.constraint_name); END LOOP;
END $$;

-- 3. Alter Column Types
ALTER TABLE public.organizations ALTER COLUMN id TYPE text USING id::text;
ALTER TABLE public.profiles ALTER COLUMN user_id TYPE text;
ALTER TABLE public.profiles ALTER COLUMN organization_id TYPE text;

DO $$ DECLARE r RECORD; BEGIN
    FOR r IN (SELECT table_name, column_name FROM information_schema.columns WHERE column_name IN ('user_id', 'organization_id', 'created_by', 'responsible_user_id', 'manager_id') AND table_schema = 'public' AND data_type = 'uuid') 
    LOOP EXECUTE format('ALTER TABLE public.%I ALTER COLUMN %I TYPE text', r.table_name, r.column_name); END LOOP;
END $$;

-- 4. Restore Core Policies (Clerk-Ready)
CREATE POLICY "Members can read own organization" ON public.organizations FOR SELECT USING (id = (auth.jwt()->>'org_id'));
CREATE POLICY "Users can read their own profile" ON public.profiles FOR SELECT USING (user_id = (auth.jwt()->>'sub'));
CREATE POLICY "Users manage their own timesheet" ON public.timesheet_entries FOR ALL USING (organization_id = (auth.jwt()->>'org_id'));
CREATE POLICY "Members manage clients" ON public.clientes FOR ALL USING (organization_id = (auth.jwt()->>'org_id'));
CREATE POLICY "Members manage processes" ON public.processos_juridicos FOR ALL USING (organization_id = (auth.jwt()->>'org_id'));

COMMIT;
