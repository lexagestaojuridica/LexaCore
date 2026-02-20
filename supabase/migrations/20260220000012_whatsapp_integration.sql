-- Tabela de Organizações: Campos de Integração WhatsApp (Z-API / Evolution)
ALTER TABLE public.organizations
ADD COLUMN whatsapp_instance_id TEXT,
ADD COLUMN whatsapp_token TEXT,
ADD COLUMN whatsapp_enabled BOOLEAN DEFAULT false;
