import { trpc } from "@/shared/lib/trpc";
import { toast } from "sonner";
import { parseISO, isValid } from "date-fns";
import type { TimesheetEntry, ProcessoTimesheet } from "../types";

export function useTimesheet() {
    const utils = trpc.useUtils();

    const timesheetQuery = trpc.timesheet.listEntries.useQuery();
    const processosQuery = trpc.timesheet.listProcessos.useQuery();

    const rawEntries = timesheetQuery.data || [];
    const entries = rawEntries.filter(e => e.started_at && isValid(parseISO(e.started_at))) as unknown as TimesheetEntry[];
    const processos = (processosQuery.data || []) as unknown as ProcessoTimesheet[];

    const createMutation = trpc.timesheet.createEntry.useMutation({
        onSuccess: () => {
            utils.timesheet.listEntries.invalidate();
            toast.success("Lançamento registrado!");
        },
        onError: () => toast.error("Erro ao registrar no banco."),
    });

    const deleteMutation = trpc.timesheet.deleteEntry.useMutation({
        onSuccess: () => {
            utils.timesheet.listEntries.invalidate();
            toast.success("Lançamento excluído");
        },
    });

    const billingMutation = trpc.timesheet.createBilling.useMutation({
        onSuccess: (res) => {
            toast.dismiss();
            toast.success(res.asaas_url ? "Cobrança gerada com sucesso no Asaas e integrada ao Financeiro!" : "Lançamento criado no Financeiro!");
            utils.timesheet.listEntries.invalidate();
            utils.financeiro.list.invalidate({ type: "receber" }); // Invalidate related financeiro query
        },
        onError: (err) => {
            toast.dismiss();
            toast.error(`Erro ao faturar: ${err.message}`);
        }
    });

    const fmtCurrency = (v: number) =>
        new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

    const handleBilling = async (entry: TimesheetEntry, value: number) => {
        const processo = processos.find(p => p.id === entry.process_id);
        const client = (processo as any)?.clients;

        const isAsaasConfigured = !!client?.asaas_customer_id;
        const confirmMsg = isAsaasConfigured
            ? `Deseja gerar a cobrança de ${fmtCurrency(value)} no Asaas e lançar no Financeiro?`
            : `Cliente sem integração Asaas. Deseja apenas lançar ${fmtCurrency(value)} no Financeiro local?`;

        if (!window.confirm(confirmMsg)) return;

        toast.loading("Processando fatura...");
        billingMutation.mutate({
            entryId: entry.id,
            customerId: client?.asaas_customer_id || null,
            clientId: client?.id || null,
            value,
            description: `Honorários (Timesheet): ${entry.description}`,
            createOnlyLocal: !isAsaasConfigured
        });
    };

    return {
        entries,
        isLoading: timesheetQuery.isLoading || processosQuery.isLoading,
        processos,
        createMutation,
        deleteMutation,
        handleBilling
    };
}
