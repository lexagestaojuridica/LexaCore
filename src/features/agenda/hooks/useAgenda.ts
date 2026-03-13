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
        onError: (err: any) => toast.error(err.message),
    });

    const updateMutation = trpc.agenda.update.useMutation({
        onSuccess: () => {
            utils.agenda.list.invalidate();
            utils.agenda.getUpcomingDeadlines.invalidate();
            toast.success("Compromisso atualizado");
        },
        onError: (err: any) => toast.error(err.message),
    });

    const deleteMutation = trpc.agenda.delete.useMutation({
        onSuccess: () => {
            utils.agenda.list.invalidate();
            utils.agenda.getUpcomingDeadlines.invalidate();
            toast.success("Compromisso excluído com sucesso");
        },
        onError: (err: any) => toast.error(err.message),
    });

    return {
        eventos: (agendaQuery.data || []) as Evento[],
        isLoading: agendaQuery.isLoading,
        createMutation: {
            ...createMutation,
            mutate: (payload: any) => createMutation.mutate(payload)
        },
        updateMutation: {
            ...updateMutation,
            mutate: (payload: { id: string } & Record<string, any>) => {
                const { id, ...data } = payload;
                updateMutation.mutate({ id, data });
            }
        },
        deleteMutation: {
            ...deleteMutation,
            mutate: (id: string) => deleteMutation.mutate(id)
        }
    };
}
