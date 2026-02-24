-- ============================================================
-- Migration: HR Refined RLS Policies (Role-Based)
-- Restricts sensitive HR data (salary, CPF, contracts) to admin/manager roles
-- ============================================================

-- ─── Helper: check if current user is admin or manager ──────
CREATE OR REPLACE FUNCTION public.is_hr_admin_or_manager()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND organization_id = get_user_organization_id()
      AND role IN ('admin', 'manager')
  );
$$;

-- ─── Drop overly-permissive "full access" policies on sensitive tables ──

-- hr_employees: remove old full-access and replace with role-differentiated
DROP POLICY IF EXISTS "Full access to employees for org members" ON public.hr_employees;

-- Replace with: SELECT visible to all org members, but INSERT/UPDATE/DELETE restricted to admin/manager
CREATE POLICY "Admins/managers can manage employees"
  ON public.hr_employees FOR ALL
  USING (
    organization_id = get_user_organization_id()
    AND is_hr_admin_or_manager()
  )
  WITH CHECK (
    organization_id = get_user_organization_id()
    AND is_hr_admin_or_manager()
  );

-- hr_contracts: restrict fully to admin/manager
DROP POLICY IF EXISTS "Contracts are isolated by org" ON public.hr_contracts;

CREATE POLICY "Admins/managers can view contracts"
  ON public.hr_contracts FOR SELECT
  USING (
    organization_id = get_user_organization_id()
    AND is_hr_admin_or_manager()
  );

CREATE POLICY "Admins/managers can manage contracts"
  ON public.hr_contracts FOR ALL
  USING (
    organization_id = get_user_organization_id()
    AND is_hr_admin_or_manager()
  )
  WITH CHECK (
    organization_id = get_user_organization_id()
    AND is_hr_admin_or_manager()
  );

-- hr_departments: keep org-level SELECT but restrict mutations to admin/manager
DROP POLICY IF EXISTS "Full access to departments for org members" ON public.hr_departments;

CREATE POLICY "Admins/managers can manage departments"
  ON public.hr_departments FOR ALL
  USING (
    organization_id = get_user_organization_id()
    AND is_hr_admin_or_manager()
  )
  WITH CHECK (
    organization_id = get_user_organization_id()
    AND is_hr_admin_or_manager()
  );

-- hr_jobs: keep org-level SELECT but restrict mutations to admin/manager
DROP POLICY IF EXISTS "Full access to jobs for org members" ON public.hr_jobs;

CREATE POLICY "Admins/managers can manage jobs"
  ON public.hr_jobs FOR ALL
  USING (
    organization_id = get_user_organization_id()
    AND is_hr_admin_or_manager()
  )
  WITH CHECK (
    organization_id = get_user_organization_id()
    AND is_hr_admin_or_manager()
  );

-- hr_performance_reviews: managers can see all; users can only see their own reviews
DROP POLICY IF EXISTS "Full access to performance reviews for org members" ON public.hr_performance_reviews;

CREATE POLICY "Admins/managers can manage performance reviews"
  ON public.hr_performance_reviews FOR ALL
  USING (
    organization_id = get_user_organization_id()
    AND is_hr_admin_or_manager()
  )
  WITH CHECK (
    organization_id = get_user_organization_id()
    AND is_hr_admin_or_manager()
  );

CREATE POLICY "Employees can view their own reviews"
  ON public.hr_performance_reviews FOR SELECT
  USING (
    organization_id = get_user_organization_id()
    AND employee_id IN (
      SELECT id FROM public.hr_employees WHERE user_id = auth.uid()
    )
  );

-- ─── Column-level security via Views (salary masking for non-admins) ────
-- Create a secure view that masks salary for non-admin users

CREATE OR REPLACE VIEW public.hr_employees_safe AS
SELECT
  id,
  organization_id,
  user_id,
  full_name,
  social_name,
  email,
  phone,
  department_id,
  job_id,
  manager_id,
  hire_date,
  status,
  employment_type,
  work_shift,
  CASE WHEN is_hr_admin_or_manager() THEN cpf ELSE '***.***.***-**' END AS cpf,
  CASE WHEN is_hr_admin_or_manager() THEN rg ELSE '**.**' END AS rg,
  CASE WHEN is_hr_admin_or_manager() THEN pis_pasep ELSE '***' END AS pis_pasep,
  CASE WHEN is_hr_admin_or_manager() THEN ctps_number ELSE '***' END AS ctps_number,
  CASE WHEN is_hr_admin_or_manager() THEN ctps_series ELSE '***' END AS ctps_series,
  CASE WHEN is_hr_admin_or_manager() THEN bank_name ELSE NULL END AS bank_name,
  CASE WHEN is_hr_admin_or_manager() THEN bank_agency ELSE NULL END AS bank_agency,
  CASE WHEN is_hr_admin_or_manager() THEN bank_account ELSE NULL END AS bank_account,
  CASE WHEN is_hr_admin_or_manager() THEN bank_pix_key ELSE NULL END AS bank_pix_key,
  created_at,
  updated_at
FROM public.hr_employees;

COMMENT ON VIEW public.hr_employees_safe IS 'Secure view that masks sensitive fields (CPF, RG, banking info) for non-admin/manager users';
