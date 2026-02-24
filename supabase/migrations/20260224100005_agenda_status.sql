-- Add status and completion tracking to agenda events
-- Enables real BI metrics for "Deadlines Met"

ALTER TABLE public.eventos_agenda 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'concluido', 'cancelado')),
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Index for BI queries
CREATE INDEX IF NOT EXISTS idx_eventos_status ON public.eventos_agenda(status, organization_id);
CREATE INDEX IF NOT EXISTS idx_eventos_category ON public.eventos_agenda(category, organization_id);
