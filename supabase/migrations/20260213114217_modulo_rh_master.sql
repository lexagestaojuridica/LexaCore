-- ========================================================
-- Lexanova Core: HR Module Master Initialization
-- Description: Creates the baseline tables for complete
-- Professional HR and DHO Platform (Employees, Attendance, Recruiting).
-- ========================================================

-- 1. Table: rh_colaboradores (Employees & Contractors)
CREATE TABLE IF NOT EXISTS public.rh_colaboradores (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(user_id) ON DELETE SET NULL, -- Optional link to system access
  full_name text NOT NULL,
  email text,
  phone text,
  document_cpf text,
  rg text,
  
  -- Contract properties
  department text NOT NULL,
  position text NOT NULL,
  work_format text DEFAULT 'Híbrido'::text, -- 'Presencial', 'Remoto', 'Híbrido'
  employment_type text DEFAULT 'CLT'::text, -- 'CLT', 'PJ', 'Estágio', 'Freelance'
  status text DEFAULT 'active'::text, -- 'active', 'on_leave', 'terminated'
  
  -- Financial properties
  base_salary numeric(12, 2) DEFAULT 0,
  
  -- Timestamps
  admission_date date NOT NULL,
  termination_date date,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 2. Table: rh_ponto_registros (Attendance Time Clocking)
CREATE TABLE IF NOT EXISTS public.rh_ponto_registros (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.rh_colaboradores(id) ON DELETE CASCADE,
  
  -- Clocking properties
  event_time timestamp with time zone DEFAULT now() NOT NULL,
  event_type text NOT NULL, -- 'entrada', 'saida_almoco', 'retorno_almoco', 'saida'
  
  -- Geolocation / Evidence
  ip_address text,
  location_data jsonb,
  device_info text,
  
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 3. Table: rh_recrutamento_vagas (ATS - Recruiting Jobs)
CREATE TABLE IF NOT EXISTS public.rh_recrutamento_vagas (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  title text NOT NULL,
  department text NOT NULL,
  description text,
  requirements text,
  status text DEFAULT 'open'::text, -- 'open', 'closed', 'draft'
  
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 4. Table: rh_recrutamento_candidatos (ATS - Applicants Pipeline)
CREATE TABLE IF NOT EXISTS public.rh_recrutamento_candidatos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES public.rh_recrutamento_vagas(id) ON DELETE CASCADE,
  
  full_name text NOT NULL,
  email text,
  phone text,
  resume_url text,
  portfolio_url text,
  notes text,
  
  pipeline_stage text DEFAULT 'novo'::text, -- 'novo', 'entrevista', 'teste', 'proposta', 'contratado', 'rejeitado'
  rating integer DEFAULT 0,
  
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Row Level Security (RLS) setup for all tables
ALTER TABLE public.rh_colaboradores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rh_ponto_registros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rh_recrutamento_vagas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rh_recrutamento_candidatos ENABLE ROW LEVEL SECURITY;

-- Creating basic Policies (Assuming organization_id based multitenancy)
DROP POLICY IF EXISTS "Users can view rh_colaboradores within their org" ON public.rh_colaboradores;
CREATE POLICY "Users can view rh_colaboradores within their org" ON public.rh_colaboradores FOR SELECT USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert rh_colaboradores within their org" ON public.rh_colaboradores;
CREATE POLICY "Users can insert rh_colaboradores within their org" ON public.rh_colaboradores FOR INSERT WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update rh_colaboradores within their org" ON public.rh_colaboradores;
CREATE POLICY "Users can update rh_colaboradores within their org" ON public.rh_colaboradores FOR UPDATE USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete rh_colaboradores within their org" ON public.rh_colaboradores;
CREATE POLICY "Users can delete rh_colaboradores within their org" ON public.rh_colaboradores FOR DELETE USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can view rh_ponto_registros within their org" ON public.rh_ponto_registros;
CREATE POLICY "Users can view rh_ponto_registros within their org" ON public.rh_ponto_registros FOR SELECT USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert rh_ponto_registros within their org" ON public.rh_ponto_registros;
CREATE POLICY "Users can insert rh_ponto_registros within their org" ON public.rh_ponto_registros FOR INSERT WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update rh_ponto_registros within their org" ON public.rh_ponto_registros;
CREATE POLICY "Users can update rh_ponto_registros within their org" ON public.rh_ponto_registros FOR UPDATE USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete rh_ponto_registros within their org" ON public.rh_ponto_registros;
CREATE POLICY "Users can delete rh_ponto_registros within their org" ON public.rh_ponto_registros FOR DELETE USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can view rh_recrutamento_vagas within their org" ON public.rh_recrutamento_vagas;
CREATE POLICY "Users can view rh_recrutamento_vagas within their org" ON public.rh_recrutamento_vagas FOR SELECT USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert rh_recrutamento_vagas within their org" ON public.rh_recrutamento_vagas;
CREATE POLICY "Users can insert rh_recrutamento_vagas within their org" ON public.rh_recrutamento_vagas FOR INSERT WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update rh_recrutamento_vagas within their org" ON public.rh_recrutamento_vagas;
CREATE POLICY "Users can update rh_recrutamento_vagas within their org" ON public.rh_recrutamento_vagas FOR UPDATE USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete rh_recrutamento_vagas within their org" ON public.rh_recrutamento_vagas;
CREATE POLICY "Users can delete rh_recrutamento_vagas within their org" ON public.rh_recrutamento_vagas FOR DELETE USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can view rh_recrutamento_candidatos within their org" ON public.rh_recrutamento_candidatos;
CREATE POLICY "Users can view rh_recrutamento_candidatos within their org" ON public.rh_recrutamento_candidatos FOR SELECT USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert rh_recrutamento_candidatos within their org" ON public.rh_recrutamento_candidatos;
CREATE POLICY "Users can insert rh_recrutamento_candidatos within their org" ON public.rh_recrutamento_candidatos FOR INSERT WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update rh_recrutamento_candidatos within their org" ON public.rh_recrutamento_candidatos;
CREATE POLICY "Users can update rh_recrutamento_candidatos within their org" ON public.rh_recrutamento_candidatos FOR UPDATE USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete rh_recrutamento_candidatos within their org" ON public.rh_recrutamento_candidatos;
CREATE POLICY "Users can delete rh_recrutamento_candidatos within their org" ON public.rh_recrutamento_candidatos FOR DELETE USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()));
