import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfDay, endOfDay, addDays } from "date-fns";
import type { Evento, Processo, DashboardStats, TimesheetSummary } from "../types";

export function useMeuDia() {
    const { user } = useAuth();

    // ── Profile & Org ──
    const { data: profile, isLoading: isProfileLoading } = useQuery({
        queryKey: ["profile", user?.id],
        queryFn: async () => {
            const { data } = await supabase
                .from("profiles")
                .select("organization_id")
                .eq("user_id", user!.id)
                .single();
            return data;
        },
        enabled: !!user,
    });

    const orgId = profile?.organization_id;

    // ── Eventos (próximos 14 dias) ──
    const { data: eventos = [], isLoading: isEventosLoading } = useQuery({
        queryKey: ["eventos_meudia", orgId],
        queryFn: async () => {
            const { data } = await supabase
                .from("eventos_agenda")
                .select("id, title, start_time, end_time, category")
                .eq("organization_id", orgId!)
                .gte("start_time", startOfDay(new Date()).toISOString())
                .lte("start_time", addDays(new Date(), 14).toISOString())
                .order("start_time", { ascending: true })
                .limit(30);
            return (data ?? []) as Evento[];
        },
        enabled: !!orgId,
    });

    // ── Processos ativos recentes ──
    const { data: processos = [], isLoading: isProcessosLoading } = useQuery({
        queryKey: ["processos_meudia", orgId],
        queryFn: async () => {
            const { data } = await supabase
                .from("processos_juridicos")
                .select("id, title, status, number, updated_at")
                .eq("organization_id", orgId!)
                .eq("status", "ativo")
                .order("updated_at", { ascending: false })
                .limit(5);
            return (data ?? []) as Processo[];
        },
        enabled: !!orgId,
    });

    // ── KPIs gerais (contagem) ──
    const { data: stats, isLoading: isStatsLoading } = useQuery({
        queryKey: ["fin_meudia", orgId],
        queryFn: async () => {
            const [{ count: processosCount }, { count: clientesCount }] = await Promise.all([
                supabase.from("processos_juridicos").select("*", { count: "exact", head: true }).eq("organization_id", orgId!).eq("status", "ativo"),
                supabase.from("clients").select("*", { count: "exact", head: true }).eq("organization_id", orgId!),
            ]);
            return {
                totalProcessos: processosCount ?? 0,
                totalClientes: clientesCount ?? 0,
            } satisfies DashboardStats;
        },
        enabled: !!orgId,
    });

    // ── Timesheet de hoje ──
    const { data: timesheetToday, isLoading: isTimesheetLoading } = useQuery({
        queryKey: ["timesheet_today", orgId, user?.id],
        queryFn: async () => {
            const { data } = await supabase
                .from("timesheet_entries")
                .select("duration_minutes, billing_status")
                .eq("user_id", user!.id)
                .eq("organization_id", orgId!)
                .gte("started_at", startOfDay(new Date()).toISOString())
                .lte("started_at", endOfDay(new Date()).toISOString());

            const totalMins = data?.reduce((s, e) => s + (e.duration_minutes || 0), 0) ?? 0;
            const billable = data?.filter((e) => e.billing_status === "faturado" || e.billing_status === "pendente")
                .reduce((s, e) => s + (e.duration_minutes || 0), 0) ?? 0;

            return { totalMins, billable, entries: data?.length ?? 0 } satisfies TimesheetSummary;
        },
        enabled: !!user && !!orgId,
    });

    return {
        user,
        eventos,
        processos,
        stats,
        timesheetToday,
        isLoading: isProfileLoading || isEventosLoading || isProcessosLoading || isStatsLoading || isTimesheetLoading,
    };
}
