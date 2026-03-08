import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import OpenAI from "npm:openai";
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
- **Consultar dados reais do escritório** como processos ativos, clientes cadastrados e compromissos da agenda

Regras:
- Sempre cite os artigos de lei relevantes quando aplicável
- Informe quando uma questão exige análise mais aprofundada do caso concreto
- Nunca forneça aconselhamento jurídico definitivo — oriente e sugira
- Formate respostas com Markdown para melhor legibilidade
- Use emojis com moderação para tornar a comunicação mais amigável (📋 📅 ⚖️ 📝 👥)
- Quando houver dados do escritório disponíveis no contexto, USE-OS para dar respostas personalizadas e precisas
- Ao mencionar processos, clientes ou eventos, referencie os dados reais fornecidos no contexto`;

function buildContextBlock(context: any): string {
  if (!context) return "";

  const parts: string[] = [];

  if (context.processos?.length > 0) {
    parts.push("## Processos Jurídicos do Escritório");
    for (const p of context.processos) {
      const lines = [`- **${p.title}**`];
      if (p.number) lines.push(`  Número: ${p.number}`);
      if (p.court) lines.push(`  Tribunal: ${p.court}`);
      if (p.status) lines.push(`  Status: ${p.status}`);
      if (p.subject) lines.push(`  Assunto: ${p.subject}`);
      if (p.client_name) lines.push(`  Cliente: ${p.client_name}`);
      if (p.estimated_value) lines.push(`  Valor estimado: R$ ${Number(p.estimated_value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`);
      if (p.notes) lines.push(`  Notas: ${p.notes}`);
      parts.push(lines.join("\n"));
    }
  }

  if (context.clientes?.length > 0) {
    parts.push("## Clientes Cadastrados");
    for (const c of context.clientes) {
      const lines = [`- **${c.name}**`];
      if (c.email) lines.push(`  Email: ${c.email}`);
      if (c.phone) lines.push(`  Telefone: ${c.phone}`);
      if (c.document) lines.push(`  Documento: ${c.document}`);
      parts.push(lines.join("\n"));
    }
  }

  if (context.eventos?.length > 0) {
    parts.push("## Agenda / Compromissos");
    for (const e of context.eventos) {
      const lines = [`- **${e.title}**`];
      if (e.start_time) lines.push(`  Início: ${e.start_time}`);
      if (e.end_time) lines.push(`  Fim: ${e.end_time}`);
      if (e.category) lines.push(`  Categoria: ${e.category}`);
      if (e.description) lines.push(`  Descrição: ${e.description}`);
      parts.push(lines.join("\n"));
    }
  }

  if (context.documentosRAG?.length > 0) {
    parts.push("## Trechos de Documentos Recuperados (RAG - Vector Search)");
    for (const doc of context.documentosRAG) {
      parts.push(`- (Confiança: ${(doc.similarity * 100).toFixed(1)}%) Texto:\n"${doc.content}"`);
    }
  }

  if (parts.length === 0) return "";

  return `\n\n---\n# BASE DE CONHECIMENTO DO ESCRITÓRIO (use os dados abaixo estruturar a resposta)\n\n${parts.join("\n\n")}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const { messages, context, organizationId } = payload;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY')! });

    // RAG LOGIC: Convert current message to Embedding
    let ragDocs = [];
    if (organizationId && messages.length > 0) {
       const lastMessage = messages[messages.length - 1].content;
       try {
         const embeddingObj = await openai.embeddings.create({
           model: "text-embedding-3-small",
           input: lastMessage
         });
         
         const { data: matchedDocs } = await supabaseAdmin.rpc('match_document_embeddings', {
            query_embedding: embeddingObj.data[0].embedding,
            match_threshold: 0.5,
            match_count: 5,
            org_id: organizationId
         });
         
         if (matchedDocs && matchedDocs.length > 0) {
            ragDocs = matchedDocs;
         }
       } catch (err) {
         console.error("RAG Error:", err);
       }
    }
    
    // Inject documents into the context
    if (!context.documentosRAG) context.documentosRAG = ragDocs;

    const contextBlock = buildContextBlock(context);
    const systemContent = SYSTEM_PROMPT + contextBlock;

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
            { role: "system", content: systemContent },
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
