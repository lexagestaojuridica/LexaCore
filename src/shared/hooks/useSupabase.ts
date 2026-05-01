import { useSession } from "@clerk/nextjs";
import { createClient } from "@supabase/supabase-js";
import { useMemo } from "react";
import type { Database } from "@/integrations/supabase/types";

export function useSupabase() {
  const { session } = useSession();

  const supabase = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

    console.log("useSupabase: Initializing client...");

    return createClient<Database>(url, key, {
      global: {
        fetch: async (url, options = {}) => {
          console.log("useSupabase: Fetching...", url);
          try {
            const token = await session?.getToken({ template: "supabase" });
            console.log("useSupabase: Token status", token ? "Obtained" : "Missing");
            const headers = new Headers(options.headers);
            if (token) {
              headers.set("Authorization", `Bearer ${token}`);
            }
            return fetch(url, { ...options, headers });
          } catch (e) {
            console.error("useSupabase: Error getting token", e);
            return fetch(url, options);
          }
        },
      },
    });
  }, [session]);

  return supabase;
}
