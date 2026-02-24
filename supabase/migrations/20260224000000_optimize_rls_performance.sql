-- ╔═══════════════════════════════════════════════════════════════╗
-- ║  LEXA Nova — Otimização de Performance em RLS               ║
-- ║  Evita subqueries repetitivas na tabela de 'profiles'       ║
-- ╚═══════════════════════════════════════════════════════════════╝

-- 1. Função de Cache Local (Security Definer)
-- Essa função consulta o perfil do usuário logado uma única vez
-- por chamada (ou o banco consegue otimizar no plano de execução)
CREATE OR REPLACE FUNCTION public.get_user_organization_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id 
  FROM profiles 
  WHERE user_id = auth.uid() 
  LIMIT 1;
$$;

-- 2. Atualização das Políticas RLS para tabelas pesadas (Chats, Log, Processos, etc)

-- TIMESHEET_ENTRIES
DROP POLICY IF EXISTS "Users can manage their own timesheet entries" ON timesheet_entries;
CREATE POLICY "Users can manage their own timesheet entries"
  ON timesheet_entries FOR ALL
  USING (organization_id = public.get_user_organization_id())
  WITH CHECK (organization_id = public.get_user_organization_id());

-- WIKI_JURIDICA
DROP POLICY IF EXISTS "Users manage their org wiki" ON wiki_juridica;
CREATE POLICY "Users manage their org wiki"
  ON wiki_juridica FOR ALL
  USING (organization_id = public.get_user_organization_id())
  WITH CHECK (organization_id = public.get_user_organization_id());

-- UNITS
DROP POLICY IF EXISTS "Users manage their org units" ON units;
CREATE POLICY "Users manage their org units"
  ON units FOR ALL
  USING (organization_id = public.get_user_organization_id())
  WITH CHECK (organization_id = public.get_user_organization_id());

-- CHAT_CHANNELS
DROP POLICY IF EXISTS "Users manage their org channels" ON chat_channels;
CREATE POLICY "Users manage their org channels"
  ON chat_channels FOR ALL
  USING (organization_id = public.get_user_organization_id())
  WITH CHECK (organization_id = public.get_user_organization_id());

-- CHAT_MESSAGES
-- O chat message não tem organization_id direto, ele depende do channel_id.
-- A função is_member_of_org já existia (criada nas migrations base do projeto), vamos usá-la se possível,
-- ou então fazer um join simplificado de acesso:
DROP POLICY IF EXISTS "Users manage their org messages" ON chat_messages;
CREATE POLICY "Users manage their org messages"
  ON chat_messages FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM chat_channels c 
      WHERE c.id = channel_id 
      AND c.organization_id = public.get_user_organization_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat_channels c 
      WHERE c.id = channel_id 
      AND c.organization_id = public.get_user_organization_id()
    )
  );

-- BÔNUS: Refatorar a política que criamos mais cedo (em 20260220000004_unified_all.sql) se possível.
-- (Deixaremos o `is_member_of_org` como está por agora, pois ele pode ser útil se tiver cache)
