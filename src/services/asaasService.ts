import { supabase } from "@/integrations/supabase/client";

export interface AsaasCustomer {
    id?: string;
    name: string;
    cpfCnpj: string;
    email?: string;
    phone?: string;
    mobilePhone?: string;
    address?: string;
    addressNumber?: string;
    complement?: string;
    province?: string;
    postalCode?: string;
    externalReference?: string;
}

export interface AsaasPayment {
    customer: string;
    billingType: "BOLETO" | "CREDIT_CARD" | "PIX" | "UNDEFINED";
    value: number;
    dueDate: string;
    description?: string;
    externalReference?: string;
    installmentCount?: number;
    installmentValue?: number;
}

export interface AsaasResponse<T = any> {
    data: T;
    error?: string;
}

/**
 * Calls all Asaas endpoints through the `asaas-proxy` Edge Function,
 * which runs server-side — no CORS issues.
 */
export const asaasService = {
    async request<T>(method: string, endpoint: string, organizationId: string, body?: unknown): Promise<T> {
        const clerkSession = typeof window !== "undefined" ? (window as any).Clerk?.session : null;
        if (!clerkSession) throw new Error("Usuário não autenticado.");

        const response = await supabase.functions.invoke("asaas-proxy", {
            body: { method, endpoint, body, organizationId },
        });

        if (response.error) {
            throw new Error(response.error.message ?? "Erro ao chamar asaas-proxy");
        }

        // The Edge Function returns { data } or { error }
        const result = response.data as AsaasResponse<T>;
        if (result?.error) {
            throw new Error(result.error);
        }

        return result.data;
    },

    async createCustomer(organizationId: string, customer: AsaasCustomer) {
        return this.request("POST", "/customers", organizationId, customer);
    },

    async updateCustomer(organizationId: string, asaasCustomerId: string, customer: AsaasCustomer) {
        return this.request("POST", `/customers/${asaasCustomerId}`, organizationId, customer);
    },

    async createPayment(organizationId: string, payment: AsaasPayment) {
        return this.request("POST", "/payments", organizationId, payment);
    },

    async getPayment(organizationId: string, paymentId: string) {
        return this.request("GET", `/payments/${paymentId}`, organizationId);
    },

    async getPixQrCode(organizationId: string, paymentId: string) {
        return this.request("GET", `/payments/${paymentId}/pixQrCode`, organizationId);
    },
};
