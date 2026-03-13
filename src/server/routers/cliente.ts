import { z } from "zod";
import { createTRPCRouter, tenantProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

export const clienteRouter = createTRPCRouter({
    list: tenantProcedure
        .input(
            z.object({
                page: z.number().default(1),
                pageSize: z.number().default(15),
                search: z.string().optional(),
            })
        )
        .query(async ({ ctx, input }) => {
            const { tenantId, db } = ctx;
            const { page, pageSize, search } = input;

            let query = db
                .from("clients")
                .select("*", { count: "exact" })
                .eq("organization_id", tenantId as any)
                .order("created_at", { ascending: false });

            if (search) {
                query = query.or(
                    `name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%,document.ilike.%${search}%,company_name.ilike.%${search}%`
                );
            }

            const from = (page - 1) * pageSize;
            const to = from + pageSize - 1;
            query = query.range(from, to);

            const { data, error, count } = await query;

            if (error) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Erro ao buscar clientes",
                    cause: error,
                });
            }

            return {
                data,
                count: count ?? 0,
            };
        }),

    getDocs: tenantProcedure
        .input(z.string())
        .query(async ({ ctx, input: clientId }) => {
            const { db } = ctx;
            const { data, error } = await db
                .from("documentos")
                .select("id, file_name, file_path, file_type, created_at")
                .eq("client_id", clientId as any)
                .order("created_at", { ascending: false });

            if (error) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Erro ao buscar documentos do cliente",
                    cause: error,
                });
            }

            return data;
        }),

    create: tenantProcedure
        .input(z.any())
        .mutation(async ({ ctx, input }) => {
            const { tenantId, db } = ctx;
            const { error, data } = await db
                .from("clients")
                .insert({ ...input, organization_id: tenantId })
                .select()
                .single();

            if (error) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Erro ao criar cliente",
                    cause: error,
                });
            }

            return data;
        }),

    update: tenantProcedure
        .input(z.object({
            id: z.string(),
            data: z.any()
        }))
        .mutation(async ({ ctx, input }) => {
            const { tenantId, db } = ctx;
            const { id, data } = input;

            const filteredData = { ...data };
            delete filteredData.organization_id;
            delete filteredData.created_at;

            const { error } = await db
                .from("clients")
                .update(filteredData)
                .eq("id", id as any)
                .eq("organization_id", tenantId as any);

            if (error) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Erro ao atualizar cliente",
                    cause: error,
                });
            }

            return { success: true };
        }),

    delete: tenantProcedure
        .input(z.string())
        .mutation(async ({ ctx, input: id }) => {
            const { tenantId, db } = ctx;
            const { error } = await db
                .from("clients")
                .delete()
                .eq("id", id)
                .eq("organization_id", tenantId);

            if (error) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Erro ao excluir cliente",
                    cause: error,
                });
            }

            return { success: true };
        }),

    getCounts: tenantProcedure.query(async ({ ctx }) => {
        const { tenantId, db } = ctx;
        const [total, pf, pj] = await Promise.all([
            db.from("clients").select("*", { count: "exact", head: true }).eq("organization_id", tenantId as any),
            db.from("clients").select("*", { count: "exact", head: true }).eq("organization_id", tenantId as any).eq("client_type", "pessoa_fisica" as any),
            db.from("clients").select("*", { count: "exact", head: true }).eq("organization_id", tenantId as any).eq("client_type", "pessoa_juridica" as any),
        ]);

        return {
            total: total.count || 0,
            pf: pf.count || 0,
            pj: pj.count || 0,
        };
    }),

    // Portal Auth
    generatePortalAuth: tenantProcedure
        .input(z.string()) // clientId
        .mutation(async ({ ctx, input: clientId }) => {
            const { tenantId, db } = ctx;

            const { data: client, error: clientErr } = await db
                .from("clients")
                .select("email, name")
                .eq("id", clientId as any)
                .single() as any;

            if (clientErr || !client?.email) {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "Cliente não possui email para acesso ao portal.",
                });
            }

            const token = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
            const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

            const { error } = await db.from("client_portal_tokens").insert({
                client_id: clientId,
                organization_id: tenantId,
                token,
                expires_at: expiresAt,
            } as any);

            if (error && !error.message.includes("does not exist")) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Erro ao gerar token do portal.",
                    cause: error,
                });
            }

            return {
                token,
                email: (client as any).email,
                name: (client as any).name,
            };
        }),

    syncAsaas: tenantProcedure
        .input(z.string()) // clientId
        .mutation(async ({ ctx, input: clientId }) => {
            const { tenantId, db } = ctx;

            // 1. Get Client
            const { data: client, error: clientErr } = await db
                .from("clients")
                .select("*")
                .eq("id", clientId as any)
                .single() as any;

            if (clientErr || !client) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Cliente não encontrado",
                });
            }

            // 2. Get Asaas Settings
            const { data: gateway } = await db
                .from("gateway_settings")
                .select("api_key, environment, status")
                .eq("organization_id", tenantId as any)
                .eq("gateway_name", "asaas" as any)
                .maybeSingle() as any;

            if (!gateway?.api_key || gateway.status !== "active") {
                throw new TRPCError({
                    code: "PRECONDITION_FAILED",
                    message: "Integração Asaas não configurada ou inativa",
                });
            }

            const ASAAS_SANDBOX = "https://sandbox.asaas.com/api/v3";
            const ASAAS_PROD = "https://www.asaas.com/api/v3";
            const baseUrl = gateway.environment === "production" ? ASAAS_PROD : ASAAS_SANDBOX;

            const customerData = {
                name: (client as any).name,
                email: (client as any).email || "",
                phone: (client as any).phone || "",
                cpfCnpj: (client as any).document || "",
                externalReference: (client as any).id,
                address: (client as any).address_street || "",
                addressNumber: (client as any).address_number || "",
                complement: (client as any).address_complement || "",
                province: (client as any).address_neighborhood || "",
                postalCode: (client as any).address_zip || "",
            };

            const method = (client as any).asaas_customer_id ? "POST" : "POST";
            const endpoint = (client as any).asaas_customer_id
                ? `/customers/${(client as any).asaas_customer_id}`
                : "/customers";

            const response = await fetch(`${baseUrl}${endpoint}`, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    "access_token": (gateway as any).api_key,
                    "User-Agent": "LEXA-Nova/1.0",
                },
                body: JSON.stringify(customerData),
            });

            const responseData: any = await response.json();

            if (!response.ok) {
                const msg = responseData?.errors?.[0]?.description ?? responseData?.message ?? "Erro na API do Asaas";
                throw new TRPCError({
                    code: "BAD_GATEWAY",
                    message: msg,
                });
            }

            // 3. Update client if it was a new creation
            if (!(client as any).asaas_customer_id && responseData.id) {
                await db
                    .from("clients")
                    .update({ asaas_customer_id: responseData.id } as any)
                    .eq("id", clientId as any);
            }

            return responseData;
        }),
});
