import { z } from "zod";
import { createTRPCRouter, tenantProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { addDays, formatDistanceToNow, parseISO, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";

export const agendaRouter = createTRPCRouter({
    list: tenantProcedure
        .input(z.object({
            start: z.string(),
            end: z.string(),
        }))
        .query(async ({ ctx, input }) => {
            const { tenantId, db } = ctx;
            const { data, error } = await db
                .from("eventos_agenda")
                .select("*")
                .eq("organization_id", tenantId as any)
                .gte("start_time", input.start)
                .lte("start_time", input.end)
                .order("start_time", { ascending: true }) as any;

            if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao buscar agenda" });
            return data || [];
        }),

    getUpcomingDeadlines: tenantProcedure.query(async ({ ctx }) => {
        const { tenantId, db } = ctx;
        const now = new Date();
        const nowIso = now.toISOString();
        const in7Days = addDays(now, 7).toISOString();
        const threeDaysAgo = addDays(now, -3);

        const { data, error } = await db
            .from("eventos_agenda")
            .select("*")
            .eq("organization_id", tenantId as any)
            .in("category", ["prazo", "audiencia"] as any)
            .lte("start_time", in7Days)
            .order("start_time", { ascending: true }) as any;

        if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao buscar prazos" });

        const notifications = (data || [])
            .filter((e: any) => parseISO(e.start_time) >= threeDaysAgo)
            .map((e: any) => {
                const eventDate = parseISO(e.start_time);
                const overdue = isPast(eventDate);
                const hoursUntil = (eventDate.getTime() - Date.now()) / (1000 * 60 * 60);

                let urgency: "critical" | "warning" | "info" = "info";
                if (overdue) urgency = "critical";
                else if (hoursUntil <= 24) urgency = "critical";
                else if (hoursUntil <= 72) urgency = "warning";

                return {
                    id: e.id,
                    title: e.title,
                    start_time: e.start_time,
                    category: e.category,
                    description: e.description,
                    process_id: e.process_id,
                    timeLabel: overdue
                        ? `Vencido há ${formatDistanceToNow(eventDate, { locale: ptBR })}`
                        : `Vence em ${formatDistanceToNow(eventDate, { locale: ptBR })}`,
                    isOverdue: overdue,
                    urgency,
                };
            });

        return notifications;
    }),

    create: tenantProcedure
        .input(z.any())
        .mutation(async ({ ctx, input }) => {
            const { tenantId, db, userId } = ctx;
            const { data, error } = await db
                .from("eventos_agenda")
                .insert({ ...input, organization_id: tenantId, user_id: userId })
                .select()
                .single() as any;

            if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao criar evento" });
            return data;
        }),

    update: tenantProcedure
        .input(z.object({
            id: z.string(),
            data: z.any(),
        }))
        .mutation(async ({ ctx, input }) => {
            const { tenantId, db } = ctx;
            const { error } = await db
                .from("eventos_agenda")
                .update(input.data)
                .eq("id", input.id as any)
                .eq("organization_id", tenantId as any);

            if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao atualizar evento" });
            return { success: true };
        }),

    delete: tenantProcedure.input(z.string()).mutation(async ({ ctx, input }) => {
        const { tenantId, db } = ctx;
        const { error } = await db
            .from("eventos_agenda")
            .delete()
            .eq("id", input as any)
            .eq("organization_id", tenantId as any);

        if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao excluir evento" });
        return { success: true };
    }),
});
