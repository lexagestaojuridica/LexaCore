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
        onError: (e: unknown) => {
            const message = e instanceof Error ? e.message : "Erro desconhecido";
            toast.error(message);
        },
    });

    const updateMutation = trpc.financeiro.update.useMutation({
        onSuccess: () => {
            utils.financeiro.list.invalidate();
            utils.financeiro.getMetrics.invalidate();
            toast.success("Conta atualizada");
        },
        onError: (e: unknown) => {
            const message = e instanceof Error ? e.message : "Erro desconhecido";
            toast.error(message);
        },
    });

    const deleteMutation = trpc.financeiro.delete.useMutation({
        onSuccess: () => {
            utils.financeiro.list.invalidate();
            utils.financeiro.getMetrics.invalidate();
            toast.success("Conta excluída");
        },
        onError: (e: unknown) => {
            const message = e instanceof Error ? e.message : "Erro desconhecido";
            toast.error(message);
        },
    });

    const markAsPaid = (id: string) => {
        updateMutation.mutate({ type: tab, id, data: { status: "pago" } });
    };

    return {
        contas: (contasQuery.data || []) as ContaBase[],
        isLoading: contasQuery.isLoading,
        createMutation: {
            ...createMutation,
            mutate: (payload: Partial<ContaBase> & { organization_id: string }) => createMutation.mutate({ type: tab, data: payload as any })
        },
        updateMutation: {
            ...updateMutation,
            mutate: (payload: { id: string } & Partial<ContaBase>) => {
                const { id, ...data } = payload;
                updateMutation.mutate({ type: tab, id, data: data as any });
            }
        },
        deleteMutation: {
            ...deleteMutation,
            mutate: (id: string) => deleteMutation.mutate({ type: tab, id })
        },
        markAsPaid
    };
}
