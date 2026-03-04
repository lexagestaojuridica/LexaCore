import type { Tables } from "@/integrations/supabase/types";

export type Processo = Tables<"processos_juridicos"> & {
    clients?: {
        id: string;
        name: string;
        phone: string | null;
        asaas_customer_id?: string | null;
    } | null;
};

export type Documento = {
    id: string;
    file_name: string;
    file_path: string;
    file_type: string | null;
    created_at: string;
};
