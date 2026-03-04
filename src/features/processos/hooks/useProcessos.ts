import { useState } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
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
    const { user } = useAuth();
    const queryClient = useQueryClient();

    // ── Profile query (org_id) ──
    const { data: profile } = useQuery({
        queryKey: ["profile", user?.id],
        queryFn: async () => {
            const { data } = await supabase.from("profiles").select("organization_id").eq("user_id", user!.id).single();
            return data;
        },
        enabled: !!user,
    });

    const orgId = profile?.organization_id;

    // ── Processes (filtered & paginated) ──
    const { data: processosData, isLoading } = useQuery({
        queryKey: ["processos", orgId, page, search, statusFilter, sortField, sortDir, viewMode],
        queryFn: async () => {
            let query = (supabase.from("processos_juridicos") as any)
                .select("*, clients(id, name, phone, asaas_customer_id)", { count: "exact" })
                .eq("organization_id", orgId!);

            if (statusFilter !== "all") {
                query = query.eq("status", statusFilter);
            }

            if (search) {
                query = query.or(`title.ilike.%${search}%,number.ilike.%${search}%,court.ilike.%${search}%,subject.ilike.%${search}%`);
            }

            query = query.order(sortField, { ascending: sortDir === "asc" });

            if (viewMode === "table") {
                const from = (page - 1) * PAGE_SIZE;
                const to = from + PAGE_SIZE - 1;
                query = query.range(from, to);
            } else {
                query = query.limit(200);
            }

            const { data, error, count } = await query;
            if (error) throw error;
            return { data: data as Processo[], count: count ?? 0 };
        },
        enabled: !!orgId,
        placeholderData: keepPreviousData,
    });

    // ── BI Counts (for StatCards) ──
    const { data: biCounts } = useQuery({
        queryKey: ["processos-bi", orgId],
        queryFn: async () => {
            const { count: total } = await supabase.from("processos_juridicos").select("*", { count: "exact", head: true }).eq("organization_id", orgId!);
            const { count: ativos } = await supabase.from("processos_juridicos").select("*", { count: "exact", head: true }).eq("organization_id", orgId!).eq("status", "ativo");
            const { count: suspensos } = await supabase.from("processos_juridicos").select("*", { count: "exact", head: true }).eq("organization_id", orgId!).eq("status", "suspenso");
            return { total: total || 0, ativos: ativos || 0, suspensos: suspensos || 0 };
        },
        enabled: !!orgId,
    });

    // ── Mutations ──
    const createMutation = useMutation({
        mutationFn: async (payload: any) => {
            const { error } = await supabase.from("processos_juridicos").insert({ ...payload, organization_id: orgId, responsible_user_id: user?.id });
            if (error) throw error;
        },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["processos"] }); toast.success("Processo criado"); },
        onError: () => toast.error("Erro ao criar processo"),
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, ...payload }: any) => {
            delete payload.organization_id;
            delete payload.created_at;
            delete payload.responsible_user_id;
            const { error } = await supabase.from("processos_juridicos").update(payload).eq("id", id).eq("organization_id", orgId!);
            if (error) throw error;
        },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["processos"] }); toast.success("Processo atualizado"); },
        onError: () => toast.error("Erro ao atualizar processo"),
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from("processos_juridicos").delete().eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["processos"] }); toast.success("Processo excluído"); },
        onError: () => toast.error("Erro ao excluir processo"),
    });

    return {
        orgId,
        processos: processosData?.data || [],
        totalCount: processosData?.count || 0,
        biCounts: biCounts || { total: 0, ativos: 0, suspensos: 0 },
        isLoading,
        createMutation,
        updateMutation,
        deleteMutation,
        PAGE_SIZE,
    };
}
