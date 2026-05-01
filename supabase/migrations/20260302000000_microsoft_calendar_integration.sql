-- Migração para Microsoft Calendar Integration

-- Tabela para armazenar os tokens do Microsoft Graph
CREATE TABLE IF NOT EXISTS public.microsoft_calendar_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    token_expires_at TIMESTAMPTZ NOT NULL,
    calendar_id TEXT,
    sync_enabled BOOLEAN DEFAULT true,
    last_sync_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(user_id)
);

-- Ativar RLS
ALTER TABLE public.microsoft_calendar_tokens ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
DROP POLICY IF EXISTS "Users can manage their own microsoft tokens" ON public.microsoft_calendar_tokens;
CREATE POLICY "Users can manage their own microsoft tokens"
    ON public.microsoft_calendar_tokens
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Função de update se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
        EXECUTE '
        CREATE OR REPLACE FUNCTION public.update_updated_at_column()
        RETURNS TRIGGER AS $func$
        BEGIN
            NEW.updated_at = TIMEZONE(''utc''::text, NOW());
            RETURN NEW;
        END;
        $func$ language ''plpgsql'';
        ';
    END IF;
END $$;

-- Trigger para atualização de updated_at
DROP TRIGGER IF EXISTS update_microsoft_calendar_tokens_modtime ON public.microsoft_calendar_tokens;
CREATE TRIGGER update_microsoft_calendar_tokens_modtime
    BEFORE UPDATE ON public.microsoft_calendar_tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- Adicionar microsoft_event_id na tabela eventos_agenda
ALTER TABLE public.eventos_agenda
ADD COLUMN IF NOT EXISTS microsoft_event_id TEXT;

-- Adicionar constraint única para não duplicar eventos importados
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'unique_microsoft_event_per_user'
    ) THEN
        ALTER TABLE public.eventos_agenda
        ADD CONSTRAINT unique_microsoft_event_per_user UNIQUE (user_id, microsoft_event_id);
    END IF;
END $$;
