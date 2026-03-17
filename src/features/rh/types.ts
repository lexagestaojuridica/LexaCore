import type { Tables } from "@/integrations/supabase/types";

export type Vaga = Tables<"rh_recrutamento_vagas">;

export type Candidato = Tables<"rh_recrutamento_candidatos"> & {
    rh_recrutamento_vagas?: {
        title: string;
    } | null;
};

export type Employee = Tables<"employees">;

export type PontoRegistro = Tables<"rh_ponto_registros">;
