-- Add google_event_id to eventos_agenda
ALTER TABLE IF EXISTS public.eventos_agenda
ADD COLUMN IF NOT EXISTS google_event_id TEXT;

-- Add a unique constraint to prevent duplicates during sync
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'unique_google_event_per_user'
    ) THEN
        ALTER TABLE public.eventos_agenda
        ADD CONSTRAINT unique_google_event_per_user UNIQUE (user_id, google_event_id);
    END IF;
END $$;
