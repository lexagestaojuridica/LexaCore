import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.3";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é a ARUNA, assistente jurídica especialista em transcrição de áudios jurídicos.

Sua tarefa é transcrever áudios de audiências, reuniões, depoimentos e outros contextos jurídicos.

Regras de transcrição:
1. **Transcreva fielmente** todo o conteúdo falado
2. **Identifique os falantes** quando possível (Juiz, Advogado, Testemunha, Parte, etc.)
3. **Marque momentos importantes** como decisões, acordos, prazos mencionados
4. **Use formatação Markdown** para organizar a transcrição
5. **Indique pausas longas** com [pausa] e trechos inaudíveis com [inaudível]
6. **Adicione timestamps aproximados** quando possível
7. Ao final, forneça um **Resumo Executivo** com os pontos principais

Formato de saída:
- Cabeçalho com tipo de áudio e informações gerais
- Transcrição organizada por falante
- Resumo executivo ao final
- Pontos de atenção e próximos passos identificados`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const audioFile = formData.get("audio") as File;
    const audioType = formData.get("audio_type") as string || "audiencia";
    const instructions = formData.get("instructions") as string || "";
    const orgId = formData.get("organization_id") as string;
    const userId = formData.get("user_id") as string;

    if (!audioFile) {
      return new Response(
        JSON.stringify({ error: "Arquivo de áudio é obrigatório." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Read audio file as base64
    const arrayBuffer = await audioFile.arrayBuffer();
    const base64Audio = base64Encode(arrayBuffer);

    // Determine MIME type
    const mimeType = audioFile.type || "audio/mpeg";

    const audioTypeLabels: Record<string, string> = {
      audiencia: "Audiência Judicial",
      reuniao: "Reunião",
      depoimento: "Depoimento",
      consulta: "Consulta com Cliente",
      outro: "Outro",
    };

    const userPrompt = `Transcreva o seguinte áudio:

**Tipo:** ${audioTypeLabels[audioType] || audioType}
**Arquivo:** ${audioFile.name}
${instructions ? `**Instruções adicionais:** ${instructions}` : ""}

Forneça uma transcrição completa e estruturada.`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            {
              role: "user",
              content: [
                { type: "text", text: userPrompt },
                {
                  type: "image_url",
                  image_url: { url: `data:${mimeType};base64,${base64Audio}` },
                },
              ],
            },
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
          JSON.stringify({ error: "Créditos de IA esgotados." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      return new Response(
        JSON.stringify({ error: "Erro ao transcrever áudio. Verifique o formato do arquivo." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("aruna-transcribe error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
