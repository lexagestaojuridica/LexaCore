import { z } from "zod";
import { createTRPCRouter, tenantProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

export const financeiroRouter = createTRPCRouter({
    list: tenantProcedure
        .input(z.object({
            type: z.enum(["receber", "pagar"]),
        }))
        .query(async ({ ctx, input }) => {
            const { tenantId, db } = ctx;
            const tableName = input.type === "receber" ? "contas_receber" : "contas_pagar";

            const { data, error } = await db
                .from(tableName)
                .select("*")
                .eq("organization_id", tenantId!)
                .order("due_date", { ascending: true });

            if (error) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: `Erro ao buscar contas a ${input.type}`,
                    cause: error,
                });
            }

            return data || [];
        }),

    getMetrics: tenantProcedure.query(async ({ ctx }) => {
        const { tenantId, db } = ctx;

        const [receber, pagar] = await Promise.all([
            db.from("contas_receber").select("amount, status").eq("organization_id", tenantId!),
            db.from("contas_pagar").select("amount, status").eq("organization_id", tenantId!),
        ]);

        const totalReceber = (receber.data || []).filter((c) => c.status === "pendente").reduce((s, c) => s + Number(c.amount), 0);
        const totalPagar = (pagar.data || []).filter((c) => c.status === "pendente").reduce((s, c) => s + Number(c.amount), 0);
        const totalRecebido = (receber.data || []).filter((c) => c.status === "pago").reduce((s, c) => s + Number(c.amount), 0);
        const totalPagoVal = (pagar.data || []).filter((c) => c.status === "pago").reduce((s, c) => s + Number(c.amount), 0);
        const saldo = totalRecebido - totalPagoVal;

        const totalFluxo = totalReceber + totalPagar;
        const healthPercent = totalFluxo === 0 ? 50 : (totalReceber / totalFluxo) * 100;

        return {
            totalReceber,
            totalPagar,
            totalRecebido,
            totalPagoVal,
            saldo,
            healthPercent
        };
    }),

    create: tenantProcedure
        .input(z.object({
            type: z.enum(["receber", "pagar"]),
            data: z.any(),
        }))
        .mutation(async ({ ctx, input }) => {
            const { tenantId, db } = ctx;
            const tableName = input.type === "receber" ? "contas_receber" : "contas_pagar";

            const { error, data } = await db
                .from(tableName)
                .insert({ ...input.data, organization_id: tenantId })
                .select()
                .single();

            if (error) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Erro ao criar lançamento",
                    cause: error,
                });
            }

            return data;
        }),

    update: tenantProcedure
        .input(z.object({
            type: z.enum(["receber", "pagar"]),
            id: z.string(),
            data: z.any(),
        }))
        .mutation(async ({ ctx, input }) => {
            const { tenantId, db } = ctx;
            const tableName = input.type === "receber" ? "contas_receber" : "contas_pagar";

            const { error } = await db
                .from(tableName)
                .update(input.data)
                .eq("id", input.id)
                .eq("organization_id", tenantId!);

            if (error) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Erro ao atualizar lançamento",
                    cause: error,
                });
            }

            return { success: true };
        }),

    delete: tenantProcedure
        .input(z.object({
            type: z.enum(["receber", "pagar"]),
            id: z.string(),
        }))
        .mutation(async ({ ctx, input }) => {
            const { tenantId, db } = ctx;
            const tableName = input.type === "receber" ? "contas_receber" : "contas_pagar";

            const { error } = await db
                .from(tableName)
                .delete()
                .eq("id", input.id)
                .eq("organization_id", tenantId!);

            if (error) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Erro ao excluir lançamento",
                    cause: error,
                });
            }

            return { success: true };
        }),

    generatePix: tenantProcedure
        .input(z.object({
            id: z.string(), // Transaction ID in contas_receber
        }))
        .mutation(async ({ ctx, input }) => {
            const { tenantId, db } = ctx;

            // 1. Get Transaction
            const { data: c, error: cErr } = await db
                .from("contas_receber")
                .select("*")
                .eq("id", input.id)
                .eq("organization_id", tenantId!)
                .single();

            if (cErr || !c) throw new TRPCError({ code: "NOT_FOUND", message: "Lançamento não encontrado" });

            // 2. Get Asaas Settings
            const { data: gateway } = await db
                .from("gateway_settings")
                .select("api_key, environment, status")
                .eq("organization_id", tenantId!)
                .eq("gateway_name", "asaas")
                .maybeSingle();

            if (!gateway?.api_key || gateway.status !== "active") {
                throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Integração Asaas inativa" });
            }

            const ASAAS_BASE = gateway.environment === "production" ? "https://www.asaas.com/api/v3" : "https://sandbox.asaas.com/api/v3";

            // 3. Create Payment in Asaas
            const payload = {
                customer: c.client_id || "",
                billingType: "PIX",
                value: Number(c.amount),
                dueDate: c.due_date,
                description: c.description || "",
                externalReference: c.id,
            };

            const response = await fetch(`${ASAAS_BASE}/payments`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "access_token": gateway.api_key,
                },
                body: JSON.stringify(payload),
            });

            const paymentData: any = await response.json();
            if (!response.ok) {
                throw new TRPCError({ code: "BAD_GATEWAY", message: paymentData?.errors?.[0]?.description || "Erro no Asaas" });
            }

            const pixCode = paymentData.pixTransaction?.payload || paymentData.encodedImage || "";

            // 4. Update local DB
            await db.from("contas_receber").update({
                pix_code: pixCode,
                gateway_id: paymentData.id,
                asaas_id: paymentData.id,
            }).eq("id", c.id);

            return { success: true, pixCode };
        }),

    reconcile: tenantProcedure
        .input(z.object({
            id: z.string(),
            type: z.enum(["receber", "pagar"]),
        }))
        .mutation(async ({ ctx, input }) => {
            const { tenantId, db } = ctx;
            const tableName = input.type === "receber" ? "contas_receber" : "contas_pagar";

            // 1. Get Transaction
            const { data: c } = await db
                .from(tableName)
                .select("*")
                .eq("id", input.id as any)
                .single() as any;

            if (!c?.asaas_id) return { status: "no_asaas_id" };

            // 2. Get Settings
            const { data: gateway } = await db
                .from("gateway_settings")
                .select("api_key, environment, status")
                .eq("organization_id", tenantId!)
                .eq("gateway_name", "asaas")
                .maybeSingle();

            if (!gateway?.api_key) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Configuração ausente" });

            const ASAAS_BASE = gateway.environment === "production" ? "https://www.asaas.com/api/v3" : "https://sandbox.asaas.com/api/v3";

            // 3. Check status in Asaas
            const response = await fetch(`${ASAAS_BASE}/payments/${c.asaas_id}`, {
                headers: { "access_token": gateway.api_key },
            });

            const payment: any = await response.json();
            if (!response.ok) return { status: "error_fetching_asaas" };

            if (["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"].includes(payment.status)) {
                await db.from(tableName as any).update({
                    status: "pago",
                    updated_at: new Date().toISOString()
                }).eq("id", c.id);
                return { status: "confirmed", asaasStatus: payment.status };
            }

            return { status: "pending", asaasStatus: payment.status };
        }),
});
