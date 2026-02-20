-- Migration: Wiki Jurídica table
-- Run this in Supabase SQL Editor

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
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS wiki_updated_at ON wiki_juridica;
CREATE TRIGGER wiki_updated_at
  BEFORE UPDATE ON wiki_juridica
  FOR EACH ROW EXECUTE FUNCTION update_wiki_updated_at();

CREATE INDEX IF NOT EXISTS idx_wiki_org ON wiki_juridica(organization_id);
CREATE INDEX IF NOT EXISTS idx_wiki_category ON wiki_juridica(category);
CREATE INDEX IF NOT EXISTS idx_wiki_pinned ON wiki_juridica(is_pinned) WHERE is_pinned = true;

ALTER TABLE wiki_juridica ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their org wiki"
  ON wiki_juridica FOR ALL
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid()));
