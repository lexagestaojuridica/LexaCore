/**
 * Untyped Supabase client for tables not yet reflected in Lovable Cloud types.
 * Use `db` for queries, `supabaseClient` for typed operations like functions.invoke.
 */
import { supabase } from "@/integrations/supabase/client";

export const db = supabase as any;
export const supabaseClient = supabase;
