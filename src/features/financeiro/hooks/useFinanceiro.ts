import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { asaasService } from "@/services/asaasService";
import { toast } from "sonner";
import type { TipoConta, ContaBase } from "../types";

export function useFinanceiro(orgId: string | undefined, tab: TipoConta) {
    const queryClient = useQueryClient();
    const tableName = tab === "receber" ? "contas_receber" : "contas_pagar";

    const { data: contas = [], isLoading } = useQuery({
        queryKey: [tableName, orgId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from(tableName)
                .select("*")
                .eq("organization_id", orgId!)
                .order("due_date", { ascending: true });
            if (error) throw error;
            return data as ContaBase[];
        },
        enabled: !!orgId,
    });

    const createMutation = useMutation({
        mutationFn: async (payload: any) => {
            const { error } = await supabase.from(tableName).insert({
                ...payload,
                organization_id: orgId
            });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [tableName] });
            queryClient.invalidateQueries({ queryKey: ["contas_receber"] });
            queryClient.invalidateQueries({ queryKey: ["contas_pagar"] });
            toast.success("Conta criada");
        },
        onError: (e: any) => toast.error(e.message),
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, ...payload }: any) => {
            const { error } = await supabase
                .from(tableName)
                .update(payload)
                .eq("id", id)
                .eq("organization_id", orgId!);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [tableName] });
            queryClient.invalidateQueries({ queryKey: ["contas_receber"] });
            queryClient.invalidateQueries({ queryKey: ["contas_pagar"] });
            toast.success("Conta atualizada");
        },
        onError: (e: any) => toast.error(e.message),
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from(tableName).delete().eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [tableName] });
            queryClient.invalidateQueries({ queryKey: ["contas_receber"] });
            queryClient.invalidateQueries({ queryKey: ["contas_pagar"] });
            toast.success("Conta excluída");
        },
        onError: (e: any) => toast.error(e.message),
    });

    const markAsPaid = (id: string) => {
        updateMutation.mutate({ id, status: "pago" });
    };

    return {
        contas,
        isLoading,
        createMutation,
        updateMutation,
        deleteMutation,
        markAsPaid
    };
}
