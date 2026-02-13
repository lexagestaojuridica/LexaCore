
-- Table to store Google Calendar OAuth tokens per user
CREATE TABLE public.google_calendar_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  calendar_id TEXT DEFAULT 'primary',
  sync_enabled BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.google_calendar_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own tokens"
ON public.google_calendar_tokens FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own tokens"
ON public.google_calendar_tokens FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own tokens"
ON public.google_calendar_tokens FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete own tokens"
ON public.google_calendar_tokens FOR DELETE
USING (user_id = auth.uid());

CREATE TRIGGER update_google_calendar_tokens_updated_at
BEFORE UPDATE ON public.google_calendar_tokens
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
