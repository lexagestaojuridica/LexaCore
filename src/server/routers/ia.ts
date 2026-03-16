import { z } from "zod";
import { createTRPCRouter, tenantProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

export const iaRouter = createTRPCRouter({
    listHistory: tenantProcedure.query(async ({ ctx }) => {
        const { db, userId } = ctx;
        const { data, error } = await db
            .from("conversas_ia")
            .select("*")
            .eq("user_id", userId as any)
            .order("created_at", { ascending: true }) as any;

        if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao buscar histórico de IA" });
        return data || [];
    }),

    saveMessage: tenantProcedure
        .input(z.object({
            id: z.string().optional(),
            role: z.enum(["user", "assistant"]),
            content: z.string()
        }))
        .mutation(async ({ ctx, input }) => {
            const { tenantId, db, userId } = ctx;
            const { error } = await db.from("conversas_ia").insert({
                id: input.id || crypto.randomUUID(),
                organization_id: tenantId as any,
                user_id: userId as any,
                role: input.role,
                content: input.content
            } as any);

            if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao salvar mensagem de IA" });
            return { success: true };
        }),

    clearHistory: tenantProcedure.mutation(async ({ ctx }) => {
        const { db, userId } = ctx;
        const { error } = await db
            .from("conversas_ia")
            .delete()
            .eq("user_id", userId as any);

        if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao limpar histórico" });
        return { success: true };
    }),

    // Context aggregation for IA
    getContext: tenantProcedure.query(async ({ ctx }) => {
        const { tenantId, db } = ctx;

        const [processos, clientes, eventos, docs] = await Promise.all([
            db.from("processos_juridicos").select("title, number, court, status, subject, estimated_value, notes, client_id, clients(name)").eq("organization_id", tenantId as any).order("updated_at", { ascending: false }).limit(50),
            db.from("clientes").select("name, email, phone, document").eq("organization_id", tenantId as any).order("name").limit(50),
            db.from("eventos_agenda").select("title, start_time, end_time, category, description").eq("organization_id", tenantId as any).gte("start_time", new Date().toISOString()).order("start_time").limit(30),
            db.from("documentos").select("id, file_name, file_type, created_at").eq("organization_id", tenantId as any).order("created_at", { ascending: false }).limit(50)
        ]) as any;

        return {
            processos: processos.data || [],
            clientes: clientes.data || [],
            eventos: eventos.data || [],
            docs: docs.data || []
        };
    }),

    analyzeBudget: tenantProcedure
        .input(z.object({
            rows: z.array(z.any()),
            month: z.number(),
            year: z.number(),
            executionRate: z.number(),
            type: z.enum(["despesa", "receita"])
        }))
        .mutation(async ({ ctx, input }) => {
            const { tenantId, db, userId } = ctx;

            // Temporary local implementation of buildPrompt logic
            const period = new Date(input.year, input.month - 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
            const lines: string[] = [
                `Analise o desempenho orçamentário de ${input.type === "despesa" ? "despesas" : "receitas"} do escritório para o período de ${period}.`,
                `Taxa de execução global: ${input.executionRate.toFixed(1)}%`,
                `Total de categorias: ${input.rows.length}`
            ];

            // Call Aruna-Chat (Edge Function or local logic)
            // For the purpose of this refactor, we are centralizing the call.
            // We use the same fetch logic but executed on the server.
            const BASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
            const CHAT_URL = `${BASE_URL}/functions/v1/aruna-chat`;
            const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

            const resp = await fetch(CHAT_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
                },
                body: JSON.stringify({
                    message: lines.join("\n") + "\nPor favor, gere um resumo executivo objetivo.",
                    organization_id: tenantId,
                    context: "budget_analysis",
                }),
            });

            if (!resp.ok) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao chamar Aruna AI" });
            const data = await resp.json();

            const content = data?.content || data?.message || "Erro na análise.";

            // Save the analysis to history
            await db.from("conversas_ia").insert({
                organization_id: tenantId as any,
                user_id: userId as any,
                role: "assistant",
                content: content
            } as any);

            return { content };
        }),
});
