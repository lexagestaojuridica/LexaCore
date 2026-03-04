export interface ContaBase {
    id: string;
    description: string;
    amount: number;
    due_date: string;
    status: string;
    category?: string | null;
    pix_code?: string | null;
    gateway_id?: string | null;
    asaas_id?: string | null;
    asaas_billing_url?: string | null;
    asaas_customer_id?: string | null;
    client_id?: string | null;
}

export type TipoConta = "receber" | "pagar";
