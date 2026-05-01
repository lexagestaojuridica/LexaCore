-- Fix for Universal Audit Trigger Function
-- Correctly handles the 'organizations' table by using 'id' instead of 'organization_id'

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
