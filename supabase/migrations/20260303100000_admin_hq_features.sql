-- Supabase schema migration for Admin HQ features: Support Tickets and Platform Settings

-- 1. Support Tickets Table
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved')),
    priority TEXT DEFAULT 'low' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS for support_tickets
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read for users based on organization_id"
    ON public.support_tickets FOR SELECT
    USING (organization_id IN (
        SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()
    ));

CREATE POLICY "Enable insert for authenticated users"
    ON public.support_tickets FOR INSERT
    WITH CHECK (auth.uid() = user_id AND organization_id IN (
        SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()
    ));

-- Note: We assume Master Admins can bypass RLS or use the service role key to manage all tickets.

-- 2. Platform Settings Table
CREATE TABLE IF NOT EXISTS public.platform_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    key TEXT NOT NULL UNIQUE,
    value JSONB NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS for platform_settings
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can read settings
CREATE POLICY "Enable read access for all users"
    ON public.platform_settings FOR SELECT
    USING (true);

-- Only admins should update, but here we assume Master Admins bypass RLS or use service role.
-- Or we could add a policy for specific super admins.
