import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ASAAS_SANDBOX = "https://sandbox.asaas.com/api/v3";
const ASAAS_PROD = "https://www.asaas.com/api/v3";

// Plan → Asaas subscription cycle config
const PLAN_VALUE: Record<string, number> = {
    free: 0,
    pro: 197,
    enterprise: 497,
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    const json = (data: unknown, status = 200) =>
        new Response(JSON.stringify(data), {
            status,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    try {
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
            { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
        );

        // Authenticate the user
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) return json({ error: "Unauthorized" }, 401);

        // Get user's organization
        const { data: profile } = await supabase
            .from("profiles")
            .select("organization_id, full_name")
            .eq("user_id", user.id)
            .single();

        if (!profile?.organization_id) return json({ error: "Organization not found" }, 400);
        const orgId = profile.organization_id;

        const body = await req.json();
        const { action, planId, interval = "MONTHLY" } = body;

        // ─── Get Asaas gateway settings for this org ─────────────────────────────
        const { data: gateway } = await supabase
            .from("gateway_settings")
            .select("api_key, environment, status")
            .eq("organization_id", orgId)
            .eq("gateway_name", "asaas")
            .maybeSingle();

        const appOrigin = req.headers.get("origin") ?? Deno.env.get("APP_URL") ?? "https://app.lexanova.com.br";

        // ─── create-checkout ────────────────────────────────────────────────────
        if (action === "create-checkout") {
            if (!gateway?.api_key || gateway.status !== "active") {
                // No Asaas configured — redirect to integration settings page
                const setupUrl = `${appOrigin}/dashboard/configuracoes?tab=integracoes&needs=asaas`;
                return json({ url: setupUrl });
            }

            if (!planId || planId === "free") {
                // Downgrading to free — just update subscription directly
                const { error } = await supabase
                    .from("subscriptions")
                    .update({ plan_id: planId, status: "active" })
                    .eq("organization_id", orgId);
                if (error) throw error;
                return json({ url: `${appOrigin}/dashboard/configuracoes?success=true&plan=${planId}` });
            }

            const baseUrl = gateway.environment === "production" ? ASAAS_PROD : ASAAS_SANDBOX;
            const value = PLAN_VALUE[planId] ?? 197;

            // Get or create Asaas customer
            const { data: org } = await supabase
                .from("organizations")
                .select("name, asaas_customer_id")
                .eq("id", orgId)
                .single();

            let asaasCustomerId: string = (org as any)?.asaas_customer_id ?? "";

            if (!asaasCustomerId) {
                // Fetch user email
                const { data: { user: authUser } } = await supabase.auth.admin.getUserById(user.id);
                const controllerCust = new AbortController();
                const timeoutCust = setTimeout(() => controllerCust.abort(), 15000);
                const customerRes = await fetch(`${baseUrl}/customers`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", "access_token": gateway.api_key },
                    body: JSON.stringify({
                        name: (org as any)?.name ?? profile.full_name ?? "Cliente",
                        email: authUser?.email ?? "",
                        externalReference: orgId,
                    }),
                    signal: controllerCust.signal,
                });
                clearTimeout(timeoutCust);
                const customer = await customerRes.json();
                asaasCustomerId = customer.id;
                if (asaasCustomerId) {
                    await supabase.from("organizations").update({ asaas_customer_id: asaasCustomerId }).eq("id", orgId);
                }
            }

            if (!asaasCustomerId) throw new Error("Não foi possível criar o cliente no Asaas.");

            // Create payment link (subscription)
            const controllerLink = new AbortController();
            const timeoutLink = setTimeout(() => controllerLink.abort(), 15000);
            const linkRes = await fetch(`${baseUrl}/paymentLinks`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "access_token": gateway.api_key },
                body: JSON.stringify({
                    name: `Assinatura LEXA Nova — Plano ${planId}`,
                    value,
                    billingType: "PIX,BOLETO,CREDIT_CARD",
                    chargeType: "RECURRENT",
                    cycle: interval === "YEARLY" ? "YEARLY" : "MONTHLY",
                    description: `Acesso ao plano ${planId} da plataforma LEXA Nova`,
                    endDate: null,
                    maxInstallmentCount: interval === "YEARLY" ? 12 : 1,
                    subscriptionCycle: interval === "YEARLY" ? "YEARLY" : "MONTHLY",
                    externalReference: `${orgId}:${planId}`,
                }),
                signal: controllerLink.signal,
            });
            clearTimeout(timeoutLink);
            const link = await linkRes.json();
            const checkoutUrl = link.url ?? link.paymentLink?.url;

            if (!checkoutUrl) {
                console.error("Asaas paymentLinks response:", JSON.stringify(link));
                throw new Error("Asaas não retornou URL de pagamento. Verifique as configurações.");
            }

            // Update subscription to pending
            await supabase.from("subscriptions")
                .update({ status: "past_due", gateway_payment_id: link.id })
                .eq("organization_id", orgId);

            return json({ url: checkoutUrl });
        }

        // ─── create-portal ──────────────────────────────────────────────────────
        if (action === "create-portal") {
            if (!gateway?.api_key || gateway.status !== "active") {
                return json({ url: `${appOrigin}/dashboard/configuracoes?tab=integracoes` });
            }

            const baseUrl = gateway.environment === "production" ? ASAAS_PROD : ASAAS_SANDBOX;

            const { data: org } = await supabase
                .from("organizations")
                .select("asaas_customer_id")
                .eq("id", orgId)
                .single();

            const asaasCustomerId = (org as any)?.asaas_customer_id;
            if (!asaasCustomerId) {
                return json({ url: `${appOrigin}/dashboard/configuracoes?tab=planos` });
            }

            const controllerPortal = new AbortController();
            const timeoutPortal = setTimeout(() => controllerPortal.abort(), 15000);
            const portalRes = await fetch(`${baseUrl}/customers/${asaasCustomerId}/portalLink`, {
                headers: { "access_token": gateway.api_key },
                signal: controllerPortal.signal,
            });
            clearTimeout(timeoutPortal);
            const portalData = await portalRes.json();
            const portalUrl = portalData.portalLink ?? `${appOrigin}/dashboard/configuracoes?tab=planos`;

            return json({ url: portalUrl });
        }

        // ─── create-charge ──────────────────────────────────────────────────────
        if (action === "create-charge") {
            const { customerId, clientId, value, dueDate, description, externalReference, sourceType, sourceId, createOnlyLocal } = body;
            
            let asaas_id = null;
            let asaas_url = null;

            // 1. Tenta criar a cobrança no Asaas (apenas se a integração estiver ativa e o cliente possuir Asaas ID)
            if (!createOnlyLocal && gateway?.api_key && gateway.status === "active" && customerId) {
                const baseUrl = gateway.environment === "production" ? ASAAS_PROD : ASAAS_SANDBOX;
                const controllerCharge = new AbortController();
                const timeoutCharge = setTimeout(() => controllerCharge.abort(), 15000);
                
                const chargeRes = await fetch(`${baseUrl}/payments`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", "access_token": gateway.api_key },
                    body: JSON.stringify({
                        customer: customerId,
                        billingType: "UNDEFINED", // Deixa o cliente escolher PIX/Boleto/Cartão
                        value,
                        dueDate: dueDate ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                        description,
                        externalReference,
                    }),
                    signal: controllerCharge.signal,
                });
                clearTimeout(timeoutCharge);
                const chargeData = await chargeRes.json();
                
                if (!chargeRes.ok) {
                    const msg = chargeData?.errors?.[0]?.description ?? chargeData?.message ?? "Erro na API do Asaas";
                    return json({ error: msg }, chargeRes.status);
                }

                asaas_id = chargeData.id;
                asaas_url = chargeData.invoiceUrl;
            }

            // 2. Cria a Conta a Receber local no Lexa (Garantindo Consistência)
            const resolvedDescription = `${description}${asaas_url ? ` | Cobrança: ${asaas_url}` : ""}`;
            const { data: conta, error: contaError } = await supabase
                .from("contas_receber")
                .insert({
                    organization_id: orgId,
                    client_id: clientId || null,
                    description: resolvedDescription,
                    amount: value,
                    due_date: dueDate ?? new Date().toISOString().split('T')[0],
                    status: "pendente",
                    category: "Honorários",
                    asaas_id: asaas_id,
                })
                .select()
                .single();

            if (contaError) {
                console.error("Erro ao salvar conta a receber:", contaError);
                // Se falhou banco, alertamos o front e estornamos ou avisamos o admin:
                throw new Error("Falha ao registrar a conta no banco após criar no Asaas. Contate o suporte.");
            }

            // 3. Atualiza a referência de origem (Ex: Timesheet, Processos)
            if (sourceType === "timesheet" && sourceId) {
                await supabase
                    .from("timesheet_entries")
                    .update({ billing_status: "faturado" })
                    .eq("id", sourceId)
                    .eq("organization_id", orgId);
            } else if (sourceType === "processo" && sourceId) {
                // Atualizações extras caso o source seja um processo recém-encerrado
            }

            return json({ success: true, asaas_id, asaas_url, conta });
        }

        return json({ error: "Invalid action" }, 400);

    } catch (error: any) {
        console.error("billing-gateway error:", error);
        if (error.name === "AbortError") {
            return json({ error: "Gateway Timeout (Asaas API took too long)" }, 504);
        }
        return new Response(
            JSON.stringify({ error: error?.message ?? "Internal error" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
