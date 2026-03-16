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
