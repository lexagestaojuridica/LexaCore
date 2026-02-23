-- Migration: Custom options per module (customizable dropdowns)

CREATE TABLE IF NOT EXISTS custom_options (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  module          text NOT NULL CHECK (module IN ('processos','clientes','financeiro','agenda','timesheet','crm','geral')),
  field_name      text NOT NULL,
  label           text NOT NULL,
  value           text NOT NULL,
  color           text DEFAULT NULL,
  icon            text DEFAULT NULL,
  sort_order      integer NOT NULL DEFAULT 0,
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, module, field_name, value)
);

CREATE INDEX IF NOT EXISTS idx_custom_options_org ON custom_options(organization_id);
CREATE INDEX IF NOT EXISTS idx_custom_options_module ON custom_options(organization_id, module);

ALTER TABLE custom_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their org custom options"
  ON custom_options FOR ALL
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid()));
