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
