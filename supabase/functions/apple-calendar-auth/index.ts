import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabaseUser = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { action, apple_id, app_specific_password, caldav_url } = await req.json();

    if (action === "verify_and_save") {
      if (!apple_id || !app_specific_password) {
        throw new Error("Apple ID e senha de aplicativo são obrigatórios.");
      }

      const credentials = btoa(`${apple_id}:${app_specific_password}`);
      const endpoint = caldav_url || "https://caldav.icloud.com/";

      // Basic PROPFIND to iCloud CalDAV to check credentials validity
      const response = await fetch(endpoint, {
        method: "PROPFIND",
        headers: {
          Authorization: `Basic ${credentials}`,
          Depth: "0",
        },
      });

      if (response.status === 401 || response.status === 403) {
        throw new Error("Credenciais inválidas. Verifique o Apple ID e a Senha de Aplicativo gerada (formato: xxxx-xxxx-xxxx-xxxx).");
      }

      // Get user profile for org_id
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("organization_id")
        .eq("user_id", user.id)
        .single();

      if (!profile?.organization_id) throw new Error("Organization not found");

      // Save to database
      const { error: insertError } = await supabaseAdmin
        .from("apple_calendar_tokens")
        .upsert({
          user_id: user.id,
          organization_id: profile.organization_id,
          apple_id: apple_id,
          app_specific_password: app_specific_password,
          caldav_url: endpoint,
        }, { onConflict: 'user_id' });

      if (insertError) throw insertError;

      return new Response(
        JSON.stringify({ success: true, message: "Apple Calendar conectado com sucesso!" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erro desconhecido ao verificar Apple ID.";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
