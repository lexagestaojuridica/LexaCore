-- ========================================================
-- Lexanova Core: Financial Gateway Foundation
-- Description: Creates the baseline for payment gateway integrations (Asaas).
-- ========================================================

-- 1. Table: gateway_settings (Storage for API Keys and Configs)
CREATE TABLE IF NOT EXISTS public.gateway_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  gateway_name text NOT NULL DEFAULT 'asaas', -- 'asaas', 'iugu', etc.
  api_key text NOT NULL,
  environment text DEFAULT 'sandbox'::text, -- 'sandbox', 'production'
  webhook_secret text,
  
  status text DEFAULT 'active'::text,
  
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  
  -- Ensure only one active config per gateway per org
  UNIQUE(organization_id, gateway_name)
);

-- 2. Add external_id to crm_leads and clients for synchronization
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS asaas_customer_id text;
ALTER TABLE public.contas_receber ADD COLUMN IF NOT EXISTS asaas_billing_id text;
ALTER TABLE public.contas_receber ADD COLUMN IF NOT EXISTS asaas_invoice_url text;

-- Row Level Security (RLS)
ALTER TABLE public.gateway_settings ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view gateway_settings within their org" ON public.gateway_settings FOR SELECT USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "Users can insert gateway_settings within their org" ON public.gateway_settings FOR INSERT WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "Users can update gateway_settings within their org" ON public.gateway_settings FOR UPDATE USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "Users can delete gateway_settings within their org" ON public.gateway_settings FOR DELETE USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()));
