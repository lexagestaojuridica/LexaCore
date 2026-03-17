-- ═══════════════════════════════════════════════════════════════
-- Migration: Workflow Persistence (Templates and Sectors)
-- Date: 2026-03-17
-- ═══════════════════════════════════════════════════════════════

-- ─── SECTORS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workflow_sectors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    name TEXT NOT NULL,
    emoji TEXT DEFAULT '⚖️',
    color TEXT DEFAULT 'bg-blue-500',
    coordinator_id UUID REFERENCES auth.users(id),
    member_ids UUID[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE workflow_sectors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workflow_sectors_org" ON workflow_sectors;
CREATE POLICY "workflow_sectors_org" ON workflow_sectors
    USING (organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid()));

-- ─── TEMPLATES ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workflow_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id), -- NULL means global/system template
    name TEXT NOT NULL,
    emoji TEXT DEFAULT '📋',
    category TEXT DEFAULT 'Geral',
    description TEXT DEFAULT '',
    steps JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE workflow_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workflow_templates_select" ON workflow_templates;
CREATE POLICY "workflow_templates_select" ON workflow_templates
    FOR SELECT USING (
        organization_id IS NULL OR 
        organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid())
    );

DROP POLICY IF EXISTS "workflow_templates_modify" ON workflow_templates;
CREATE POLICY "workflow_templates_modify" ON workflow_templates
    FOR ALL USING (
        organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid())
    );

-- ─── SEED DATA ──────────────────────────────────────────────
-- Only insert if they don't exist
INSERT INTO workflow_templates (id, name, emoji, category, description, steps)
VALUES 
    ('00000000-0000-0000-0000-000000000001', 'Onboarding de Cliente', '📋', 'Geral', 'Fluxo completo de recepção e cadastro de novo cliente.', '[{"title": "Reunião inicial com o cliente", "description": "Agendar e realizar reunião."}, {"title": "Coletar documentos pessoais", "description": "RG, CPF, etc."}, {"title": "Análise de viabilidade", "description": "Avaliar fundamentação jurídica."}, {"title": "Elaborar proposta de honorários", "description": "Definir valor e contrato."}, {"title": "Assinar contrato de honorários", "description": "Formalizar contratação."}, {"title": "Cadastrar no sistema", "description": "Registrar no LEXA."}]'::jsonb),
    ('00000000-0000-0000-0000-000000000002', 'Petição Inicial', '⚖️', 'Processual', 'Etapas para elaboração e protocolo de petição inicial.', '[{"title": "Analisar documentação", "description": "Revisar todos os documentos."}, {"title": "Pesquisa jurisprudencial", "description": "Buscar decisões relevantes."}, {"title": "Redigir petição inicial", "description": "Elaborar peça processual."}, {"title": "Protocolar no tribunal", "description": "Efetuar protocolo."}]'::jsonb)
ON CONFLICT (id) DO NOTHING;
