/**
 * Asaas Payment Gateway Integration
 *
 * Client-side constants and types for Asaas integration.
 * Actual API calls are made from Hostinger Edge Functions / tRPC routes
 * to keep the API key server-side only.
 *
 * Usage:
 *   import { ASAAS_BILLING_TYPES, AsaasBillingType } from '@/integrations/asaas';
 */

// ─── Billing types ─────────────────────────────────────────────────────────

export const ASAAS_BILLING_TYPES = {
  BOLETO: "BOLETO",
  CREDIT_CARD: "CREDIT_CARD",
  DEBIT_CARD: "DEBIT_CARD",
  PIX: "PIX",
  UNDEFINED: "UNDEFINED",
} as const;

export type AsaasBillingType = (typeof ASAAS_BILLING_TYPES)[keyof typeof ASAAS_BILLING_TYPES];

// ─── Payment status ────────────────────────────────────────────────────────

export const ASAAS_PAYMENT_STATUS = {
  PENDING: "PENDING",
  RECEIVED: "RECEIVED",
  CONFIRMED: "CONFIRMED",
  OVERDUE: "OVERDUE",
  REFUNDED: "REFUNDED",
  RECEIVED_IN_CASH: "RECEIVED_IN_CASH",
  REFUND_REQUESTED: "REFUND_REQUESTED",
  CHARGEBACK_REQUESTED: "CHARGEBACK_REQUESTED",
  CHARGEBACK_DISPUTE: "CHARGEBACK_DISPUTE",
  AWAITING_CHARGEBACK_REVERSAL: "AWAITING_CHARGEBACK_REVERSAL",
  DUNNING_REQUESTED: "DUNNING_REQUESTED",
  DUNNING_RECEIVED: "DUNNING_RECEIVED",
  AWAITING_RISK_ANALYSIS: "AWAITING_RISK_ANALYSIS",
} as const;

export type AsaasPaymentStatus =
  (typeof ASAAS_PAYMENT_STATUS)[keyof typeof ASAAS_PAYMENT_STATUS];

// ─── Customer type ─────────────────────────────────────────────────────────

export interface AsaasCustomer {
  id: string;
  name: string;
  email: string;
  cpfCnpj: string;
  phone?: string;
  mobilePhone?: string;
  address?: string;
  addressNumber?: string;
  complement?: string;
  province?: string;
  postalCode?: string;
  externalReference?: string;
}

// ─── Payment type ──────────────────────────────────────────────────────────

export interface AsaasPayment {
  id: string;
  customer: string;
  billingType: AsaasBillingType;
  value: number;
  dueDate: string;
  description?: string;
  status: AsaasPaymentStatus;
  invoiceUrl?: string;
  bankSlipUrl?: string;
  pixQrCodeId?: string;
  externalReference?: string;
}

// ─── Environment helpers ───────────────────────────────────────────────────

/**
 * Returns true if Asaas is configured in sandbox mode.
 * Server-side only.
 */
export function isAsaasSandbox(): boolean {
  return process.env.ASAAS_ENVIRONMENT !== "production";
}

/**
 * Returns the Asaas base URL based on the configured environment.
 * Server-side only.
 */
export function getAsaasBaseUrl(): string {
  return isAsaasSandbox()
    ? (process.env.ASAAS_BASE_URL_SANDBOX ?? "https://sandbox.asaas.com/api/v3")
    : (process.env.ASAAS_BASE_URL_PRODUCTION ?? "https://api.asaas.com/v3");
}
