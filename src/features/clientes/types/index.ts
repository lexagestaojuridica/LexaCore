// ─── Clientes Types ──────────────────────────────────────

export interface Client {
    id: string;
    organization_id: string;
    name: string;
    email: string | null;
    phone: string | null;
    document: string | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
    client_type: string | null;
    rg: string | null;
    birth_date: string | null;
    gender: string | null;
    marital_status: string | null;
    nationality: string | null;
    profession: string | null;
    address_street: string | null;
    address_number: string | null;
    address_complement: string | null;
    address_neighborhood: string | null;
    address_city: string | null;
    address_state: string | null;
    address_zip: string | null;
    secondary_phone: string | null;
    secondary_email: string | null;
    company_name: string | null;
    company_position: string | null;
    asaas_customer_id: string | null;
}

export interface ClientDocumento {
    id: string;
    file_name: string;
    file_path: string;
    file_type: string | null;
    created_at: string;
}

export const GENDER_OPTIONS = [
    { value: "masculino", label: "Masculino" },
    { value: "feminino", label: "Feminino" },
    { value: "outro", label: "Outro" },
];

export const MARITAL_OPTIONS = [
    { value: "solteiro", label: "Solteiro(a)" },
    { value: "casado", label: "Casado(a)" },
    { value: "divorciado", label: "Divorciado(a)" },
    { value: "viuvo", label: "Viúvo(a)" },
    { value: "uniao_estavel", label: "União Estável" },
];

export const STATE_OPTIONS = [
    "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS",
    "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC",
    "SP", "SE", "TO",
];

export interface ClientForm {
    name: string;
    email: string;
    phone: string;
    document: string;
    notes: string;
    client_type: string;
    rg: string;
    birth_date: string;
    gender: string;
    marital_status: string;
    nationality: string;
    profession: string;
    address_street: string;
    address_number: string;
    address_complement: string;
    address_neighborhood: string;
    address_city: string;
    address_state: string;
    address_zip: string;
    secondary_phone: string;
    secondary_email: string;
    company_name: string;
    company_position: string;
}

export const emptyClientForm: ClientForm = {
    name: "", email: "", phone: "", document: "", notes: "",
    client_type: "pessoa_fisica", rg: "", birth_date: "", gender: "",
    marital_status: "", nationality: "Brasileira", profession: "",
    address_street: "", address_number: "", address_complement: "",
    address_neighborhood: "", address_city: "", address_state: "", address_zip: "",
    secondary_phone: "", secondary_email: "", company_name: "", company_position: "",
};
