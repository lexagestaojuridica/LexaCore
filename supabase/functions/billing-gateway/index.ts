import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
            { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
        );

        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) throw new Error("Unauthorized");

        const { action, planId, interval } = await req.json();

        // In a real implementation, you would use Stripe or Asaas here
        // const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY");

        if (action === "create-checkout") {
            console.log(`Creating mock checkout for user ${user.id} on plan ${planId}`);

            // Mock Success URL
            const mockUrl = `${new URL(req.url).origin}/dashboard/configuracoes?success=true`;

            return new Response(
                JSON.stringify({ url: mockUrl }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        if (action === "create-portal") {
            const mockUrl = `${new URL(req.url).origin}/dashboard/configuracoes?portal=true`;
            return new Response(
                JSON.stringify({ url: mockUrl }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        throw new Error("Invalid action");
    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
