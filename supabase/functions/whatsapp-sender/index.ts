import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WebhookPayload {
    organization_id: string;
    phone: string;
    message: string;
}

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 401,
            });
        }

        const supabaseClient = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_ANON_KEY") ?? "",
            { global: { headers: { Authorization: authHeader } } }
        );

        const body: WebhookPayload = await req.json();

        if (!body.organization_id || !body.phone || !body.message) {
            throw new Error("Parâmetros inválidos: organization_id, phone e message são obrigatórios.");
        }

        // 1. Fetch Integration Settings from Organization
        const { data: org, error: orgError } = await supabaseClient
            .from("organizations")
            .select("whatsapp_instance_id, whatsapp_token, whatsapp_enabled")
            .eq("id", body.organization_id)
            .single();

        if (orgError || !org) {
            throw new Error("Organização não encontrada.");
        }

        if (!org.whatsapp_enabled) {
            return new Response(
                JSON.stringify({ message: "Integração do WhatsApp desabilitada pelo escritório." }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        if (!org.whatsapp_instance_id || !org.whatsapp_token) {
            throw new Error("Credenciais do Z-API não configuradas para esta organização.");
        }

        // 2. Format Phone Number (Remove non-digits)
        const formattedPhone = body.phone.replace(/\D/g, "");

        // 3. Send Message via Z-API
        const zapiUrl = `https://api.z-api.io/instances/${org.whatsapp_instance_id}/token/${org.whatsapp_token}/send-text`;

        const response = await fetch(zapiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                phone: formattedPhone,
                message: body.message,
            }),
        });

        const result = await response.json();

        if (!response.ok) {
            console.error("Z-API Error:", result);
            throw new Error(`Erro Z-API: ${result.error || response.statusText}`);
        }

        return new Response(JSON.stringify({ success: true, ...result }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        });
    } catch (error: any) {
        console.error("WhatsApp Sender Error:", error.message);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
        });
    }
});
