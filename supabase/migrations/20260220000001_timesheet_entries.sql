-- Migration: Timesheet entries table
-- Run this in Supabase SQL Editor

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

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_timesheet_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS timesheet_updated_at ON timesheet_entries;
CREATE TRIGGER timesheet_updated_at
  BEFORE UPDATE ON timesheet_entries
  FOR EACH ROW EXECUTE FUNCTION update_timesheet_updated_at();

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_timesheet_org ON timesheet_entries(organization_id);
CREATE INDEX IF NOT EXISTS idx_timesheet_user ON timesheet_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_timesheet_process ON timesheet_entries(process_id);
CREATE INDEX IF NOT EXISTS idx_timesheet_started ON timesheet_entries(started_at DESC);

-- Row-Level Security
ALTER TABLE timesheet_entries ENABLE ROW LEVEL SECURITY;

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
