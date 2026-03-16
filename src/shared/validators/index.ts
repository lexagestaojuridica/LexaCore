/**
 * Zod Validation Schemas for LEXA v3.5
 *
 * Centralized validation schemas shared across features.
 * Feature-specific schemas should be colocated in the feature directory.
 */

import { z } from "zod";

// ─── Common ────────────────────────────────────────────────────────────────

export const UUIDSchema = z.string().uuid("ID inválido");

export const CPFCNPJSchema = z
  .string()
  .min(11, "CPF/CNPJ inválido")
  .max(18, "CPF/CNPJ inválido")
  .regex(/^[\d.\-/]+$/, "CPF/CNPJ deve conter apenas números e separadores");

export const BrazilianPhoneSchema = z
  .string()
  .regex(/^\(?[1-9]{2}\)?\s?9?\d{4}[-\s]?\d{4}$/, "Telefone inválido");

export const BrazilDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato YYYY-MM-DD");

export const MoneySchema = z
  .number()
  .nonnegative("Valor não pode ser negativo")
  .multipleOf(0.01, "Valor deve ter no máximo 2 casas decimais");

export const PaginationSchema = z.object({
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(20),
});

// ─── Processo ──────────────────────────────────────────────────────────────

export const ProcessoStatusSchema = z.enum(["ativo", "arquivado", "suspenso", "encerrado"]);

export const ProcessoSchema = z.object({
  numero: z.string().min(1, "Número do processo é obrigatório"),
  titulo: z.string().min(3, "Título deve ter pelo menos 3 caracteres").max(200),
  descricao: z.string().max(2000).optional(),
  status: ProcessoStatusSchema.default("ativo"),
  clienteId: UUIDSchema,
  responsavelId: UUIDSchema,
  dataAbertura: BrazilDateSchema,
  dataEncerramento: BrazilDateSchema.optional(),
  valorCausa: MoneySchema.optional(),
  tribunal: z.string().max(200).optional(),
  vara: z.string().max(200).optional(),
});

export type ProcessoInput = z.infer<typeof ProcessoSchema>;

// ─── Cliente ───────────────────────────────────────────────────────────────

export const ClienteTipoSchema = z.enum(["pessoa_fisica", "pessoa_juridica"]);

export const ClienteSchema = z.object({
  nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres").max(200),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  cpfCnpj: CPFCNPJSchema,
  tipo: ClienteTipoSchema,
  telefone: BrazilianPhoneSchema.optional().or(z.literal("")),
});

export type ClienteInput = z.infer<typeof ClienteSchema>;

// ─── Timesheet ─────────────────────────────────────────────────────────────

export const TimesheetEntrySchema = z.object({
  processoId: UUIDSchema.optional(),
  descricao: z.string().min(3, "Descrição deve ter pelo menos 3 caracteres").max(500),
  dataInicio: z.string().datetime("Data de início inválida"),
  dataFim: z.string().datetime("Data de fim inválida").optional(),
  duracaoMinutos: z.number().int().positive().optional(),
});

export type TimesheetEntryInput = z.infer<typeof TimesheetEntrySchema>;

// ─── Agenda ────────────────────────────────────────────────────────────────

export const AgendaEventTypeSchema = z.enum([
  "audiencia",
  "prazo",
  "reuniao",
  "tarefa",
  "outro",
]);

export const AgendaEventSchema = z.object({
  titulo: z.string().min(2, "Título deve ter pelo menos 2 caracteres").max(200),
  descricao: z.string().max(1000).optional(),
  tipo: AgendaEventTypeSchema,
  dataInicio: z.string().datetime("Data de início inválida"),
  dataFim: z.string().datetime("Data de fim inválida").optional(),
  allDay: z.boolean().default(false),
  processoId: UUIDSchema.optional(),
  clienteId: UUIDSchema.optional(),
});

export type AgendaEventInput = z.infer<typeof AgendaEventSchema>;

// ─── Financeiro ────────────────────────────────────────────────────────────

export const LancamentoTipoSchema = z.enum(["receita", "despesa"]);
export const LancamentoStatusSchema = z.enum(["pendente", "pago", "atrasado", "cancelado"]);

export const LancamentoFinanceiroSchema = z.object({
  tipo: LancamentoTipoSchema,
  descricao: z.string().min(3).max(300),
  valor: MoneySchema,
  dataVencimento: BrazilDateSchema,
  dataPagamento: BrazilDateSchema.optional(),
  status: LancamentoStatusSchema.default("pendente"),
  clienteId: UUIDSchema.optional(),
  processoId: UUIDSchema.optional(),
});

export type LancamentoFinanceiroInput = z.infer<typeof LancamentoFinanceiroSchema>;
