import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DOC_TYPE_PROMPTS: Record<string, string> = {
  peticao_inicial: "Gere uma petição inicial completa e bem fundamentada",
  procuracao: "Gere uma procuração ad judicia et extra completa",
  contestacao: "Gere uma contestação completa e bem fundamentada",
  recurso: "Gere um recurso de apelação completo e fundamentado",
  contrato: "Gere um contrato completo com todas as cláusulas necessárias",
  notificacao: "Gere uma notificação extrajudicial formal",
  parecer: "Gere um parecer jurídico fundamentado",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { doc_type, instructions, client_id, process_id, organization_id, user_id } = await req.json();

    if (!doc_type || !organization_id || !user_id) {
      return new Response(
        JSON.stringify({ error: "Parâmetros obrigatórios: doc_type, organization_id, user_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Build the prompt
    const basePrompt = DOC_TYPE_PROMPTS[doc_type] || "Gere um documento jurídico";
    const systemPrompt = `Você é a ARUNA, assistente jurídica especializada em direito brasileiro.
Gere documentos jurídicos completos, profissionais e prontos para uso.
- Use formatação Markdown adequada
- Inclua todos os campos necessários com marcadores [PREENCHER] onde dados específicos são necessários
- Cite artigos de lei relevantes
- Use linguagem jurídica formal brasileira
- Inclua cabeçalho, corpo e fechamento apropriados para o tipo de documento
- Data atual: ${new Date().toLocaleDateString("pt-BR")}`;

    const userPrompt = `${basePrompt}.
${instructions ? `\nInstruções adicionais: ${instructions}` : ""}
\nGere o documento completo em Markdown.`;

    // Call AI to generate the document (non-streaming)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000); // 45s for generative AI

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: false,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Muitas requisições. Tente novamente em alguns segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos de IA esgotados." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const text = await aiResponse.text();
      console.error("AI error:", aiResponse.status, text);
      throw new Error("Erro ao gerar documento com IA");
    }

    const aiData = await aiResponse.json();
    const documentContent = aiData.choices?.[0]?.message?.content;
    if (!documentContent) throw new Error("IA não retornou conteúdo");

    // Save as .md file in storage
    const docTypeLabels: Record<string, string> = {
      peticao_inicial: "Petição Inicial",
      procuracao: "Procuração",
      contestacao: "Contestação",
      recurso: "Recurso",
      contrato: "Contrato",
      notificacao: "Notificação Extrajudicial",
      parecer: "Parecer Jurídico",
    };

    const label = docTypeLabels[doc_type] || "Documento";
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const fileName = `${label} - ${timestamp}.md`;
    const filePath = `${organization_id}/${user_id}/${fileName}`;

    // Upload to storage
    const fileBlob = new Blob([documentContent], { type: "text/markdown" });
    const { error: uploadError } = await supabase.storage
      .from("documentos")
      .upload(filePath, fileBlob, { contentType: "text/markdown", upsert: false });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      throw new Error("Erro ao salvar arquivo: " + uploadError.message);
    }

    // Save metadata in documentos table
    const { data: docRecord, error: dbError } = await supabase
      .from("documentos")
      .insert({
        file_name: fileName,
        file_path: filePath,
        file_type: "text/markdown",
        user_id,
        organization_id,
        client_id: client_id || null,
        process_id: process_id || null,
      })
      .select("id, file_name")
      .single();

    if (dbError) {
      console.error("DB error:", dbError);
      throw new Error("Erro ao registrar documento: " + dbError.message);
    }

    return new Response(
      JSON.stringify({
        success: true,
        document: docRecord,
        content_preview: documentContent.slice(0, 500),
        message: `📝 Documento "${label}" gerado e salvo com sucesso!`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    console.error("aruna-generate-doc error:", e);
    if (e.name === "AbortError") {
      return new Response(
        JSON.stringify({ error: "O provedor de IA demorou muito para responder (Timeout). Tente novamente." }),
        { status: 504, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
