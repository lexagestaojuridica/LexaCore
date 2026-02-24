import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.3";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é a ARUNA, assistente jurídica especialista em sumarização de andamentos processuais.

Sua tarefa é ler um conjunto de movimentações judiciais e gerar um "Resumo para o Cliente" e um "Resumo Técnico (Advogado)".

1. **Resumo para o Cliente**: Use linguagem simples, sem juridiquês. Foque no que mudou, se há algo que o cliente precisa fazer e qual o provável próximo passo.
2. **Resumo Técnico**: Use terminologia jurídica precisa. Destaque prazos, decisões interlocutórias, recursos e estratégias sugeridas.

Formatação:
- Responda em Markdown.
- Use emojis moderadamente para facilitar a leitura.
- Seja conciso mas completo.`;

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const { process_id, content, organization_id } = await req.json();

        if (!process_id || !content) {
            return new Response(
                JSON.stringify({ error: "ID do processo e conteúdo são obrigatórios." }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
        if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

        const userPrompt = `Fatos a resumir do processo (${process_id}):
    
${content}

---
Instrução: Gere os dois resumos solicitados (Cliente e Técnico).`;

        const response = await fetch(
            "https://ai.gateway.lovable.dev/v1/chat/completions",
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${LOVABLE_API_KEY}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    model: "google/gemini-3-flash-preview",
                    messages: [
                        { role: "system", content: SYSTEM_PROMPT },
                        { role: "user", content: userPrompt },
                    ],
                }),
            }
        );

        if (!response.ok) {
            const text = await response.text();
            console.error("AI gateway error:", response.status, text);
            return new Response(
                JSON.stringify({ error: "Erro ao conectar com a IA." }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const result = await response.json();
        const summary = result.choices[0].message.content;

        return new Response(JSON.stringify({ summary }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    } catch (e) {
        console.error("aruna-process-summary error:", e);
        return new Response(
            JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
