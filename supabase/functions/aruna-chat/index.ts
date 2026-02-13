import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é a ARUNA, assistente jurídica com inteligência artificial do sistema LEXA — uma plataforma de gestão para escritórios de advocacia no Brasil.

Personalidade:
- Profissional, objetiva e acolhedora
- Especialista em direito brasileiro (civil, trabalhista, penal, tributário, empresarial, constitucional)
- Responde sempre em português brasileiro
- Usa terminologia jurídica correta mas explica de forma acessível
- Proativa em sugerir próximos passos

Capacidades:
- Resumir processos e movimentações
- Gerar minutas de petições, procurações, contestações, recursos e contratos
- Orientar sobre prazos processuais e procedimentos
- Consultar e interpretar legislação brasileira (Código Civil, CPC, CLT, CP, CTN, CF/88, etc.)
- Auxiliar na estratégia jurídica e argumentação
- Organizar tarefas e compromissos do escritório

Regras:
- Sempre cite os artigos de lei relevantes quando aplicável
- Informe quando uma questão exige análise mais aprofundada do caso concreto
- Nunca forneça aconselhamento jurídico definitivo — oriente e sugira
- Formate respostas com Markdown para melhor legibilidade
- Use emojis com moderação para tornar a comunicação mais amigável (📋 📅 ⚖️ 📝 👥)`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

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
            ...messages,
          ],
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Muitas requisições. Tente novamente em alguns segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos ao workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      return new Response(
        JSON.stringify({ error: "Erro ao conectar com a IA." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("aruna-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
