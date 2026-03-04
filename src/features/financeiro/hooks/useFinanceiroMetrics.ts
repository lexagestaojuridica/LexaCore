import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useFinanceiroMetrics(orgId: string | undefined) {
    const { data: receberData = [] } = useQuery({
        queryKey: ["contas_receber", orgId],
        queryFn: async () => {
            const { data } = await supabase.from("contas_receber").select("amount, status").eq("organization_id", orgId!);
            return data ?? [];
        },
        enabled: !!orgId,
    });

    const { data: pagarData = [] } = useQuery({
        queryKey: ["contas_pagar", orgId],
        queryFn: async () => {
            const { data } = await supabase.from("contas_pagar").select("amount, status").eq("organization_id", orgId!);
            return data ?? [];
        },
        enabled: !!orgId,
    });

    const totalReceber = receberData.filter((c) => c.status === "pendente").reduce((s, c) => s + Number(c.amount), 0);
    const totalPagar = pagarData.filter((c) => c.status === "pendente").reduce((s, c) => s + Number(c.amount), 0);
    const totalRecebido = receberData.filter((c) => c.status === "pago").reduce((s, c) => s + Number(c.amount), 0);
    const totalPagoVal = pagarData.filter((c) => c.status === "pago").reduce((s, c) => s + Number(c.amount), 0);
    const saldo = totalRecebido - totalPagoVal;

    const totalFluxo = totalReceber + totalPagar;
    const healthPercent = totalFluxo === 0 ? 50 : (totalReceber / totalFluxo) * 100;

    return {
        totalReceber,
        totalPagar,
        totalRecebido,
        totalPagoVal,
        saldo,
        healthPercent
    };
}
