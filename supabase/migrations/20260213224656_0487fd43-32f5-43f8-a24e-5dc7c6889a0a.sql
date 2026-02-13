
-- Add more fields to clients table for a complete registration form
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS client_type text DEFAULT 'pessoa_fisica',
  ADD COLUMN IF NOT EXISTS rg text,
  ADD COLUMN IF NOT EXISTS birth_date date,
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS marital_status text,
  ADD COLUMN IF NOT EXISTS nationality text DEFAULT 'Brasileira',
  ADD COLUMN IF NOT EXISTS profession text,
  ADD COLUMN IF NOT EXISTS address_street text,
  ADD COLUMN IF NOT EXISTS address_number text,
  ADD COLUMN IF NOT EXISTS address_complement text,
  ADD COLUMN IF NOT EXISTS address_neighborhood text,
  ADD COLUMN IF NOT EXISTS address_city text,
  ADD COLUMN IF NOT EXISTS address_state text,
  ADD COLUMN IF NOT EXISTS address_zip text,
  ADD COLUMN IF NOT EXISTS secondary_phone text,
  ADD COLUMN IF NOT EXISTS secondary_email text,
  ADD COLUMN IF NOT EXISTS company_name text,
  ADD COLUMN IF NOT EXISTS company_position text;
