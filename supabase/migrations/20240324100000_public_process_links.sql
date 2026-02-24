-- Migration: Adicionar public_token para Portal White Label do Cliente
ALTER TABLE public.processos_juridicos ADD COLUMN IF NOT EXISTS public_token uuid DEFAULT gen_random_uuid();
CREATE INDEX IF NOT EXISTS idx_processos_public_token ON public.processos_juridicos(public_token);

-- Cria uma Função Segura (RPC) para buscar um processo via token, bypassando RLS do Supabase apenas para essa rota
CREATE OR REPLACE FUNCTION get_public_process_with_org(token_val uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'processo', row_to_json(p),
    'organizacao', (
      SELECT json_build_object(
        'name', o.name,
        'logo_url', o.logo_url,
        'slug', o.slug,
        'document', o.document
      )
      FROM public.organizations o 
      WHERE o.id = p.organization_id
    ),
    'andamentos', (
      SELECT json_agg(json_build_object(
        'date', h.date,
        'description', h.description,
        'type', h.type
      ) ORDER BY h.date DESC)
      FROM (
          -- Unimos Andamentos e Tarefas como Historico para o Cliente ver
          SELECT date, description, type FROM public.processos_history WHERE processo_id = p.id
      ) h
    )
  ) INTO result
  FROM public.processos_juridicos p
  WHERE p.public_token = token_val;
  
  RETURN result;
END;
$$;

-- Permite uso Público (Anônimo)
GRANT EXECUTE ON FUNCTION get_public_process_with_org(uuid) TO anon, authenticated;
