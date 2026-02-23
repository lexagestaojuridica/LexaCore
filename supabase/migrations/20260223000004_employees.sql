-- Migration: Employees table

CREATE TABLE IF NOT EXISTS employees (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         uuid REFERENCES profiles(user_id) ON DELETE SET NULL,
  full_name       text NOT NULL,
  email           text,
  phone           text,
  oab_number      text,
  department      text,
  position        text,
  hire_date       date,
  hourly_rate     numeric(10,2),
  unit_id         uuid REFERENCES units(id) ON DELETE SET NULL,
  is_active       boolean NOT NULL DEFAULT true,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_employees_org ON employees(organization_id);
CREATE INDEX IF NOT EXISTS idx_employees_unit ON employees(unit_id);
CREATE INDEX IF NOT EXISTS idx_employees_user ON employees(user_id);

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their org employees"
  ON employees FOR ALL
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid()));
