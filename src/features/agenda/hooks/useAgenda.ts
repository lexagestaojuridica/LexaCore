import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Evento } from "../types";
import { addMonths, subMonths, parseISO, isValid } from "date-fns";

export function useAgenda(
    organizationId: string | undefined,
    userId: string | undefined,
    currentMonth: Date
) {
    const queryClient = useQueryClient();

    const { data: rawEventos = [], isLoading } = useQuery({
        queryKey: ["eventos_agenda", organizationId, currentMonth.getFullYear(), currentMonth.getMonth()],
        queryFn: async () => {
            const startWindow = subMonths(currentMonth, 2).toISOString();
            const endWindow = addMonths(currentMonth, 2).toISOString();
            const { data, error } = await supabase
                .from("eventos_agenda")
                .select("*")
                .eq("organization_id", organizationId!)
                .gte("start_time", startWindow)
                .lte("start_time", endWindow)
                .order("start_time", { ascending: true });

            if (error) throw error;
            return data as unknown as Evento[];
        },
        enabled: !!organizationId,
    });

    const eventos = rawEventos.filter(e =>
        e.start_time && e.end_time && isValid(parseISO(e.start_time)) && isValid(parseISO(e.end_time))
    );

    const createMutation = useMutation({
        mutationFn: async (payload: Partial<Evento>) => {
            const { error } = await supabase.from("eventos_agenda").insert(payload);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["eventos_agenda"] });
            toast.success("Compromisso criado com sucesso");
        },
        onError: (err: any) => toast.error(err.message),
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, ...payload }: Partial<Evento> & { id: string }) => {
            const { error } = await supabase.from("eventos_agenda").update(payload).eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["eventos_agenda"] });
            toast.success("Compromisso atualizado");
        },
        onError: (err: any) => toast.error(err.message),
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from("eventos_agenda").delete().eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["eventos_agenda"] });
            toast.success("Comprimisso excluído com sucesso");
        },
        onError: (err: any) => toast.error(err.message),
    });

    return {
        eventos,
        isLoading,
        createMutation,
        updateMutation,
        deleteMutation
    };
}
