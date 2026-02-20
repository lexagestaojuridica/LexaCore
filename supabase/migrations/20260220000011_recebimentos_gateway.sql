-- Tabela de Recebimentos: Suporte a Gateways (Asaas/Stripe/MercadoPago)
ALTER TABLE public.contas_receber
ADD COLUMN gateway_id TEXT,
ADD COLUMN payment_link TEXT,
ADD COLUMN pix_code TEXT,
ADD COLUMN pix_qr_code_base64 TEXT;

-- Index para agilizar a busca pelo Webhook
CREATE INDEX IF NOT EXISTS idx_contas_receber_gateway_id ON public.contas_receber(gateway_id);
