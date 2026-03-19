/**
 * Lazy Supabase client for server-side usage (tRPC context, etc.).
 * Avoids "supabaseUrl is required" errors during `next build` page-data collection,
 * where env vars may not yet be available at module-evaluation time.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from './types';

let _client: SupabaseClient<Database> | null = null;

function getClient() {
  if (!_client) {
    const url =
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.VITE_SUPABASE_URL ||
      "";
    const key =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
      "";

    if (!url || !key) {
      // Return a proxy that throws helpful errors at call-time instead of import-time
      return new Proxy({} as unknown as Record<string, unknown>, {
        get(_, prop) {
          if (typeof prop === "symbol" || prop === "then") return undefined;
          return () => {
            throw new Error(
              `Supabase client not configured – missing SUPABASE_URL / PUBLISHABLE_KEY. Called .${String(prop)}()`
            );
          };
        },
      });
    }

    _client = createClient<Database>(url, key);
  }
  return _client;
}

/** Untyped Supabase client – safe for server & build time */
export const db = new Proxy({} as unknown as SupabaseClient<Database>, {
  get(_, prop) {
    const client = getClient();
    return (client as Record<string, any>)[prop as string];
  },
});

export const supabaseClient = db;
