// ─── Configuracoes Types ──────────────────────────────────

export interface Plan {
    id: string;
    name: string;
    slug: string;
    price_monthly: number;
    price_yearly: number;
    max_users: number;
    max_processes: number;
    features: string[];
    is_active: boolean;
    sort_order: number;
}

export interface CustomOption {
    id: string;
    organization_id: string;
    module: string;
    field_name: string;
    label: string;
    value: string;
    color: string | null;
    sort_order: number;
    is_active: boolean;
}

export interface Employee {
    id: string;
    organization_id: string;
    user_id: string | null;
    full_name: string;
    email: string | null;
    phone: string | null;
    oab_number: string | null;
    department: string | null;
    position: string | null;
    hire_date: string | null;
    hourly_rate: number | null;
    unit_id: string | null;
    is_active: boolean;
    notes: string | null;
}

export interface EmployeeFormState {
    full_name: string;
    email: string;
    phone: string;
    oab_number: string;
    department: string;
    position: string;
    hire_date: string;
    hourly_rate: string;
    unit_id: string;
    notes: string;
}

export interface OrgFormState {
    whatsapp_instance_id: string;
    whatsapp_token: string;
    whatsapp_enabled: boolean;
    asaas_api_key: string;
    asaas_environment: string;
    asaas_enabled: boolean;
    jusbrasil_token: string;
    escavador_token: string;
}

export const emptyEmployee: EmployeeFormState = {
    full_name: "", email: "", phone: "", oab_number: "",
    department: "", position: "", hire_date: "", hourly_rate: "",
    unit_id: "none", notes: "",
};

export const emptyOrgForm: OrgFormState = {
    whatsapp_instance_id: "", whatsapp_token: "", whatsapp_enabled: false,
    asaas_api_key: "", asaas_environment: "sandbox", asaas_enabled: false,
    jusbrasil_token: "", escavador_token: "",
};

export const MODULES = [
    { value: "processos", label: "Processos" },
    { value: "clientes", label: "Clientes" },
    { value: "financeiro", label: "Financeiro" },
    { value: "agenda", label: "Agenda" },
    { value: "timesheet", label: "Timesheet" },
    { value: "crm", label: "CRM" },
    { value: "geral", label: "Geral" },
];

export const FALLBACK_PLANS: Plan[] = [
    { id: "free", name: "Free", slug: "free", price_monthly: 0, price_yearly: 0, max_users: 2, max_processes: 50, features: ["2 usuários", "50 processos", "Agenda básica", "Timesheet", "Chat interno"], is_active: true, sort_order: 1 },
    { id: "pro", name: "Pro", slug: "pro", price_monthly: 197, price_yearly: 1970, max_users: 10, max_processes: 500, features: ["10 usuários", "500 processos", "Agenda avançada", "Timesheet + BI", "CRM completo", "Integrações", "ARUNA IA", "Suporte prioritário"], is_active: true, sort_order: 2 },
    { id: "enterprise", name: "Enterprise", slug: "enterprise", price_monthly: 497, price_yearly: 4970, max_users: -1, max_processes: -1, features: ["Usuários ilimitados", "Processos ilimitados", "Multi-unidades", "Workflow avançado", "API dedicada", "IA personalizada", "SLA 99.9%", "Gerente de conta"], is_active: true, sort_order: 3 },
];
