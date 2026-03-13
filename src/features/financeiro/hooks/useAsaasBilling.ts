import { trpc } from "@/shared/lib/trpc";
import { toast } from "sonner";
import type { ContaBase, TipoConta } from "../types";

export function useAsaasBilling(
    tab: TipoConta,
    setPixModalOpen: (open: boolean) => void,
    setSelectedPix: (pix: any) => void
) {
    const utils = trpc.useUtils();

    const generatePixMutation = trpc.financeiro.generatePix.useMutation({
        onSuccess: (data) => {
            utils.financeiro.list.invalidate();
            setSelectedPix({ pix_code: data.pixCode });
            setPixModalOpen(true);
            toast.success("Cobrança PIX gerada com sucesso!");
        },
        onError: (e: any) => toast.error(`Erro ao gerar PIX: ${e.message}`)
    });

    const reconcileMutation = trpc.financeiro.reconcile.useMutation({
        onSuccess: (data) => {
            if (data.status === "confirmed") {
                utils.financeiro.list.invalidate();
                toast.success("Pagamento confirmado!");
            } else if (data.status === "pending") {
                toast.info(`Status no Asaas: ${data.asaasStatus}`);
            }
        },
        onError: (err: any) => toast.error(`Erro ao reconciliar: ${err.message}`)
    });

    const reconcileAllAsaas = async (filteredContas: ContaBase[]) => {
        const pendingAsaas = filteredContas.filter((c) => c.status === "pendente" && c.asaas_id);
        if (pendingAsaas.length === 0) {
            toast.info("Nenhuma conta do Asaas pendente para sincronizar.");
            return;
        }

        toast.loading(`Sincronizando ${pendingAsaas.length} faturas...`);
        for (const c of pendingAsaas) {
            await reconcileMutation.mutateAsync({ id: c.id, type: tab });
        }
        toast.dismiss();
    };

    return {
        generatePixMutation: {
            ...generatePixMutation,
            mutate: (c: ContaBase) => generatePixMutation.mutate({ id: c.id })
        },
        reconcileAsaasMutation: reconcileMutation,
        reconcileAllAsaas
    };
}
