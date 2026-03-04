// ─── Meu Dia Types ────────────────────────────────────
// Re-export from shared agenda types
export type { Evento } from "@/features/agenda/types";

export interface Processo {
    id: string;
    title: string;
    status: string;
    number: string | null;
    updated_at: string;
}

export interface DashboardStats {
    totalProcessos: number;
    totalClientes: number;
}

export interface TimesheetSummary {
    totalMins: number;
    billable: number;
    entries: number;
}
