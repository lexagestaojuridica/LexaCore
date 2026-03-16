import { trpc } from "@/shared/lib/trpc";
import { toast } from "sonner";
import type { Processo } from "../types";

const PAGE_SIZE = 15;

export function useProcessos(
    page: number,
    search: string,
    statusFilter: string,
    sortField: string,
    sortDir: "asc" | "desc",
    viewMode: "table" | "kanban"
) {
    const utils = trpc.useUtils();

    const processesQuery = trpc.processo.list.useQuery({
        page,
        search,
        statusFilter,
        sortField,
        sortDir,
        viewMode,
        pageSize: PAGE_SIZE,
    });

    const biCounts = trpc.processo.getCounts.useQuery();

    // ── Mutations ──
    const createMutation = trpc.processo.create.useMutation({
        onSuccess: () => {
            utils.processo.list.invalidate();
            toast.success("Processo criado");
        },
        onError: () => toast.error("Erro ao criar processo"),
    });

    const updateMutation = trpc.processo.update.useMutation({
        onSuccess: () => {
            utils.processo.list.invalidate();
            toast.success("Processo atualizado");
        },
        onError: () => toast.error("Erro ao atualizar processo"),
    });

    const deleteMutation = trpc.processo.delete.useMutation({
        onSuccess: () => {
            utils.processo.list.invalidate();
            toast.success("Processo excluído");
        },
        onError: () => toast.error("Erro ao excluir processo"),
    });

    return {
        orgId: "trpc-managed",
        processos: (processesQuery.data?.data as unknown as Processo[]) || [],
        totalCount: processesQuery.data?.count || 0,
        biCounts: biCounts.data || { total: 0, ativos: 0, suspensos: 0 },
        isLoading: processesQuery.isLoading,
        createMutation,
        updateMutation: {
            ...updateMutation,
            mutate: (payload: { id: string } & Partial<Processo>) => {
                const { id, ...data } = payload;
                updateMutation.mutate({ id, data });
            }
        },
        deleteMutation,
        PAGE_SIZE,
    };
}
