-- ╔═══════════════════════════════════════════════════════════════╗
-- ║  LEXA Nova — Script Unificado de Migrations + Segurança     ║
-- ║  Execute este arquivo INTEIRO no SQL Editor do Supabase      ║
-- ╚═══════════════════════════════════════════════════════════════╝

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- PARTE 1: CORREÇÕES DE SEGURANÇA (RLS)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- 1A. CLIENTES: restringir SELECT para admin/advogado apenas
--     (antes: qualquer membro da org via SELECT ver todos os dados)
DROP POLICY IF EXISTS "Members can read clients" ON public.clients;
CREATE POLICY "Members can read clients" ON public.clients
  FOR SELECT USING (
    public.is_member_of_org(auth.uid(), organization_id)
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'advogado')
      OR public.has_role(auth.uid(), 'financeiro')
    )
  );

-- 1B. EVENTOS_AGENDA: restringir SELECT para eventos próprios
--     (antes: qualquer membro via SELECT ver todos os eventos da org)
DROP POLICY IF EXISTS "Members can read eventos" ON public.eventos_agenda;
CREATE POLICY "Members can read eventos" ON public.eventos_agenda
  FOR SELECT USING (
    public.is_member_of_org(auth.uid(), organization_id)
    AND (
      user_id = auth.uid()
      OR public.has_role(auth.uid(), 'admin')
    )
  );

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- PARTE 2: TABELA TIMESHEET_ENTRIES
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS timesheet_entries (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id   uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id           uuid NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  process_id        uuid REFERENCES processos_juridicos(id) ON DELETE SET NULL,
  description       text,
  started_at        timestamptz NOT NULL,
  ended_at          timestamptz,
  duration_minutes  integer,
  hourly_rate       numeric(10,2),
  billing_status    text NOT NULL DEFAULT 'pendente'
    CHECK (billing_status IN ('pendente','faturado','pago','nao_faturavel')),
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION update_timesheet_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS timesheet_updated_at ON timesheet_entries;
CREATE TRIGGER timesheet_updated_at
  BEFORE UPDATE ON timesheet_entries
  FOR EACH ROW EXECUTE FUNCTION update_timesheet_updated_at();

CREATE INDEX IF NOT EXISTS idx_timesheet_org ON timesheet_entries(organization_id);
CREATE INDEX IF NOT EXISTS idx_timesheet_user ON timesheet_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_timesheet_process ON timesheet_entries(process_id);
CREATE INDEX IF NOT EXISTS idx_timesheet_started ON timesheet_entries(started_at DESC);

ALTER TABLE timesheet_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own timesheet entries" ON timesheet_entries;
CREATE POLICY "Users can manage their own timesheet entries"
  ON timesheet_entries FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- PARTE 3: TABELA WIKI_JURIDICA
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS wiki_juridica (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id   uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id           uuid NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  title             text NOT NULL,
  content           text NOT NULL,
  category          text NOT NULL DEFAULT 'outro'
    CHECK (category IN ('tese','modelo','procedimento','jurisprudencia','dica','outro')),
  tags              text[] NOT NULL DEFAULT '{}',
  is_pinned         boolean NOT NULL DEFAULT false,
  is_public         boolean NOT NULL DEFAULT false,
  views             integer NOT NULL DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION update_wiki_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS wiki_updated_at ON wiki_juridica;
CREATE TRIGGER wiki_updated_at
  BEFORE UPDATE ON wiki_juridica
  FOR EACH ROW EXECUTE FUNCTION update_wiki_updated_at();

CREATE INDEX IF NOT EXISTS idx_wiki_org ON wiki_juridica(organization_id);
CREATE INDEX IF NOT EXISTS idx_wiki_category ON wiki_juridica(category);
CREATE INDEX IF NOT EXISTS idx_wiki_pinned ON wiki_juridica(is_pinned) WHERE is_pinned = true;

ALTER TABLE wiki_juridica ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their org wiki" ON wiki_juridica;
CREATE POLICY "Users manage their org wiki"
  ON wiki_juridica FOR ALL
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid()));

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- PARTE 4: TABELAS UNITS + CHAT
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS units (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id   uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name              text NOT NULL,
  slug              text NOT NULL,
  address           text,
  city              text,
  state             text,
  phone             text,
  email             text,
  manager_id        uuid REFERENCES profiles(user_id) ON DELETE SET NULL,
  is_headquarters   boolean NOT NULL DEFAULT false,
  is_active         boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, slug)
);

CREATE OR REPLACE FUNCTION update_units_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS units_updated_at ON units;
CREATE TRIGGER units_updated_at
  BEFORE UPDATE ON units
  FOR EACH ROW EXECUTE FUNCTION update_units_updated_at();

CREATE INDEX IF NOT EXISTS idx_units_org ON units(organization_id);
CREATE INDEX IF NOT EXISTS idx_units_active ON units(is_active) WHERE is_active = true;

ALTER TABLE units ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their org units" ON units;
CREATE POLICY "Users manage their org units"
  ON units FOR ALL
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid()));

-- Chat channels
CREATE TABLE IF NOT EXISTS chat_channels (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id   uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name              text NOT NULL,
  type              text NOT NULL DEFAULT 'general'
    CHECK (type IN ('general','process','direct','unit')),
  process_id        uuid REFERENCES processos_juridicos(id) ON DELETE SET NULL,
  unit_id           uuid REFERENCES units(id) ON DELETE SET NULL,
  is_archived       boolean NOT NULL DEFAULT false,
  created_by        uuid REFERENCES profiles(user_id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_channels_org ON chat_channels(organization_id);
ALTER TABLE chat_channels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their org channels" ON chat_channels;
CREATE POLICY "Users manage their org channels"
  ON chat_channels FOR ALL
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid()));

-- Chat messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id        uuid NOT NULL REFERENCES chat_channels(id) ON DELETE CASCADE,
  user_id           uuid NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  content           text NOT NULL,
  reply_to          uuid REFERENCES chat_messages(id) ON DELETE SET NULL,
  is_edited         boolean NOT NULL DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_msg_channel ON chat_messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_chat_msg_created ON chat_messages(created_at DESC);
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their org messages" ON chat_messages;
CREATE POLICY "Users manage their org messages"
  ON chat_messages FOR ALL
  USING (channel_id IN (
    SELECT id FROM chat_channels WHERE organization_id IN (
      SELECT organization_id FROM profiles WHERE user_id = auth.uid()
    )
  ))
  WITH CHECK (channel_id IN (
    SELECT id FROM chat_channels WHERE organization_id IN (
      SELECT organization_id FROM profiles WHERE user_id = auth.uid()
    )
  ));

-- Enable realtime for chat messages
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
  END IF;
END $$;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- PRONTO! Todas as tabelas e políticas de segurança foram criadas.
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
