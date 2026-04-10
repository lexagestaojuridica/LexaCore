import { trpc } from "@/shared/lib/trpc";
import { toast } from "sonner";
import { Evento } from "../types";
import { addMonths, subMonths } from "date-fns";

export function useAgenda(
    currentMonth: Date
) {
    const utils = trpc.useUtils();

    const startWindow = subMonths(currentMonth, 2).toISOString();
    const endWindow = addMonths(currentMonth, 2).toISOString();

    const agendaQuery = trpc.agenda.list.useQuery({
        start: startWindow,
        end: endWindow
    });

    const createMutation = trpc.agenda.create.useMutation({
        onSuccess: () => {
            utils.agenda.list.invalidate();
            utils.agenda.getUpcomingDeadlines.invalidate();
            toast.success("Compromisso criado com sucesso");
        },
        onError: (err: unknown) => {
            const message = err instanceof Error ? err.message : "Erro desconhecido";
            toast.error(message);
        },
    });

    const updateMutation = trpc.agenda.update.useMutation({
        onSuccess: () => {
            utils.agenda.list.invalidate();
            utils.agenda.getUpcomingDeadlines.invalidate();
            toast.success("Compromisso atualizado");
        },
        onError: (err: unknown) => {
            const message = err instanceof Error ? err.message : "Erro desconhecido";
            toast.error(message);
        },
    });

    const deleteMutation = trpc.agenda.delete.useMutation({
        onSuccess: () => {
            utils.agenda.list.invalidate();
            utils.agenda.getUpcomingDeadlines.invalidate();
            toast.success("Compromisso excluído com sucesso");
        },
        onError: (err: unknown) => {
            const message = err instanceof Error ? err.message : "Erro desconhecido";
            toast.error(message);
        },
    });

    return {
        eventos: (agendaQuery.data || []) as unknown as Evento[],
        isLoading: agendaQuery.isLoading,
        createMutation: {
            ...createMutation,
            mutate: (payload: Partial<Evento> & { user_id: string; organization_id: string }) => createMutation.mutate(payload as any)
        },
        updateMutation: {
            ...updateMutation,
            mutate: (payload: { id: string } & Partial<Evento>) => {
                const { id, ...data } = payload;
                updateMutation.mutate({ id, data: data as any });
            }
        },
        deleteMutation: {
            ...deleteMutation,
            mutate: (id: string) => deleteMutation.mutate(id)
        }
    };
}
