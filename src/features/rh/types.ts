// These tables don't exist in the DB schema yet. Using inline types as placeholders.

export type Vaga = {
  id: string;
  title: string;
  organization_id: string;
  status?: string;
  created_at?: string;
};

export type Candidato = {
  id: string;
  full_name: string;
  organization_id: string;
  pipeline_stage?: string;
  rating?: number;
  created_at?: string;
  rh_recrutamento_vagas?: {
    title: string;
  } | null;
};

export type Employee = {
  id: string;
  full_name: string;
  organization_id: string;
  role?: string;
  department?: string;
  created_at?: string;
};

export type PontoRegistro = {
  id: string;
  user_id: string;
  organization_id: string;
  check_in?: string;
  check_out?: string;
  created_at?: string;
};
