-- Migration: Units (Franquias/Unidades)
-- Modelo escalável multi-escritório

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

-- Messages readable by org members (via channel)
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

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
