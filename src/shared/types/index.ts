/**
 * Centralized TypeScript types for LEXA v3.5
 *
 * Domain types shared across features. Feature-specific types
 * should live in `src/features/<feature>/types/index.ts`.
 */

// ─── Pagination ────────────────────────────────────────────────────────────

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ─── API Response ──────────────────────────────────────────────────────────

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: string;
  code?: string;
}

export type ApiResult<T> = ApiSuccess<T> | ApiError;

// ─── User & Auth ───────────────────────────────────────────────────────────

export interface LexaUser {
  id: string;
  clerkId: string;
  email: string;
  name: string;
  role: UserRole;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

export type UserRole = "admin" | "advogado" | "associado" | "administrativo" | "cliente";

// ─── Organization ──────────────────────────────────────────────────────────

export interface Organization {
  id: string;
  clerkOrgId: string;
  name: string;
  cnpj?: string;
  plan: SubscriptionPlan;
  createdAt: string;
}

export type SubscriptionPlan = "starter" | "professional" | "enterprise";

// ─── Process (Processo Jurídico) ───────────────────────────────────────────

export interface Processo {
  id: string;
  numero: string;
  titulo: string;
  descricao?: string;
  status: ProcessoStatus;
  clienteId: string;
  responsavelId: string;
  organizationId: string;
  dataAbertura: string;
  dataEncerramento?: string;
  valorCausa?: number;
  tribunal?: string;
  vara?: string;
  createdAt: string;
  updatedAt: string;
}

export type ProcessoStatus = "ativo" | "arquivado" | "suspenso" | "encerrado";

// ─── Client (Cliente) ──────────────────────────────────────────────────────

export interface Cliente {
  id: string;
  nome: string;
  email?: string;
  cpfCnpj: string;
  tipo: "pessoa_fisica" | "pessoa_juridica";
  telefone?: string;
  organizationId: string;
  asaasCustomerId?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Financial ─────────────────────────────────────────────────────────────

export interface LancamentoFinanceiro {
  id: string;
  tipo: "receita" | "despesa";
  descricao: string;
  valor: number;
  dataVencimento: string;
  dataPagamento?: string;
  status: "pendente" | "pago" | "atrasado" | "cancelado";
  clienteId?: string;
  processoId?: string;
  organizationId: string;
  asaasPaymentId?: string;
  createdAt: string;
}

// ─── Timesheet ─────────────────────────────────────────────────────────────

export interface TimesheetEntry {
  id: string;
  userId: string;
  processoId?: string;
  descricao: string;
  dataInicio: string;
  dataFim?: string;
  duracaoMinutos?: number;
  status: "em_andamento" | "concluido" | "aprovado" | "faturado";
  organizationId: string;
  createdAt: string;
}

// ─── Agenda ────────────────────────────────────────────────────────────────

export interface AgendaEvent {
  id: string;
  titulo: string;
  descricao?: string;
  tipo: AgendaEventType;
  dataInicio: string;
  dataFim?: string;
  allDay: boolean;
  processoId?: string;
  clienteId?: string;
  userId: string;
  organizationId: string;
  recorrencia?: string;
  createdAt: string;
}

export type AgendaEventType =
  | "audiencia"
  | "prazo"
  | "reuniao"
  | "tarefa"
  | "outro";

// ─── Audit Log ─────────────────────────────────────────────────────────────

export interface AuditLog {
  id: string;
  tableName: string;
  operation: "INSERT" | "UPDATE" | "DELETE";
  recordId: string;
  oldData?: Record<string, unknown>;
  newData?: Record<string, unknown>;
  userId: string;
  organizationId: string;
  createdAt: string;
}

// ─── Utility types ─────────────────────────────────────────────────────────

export type Maybe<T> = T | null | undefined;
export type Nullable<T> = T | null;
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
