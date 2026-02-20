-- Add recurrence_rule to eventos_agenda
ALTER TABLE public.eventos_agenda
ADD COLUMN recurrence_rule TEXT DEFAULT NULL;

COMMENT ON COLUMN public.eventos_agenda.recurrence_rule IS 'Rule for recurring events (e.g. daily, weekly, monthly, yearly)';
