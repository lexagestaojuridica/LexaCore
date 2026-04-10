import { z } from "zod";
import { createTRPCRouter, tenantProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

export const workflowRouter = createTRPCRouter({
    listInstances: tenantProcedure.query(async ({ ctx }) => {
        const { tenantId, db } = ctx;
        const { data, error } = await db
            .from("workflow_instances")
            .select("*")
            .eq("organization_id", tenantId!)
            .order("created_at", { ascending: false });

        if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao buscar instâncias de workflow" });
        return data || [];
    }),

    listTemplates: tenantProcedure.query(async ({ ctx }) => {
        const { tenantId, db } = ctx;
        const { data, error } = await db
            .from("workflow_templates")
            .select("*")
            .or(`organization_id.is.null,organization_id.eq.${tenantId!}`)
            .order("name");

        if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao buscar templates" });
        return data || [];
    }),

    listSectors: tenantProcedure.query(async ({ ctx }) => {
        const { tenantId, db } = ctx;
        const { data, error } = await db
            .from("workflow_sectors")
            .select("*")
            .eq("organization_id", tenantId!)
            .order("name");

        if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao buscar setores" });
        return data || [];
    }),

    upsertSector: tenantProcedure
        .input(z.object({
            id: z.string().optional(),
            data: z.any(),
        }))
        .mutation(async ({ ctx, input }) => {
            const { tenantId, db } = ctx;
            const payload = { ...input.data, organization_id: tenantId };

            if (input.id) {
                const { error } = await db.from("workflow_sectors").update(payload).eq("id", input.id).eq("organization_id", tenantId!);
                if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao atualizar setor" });
                return { id: input.id };
            } else {
                const { data, error } = await db.from("workflow_sectors").insert(payload).select().single();
                if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao criar setor" });
                return data;
            }
        }),

    deleteSector: tenantProcedure.input(z.string()).mutation(async ({ ctx, input: id }) => {
        const { tenantId, db } = ctx;
        const { error } = await db.from("workflow_sectors").delete().eq("id", id).eq("organization_id", tenantId!);
        if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao excluir setor" });
        return { success: true };
    }),

    getSteps: tenantProcedure
        .input(z.array(z.string()))
        .query(async ({ ctx, input }) => {
            const { db } = ctx;
            const { data, error } = await db
                .from("workflow_steps")
                .select("*")
                .in("workflow_id", input)
                .order("sort_order");

            if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao buscar etapas de workflow" });
            return data || [];
        }),

    startWorkflow: tenantProcedure
        .input(z.object({
            templateId: z.string(),
            templateName: z.string(),
            templateEmoji: z.string(),
            sectorId: z.string(),
            assignedTo: z.string(),
            assignedToName: z.string(),
            priority: z.enum(["alta", "media", "baixa"]),
            deadline: z.string().nullable(),
            steps: z.array(z.object({
                title: z.string(),
                description: z.string().nullable(),
                due_date: z.string().nullable(),
            }))
        }))
        .mutation(async ({ ctx, input }) => {
            const { tenantId, db, userId } = ctx;
            const { data: wf, error } = await db.from("workflow_instances").insert({
                organization_id: tenantId!,
                user_id: userId!,
                template_id: input.templateId,
                template_name: input.templateName,
                template_emoji: input.templateEmoji,
                sector_id: input.sectorId,
                assigned_to: input.assignedTo,
                assigned_to_name: input.assignedToName,
                priority: input.priority,
                deadline: input.deadline,
                created_by: userId!,
            }).select("id").single();

            if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao iniciar workflow" });

            const steps = input.steps.map((s, i) => ({
                workflow_id: wf!.id,
                title: s.title,
                description: s.description,
                completed: false,
                due_date: s.due_date,
                notes: "",
                sort_order: i,
            }));

            const { error: stepErr } = await db.from("workflow_steps").insert(steps as any);
            if (stepErr) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao criar etapas do workflow" });

            return wf;
        }),

    updateStep: tenantProcedure
        .input(z.object({
            stepId: z.string(),
            data: z.any()
        }))
        .mutation(async ({ ctx, input }) => {
            const { db } = ctx;
            const { error } = await db
                .from("workflow_steps")
                .update(input.data as any)
                .eq("id", input.stepId as any);

            if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao atualizar etapa" });
            return { success: true };
        }),

    addStep: tenantProcedure
        .input(z.object({
            instanceId: z.string(),
            title: z.string(),
            description: z.string(),
            sort_order: z.number().default(999)
        }))
        .mutation(async ({ ctx, input }) => {
            const { db } = ctx;
            const { error } = await db.from("workflow_steps").insert({
                workflow_id: input.instanceId as any,
                title: input.title,
                description: input.description,
                completed: false,
                sort_order: input.sort_order,
            } as any);

            if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao adicionar etapa" });
            return { success: true };
        }),

    deleteWorkflow: tenantProcedure.input(z.string()).mutation(async ({ ctx, input }) => {
        const { tenantId, db } = ctx;
        const { error } = await db
            .from("workflow_instances")
            .delete()
            .eq("id", input as any)
            .eq("organization_id", tenantId as any);

        if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao excluir workflow" });
        return { success: true };
    }),

    reassignWorkflow: tenantProcedure
        .input(z.object({
            id: z.string(),
            assignedTo: z.string(),
            assignedToName: z.string()
        }))
        .mutation(async ({ ctx, input }) => {
            const { tenantId, db } = ctx;
            const { error } = await db.from("workflow_instances")
                .update({ assigned_to: input.assignedTo, assigned_to_name: input.assignedToName } as any)
                .eq("id", input.id as any)
                .eq("organization_id", tenantId as any);

            if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao reatribuir workflow" });
            return { success: true };
        }),
});
