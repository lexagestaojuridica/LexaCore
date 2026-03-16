import { z } from "zod";
import { createTRPCRouter, tenantProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { startOfDay, endOfDay, addDays } from "date-fns";

export const meuDiaRouter = createTRPCRouter({
    getDashboardData: tenantProcedure.query(async ({ ctx }) => {
        const { tenantId, db, userId } = ctx;
        const now = new Date();

        const [eventos, processos, statsProc, statsCli, timesheet] = await Promise.all([
            // Eventos próximos 14 dias
            db.from("eventos_agenda")
                .select("id, title, start_time, end_time, category")
                .eq("organization_id", tenantId as any)
                .gte("start_time", startOfDay(now).toISOString())
                .lte("start_time", addDays(now, 14).toISOString())
                .order("start_time", { ascending: true })
                .limit(30),

            // Processos ativos recentes
            db.from("processos_juridicos")
                .select("id, title, status, number, updated_at")
                .eq("organization_id", tenantId as any)
                .eq("status", "ativo" as any)
                .order("updated_at", { ascending: false })
                .limit(5),

            // Stats Count Processos
            db.from("processos_juridicos")
                .select("*", { count: "exact", head: true })
                .eq("organization_id", tenantId as any)
                .eq("status", "ativo" as any),

            // Stats Count Clientes
            db.from("clientes")
                .select("*", { count: "exact", head: true })
                .eq("organization_id", tenantId as any),

            // Timesheet Hoje
            db.from("timesheet_entries")
                .select("duration_minutes, billing_status")
                .eq("user_id", userId as any)
                .eq("organization_id", tenantId as any)
                .gte("started_at", startOfDay(now).toISOString())
                .lte("started_at", endOfDay(now).toISOString())
        ]);

        const tEntries = (timesheet.data || []) as any[];
        const totalMins = tEntries.reduce((s, e) => s + (e.duration_minutes || 0), 0);
        const billable = tEntries
            .filter((e) => e.billing_status === "faturado" || e.billing_status === "pendente")
            .reduce((s, e) => s + (e.duration_minutes || 0), 0);

        return {
            eventos: eventos.data || [],
            processos: (processos.data || []) as any[],
            stats: {
                totalProcessos: statsProc.count || 0,
                totalClientes: statsCli.count || 0,
            },
            timesheetToday: {
                totalMins,
                billable,
                entries: tEntries.length,
            }
        };
    }),

    globalSearch: tenantProcedure
        .input(z.object({
            query: z.string().min(3),
        }))
        .query(async ({ ctx, input }) => {
            const { tenantId, db } = ctx;
            const searchTerm = `%${input.query}%`;

            const [processos, clientes, wiki] = await Promise.all([
                db.from("processos_juridicos")
                    .select("id, title")
                    .eq("organization_id", tenantId as any)
                    .ilike("title", searchTerm)
                    .limit(5) as any,
                db.from("clientes")
                    .select("id, name")
                    .eq("organization_id", tenantId as any)
                    .ilike("name", searchTerm)
                    .limit(5) as any,
                db.from("wiki_juridica")
                    .select("id, title, category")
                    .eq("organization_id", tenantId as any)
                    .or(`title.ilike.${searchTerm},content.ilike.${searchTerm}`)
                    .limit(5) as any
            ]);

            const results: any[] = [];

            if (processos.data) {
                results.push(...processos.data.map((p: any) => ({
                    id: p.id,
                    title: p.title,
                    subtitle: "Processo Jurídico",
                    type: "processo",
                    url: `/dashboard/processos?id=${p.id}`
                })));
            }
            if (clientes.data) {
                results.push(...clientes.data.map((c: any) => ({
                    id: c.id,
                    title: c.name,
                    subtitle: "Cliente",
                    type: "cliente",
                    url: `/dashboard/clientes?id=${c.id}`
                })));
            }
            if (wiki.data) {
                results.push(...wiki.data.map((w: any) => ({
                    id: w.id,
                    title: w.title,
                    subtitle: `Categoria: ${w.category}`,
                    type: "wiki",
                    url: `/dashboard/wiki?id=${w.id}`
                })));
            }

            return results;
        }),
});
