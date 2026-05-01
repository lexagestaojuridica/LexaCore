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
    -- If we are auditing the organizations table itself, the 'id' is the organization_id
    IF TG_TABLE_NAME = 'organizations' THEN
        IF TG_OP = 'DELETE' THEN
            _org_id := OLD.id;
            _record_id := OLD.id::TEXT;
            _old_data := to_jsonb(OLD);
            _new_data := NULL;
        ELSIF TG_OP = 'INSERT' THEN
            _org_id := NEW.id;
            _record_id := NEW.id::TEXT;
            _old_data := NULL;
            _new_data := to_jsonb(NEW);
        ELSIF TG_OP = 'UPDATE' THEN
            _org_id := NEW.id;
            _record_id := NEW.id::TEXT;
            _old_data := to_jsonb(OLD);
            _new_data := to_jsonb(NEW);
        END IF;
    ELSE
        -- Standard logic for tables with organization_id
        IF TG_OP = 'DELETE' THEN
            _org_id := (to_jsonb(OLD)->>'organization_id')::UUID;
            _record_id := OLD.id::TEXT;
            _old_data := to_jsonb(OLD);
            _new_data := NULL;
        ELSIF TG_OP = 'INSERT' THEN
            _org_id := (to_jsonb(NEW)->>'organization_id')::UUID;
            _record_id := NEW.id::TEXT;
            _old_data := NULL;
            _new_data := to_jsonb(NEW);
        ELSIF TG_OP = 'UPDATE' THEN
            _org_id := (to_jsonb(NEW)->>'organization_id')::UUID;
            _record_id := NEW.id::TEXT;
            _old_data := to_jsonb(OLD);
            _new_data := to_jsonb(NEW);
        END IF;
    END IF;

    -- For UPDATE, detect which fields actually changed
    IF TG_OP = 'UPDATE' THEN
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
