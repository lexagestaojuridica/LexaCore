import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ASAAS_API_KEY = Deno.env.get('ASAAS_API_KEY') || '';
// Use sandbox URL for testing, production URL otherwise
const ASAAS_API_URL = Deno.env.get('ASAAS_API_URL') || 'https://sandbox.asaas.com/api/v3';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // Verify user
    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) throw new Error("Não autorizado")

    const { client_id, amount, description, due_date, organization_id } = await req.json()

    // 1. Get client details
    const { data: clientData, error: clientError } = await supabaseClient
      .from('clients')
      .select('*')
      .eq('id', client_id)
      .single()

    if (clientError || !clientData) throw new Error("Cliente não encontrado")

    let asaasCustomerId = clientData.asaas_customer_id

    // 2. Create Asaas Customer if not exists
    if (!asaasCustomerId) {
       const createCustomerPayload = {
         name: clientData.name,
         cpfCnpj: clientData.document?.replace(/\D/g, ''),
         email: clientData.email,
         phone: clientData.phone?.replace(/\D/g, ''),
         mobilePhone: clientData.phone?.replace(/\D/g, '')
       }

       const customerRes = await fetch(`${ASAAS_API_URL}/customers`, {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json',
           'access_token': ASAAS_API_KEY
         },
         body: JSON.stringify(createCustomerPayload)
       })

       if (!customerRes.ok) {
          const err = await customerRes.json()
          throw new Error(`Falha ao criar cliente no Asaas: ${JSON.stringify(err)}`)
       }

       const asaasCustomer = await customerRes.json()
       asaasCustomerId = asaasCustomer.id

       // Save to DB
       // We use a service role key if user doesn't have RLS permission to update clients, but RLS should allow if same org
       await supabaseClient
         .from('clients')
         .update({ asaas_customer_id: asaasCustomerId })
         .eq('id', client_id)
    }

    // 3. Create Charge (PIX by default for simplicity, can be BOLETO)
    const chargePayload = {
      customer: asaasCustomerId,
      billingType: 'PIX',
      value: amount,
      dueDate: due_date || new Date().toISOString().split('T')[0],
      description: description,
      externalReference: `lexa_charge_${Date.now()}`
    }

    const chargeRes = await fetch(`${ASAAS_API_URL}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': ASAAS_API_KEY
      },
      body: JSON.stringify(chargePayload)
    })

    if (!chargeRes.ok) {
      const err = await chargeRes.json()
      throw new Error(`Falha ao criar cobrança no Asaas: ${JSON.stringify(err)}`)
    }

    const chargeData = await chargeRes.json()

    // 4. Create internal Conta a Receber
    const { data: novaConta, error: dbError } = await supabaseClient
      .from('contas_receber')
      .insert({
        organization_id,
        description,
        amount,
        due_date: chargeData.dueDate,
        status: 'pendente',
        client_id,
        asaas_id: chargeData.id,
        asaas_billing_url: chargeData.invoiceUrl,
        pix_code: chargeData.pixQrCode // Assuming we need to fetch pixQrCode if not returned, usually it isn't in the same payload for BOLETO. For PIX, Asaas generates it.
      })
      .select()
      .single()

    if (dbError) throw dbError

    // Let's also try to get the PIX encoded string directly to store it
     const pixRes = await fetch(`${ASAAS_API_URL}/payments/${chargeData.id}/pixQrCode`, {
        headers: {
           'access_token': ASAAS_API_KEY
        }
     })
     if (pixRes.ok) {
        const pixData = await pixRes.json()
        await supabaseClient.from('contas_receber').update({ pix_code: pixData.payload }).eq('id', novaConta.id)
        novaConta.pix_code = pixData.payload
     }

    return new Response(JSON.stringify({ success: true, conta: novaConta }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (err: any) {
    console.error(err)
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
