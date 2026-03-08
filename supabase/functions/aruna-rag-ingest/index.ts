import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"
import OpenAI from "npm:openai"

// Polyfill or lightweight library to parse PDF text in Deno is tricky, 
// usually we rely on an API like Unstructured.io or a deno-compatible pdf lib.
// For the sake of the RAG draft, we will assume we receive plain text metadata or we extract it simply.
// In a real prod environment we could use 'npm:pdf-parse' if node compat is enabled.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY')! })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
    const { documentId, organizationId, textContent } = await req.json()

    if (!textContent || !documentId) {
       throw new Error("Missing 'textContent' or 'documentId'")
    }

    // 1. Chunking Mechanism
    const chunks = chunkText(textContent, 1000)

    // 2. Generate Embeddings for each chunk
    const embeddingsResp = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: chunks,
    })

    const records = chunks.map((chunk, i) => ({
      document_id: documentId,
      organization_id: organizationId,
      content: chunk,
      embedding: embeddingsResp.data[i].embedding,
    }))

    // 3. Save into document_embeddings table
    const { error } = await supabaseAdmin.from('document_embeddings').insert(records)

    if (error) {
       console.error("Erro ao salvar embeddings", error)
       throw error
    }

    return new Response(JSON.stringify({ success: true, chunksProcessed: chunks.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (err: any) {
    console.error(err)
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})

// Simple chunker function based on character length 
function chunkText(text: string, chunkSize: number = 1000, overlap: number = 200): string[] {
  const chunks = []
  let i = 0
  while (i < text.length) {
    chunks.push(text.slice(i, i + chunkSize))
    i += chunkSize - overlap
  }
  return chunks
}
