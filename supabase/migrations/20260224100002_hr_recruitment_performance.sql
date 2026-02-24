-- hr_recruitment_performance.sql
-- Descrição: Estrutura para Recrutamento (ATS) e Avaliação de Desempenho (360)
-- Tabelas: hr_job_postings, hr_candidates, hr_performance_cycles, hr_performance_reviews

-- DROP TABLE IF EXISTS public.hr_performance_reviews CASCADE;
-- DROP TABLE IF EXISTS public.hr_performance_cycles CASCADE;
-- DROP TABLE IF EXISTS public.hr_candidates CASCADE;
-- DROP TABLE IF EXISTS public.hr_job_postings CASCADE;

-- 1. Job Postings (Vagas/Recrutamento ATS)
CREATE TABLE IF NOT EXISTS public.hr_job_postings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    department_id UUID REFERENCES public.hr_departments(id) ON DELETE SET NULL,
    
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    requirements TEXT,
    benefits TEXT,
    location TEXT,
    work_model TEXT CHECK (work_model IN ('onsite', 'remote', 'hybrid')),
    
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'closed', 'cancelled')),
    open_date DATE,
    close_date DATE,
    
    salary_range_min NUMERIC(15, 2),
    salary_range_max NUMERIC(15, 2),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Candidates (Funil Kanban de Recrutamento)
CREATE TABLE IF NOT EXISTS public.hr_candidates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    job_posting_id UUID REFERENCES public.hr_job_postings(id) ON DELETE CASCADE,
    
    -- Candidate Info
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    linkedin_url TEXT,
    portfolio_url TEXT,
    resume_url TEXT, -- Link do Storage Supabase
    
    -- ATS Pipeline Status
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'screening', 'interview', 'offer', 'hired', 'rejected', 'withdrawn')),
    applied_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    feedback TEXT, -- Notas internas dos recrutadores
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Performance Cycles (Ciclos de Avaliação)
CREATE TABLE IF NOT EXISTS public.hr_performance_cycles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    
    name TEXT NOT NULL, -- ex: "Avaliação Q3 2026"
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed')),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Performance Reviews (A Avaliação propriamente dita)
CREATE TABLE IF NOT EXISTS public.hr_performance_reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    cycle_id UUID NOT NULL REFERENCES public.hr_performance_cycles(id) ON DELETE CASCADE,
    
    employee_id UUID NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
    reviewer_id UUID REFERENCES public.hr_employees(id) ON DELETE SET NULL,
    
    review_type TEXT NOT NULL CHECK (review_type IN ('self', 'manager', 'peer', 'subordinate')),
    
    -- Metricas quantitativas (1 a 5, por exemplo)
    score_goals NUMERIC(3, 1),
    score_values NUMERIC(3, 1),
    score_overall NUMERIC(3, 1),
    
    -- Qualitativo
    strengths TEXT,
    improvements TEXT,
    comments TEXT,
    
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'acknowledged')),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =========================================================================
-- INDEXES & PERFORMANCE
-- =========================================================================
CREATE INDEX IF NOT EXISTS idx_hr_jobposts_org ON public.hr_job_postings(organization_id);
CREATE INDEX IF NOT EXISTS idx_hr_cand_org ON public.hr_candidates(organization_id);
CREATE INDEX IF NOT EXISTS idx_hr_cand_job ON public.hr_candidates(job_posting_id);
CREATE INDEX IF NOT EXISTS idx_hr_pcycles_org ON public.hr_performance_cycles(organization_id);
CREATE INDEX IF NOT EXISTS idx_hr_pfc_org ON public.hr_performance_reviews(organization_id);
CREATE INDEX IF NOT EXISTS idx_hr_pfc_cycle ON public.hr_performance_reviews(cycle_id);
CREATE INDEX IF NOT EXISTS idx_hr_pfc_emp ON public.hr_performance_reviews(employee_id);

-- =========================================================================
-- REPLICANDO TRIGGERS UPDATED_AT
-- =========================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_hr_jobpostings') THEN
        CREATE TRIGGER set_updated_at_hr_jobpostings BEFORE UPDATE ON public.hr_job_postings FOR EACH ROW EXECUTE FUNCTION update_modified_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_hr_candidates') THEN
        CREATE TRIGGER set_updated_at_hr_candidates BEFORE UPDATE ON public.hr_candidates FOR EACH ROW EXECUTE FUNCTION update_modified_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_hr_pfcycles') THEN
        CREATE TRIGGER set_updated_at_hr_pfcycles BEFORE UPDATE ON public.hr_performance_cycles FOR EACH ROW EXECUTE FUNCTION update_modified_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_hr_pfreviews') THEN
        CREATE TRIGGER set_updated_at_hr_pfreviews BEFORE UPDATE ON public.hr_performance_reviews FOR EACH ROW EXECUTE FUNCTION update_modified_column();
    END IF;
END $$;

-- =========================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =========================================================================
ALTER TABLE public.hr_job_postings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_performance_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_performance_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Full access to job postings for org members" ON public.hr_job_postings FOR ALL USING (organization_id = get_user_organization_id());
CREATE POLICY "Full access to candidates for org members" ON public.hr_candidates FOR ALL USING (organization_id = get_user_organization_id());
CREATE POLICY "Full access to performance cycles for org members" ON public.hr_performance_cycles FOR ALL USING (organization_id = get_user_organization_id());
CREATE POLICY "Full access to performance reviews for org members" ON public.hr_performance_reviews FOR ALL USING (organization_id = get_user_organization_id());
