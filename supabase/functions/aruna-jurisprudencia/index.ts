import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é a ARUNA, assistente jurídica especialista em pesquisa de jurisprudência brasileira.

Sua tarefa é realizar pesquisas detalhadas de jurisprudência com base na consulta do usuário.

Para cada pesquisa, você deve:

1. **Identificar os temas jurídicos** relevantes à consulta
2. **Citar jurisprudência relevante** dos tribunais superiores brasileiros (STF, STJ, TST, TSE) e tribunais regionais
3. **Apresentar ementas** resumidas dos julgados mais relevantes
4. **Indicar a tendência jurisprudencial** atual sobre o tema
5. **Citar artigos de lei** e súmulas vinculantes/persuasivas aplicáveis
6. **Sugerir teses jurídicas** que podem ser utilizadas

Formatação:
- Use Markdown estruturado com títulos, listas e citações
- Cite o número do processo/recurso quando possível (formato: REsp nº X.XXX.XXX/UF, RE nº XXXXXX, etc.)
- Indique tribunal, relator e data quando disponíveis
- Destaque súmulas e teses vinculantes em blocos de citação
- Use emojis moderadamente: ⚖️ 📋 🔍 📚

IMPORTANTE: Você está usando seu conhecimento treinado. Informe ao usuário que a pesquisa é baseada no seu treinamento e recomende verificação nos sites oficiais dos tribunais (stf.jus.br, stj.jus.br, tst.jus.br) para jurisprudência atualizada.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, area, context } = await req.json();

    if (!query) {
      return new Response(
        JSON.stringify({ error: "Consulta não informada." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const userPrompt = `Pesquise jurisprudência sobre o seguinte tema:

**Consulta:** ${query}
${area ? `**Área do Direito:** ${area}` : ""}
${context ? `**Contexto adicional:** ${context}` : ""}

Forneça uma pesquisa completa e estruturada.`;

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
    console.error("aruna-jurisprudencia error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
