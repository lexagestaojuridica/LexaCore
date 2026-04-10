import { z } from "zod";
import { createTRPCRouter, tenantProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

export const processoRouter = createTRPCRouter({
    list: tenantProcedure
        .input(
            z.object({
                page: z.number().default(1),
                pageSize: z.number().default(15),
                search: z.string().optional(),
                statusFilter: z.string().default("all"),
                sortField: z.string().default("created_at"),
                sortDir: z.enum(["asc", "desc"]).default("desc"),
                viewMode: z.enum(["table", "kanban"]).default("table"),
            })
        )
        .query(async ({ ctx, input }) => {
            const { tenantId, db } = ctx;
            const { page, pageSize, search, statusFilter, sortField, sortDir, viewMode } = input;

            let query = db
                .from("processos_juridicos")
                .select("*, clientes(id, name, phone, asaas_customer_id)", { count: "exact" })
                .eq("organization_id", tenantId!);

            if (statusFilter !== "all") {
                query = query.eq("status", statusFilter);
            }

            if (search) {
                query = query.or(
                    `title.ilike.%${search}%,number.ilike.%${search}%,court.ilike.%${search}%,subject.ilike.%${search}%`
                );
            }

            query = query.order(sortField as any, { ascending: sortDir === "asc" }); // sortField is still generic enough to need as any or a better mapping

            if (viewMode === "table") {
                const from = (page - 1) * pageSize;
                const to = from + pageSize - 1;
                query = query.range(from, to);
            } else {
                query = query.limit(200);
            }

            const { data, error, count } = await query;

            if (error) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Erro ao buscar processos",
                    cause: error,
                });
            }

            return {
                data,
                count: count ?? 0,
            };
        }),

    getCounts: tenantProcedure.query(async ({ ctx }) => {
        const { tenantId, db } = ctx;

        const [total, ativos, suspensos] = await Promise.all([
            db
                .from("processos_juridicos")
                .select("*", { count: "exact", head: true })
                .eq("organization_id", tenantId!),
            db
                .from("processos_juridicos")
                .select("*", { count: "exact", head: true })
                .eq("organization_id", tenantId!)
                .eq("status", "ativo"),
            db
                .from("processos_juridicos")
                .select("*", { count: "exact", head: true })
                .eq("organization_id", tenantId!)
                .eq("status", "suspenso"),
        ]);

        return {
            total: total.count || 0,
            ativos: ativos.count || 0,
            suspensos: suspensos.count || 0,
        };
    }),

    create: tenantProcedure
        .input(z.any())
        .mutation(async ({ ctx, input }) => {
            const { tenantId, userId, db } = ctx;
            const { error, data } = await db.from("processos_juridicos").insert({
                ...input,
                organization_id: tenantId,
                responsible_user_id: userId,
            }).select().single();

            if (error) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Erro ao criar processo",
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
            delete filteredData.responsible_user_id;

            const { error } = await db
                .from("processos_juridicos")
                .update(filteredData)
                .eq("id", id)
                .eq("organization_id", tenantId!);

            if (error) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Erro ao atualizar processo",
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
                .from("processos_juridicos")
                .delete()
                .eq("id", id)
                .eq("organization_id", tenantId!);

            if (error) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Erro ao excluir processo",
                    cause: error,
                });
            }

            return { success: true };
        }),
});
