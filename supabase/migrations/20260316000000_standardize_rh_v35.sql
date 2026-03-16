-- Migration: Standardize RH Tables for v3.5
-- Rename legacy ponto table to follow domain pattern

ALTER TABLE IF EXISTS public.rh_ponto_registros RENAME TO ponto_registros;

-- Ensure RLS and indices are updated (Postgres handles this automatically with RENAME)
-- But we add a comment for clarity
COMMENT ON TABLE public.ponto_registros IS 'Standardized table for attendance tracking (v3.5)';
