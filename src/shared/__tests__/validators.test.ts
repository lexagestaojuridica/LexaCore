import { describe, it, expect } from "vitest";
import {
  ProcessoSchema,
  ClienteSchema,
  LancamentoFinanceiroSchema,
  AgendaEventSchema,
  TimesheetEntrySchema,
  PaginationSchema,
  CPFCNPJSchema,
  MoneySchema,
  BrazilDateSchema,
} from "@/shared/validators";

describe("Shared Validators", () => {
  describe("PaginationSchema", () => {
    it("validates valid pagination params", () => {
      const result = PaginationSchema.safeParse({ page: 1, pageSize: 20 });
      expect(result.success).toBe(true);
    });

    it("applies default values", () => {
      const result = PaginationSchema.parse({});
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
    });

    it("rejects pageSize greater than 100", () => {
      const result = PaginationSchema.safeParse({ page: 1, pageSize: 101 });
      expect(result.success).toBe(false);
    });

    it("rejects zero or negative page", () => {
      const result = PaginationSchema.safeParse({ page: 0, pageSize: 20 });
      expect(result.success).toBe(false);
    });
  });

  describe("CPFCNPJSchema", () => {
    it("accepts valid CPF", () => {
      expect(CPFCNPJSchema.safeParse("123.456.789-09").success).toBe(true);
    });

    it("accepts valid CNPJ", () => {
      expect(CPFCNPJSchema.safeParse("12.345.678/0001-90").success).toBe(true);
    });

    it("rejects too short value", () => {
      expect(CPFCNPJSchema.safeParse("123").success).toBe(false);
    });

    it("rejects value with letters", () => {
      expect(CPFCNPJSchema.safeParse("abc.def.ghi-jk").success).toBe(false);
    });
  });

  describe("MoneySchema", () => {
    it("accepts zero and positive values", () => {
      expect(MoneySchema.safeParse(0).success).toBe(true);
      expect(MoneySchema.safeParse(100.5).success).toBe(true);
      expect(MoneySchema.safeParse(1234.99).success).toBe(true);
    });

    it("rejects negative values", () => {
      expect(MoneySchema.safeParse(-1).success).toBe(false);
    });
  });

  describe("BrazilDateSchema", () => {
    it("accepts YYYY-MM-DD format", () => {
      expect(BrazilDateSchema.safeParse("2026-03-16").success).toBe(true);
    });

    it("rejects DD/MM/YYYY format", () => {
      expect(BrazilDateSchema.safeParse("16/03/2026").success).toBe(false);
    });

    it("rejects invalid date string", () => {
      expect(BrazilDateSchema.safeParse("not-a-date").success).toBe(false);
    });
  });

  describe("ProcessoSchema", () => {
    const validProcesso = {
      numero: "0001234-56.2026.8.26.0001",
      titulo: "Ação de Cobrança",
      status: "ativo" as const,
      clienteId: "550e8400-e29b-41d4-a716-446655440000",
      responsavelId: "550e8400-e29b-41d4-a716-446655440001",
      dataAbertura: "2026-01-15",
    };

    it("validates a complete valid processo", () => {
      const result = ProcessoSchema.safeParse(validProcesso);
      expect(result.success).toBe(true);
    });

    it("requires numero", () => {
      const result = ProcessoSchema.safeParse({ ...validProcesso, numero: "" });
      expect(result.success).toBe(false);
    });

    it("requires titulo with at least 3 characters", () => {
      const result = ProcessoSchema.safeParse({ ...validProcesso, titulo: "AB" });
      expect(result.success).toBe(false);
    });

    it("rejects invalid status", () => {
      const result = ProcessoSchema.safeParse({ ...validProcesso, status: "invalido" });
      expect(result.success).toBe(false);
    });

    it("rejects invalid clienteId UUID", () => {
      const result = ProcessoSchema.safeParse({ ...validProcesso, clienteId: "not-a-uuid" });
      expect(result.success).toBe(false);
    });

    it("validates optional fields when provided", () => {
      const result = ProcessoSchema.safeParse({
        ...validProcesso,
        valorCausa: 5000.0,
        tribunal: "TJSP",
        vara: "1ª Vara Cível",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("ClienteSchema", () => {
    const validCliente = {
      nome: "João Silva",
      email: "joao@example.com",
      cpfCnpj: "123.456.789-09",
      tipo: "pessoa_fisica" as const,
    };

    it("validates a complete valid cliente", () => {
      const result = ClienteSchema.safeParse(validCliente);
      expect(result.success).toBe(true);
    });

    it("requires nome with at least 2 characters", () => {
      const result = ClienteSchema.safeParse({ ...validCliente, nome: "J" });
      expect(result.success).toBe(false);
    });

    it("rejects invalid email format", () => {
      const result = ClienteSchema.safeParse({ ...validCliente, email: "not-an-email" });
      expect(result.success).toBe(false);
    });

    it("accepts empty string for optional email", () => {
      const result = ClienteSchema.safeParse({ ...validCliente, email: "" });
      expect(result.success).toBe(true);
    });

    it("rejects invalid tipo", () => {
      const result = ClienteSchema.safeParse({ ...validCliente, tipo: "empresa" });
      expect(result.success).toBe(false);
    });
  });

  describe("LancamentoFinanceiroSchema", () => {
    const validLancamento = {
      tipo: "receita" as const,
      descricao: "Honorários advocatícios",
      valor: 1500.0,
      dataVencimento: "2026-04-01",
      status: "pendente" as const,
    };

    it("validates a valid lancamento", () => {
      const result = LancamentoFinanceiroSchema.safeParse(validLancamento);
      expect(result.success).toBe(true);
    });

    it("rejects negative valor", () => {
      const result = LancamentoFinanceiroSchema.safeParse({ ...validLancamento, valor: -100 });
      expect(result.success).toBe(false);
    });

    it("rejects invalid tipo", () => {
      const result = LancamentoFinanceiroSchema.safeParse({ ...validLancamento, tipo: "outro" });
      expect(result.success).toBe(false);
    });
  });

  describe("AgendaEventSchema", () => {
    const validEvent = {
      titulo: "Audiência de Instrução",
      tipo: "audiencia" as const,
      dataInicio: "2026-04-15T09:00:00.000Z",
      allDay: false,
    };

    it("validates a valid agenda event", () => {
      const result = AgendaEventSchema.safeParse(validEvent);
      expect(result.success).toBe(true);
    });

    it("requires titulo with at least 2 characters", () => {
      const result = AgendaEventSchema.safeParse({ ...validEvent, titulo: "A" });
      expect(result.success).toBe(false);
    });

    it("rejects invalid tipo", () => {
      const result = AgendaEventSchema.safeParse({ ...validEvent, tipo: "invalido" });
      expect(result.success).toBe(false);
    });
  });

  describe("TimesheetEntrySchema", () => {
    it("validates a valid timesheet entry", () => {
      const result = TimesheetEntrySchema.safeParse({
        descricao: "Elaboração de petição inicial",
        dataInicio: "2026-03-16T09:00:00.000Z",
      });
      expect(result.success).toBe(true);
    });

    it("requires descricao with at least 3 characters", () => {
      const result = TimesheetEntrySchema.safeParse({
        descricao: "AB",
        dataInicio: "2026-03-16T09:00:00.000Z",
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid datetime format for dataInicio", () => {
      const result = TimesheetEntrySchema.safeParse({
        descricao: "Trabalho realizado",
        dataInicio: "2026-03-16",
      });
      expect(result.success).toBe(false);
    });
  });
});
