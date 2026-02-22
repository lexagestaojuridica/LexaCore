-- 1. Permite o app_role 'cliente'
-- Como Supabase executa dentro de uma transação, precisamos dar o commit antes para o ALTER TYPE ADD VALUE funcionar.
COMMIT;
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'cliente';

-- 2. Vincula o cliente do CRM ao user real logado (para uso de RLS e JWT)
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 3. Políticas de RLS para o Portal do Cliente (Leitura estrita de dados onde ele é o client_id)
-- Eles são aditivos. Se uma política anterior concedeu acesso ao advogado, ela continua valendo, e essa soma-se permitindo o cliente.

-- Processos
CREATE POLICY "Clientes podem ler seus próprios processos" ON public.processos_juridicos
FOR SELECT USING (
  client_id IN (SELECT id FROM public.clients WHERE auth_user_id = auth.uid())
);

-- Faturas (Contas a Receber)
CREATE POLICY "Clientes podem ver suas faturas" ON public.contas_receber
FOR SELECT USING (
  client_id IN (SELECT id FROM public.clients WHERE auth_user_id = auth.uid())
);

-- Documentos (Apenas os atrelados ao cliente)
CREATE POLICY "Clientes podem ler seus documentos" ON public.documentos
FOR SELECT USING (
  client_id IN (SELECT id FROM public.clients WHERE auth_user_id = auth.uid())
);

-- Eventos / Agenda (Apenas os que têm o processo atrelado ao cliente)
CREATE POLICY "Clientes podem ver eventos de seus processos" ON public.eventos_agenda
FOR SELECT USING (
  process_id IN (
    SELECT id FROM public.processos_juridicos 
    WHERE client_id IN (SELECT id FROM public.clients WHERE auth_user_id = auth.uid())
  )
);
