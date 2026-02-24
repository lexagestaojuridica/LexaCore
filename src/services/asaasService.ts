import { supabase } from "@/integrations/supabase/client";

const ASAAS_SANDBOX_URL = "https://sandbox.asaas.com/api/v3";
const ASAAS_PROD_URL = "https://www.asaas.com/api/v3";

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

export const asaasService = {
    async getSettings(organizationId: string) {
        const { data, error } = await supabase
            .from("gateway_settings")
            .select("*")
            .eq("organization_id", organizationId)
            .eq("gateway_name", "asaas")
            .maybeSingle();

        if (error) throw error;
        return data;
    },

    async request(method: string, endpoint: string, organizationId: string, body?: any) {
        const settings = await this.getSettings(organizationId);
        if (!settings || !settings.api_key || settings.status !== "active") {
            throw new Error("Asaas integration not configured or inactive");
        }

        const baseUrl = settings.environment === "production" ? ASAAS_PROD_URL : ASAAS_SANDBOX_URL;

        // NOTE: For best security and to avoid CORS issues, these requests should ideally 
        // be made via Supabase Edge Functions. 
        const response = await fetch(`${baseUrl}${endpoint}`, {
            method,
            headers: {
                "Content-Type": "application/json",
                "access_token": settings.api_key || "",
            },
            body: body ? JSON.stringify(body) : undefined,
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.errors?.[0]?.description || "Erro na API do Asaas");
        }

        return response.json();
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
    }
};
