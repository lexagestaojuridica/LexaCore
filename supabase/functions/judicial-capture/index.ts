import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        // 1. Get all processes with auto-capture enabled
        const { data: processes, error: processesError } = await supabaseClient
            .from("processos_juridicos")
            .select("id, number, organization_id")
            .eq("auto_capture_enabled", true)
            .neq("number", null)
            .neq("number", "");

        if (processesError || !processes) {
            throw new Error(`Erro ao buscar processos: ${processesError?.message}`);
        }

        if (processes.length === 0) {
            return new Response(JSON.stringify({ message: "Nenhum processo com captura automática habilitada." }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            });
        }

        // 2. Mock API call array (simulate finding new captures for 1/3 of the processes)
        const newCaptures = [];

        for (const process of processes) {
            // Fake logic: randomly decide if this process has a new update
            const hasUpdate = Math.random() > 0.6; // 40% chance of a new capture

            if (hasUpdate) {
                newCaptures.push({
                    process_id: process.id,
                    source: Math.random() > 0.5 ? "Jusbrasil" : "Escavador",
                    capture_date: new Date().toISOString(),
                    content: `Publicação no Diário Oficial referente ao processo nº ${process.number}. Despacho: Mantenha-se o feito em arquivo provisório. Intimem-se as partes. Prazo 15 dias.`
                });
            }
        }

        if (newCaptures.length > 0) {
            // 3. Insert captures into the database
            const { error: insertError } = await supabaseClient
                .from("process_captures")
                .insert(newCaptures);

            if (insertError) {
                throw new Error(`Erro ao salvar capturas: ${insertError.message}`);
            }
        }

        // This can be triggered by a pg_cron daily at 00:00 or a Supabase scheduled edge function.
        return new Response(JSON.stringify({
            success: true,
            scanned_processes: processes.length,
            new_captures_count: newCaptures.length,
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        });
    } catch (error: any) {
        console.error("Judicial Capture Error:", error.message);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
        });
    }
});
