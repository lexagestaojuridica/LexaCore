-- Migration: Timesheet timer logs (pause/resume tracking)

CREATE TABLE IF NOT EXISTS timesheet_timer_logs (
  id                  uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  timesheet_entry_id  uuid NOT NULL REFERENCES timesheet_entries(id) ON DELETE CASCADE,
  action              text NOT NULL CHECK (action IN ('start','pause','resume','stop')),
  logged_at           timestamptz NOT NULL DEFAULT now(),
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_timer_logs_entry ON timesheet_timer_logs(timesheet_entry_id);
CREATE INDEX IF NOT EXISTS idx_timer_logs_logged ON timesheet_timer_logs(logged_at DESC);

ALTER TABLE timesheet_timer_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage timer logs via org"
  ON timesheet_timer_logs FOR ALL
  USING (
    timesheet_entry_id IN (
      SELECT id FROM timesheet_entries
      WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    timesheet_entry_id IN (
      SELECT id FROM timesheet_entries
      WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE user_id = auth.uid()
      )
    )
  );
