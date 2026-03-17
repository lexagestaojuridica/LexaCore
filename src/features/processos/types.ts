import type { Tables } from "@/integrations/supabase/types";

export type Processo = Tables<"processos_juridicos"> & {
    cliente_nome?: string | null;
    counts?: { count: number };
    clientes?: {
        id: string;
        name: string;
        phone: string | null;
        asaas_customer_id?: string | null;
    } | null;
    estimated_value_display?: string;
    segredo_de_justica?: boolean;
    public_token?: string | null;
    public_link_password?: string | null;
    public_link_expires_at?: string | null;
};

export type Documento = {
    id: string;
    file_name: string;
    file_path: string;
    file_type: string | null;
    created_at: string;
};

export interface ProcessCapture {
    id: string;
    process_id: string;
    capture_date: string;
    content: string;
    source: string;
    status: string;
    created_at: string;
}

export interface Deadline {
    id: string;
    process_id: string;
    organization_id: string;
    title: string;
    deadline_type: 'useful_days' | 'calendar_days';
    start_date: string;
    days_count: number;
    fatal_date: string;
    status: 'pending' | 'completed' | 'overdue' | 'cancelled';
    created_at: string;
}
