import { describe, it, expect } from "vitest";
import {
  APP_NAME,
  APP_VERSION,
  USER_ROLES,
  USER_ROLE_LABELS,
  PROCESSO_STATUS,
  PROCESSO_STATUS_LABELS,
  PROCESSO_STATUS_COLORS,
  AGENDA_EVENT_TYPES,
  LANCAMENTO_STATUS,
  QUERY_KEYS,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  MAX_FILE_SIZE_BYTES,
  MAX_FILE_SIZE_MB,
} from "@/shared/constants";

describe("Shared Constants", () => {
  it("APP_NAME is LEXA", () => {
    expect(APP_NAME).toBe("LEXA");
  });

  it("APP_VERSION follows semver", () => {
    expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("DEFAULT_PAGE_SIZE is less than MAX_PAGE_SIZE", () => {
    expect(DEFAULT_PAGE_SIZE).toBeLessThan(MAX_PAGE_SIZE);
  });

  it("MAX_FILE_SIZE_BYTES equals MAX_FILE_SIZE_MB * 1024 * 1024", () => {
    expect(MAX_FILE_SIZE_BYTES).toBe(MAX_FILE_SIZE_MB * 1024 * 1024);
  });

  describe("USER_ROLES", () => {
    it("defines all expected roles", () => {
      expect(USER_ROLES.ADMIN).toBe("admin");
      expect(USER_ROLES.ADVOGADO).toBe("advogado");
      expect(USER_ROLES.ASSOCIADO).toBe("associado");
      expect(USER_ROLES.ADMINISTRATIVO).toBe("administrativo");
      expect(USER_ROLES.CLIENTE).toBe("cliente");
    });

    it("has labels for all roles", () => {
      Object.values(USER_ROLES).forEach((role) => {
        expect(USER_ROLE_LABELS[role]).toBeDefined();
        expect(USER_ROLE_LABELS[role].length).toBeGreaterThan(0);
      });
    });
  });

  describe("PROCESSO_STATUS", () => {
    it("defines all expected statuses", () => {
      expect(PROCESSO_STATUS.ATIVO).toBe("ativo");
      expect(PROCESSO_STATUS.ARQUIVADO).toBe("arquivado");
      expect(PROCESSO_STATUS.SUSPENSO).toBe("suspenso");
      expect(PROCESSO_STATUS.ENCERRADO).toBe("encerrado");
    });

    it("has labels for all statuses", () => {
      Object.values(PROCESSO_STATUS).forEach((status) => {
        expect(PROCESSO_STATUS_LABELS[status]).toBeDefined();
      });
    });

    it("has color classes for all statuses", () => {
      Object.values(PROCESSO_STATUS).forEach((status) => {
        expect(PROCESSO_STATUS_COLORS[status]).toBeDefined();
        expect(PROCESSO_STATUS_COLORS[status].length).toBeGreaterThan(0);
      });
    });
  });

  describe("AGENDA_EVENT_TYPES", () => {
    it("includes audiencia and prazo", () => {
      expect(AGENDA_EVENT_TYPES.AUDIENCIA).toBe("audiencia");
      expect(AGENDA_EVENT_TYPES.PRAZO).toBe("prazo");
    });
  });

  describe("LANCAMENTO_STATUS", () => {
    it("includes all financial statuses", () => {
      expect(LANCAMENTO_STATUS.PENDENTE).toBe("pendente");
      expect(LANCAMENTO_STATUS.PAGO).toBe("pago");
      expect(LANCAMENTO_STATUS.ATRASADO).toBe("atrasado");
      expect(LANCAMENTO_STATUS.CANCELADO).toBe("cancelado");
    });
  });

  describe("QUERY_KEYS", () => {
    it("defines all main query keys", () => {
      expect(QUERY_KEYS.PROCESSOS).toBe("processos");
      expect(QUERY_KEYS.CLIENTES).toBe("clientes");
      expect(QUERY_KEYS.AGENDA).toBe("agenda");
      expect(QUERY_KEYS.FINANCEIRO).toBe("financeiro");
    });
  });
});
