import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { asaasService } from "@/services/asaasService";
import { toast } from "sonner";
import type { ContaBase, TipoConta } from "../types";

export function useAsaasBilling(orgId: string | undefined, tab: TipoConta, setPixModalOpen: (open: boolean) => void, setSelectedPix: (pix: any) => void) {
    const queryClient = useQueryClient();
    const tableName = tab === "receber" ? "contas_receber" : "contas_pagar";

    const generatePixMutation = useMutation({
        mutationFn: async (c: ContaBase) => {
            if (!orgId) throw new Error("Organização não encontrada.");

            const { data: settingsRaw } = await supabase
                .from("gateway_settings")
                .select("status, api_key")
                .eq("organization_id", orgId)
                .eq("gateway_name", "asaas")
                .maybeSingle();

            const settings = settingsRaw as { api_key?: string; status?: string } | null;

            if (!settings?.api_key || settings?.status !== "active") {
                throw new Error("Integração com Asaas não configurada. Acesse Configurações > Integrações para ativar.");
            }

            const payment = await asaasService.createPayment(orgId, {
                customer: c.asaas_customer_id || c.client_id || "",
                billingType: "PIX",
                value: Number(c.amount),
                dueDate: c.due_date,
                description: c.description,
                externalReference: c.id,
            });

            const pixCode = payment.pixTransaction?.payload || payment.encodedImage || "";
            const { error } = await supabase.from("contas_receber").update({
                pix_code: pixCode,
                gateway_id: payment.id,
                asaas_id: payment.id,
            }).eq("id", c.id);

            if (error) throw error;
            return { ...c, pix_code: pixCode };
        },
        onSuccess: (updatedData) => {
            queryClient.invalidateQueries({ queryKey: [tableName] });
            setSelectedPix(updatedData);
            setPixModalOpen(true);
            toast.success("Cobrança PIX gerada com sucesso!");
        },
        onError: (e: any) => toast.error(`Erro ao gerar PIX: ${e.message}`)
    });

    const reconcileAsaasMutation = useMutation({
        mutationFn: async (c: ContaBase) => {
            if (!orgId || !c.asaas_id) return;

            const payment = await asaasService.getPayment(orgId, c.asaas_id);

            if (payment.status === "RECEIVED" || payment.status === "CONFIRMED" || payment.status === "RECEIVED_IN_CASH") {
                const { error } = await supabase.from(tableName).update({
                    status: "pago",
                    updated_at: new Date().toISOString()
                }).eq("id", c.id);

                if (error) throw error;
                toast.success(`Pagamento de ${c.description} confirmado!`);
            } else {
                toast.info(`Status no Asaas: ${payment.status}`);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [tableName] });
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
            await reconcileAsaasMutation.mutateAsync(c);
        }
        toast.dismiss();
        toast.success("Sincronização concluída.");
    };

    return {
        generatePixMutation,
        reconcileAsaasMutation,
        reconcileAllAsaas
    };
}
