import { trpc } from "@/shared/lib/trpc";

export function useFinanceiroMetrics() {
    const metricsQuery = trpc.financeiro.getMetrics.useQuery();

    return {
        totalReceber: metricsQuery.data?.totalReceber || 0,
        totalPagar: metricsQuery.data?.totalPagar || 0,
        totalRecebido: metricsQuery.data?.totalRecebido || 0,
        totalPagoVal: metricsQuery.data?.totalPagoVal || 0,
        saldo: metricsQuery.data?.saldo || 0,
        healthPercent: metricsQuery.data?.healthPercent || 0,
        isLoading: metricsQuery.isLoading
    };
}
