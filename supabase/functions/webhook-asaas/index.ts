import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const payload = await req.json();
        console.log("Asaas Webhook Event:", payload.event);

        const asaasPaymentId = payload.payment?.id;
        const event = payload.event;

        if (!asaasPaymentId) {
            // Retorna 200 para evitar retentativas de eventos irrelevantes
            return new Response(JSON.stringify({ message: "Ignorado - sem payment id" }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            });
        }

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        let newStatus = '';
        if (event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED') {
            newStatus = 'pago';
        } else if (event === 'PAYMENT_OVERDUE') {
            newStatus = 'vencido';
        } else if (event === 'PAYMENT_DELETED' || event === 'PAYMENT_REFUNDED') {
            newStatus = 'cancelado';
        }

        if (newStatus) {
            console.log(`Atualizando fatura ${asaasPaymentId} para o status ${newStatus}`);

            const { error } = await supabaseAdmin
                .from('contas_receber')
                .update({
                    status: newStatus,
                    updated_at: new Date().toISOString()
                })
                .eq('asaas_payment_id', asaasPaymentId);

            if (error) {
                console.error("Supabase Error Update Recebimentos:", error.message);
            }
        }

        return new Response(JSON.stringify({ message: "Webhook processado com sucesso" }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });
    } catch (error: any) {
        console.error('Webhook processing error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        });
    }
});
