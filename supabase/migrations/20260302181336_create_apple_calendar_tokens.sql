-- Create apple_calendar_tokens table
CREATE TABLE IF NOT EXISTS apple_calendar_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    apple_id VARCHAR(255) NOT NULL,
    -- Em um ambiente de produção real com pgcrypto:
    -- app_specific_password_encrypted BYTEA NOT NULL,
    -- Para este MVP/Scaffolding, usaremos texto simples, mas protegido via RLS. O supabase "Vault" seria o ideal.
    app_specific_password VARCHAR(255) NOT NULL,
    caldav_url VARCHAR(255) DEFAULT 'https://caldav.icloud.com',
    sync_enabled BOOLEAN DEFAULT true,
    last_sync_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Ensure one token per user
    UNIQUE(user_id)
);

-- RLS Policies
ALTER TABLE apple_calendar_tokens ENABLE ROW LEVEL SECURITY;

-- Users can view their own tokens
CREATE POLICY "Users can view own apple calendar tokens"
    ON apple_calendar_tokens FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own tokens
CREATE POLICY "Users can insert own apple calendar tokens"
    ON apple_calendar_tokens FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own tokens
CREATE POLICY "Users can update own apple calendar tokens"
    ON apple_calendar_tokens FOR UPDATE
    USING (auth.uid() = user_id);

-- Users can delete their own tokens
CREATE POLICY "Users can delete own apple calendar tokens"
    ON apple_calendar_tokens FOR DELETE
    USING (auth.uid() = user_id);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_apple_calendar_tokens_updated_at
    BEFORE UPDATE ON apple_calendar_tokens
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
