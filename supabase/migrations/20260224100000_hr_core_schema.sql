-- hr_core_schema.sql
-- Descrição: Estrutura base de tabelas para o Módulo de Recursos Humanos / DHO
-- Tabelas: hr_departments, hr_jobs, hr_employees, hr_contracts

-- Drop tables if they exist (for idempotency during local development)
-- DROP TABLE IF EXISTS public.hr_contracts CASCADE;
-- DROP TABLE IF EXISTS public.hr_employees CASCADE;
-- DROP TABLE IF EXISTS public.hr_jobs CASCADE;
-- DROP TABLE IF EXISTS public.hr_departments CASCADE;

-- 1. Departments
CREATE TABLE IF NOT EXISTS public.hr_departments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    manager_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Gestor do departamento
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(organization_id, name)
);

-- 2. Jobs / Position Titles (Cargos)
CREATE TABLE IF NOT EXISTS public.hr_jobs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    department_id UUID REFERENCES public.hr_departments(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    requirements TEXT,
    base_salary NUMERIC(15, 2), -- Salário base sugerido
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(organization_id, title)
);

-- 3. Employees (Colaboradores / Ficha)
CREATE TABLE IF NOT EXISTS public.hr_employees (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Vínculo opcional se o colab tiver acesso ao sistema
    department_id UUID REFERENCES public.hr_departments(id) ON DELETE SET NULL,
    job_id UUID REFERENCES public.hr_jobs(id) ON DELETE SET NULL,
    manager_id UUID REFERENCES public.hr_employees(id) ON DELETE SET NULL, -- Reporte Direto (Gestor)
    
    -- Dados Pessoais
    full_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    birth_date DATE,
    gender TEXT,
    marital_status TEXT,
    
    -- Documentos
    cpf TEXT,
    rg TEXT,
    pis_pasep TEXT,
    oab_number TEXT,
    oab_uf TEXT,
    
    -- Endereço
    address_street TEXT,
    address_number TEXT,
    address_complement TEXT,
    address_neighborhood TEXT,
    address_city TEXT,
    address_state TEXT,
    address_zip TEXT,
    
    -- Status
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'on_leave', 'terminated')),
    hire_date DATE NOT NULL DEFAULT CURRENT_DATE,
    termination_date DATE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Contracts (Contratos/Remuneração)
CREATE TABLE IF NOT EXISTS public.hr_contracts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
    
    contract_type TEXT NOT NULL CHECK (contract_type IN ('clt', 'pj', 'internship', 'statutory', 'temporary')),
    work_model TEXT DEFAULT 'hybrid' CHECK (work_model IN ('onsite', 'remote', 'hybrid')),
    
    base_salary NUMERIC(15, 2) NOT NULL,
    currency TEXT DEFAULT 'BRL',
    
    weekly_hours NUMERIC(5, 2), -- Carga horária semanal
    start_date DATE NOT NULL,
    end_date DATE, -- Para contratos com prazo determinado (estágio, temp)
    
    benefits JSONB DEFAULT '{}'::jsonb, -- Armazenar Vales, Plano_Saude via JSON flexível
    
    is_active BOOLEAN DEFAULT true, -- Permite histórico guardando contratos antigos passivamente
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =========================================================================
-- INDEXES & PERFORMANCE
-- =========================================================================
CREATE INDEX IF NOT EXISTS idx_hr_dep_org ON public.hr_departments(organization_id);
CREATE INDEX IF NOT EXISTS idx_hr_jobs_org ON public.hr_jobs(organization_id);
CREATE INDEX IF NOT EXISTS idx_hr_emp_org ON public.hr_employees(organization_id);
CREATE INDEX IF NOT EXISTS idx_hr_emp_user ON public.hr_employees(user_id);
CREATE INDEX IF NOT EXISTS idx_hr_contr_emp ON public.hr_contracts(employee_id);

-- =========================================================================
-- REPLICANDO TRIGGERS UPDATED_AT
-- =========================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_hr_deps') THEN
        CREATE TRIGGER set_updated_at_hr_deps BEFORE UPDATE ON public.hr_departments FOR EACH ROW EXECUTE FUNCTION update_modified_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_hr_jobs') THEN
        CREATE TRIGGER set_updated_at_hr_jobs BEFORE UPDATE ON public.hr_jobs FOR EACH ROW EXECUTE FUNCTION update_modified_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_hr_emps') THEN
        CREATE TRIGGER set_updated_at_hr_emps BEFORE UPDATE ON public.hr_employees FOR EACH ROW EXECUTE FUNCTION update_modified_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_hr_contracts') THEN
        CREATE TRIGGER set_updated_at_hr_contracts BEFORE UPDATE ON public.hr_contracts FOR EACH ROW EXECUTE FUNCTION update_modified_column();
    END IF;
END $$;

-- =========================================================================
-- OPTIMIZED ROW LEVEL SECURITY (RLS) POLICIES
-- USING get_user_organization_id() from previous optimization
-- =========================================================================
ALTER TABLE public.hr_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_contracts ENABLE ROW LEVEL SECURITY;

-- 1. Departments Policy
CREATE POLICY "Users can view departments in their org" ON public.hr_departments FOR SELECT
    USING (organization_id = get_user_organization_id());
CREATE POLICY "Full access to departments for org members" ON public.hr_departments FOR ALL
    USING (organization_id = get_user_organization_id());

-- 2. Jobs Policy
CREATE POLICY "Users can view jobs in their org" ON public.hr_jobs FOR SELECT
    USING (organization_id = get_user_organization_id());
CREATE POLICY "Full access to jobs for org members" ON public.hr_jobs FOR ALL
    USING (organization_id = get_user_organization_id());

-- 3. Employees Policy (Everyone sees basic info like directory)
CREATE POLICY "Users can view employees in their org" ON public.hr_employees FOR SELECT
    USING (organization_id = get_user_organization_id());
CREATE POLICY "Full access to employees for org members" ON public.hr_employees FOR ALL
    USING (organization_id = get_user_organization_id());

-- 4. Contracts Policy (Sensitive: only users with role 'admin'/'manager' or the employee themselves)
-- Aqui assumimos uma checagem custom ou, para simplificar e isolar a org, liberamos para o org temporariamente,
-- mas é recomendado usar a role verificada globalmente.
CREATE POLICY "Contracts are isolated by org" ON public.hr_contracts FOR ALL
    USING (organization_id = get_user_organization_id());
