import { useUser } from "@clerk/nextjs";
import { trpc } from "@/shared/lib/trpc";
import type { Evento, Processo, DashboardStats, TimesheetSummary } from "../types";

export function useMeuDia() {
    const { user } = useUser();

    const dashboardQuery = trpc.meuDia.getDashboardData.useQuery(undefined, {
        enabled: !!user,
    });

    return {
        user,
        eventos: (dashboardQuery.data?.eventos ?? []) as Evento[],
        processos: (dashboardQuery.data?.processos ?? []) as Processo[],
        stats: dashboardQuery.data?.stats as DashboardStats | undefined,
        timesheetToday: dashboardQuery.data?.timesheetToday as TimesheetSummary | undefined,
        isLoading: dashboardQuery.isLoading,
    };
}
