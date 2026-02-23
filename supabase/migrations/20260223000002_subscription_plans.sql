-- Migration: Subscription plans and organization subscriptions

CREATE TABLE IF NOT EXISTS subscription_plans (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name            text NOT NULL,
  slug            text NOT NULL UNIQUE,
  price_monthly   numeric(10,2) NOT NULL DEFAULT 0,
  price_yearly    numeric(10,2) NOT NULL DEFAULT 0,
  max_users       integer NOT NULL DEFAULT 1,
  max_processes   integer NOT NULL DEFAULT 50,
  features        jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active       boolean NOT NULL DEFAULT true,
  sort_order      integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS organization_subscriptions (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plan_id         uuid NOT NULL REFERENCES subscription_plans(id) ON DELETE RESTRICT,
  status          text NOT NULL DEFAULT 'active' CHECK (status IN ('active','trialing','past_due','cancelled')),
  started_at      timestamptz NOT NULL DEFAULT now(),
  expires_at      timestamptz,
  billing_cycle   text NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly','yearly')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Seed default plans
INSERT INTO subscription_plans (name, slug, price_monthly, price_yearly, max_users, max_processes, features, sort_order)
VALUES
  ('Free', 'free', 0, 0, 2, 10,
   '["Processos básicos", "Agenda simples", "1 unidade"]'::jsonb, 0),
  ('Pro', 'pro', 197, 1970, 10, 500,
   '["Processos ilimitados", "Timesheet completo", "BI & Relatórios", "Workflow", "5 unidades", "Integrações"]'::jsonb, 1),
  ('Enterprise', 'enterprise', 497, 4970, 999, 99999,
   '["Tudo do Pro", "Unidades ilimitadas", "API completa", "SSO/SAML", "Suporte prioritário", "SLA garantido"]'::jsonb, 2)
ON CONFLICT (slug) DO NOTHING;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_org_sub_org ON organization_subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_sub_plan ON organization_subscriptions(plan_id);

-- RLS
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can read plans" ON subscription_plans FOR SELECT USING (true);

CREATE POLICY "Org members can manage subscriptions" ON organization_subscriptions FOR ALL
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid()));
