import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';

if (!SUPABASE_URL && typeof window !== 'undefined') {
  console.warn(
    "Missing environment variable: NEXT_PUBLIC_SUPABASE_URL. " +
    "Please check your .env.local file (see .env.example for reference) and ensure it's set correctly."
  );
}

if (!SUPABASE_PUBLISHABLE_KEY && typeof window !== 'undefined') {
  console.warn(
    "Missing environment variable: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. " +
    "Please check your .env.local file (see .env.example for reference) and ensure it's set correctly."
  );
}

// Throttle clerk JWT warning to avoid console spam
let jwtWarningLogged = false;

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  global: {
    fetch: async (url, options: RequestInit = {}) => {
      let clerkToken: string | null = null;
      try {
        const clerk = (window as any).Clerk;
        if (typeof window !== "undefined" && clerk?.session) {
          clerkToken = await clerk.session.getToken({ template: "supabase" });
        }
      } catch (err: unknown) {
        const e = err as { message?: string };
        if (e.message?.includes("template")) {
          if (!jwtWarningLogged) {
            console.error("❌ ERRO LEXA: Template JWT 'supabase' não encontrado no Clerk. Configure-o no dashboard do Clerk para habilitar RLS/IA.");
            jwtWarningLogged = true;
          }
        } else {
          console.error("Error getting Clerk token for Supabase", e);
        }
      }

      const headers = new Headers(options.headers);
      if (clerkToken) {
        headers.set("Authorization", `Bearer ${clerkToken}`);
      }

      return fetch(url, {
        ...options,
        headers,
      });
    },
  },
});
