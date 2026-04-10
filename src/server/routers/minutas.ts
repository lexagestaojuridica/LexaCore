import { z } from "zod";
import { createTRPCRouter, tenantProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

export const minutasRouter = createTRPCRouter({
    list: tenantProcedure.query(async ({ ctx }) => {
        const { tenantId, db } = ctx;
        const { data, error } = await db
            .from("minutas_documents")
            .select("*")
            .eq("organization_id", tenantId!)
            .order("updated_at", { ascending: false });

        if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao buscar minutas" });
        return data || [];
    }),

    getVersions: tenantProcedure
        .input(z.array(z.string()))
        .query(async ({ ctx, input: ids }) => {
            const { db } = ctx;
            const { data, error } = await db
                .from("minutas_versions")
                .select("*")
                .in("document_id", ids)
                .order("saved_at", { ascending: false });

            if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao buscar versões" });
            return data || [];
        }),

    upsert: tenantProcedure
        .input(z.object({
            id: z.string().optional(),
            data: z.any(),
        }))
        .mutation(async ({ ctx, input }) => {
            const { tenantId, userId, db } = ctx;
            const payload = { ...input.data, organization_id: tenantId, user_id: userId, updated_at: new Date().toISOString() };

            if (input.id) {
                const { error } = await db.from("minutas_documents").update(payload).eq("id", input.id).eq("organization_id", tenantId!);
                if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao atualizar minuta" });
                return { id: input.id };
            } else {
                const { data, error } = await db.from("minutas_documents").insert(payload).select().single();
                if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao criar minuta" });
                return data;
            }
        }),

    delete: tenantProcedure.input(z.string()).mutation(async ({ ctx, input: id }) => {
        const { tenantId, db } = ctx;
        const { error } = await db.from("minutas_documents").delete().eq("id", id).eq("organization_id", tenantId!);
        if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao excluir minuta" });
        return { success: true };
    }),

    saveVersion: tenantProcedure
        .input(z.object({
            document_id: z.string(),
            content: z.string(),
            label: z.string(),
        }))
        .mutation(async ({ ctx, input }) => {
            const { db } = ctx;
            const { error } = await db.from("minutas_versions").insert(input);
            if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao salvar versão" });
            return { success: true };
        }),
});
