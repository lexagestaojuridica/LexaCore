import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || ''

// Webhook Webhook Oficial da Meta (WhatsApp Business API) ou Z-API / EvolutionAPI
Deno.serve(async (req) => {
  if (req.method === 'GET') {
    // Validação de Webhook (Meta API)
    const url = new URL(req.url)
    const mode = url.searchParams.get('hub.mode')
    const token = url.searchParams.get('hub.verify_token')
    const challenge = url.searchParams.get('hub.challenge')

    if (mode === 'subscribe' && token === Deno.env.get('WHATSAPP_VERIFY_TOKEN')) {
      return new Response(challenge, { status: 200 })
    }
    return new Response('Forbidden', { status: 403 })
  }

  try {
    const payload = await req.json()
    // Estrutura simplificada de recebimento:
    const message = payload.entry?.[0]?.changes?.[0]?.value?.messages?.[0]
    
    if (message && message.type === 'text') {
      const phone = message.from
      const text = message.text.body

      const supabase = createClient(supabaseUrl, supabaseAnonKey)

      // 1. Identificar o cliente pelo telefone
      const { data: client } = await supabase
        .from('clients')
        .select('id, organization_id, name')
        .eq('phone', phone)
        .single()

      if (client) {
        // 2. Acionar a Aruna (RAG) internamente para gerar resposta
        // Aqui chamariamos o endpoint de geração ou função local da Aruna
        const aiResponse = `Olá ${client.name}, sou a Aruna. Recebi sua mensagem: "${text}". Em breve atualizaremos seu processo.`
        
        // 3. Registrar a interação Omnichannel no banco para histórico no Lexa
        await supabase.from('conversas_ia').insert({
          role: 'user',
          content: `[WhatsApp] ${text}`,
          organization_id: client.organization_id,
          user_id: null // Identificado apenas pelo cliente
        })

        await supabase.from('conversas_ia').insert({
          role: 'assistant',
          content: `[WhatsApp] ${aiResponse}`,
          organization_id: client.organization_id,
          user_id: null
        })

        // 4. Enviar a resposta de volta ao WhatsApp (via fetch para a API da Meta)
        // fetch('https://graph.facebook.com/v17.0/.../messages', { ... })
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})
