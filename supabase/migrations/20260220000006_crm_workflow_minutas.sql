-- ═══════════════════════════════════════════════════════════════
-- Migration: CRM, Workflow and Minutas tables
-- Date: 2026-02-20
-- ═══════════════════════════════════════════════════════════════

-- ─── CRM ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS crm_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  email TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  type TEXT DEFAULT 'pessoa_fisica',
  company TEXT DEFAULT '',
  city TEXT DEFAULT '',
  state TEXT DEFAULT '',
  tags TEXT[] DEFAULT '{}',
  score INT DEFAULT 1,
  notes TEXT DEFAULT '',
  source TEXT DEFAULT 'manual',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE crm_contacts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "crm_contacts_org" ON crm_contacts;
CREATE POLICY "crm_contacts_org" ON crm_contacts
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid()));

CREATE TABLE IF NOT EXISTS crm_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  contact_id UUID REFERENCES crm_contacts(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  contact_name TEXT DEFAULT '',
  value NUMERIC DEFAULT 0,
  priority TEXT DEFAULT 'media',
  date DATE DEFAULT CURRENT_DATE,
  notes TEXT DEFAULT '',
  stage_id TEXT DEFAULT 'novo_lead',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE crm_leads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "crm_leads_org" ON crm_leads;
CREATE POLICY "crm_leads_org" ON crm_leads
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid()));

CREATE TABLE IF NOT EXISTS crm_deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  contact_id UUID REFERENCES crm_contacts(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  contact_name TEXT DEFAULT '',
  value NUMERIC DEFAULT 0,
  probability INT DEFAULT 50,
  stage TEXT DEFAULT 'Qualificação',
  due_date DATE,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE crm_deals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "crm_deals_org" ON crm_deals;
CREATE POLICY "crm_deals_org" ON crm_deals
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid()));

CREATE TABLE IF NOT EXISTS crm_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  contact_id UUID REFERENCES crm_contacts(id) ON DELETE SET NULL,
  type TEXT NOT NULL DEFAULT 'tarefa',
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  contact_name TEXT DEFAULT '',
  date DATE DEFAULT CURRENT_DATE,
  time TEXT DEFAULT '09:00',
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE crm_activities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "crm_activities_org" ON crm_activities;
CREATE POLICY "crm_activities_org" ON crm_activities
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid()));

-- ─── WORKFLOW ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS workflow_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  template_id TEXT DEFAULT '',
  template_name TEXT NOT NULL,
  template_emoji TEXT DEFAULT '📋',
  sector_id TEXT DEFAULT '',
  assigned_to TEXT DEFAULT '',
  assigned_to_name TEXT DEFAULT '',
  priority TEXT DEFAULT 'media',
  deadline DATE,
  status TEXT DEFAULT 'pendente',
  created_by TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE workflow_instances ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "workflow_instances_org" ON workflow_instances;
CREATE POLICY "workflow_instances_org" ON workflow_instances
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid()));

CREATE TABLE IF NOT EXISTS workflow_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflow_instances(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  completed BOOLEAN DEFAULT false,
  due_date DATE,
  notes TEXT DEFAULT '',
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE workflow_steps ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "workflow_steps_org" ON workflow_steps;
CREATE POLICY "workflow_steps_org" ON workflow_steps
  USING (workflow_id IN (SELECT id FROM workflow_instances WHERE organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid())));

-- ─── MINUTAS ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS minutas_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  title TEXT NOT NULL,
  category TEXT DEFAULT 'outros',
  content TEXT DEFAULT '',
  variables JSONB DEFAULT '[]',
  tags TEXT[] DEFAULT '{}',
  favorite BOOLEAN DEFAULT false,
  usage_count INT DEFAULT 0,
  source TEXT DEFAULT 'manual',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE minutas_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "minutas_documents_org" ON minutas_documents;
CREATE POLICY "minutas_documents_org" ON minutas_documents
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid()));

CREATE TABLE IF NOT EXISTS minutas_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES minutas_documents(id) ON DELETE CASCADE,
  content TEXT DEFAULT '',
  label TEXT DEFAULT '',
  saved_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE minutas_versions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "minutas_versions_org" ON minutas_versions;
CREATE POLICY "minutas_versions_org" ON minutas_versions
  USING (document_id IN (SELECT id FROM minutas_documents WHERE organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid())));
