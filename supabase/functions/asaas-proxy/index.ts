import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * asaas-proxy — Server-side proxy for all Asaas API calls.
 * Routes are:  POST /asaas-proxy   { method, endpoint, body?, organizationId }
 *
 * This avoids CORS issues when calling the Asaas API directly from the browser.
 * All API key lookups happen server-side using the organization's gateway_settings.
 */

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ASAAS_SANDBOX = "https://sandbox.asaas.com/api/v3";
const ASAAS_PROD = "https://www.asaas.com/api/v3";

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    const json = (data: unknown, status = 200) =>
        new Response(JSON.stringify(data), {
            status,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    try {
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
            { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
        );

        // Auth check
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) return json({ error: "Unauthorized" }, 401);

        const { method = "GET", endpoint, body, organizationId } = await req.json();

        if (!endpoint) return json({ error: "endpoint is required" }, 400);
        if (!organizationId) return json({ error: "organizationId is required" }, 400);

        // Verify the user belongs to this organization
        const { data: profile } = await supabase
            .from("profiles")
            .select("organization_id")
            .eq("user_id", user.id)
            .single();

        if (profile?.organization_id !== organizationId) {
            return json({ error: "Forbidden" }, 403);
        }

        // Get Asaas settings for this org
        const { data: gateway } = await supabase
            .from("gateway_settings")
            .select("api_key, environment, status")
            .eq("organization_id", organizationId)
            .eq("gateway_name", "asaas")
            .maybeSingle();

        if (!gateway?.api_key || gateway.status !== "active") {
            return json({ error: "Asaas integration not configured or inactive" }, 422);
        }

        const baseUrl = gateway.environment === "production" ? ASAAS_PROD : ASAAS_SANDBOX;
        const url = `${baseUrl}${endpoint}`;

        const response = await fetch(url, {
            method,
            headers: {
                "Content-Type": "application/json",
                "access_token": gateway.api_key,
                "User-Agent": "LEXA-Nova/1.0",
            },
            body: body && method !== "GET" ? JSON.stringify(body) : undefined,
        });

        const responseData = await response.json();

        if (!response.ok) {
            const msg = responseData?.errors?.[0]?.description ?? responseData?.message ?? "Erro na API do Asaas";
            return json({ error: msg }, response.status);
        }

        return json(responseData);

    } catch (error) {
        console.error("asaas-proxy error:", error);
        return new Response(
            JSON.stringify({ error: error?.message ?? "Internal error" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
