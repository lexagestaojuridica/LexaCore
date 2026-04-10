import { z } from "zod";
import { createTRPCRouter, tenantProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

export const crmRouter = createTRPCRouter({
    // Contacts
    listContacts: tenantProcedure.query(async ({ ctx }) => {
        const { tenantId, db } = ctx;
        const { data, error } = await db
            .from("crm_contacts")
            .select("*")
            .eq("organization_id", tenantId!)
            .order("created_at", { ascending: false })
            .limit(300);
        if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao buscar contatos", cause: error });
        return data || [];
    }),

    upsertContact: tenantProcedure
        .input(z.object({
            id: z.string().optional(),
            data: z.any(),
        }))
        .mutation(async ({ ctx, input }) => {
            const { tenantId, db, userId } = ctx;
            const payload = { ...input.data, organization_id: tenantId, user_id: userId };

            if (input.id) {
                const { error } = await db.from("crm_contacts").update(payload).eq("id", input.id!).eq("organization_id", tenantId!);
                if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao atualizar contato" });
                return { id: input.id };
            } else {
                const { data, error } = await db.from("crm_contacts").insert(payload).select().single();
                if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao criar contato" });
                return data;
            }
        }),

    deleteContact: tenantProcedure.input(z.string()).mutation(async ({ ctx, input: id }) => {
        const { tenantId, db } = ctx;
        const { error } = await db.from("crm_contacts").delete().eq("id", id).eq("organization_id", tenantId!);
        if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao excluir contato" });
        return { success: true };
    }),

    // Leads
    listLeads: tenantProcedure.query(async ({ ctx }) => {
        const { tenantId, db } = ctx;
        const { data, error } = await db
            .from("crm_leads")
            .select("*")
            .eq("organization_id", tenantId!)
            .order("created_at", { ascending: false })
            .limit(300);
        if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao buscar leads" });
        return data || [];
    }),

    upsertLead: tenantProcedure
        .input(z.object({
            id: z.string().optional(),
            data: z.any(),
        }))
        .mutation(async ({ ctx, input }) => {
            const { tenantId, db } = ctx;
            const payload = { ...input.data, organization_id: tenantId };

            if (input.id) {
                const { error } = await db.from("crm_leads").update(payload).eq("id", input.id!).eq("organization_id", tenantId!);
                if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao atualizar lead" });
                return { id: input.id };
            } else {
                const { data, error } = await db.from("crm_leads").insert(payload).select().single();
                if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao criar lead" });
                return data;
            }
        }),

    deleteLead: tenantProcedure.input(z.string()).mutation(async ({ ctx, input: id }) => {
        const { tenantId, db } = ctx;
        const { error } = await db.from("crm_leads").delete().eq("id", id).eq("organization_id", tenantId!);
        if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao excluir lead" });
        return { success: true };
    }),

    // Deals
    listDeals: tenantProcedure.query(async ({ ctx }) => {
        const { tenantId, db } = ctx;
        const { data, error } = await db
            .from("crm_deals")
            .select("*")
            .eq("organization_id", tenantId!)
            .order("created_at", { ascending: false })
            .limit(300);
        if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao buscar negócios" });
        return data || [];
    }),

    upsertDeal: tenantProcedure
        .input(z.object({
            id: z.string().optional(),
            data: z.any(),
        }))
        .mutation(async ({ ctx, input }) => {
            const { tenantId, db } = ctx;
            const payload = { ...input.data, organization_id: tenantId };

            if (input.id) {
                const { error } = await db.from("crm_deals").update(payload).eq("id", input.id!).eq("organization_id", tenantId!);
                if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao atualizar negócio" });
                return { id: input.id };
            } else {
                const { data, error } = await db.from("crm_deals").insert(payload).select().single();
                if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao criar negócio" });
                return data;
            }
        }),

    deleteDeal: tenantProcedure.input(z.string()).mutation(async ({ ctx, input: id }) => {
        const { tenantId, db } = ctx;
        const { error } = await db.from("crm_deals").delete().eq("id", id).eq("organization_id", tenantId!);
        if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao excluir negócio" });
        return { success: true };
    }),

    // Activities
    listActivities: tenantProcedure.query(async ({ ctx }) => {
        const { tenantId, db } = ctx;
        const { data, error } = await db
            .from("crm_activities")
            .select("*")
            .eq("organization_id", tenantId!)
            .order("created_at", { ascending: false })
            .limit(300);
        if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao buscar atividades" });
        return data || [];
    }),

    upsertActivity: tenantProcedure
        .input(z.object({
            id: z.string().optional(),
            data: z.any(),
        }))
        .mutation(async ({ ctx, input }) => {
            const { tenantId, db } = ctx;
            const payload = { ...input.data, organization_id: tenantId };

            if (input.id) {
                const { error } = await db.from("crm_activities").update(payload).eq("id", input.id!).eq("organization_id", tenantId!);
                if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao atualizar atividade" });
                return { id: input.id };
            } else {
                const { data, error } = await db.from("crm_activities").insert(payload).select().single();
                if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao criar atividade" });
                return data;
            }
        }),

    deleteActivity: tenantProcedure.input(z.string()).mutation(async ({ ctx, input: id }) => {
        const { tenantId, db } = ctx;
        const { error } = await db.from("crm_activities").delete().eq("id", id).eq("organization_id", tenantId!);
        if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao excluir atividade" });
        return { success: true };
    }),

    // Helper findOrCreate
    findOrCreateContact: tenantProcedure
        .input(z.string())
        .mutation(async ({ ctx, input: name }) => {
            const { tenantId, db, userId } = ctx;

            // Try find
            const { data: existing } = await db
                .from("crm_contacts")
                .select("*")
                .eq("organization_id", tenantId!)
                .ilike("name", name)
                .maybeSingle();

            if (existing) return existing;

            // Create
            const { data, error } = await db.from("crm_contacts").insert({
                name,
                organization_id: tenantId!,
                user_id: userId!,
                source: "lead",
                tags: ["Novo"],
            }).select().single();

            if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao criar contato automático" });
            return data;
        }),
});
