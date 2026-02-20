-- Tabela de assinaturas de documentos
CREATE TABLE public.document_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES public.documentos(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  
  -- Informações de Contato / Controle do Signatário
  signer_name TEXT NOT NULL,
  signer_email TEXT NOT NULL,
  signer_document TEXT, -- CPF, Passaporte
  
  -- Estado da Assinatura
  status TEXT NOT NULL DEFAULT 'pendente', -- pendente, visualizado, assinado, recusado, expirado
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'), -- URL Segura
  
  -- Evidências Legais (Preenchidos na hora do aceite)
  signed_at TIMESTAMPTZ,
  ip_address TEXT,
  user_agent TEXT,
  location_data JSONB, -- Opcional
  signature_hash TEXT, -- SHA-256 gerado do arquivo misturado com IP e Timestamp
  
  -- Controle de Vida Útil
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.document_signatures ENABLE ROW LEVEL SECURITY;

-- Políticas
-- Administradores e Advogados enxergam as assinaturas do seu escritório
CREATE POLICY "Membros da org gerenciam assinaturas" ON public.document_signatures
FOR ALL USING (
  organization_id = (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid())
);

-- Signatários Externos (Não-Autenticados, mas possuem o Token Secreto)
-- Precisamos liberar acesso as assinaturas via Supabase Anon Key desde que a edge function repasse, OU criar uma policy para select via token.
CREATE POLICY "Signatários acessam com token" ON public.document_signatures
FOR SELECT USING (true); -- Controle feito via Rota do Frontend com match no Token.

CREATE POLICY "Signatários atualizam status usando token na Edge Function / API" ON public.document_signatures
FOR UPDATE USING (true);
