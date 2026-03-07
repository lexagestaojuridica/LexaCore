import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { parseISO, isValid } from "date-fns";
import type { TimesheetEntry, ProcessoTimesheet } from "../types";

export function useTimesheet(orgId: string | undefined, userId: string | undefined) {
    const queryClient = useQueryClient();

    const { data: rawEntries = [], isLoading } = useQuery({
        queryKey: ["timesheet", orgId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("timesheet_entries")
                .select("*")
                .eq("organization_id", orgId!)
                .order("started_at", { ascending: false });
            if (error) return [];
            return (data ?? []) as unknown as TimesheetEntry[];
        },
        enabled: !!orgId,
    });

    const entries = rawEntries.filter(e => e.started_at && isValid(parseISO(e.started_at)));

    const { data: processos = [] } = useQuery({
        queryKey: ["processos-ts", orgId],
        queryFn: async () => {
            const { data } = await supabase
                .from("processos_juridicos")
                .select("id, title, number, client_id, clients(id, name, asaas_customer_id)")
                .eq("organization_id", orgId!)
                .eq("status", "ativo");
            return (data ?? []) as unknown as ProcessoTimesheet[];
        },
        enabled: !!orgId,
    });

    const createMutation = useMutation({
        mutationFn: async (payload: any) => {
            const { error } = await supabase.from("timesheet_entries").insert(payload);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["timesheet"] });
            toast.success("Lançamento registrado!");
        },
        onError: () => toast.error("Erro ao registrar no banco."),
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from("timesheet_entries").delete().eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["timesheet"] });
            toast.success("Lançamento excluído");
        },
    });

    const fmtCurrency = (v: number) =>
        new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

    const handleBilling = async (entry: TimesheetEntry, value: number) => {
        if (!orgId || !userId) return;

        const processo = processos.find(p => p.id === entry.process_id);
        const client = processo?.clients;

        const isAsaasConfigured = !!client?.asaas_customer_id;
        const confirmMsg = isAsaasConfigured
            ? `Deseja gerar a cobrança de ${fmtCurrency(value)} no Asaas e lançar no Financeiro?`
            : `Cliente sem integração Asaas. Deseja apenas lançar ${fmtCurrency(value)} no Financeiro local?`;

        if (!window.confirm(confirmMsg)) return;

        try {
            toast.loading("Processando fatura...");
            const { data: res, error } = await supabase.functions.invoke("billing-gateway", {
                body: {
                    action: "create-charge",
                    customerId: client?.asaas_customer_id,
                    clientId: client?.id,
                    value,
                    description: `Honorários (Timesheet): ${entry.description}`,
                    externalReference: entry.id,
                    sourceType: "timesheet",
                    sourceId: entry.id,
                    createOnlyLocal: !isAsaasConfigured
                }
            });

            if (error) throw error;
            if (res?.error) throw new Error(res.error);

            toast.dismiss();
            toast.success(res.asaas_url ? "Cobrança gerada com sucesso no Asaas e integrada ao Financeiro!" : "Lançamento criado no Financeiro!");
            queryClient.invalidateQueries({ queryKey: ["timesheet"] });
            queryClient.invalidateQueries({ queryKey: ["contas_receber"] });
        } catch (err: any) {
            toast.dismiss();
            toast.error(`Erro ao faturar: ${err.message}`);
        }
    };

    return {
        entries,
        isLoading,
        processos,
        createMutation,
        deleteMutation,
        handleBilling
    };
}
