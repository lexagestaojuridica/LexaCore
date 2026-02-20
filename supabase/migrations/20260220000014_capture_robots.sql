-- Módulo de Robôs de Captura (Jusbrasil/Escavador)

-- 1. Adicionar credenciais na tabela organizations
ALTER TABLE public.organizations
ADD COLUMN jusbrasil_token TEXT,
ADD COLUMN escavador_token TEXT;

-- 2. Permitir ativar/desativar captura automática por processo
ALTER TABLE public.processos_juridicos
ADD COLUMN auto_capture_enabled BOOLEAN DEFAULT false;

-- 3. Tabela de Andamentos Capturados pelos Robôs
CREATE TABLE IF NOT EXISTS public.process_captures (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  process_id uuid NOT NULL REFERENCES public.processos_juridicos(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('Jusbrasil', 'Escavador', 'Outro')),
  capture_date TIMESTAMP WITH TIME ZONE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.process_captures ENABLE ROW LEVEL SECURITY;

-- Setup RLS para process_captures (Acesso através do processo)
CREATE POLICY "Users can view captures for their organization's processes"
ON public.process_captures
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.processos_juridicos pj
    WHERE pj.id = process_captures.process_id
    AND pj.organization_id = (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid())
  )
);

CREATE POLICY "Service Role can manage process captures"
ON public.process_captures
FOR ALL
USING (auth.uid() IS NULL); -- Permitir Edge Functions
