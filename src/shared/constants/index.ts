/**
 * Business Constants for LEXA v3.5
 *
 * Centralized constants used across features.
 * Never hardcode these values in component files.
 */

// ─── App ───────────────────────────────────────────────────────────────────

export const APP_NAME = "LEXA" as const;
export const APP_VERSION = "3.5.0" as const;

// ─── Pagination ────────────────────────────────────────────────────────────

export const DEFAULT_PAGE_SIZE = 20 as const;
export const MAX_PAGE_SIZE = 100 as const;

// ─── User Roles ────────────────────────────────────────────────────────────

export const USER_ROLES = {
  ADMIN: "admin",
  ADVOGADO: "advogado",
  ASSOCIADO: "associado",
  ADMINISTRATIVO: "administrativo",
  CLIENTE: "cliente",
} as const;

export const USER_ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  advogado: "Advogado(a)",
  associado: "Associado(a)",
  administrativo: "Administrativo",
  cliente: "Cliente",
};

// ─── Subscription Plans ────────────────────────────────────────────────────

export const SUBSCRIPTION_PLANS = {
  STARTER: "starter",
  PROFESSIONAL: "professional",
  ENTERPRISE: "enterprise",
} as const;

export const SUBSCRIPTION_PLAN_LABELS: Record<string, string> = {
  starter: "Starter",
  professional: "Professional",
  enterprise: "Enterprise",
};

// ─── Process Status ────────────────────────────────────────────────────────

export const PROCESSO_STATUS = {
  ATIVO: "ativo",
  ARQUIVADO: "arquivado",
  SUSPENSO: "suspenso",
  ENCERRADO: "encerrado",
} as const;

export const PROCESSO_STATUS_LABELS: Record<string, string> = {
  ativo: "Ativo",
  arquivado: "Arquivado",
  suspenso: "Suspenso",
  encerrado: "Encerrado",
};

export const PROCESSO_STATUS_COLORS: Record<string, string> = {
  ativo: "bg-green-100 text-green-800",
  arquivado: "bg-gray-100 text-gray-800",
  suspenso: "bg-yellow-100 text-yellow-800",
  encerrado: "bg-red-100 text-red-800",
};

// ─── Agenda Event Types ────────────────────────────────────────────────────

export const AGENDA_EVENT_TYPES = {
  AUDIENCIA: "audiencia",
  PRAZO: "prazo",
  REUNIAO: "reuniao",
  TAREFA: "tarefa",
  OUTRO: "outro",
} as const;

export const AGENDA_EVENT_TYPE_LABELS: Record<string, string> = {
  audiencia: "Audiência",
  prazo: "Prazo",
  reuniao: "Reunião",
  tarefa: "Tarefa",
  outro: "Outro",
};

// ─── Financial ─────────────────────────────────────────────────────────────

export const LANCAMENTO_TIPOS = {
  RECEITA: "receita",
  DESPESA: "despesa",
} as const;

export const LANCAMENTO_STATUS = {
  PENDENTE: "pendente",
  PAGO: "pago",
  ATRASADO: "atrasado",
  CANCELADO: "cancelado",
} as const;

export const LANCAMENTO_STATUS_LABELS: Record<string, string> = {
  pendente: "Pendente",
  pago: "Pago",
  atrasado: "Atrasado",
  cancelado: "Cancelado",
};

// ─── File Upload ───────────────────────────────────────────────────────────

export const MAX_FILE_SIZE_MB = 50 as const;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export const ALLOWED_DOCUMENT_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

// ─── Cache keys (React Query) ──────────────────────────────────────────────

export const QUERY_KEYS = {
  PROCESSOS: "processos",
  CLIENTES: "clientes",
  AGENDA: "agenda",
  TIMESHEET: "timesheet",
  FINANCEIRO: "financeiro",
  USUARIOS: "usuarios",
  ORGANIZACAO: "organizacao",
  AUDIT_LOGS: "audit_logs",
} as const;

// ─── Local Storage keys ────────────────────────────────────────────────────

export const STORAGE_KEYS = {
  THEME: "lexa_theme",
  SIDEBAR_COLLAPSED: "lexa_sidebar_collapsed",
  LAST_ROUTE: "lexa_last_route",
} as const;

// ─── Brazilian legal ───────────────────────────────────────────────────────

export const TRIBUNAIS = [
  "STF",
  "STJ",
  "TST",
  "TSE",
  "STM",
  "TRF1",
  "TRF2",
  "TRF3",
  "TRF4",
  "TRF5",
  "TRF6",
  "TJSP",
  "TJRJ",
  "TJMG",
  "TJRS",
  "TJBA",
  "TJPR",
  "TJSC",
  "TJGO",
  "TJPE",
] as const;
