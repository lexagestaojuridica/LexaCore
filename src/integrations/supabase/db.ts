/**
 * Untyped Supabase client for tables not yet reflected in Lovable Cloud types.
 * 
 * Use `db` instead of `supabase` when querying tables that exist in the external
 * Supabase but are not in the auto-generated types (e.g., rh_*, orcamentos, 
 * notifications, support_tickets, etc.)
 * 
 * This is a temporary workaround until schema sync is complete.
 */
import { supabase } from "@/integrations/supabase/client";

export const db = supabase as any;
