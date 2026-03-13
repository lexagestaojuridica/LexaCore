import { trpc } from "@/shared/lib/trpc";
import { toast } from "sonner";
import type { TipoConta, ContaBase } from "../types";

export function useFinanceiro(tab: TipoConta) {
    const utils = trpc.useUtils();

    const contasQuery = trpc.financeiro.list.useQuery({ type: tab });

    const createMutation = trpc.financeiro.create.useMutation({
        onSuccess: () => {
            utils.financeiro.list.invalidate();
            utils.financeiro.getMetrics.invalidate();
            toast.success("Conta criada");
        },
        onError: (e: any) => toast.error(e.message),
    });

    const updateMutation = trpc.financeiro.update.useMutation({
        onSuccess: () => {
            utils.financeiro.list.invalidate();
            utils.financeiro.getMetrics.invalidate();
            toast.success("Conta atualizada");
        },
        onError: (e: any) => toast.error(e.message),
    });

    const deleteMutation = trpc.financeiro.delete.useMutation({
        onSuccess: () => {
            utils.financeiro.list.invalidate();
            utils.financeiro.getMetrics.invalidate();
            toast.success("Conta excluída");
        },
        onError: (e: any) => toast.error(e.message),
    });

    const markAsPaid = (id: string) => {
        updateMutation.mutate({ type: tab, id, data: { status: "pago" } });
    };

    return {
        contas: (contasQuery.data as unknown as ContaBase[]) || [],
        isLoading: contasQuery.isLoading,
        createMutation: {
            ...createMutation,
            mutate: (payload: any) => createMutation.mutate({ type: tab, data: payload })
        },
        updateMutation: {
            ...updateMutation,
            mutate: (payload: { id: string } & Record<string, any>) => {
                const { id, ...data } = payload;
                updateMutation.mutate({ type: tab, id, data });
            }
        },
        deleteMutation: {
            ...deleteMutation,
            mutate: (id: string) => deleteMutation.mutate({ type: tab, id })
        },
        markAsPaid
    };
}
