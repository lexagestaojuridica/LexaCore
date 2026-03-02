-- Fix Processos Jurídicos RLS Insert permissions
-- This allows organization members to insert and update their own processes.

-- Drop existing policies that might be conflicting
DROP POLICY IF EXISTS "Users can create processes in their org" ON public.processos_juridicos;
DROP POLICY IF EXISTS "Organization members can create processes" ON public.processos_juridicos;

-- Create correct INSERT policy
CREATE POLICY "Users can create processes in their org" ON public.processos_juridicos
FOR INSERT WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM profiles WHERE user_id = auth.uid()
  )
);

-- Ensure UPDATE policy exists and is correct
DROP POLICY IF EXISTS "Users can update processes in their org" ON public.processos_juridicos;
CREATE POLICY "Users can update processes in their org" ON public.processos_juridicos
FOR UPDATE USING (
  organization_id IN (
    SELECT organization_id FROM profiles WHERE user_id = auth.uid()
  )
);
