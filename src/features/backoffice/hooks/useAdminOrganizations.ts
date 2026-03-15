import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db as supabase } from "@/integrations/supabase/db";
import { toast } from "sonner";
import type { Organization, SubscriptionPlanRef } from "../types";

export function useAdminOrganizations(searchTerm: string) {
    const queryClient = useQueryClient();

    // ── Plans list (for subscription management) ──
    const { data: plansList } = useQuery({
        queryKey: ["admin-subscription-plans-list"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("subscription_plans")
                .select("id, name, slug")
                .eq("is_active", true)
                .order("sort_order", { ascending: true });
            if (error) throw error;
            return data as SubscriptionPlanRef[];
        },
    });

    // ── Organizations list ──
    const { data: orgs, isLoading } = useQuery({
        queryKey: ["admin-organizations", searchTerm],
        queryFn: async () => {
            let query = supabase.from("organizations").select(`
        *,
        profiles:profiles(id, full_name, user_id),
        subscriptions:organization_subscriptions(
          status,
          plan:subscription_plans(id, name, slug)
        )
      `);

            if (searchTerm) {
                query = query.ilike("name", `%${searchTerm}%`);
            }

            const { data, error } = await query.order("created_at", { ascending: false });
            if (error) throw error;
            return data as Organization[];
        },
    });

    // ── Update org mutation ──
    const updateMutation = useMutation({
        mutationFn: async ({ id, updates }: { id: string; updates: Partial<Organization> }) => {
            const { error } = await supabase.from("organizations").update(updates).eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-organizations"] });
            toast.success("Atualizado com sucesso!");
        },
        onError: (err: Error) => toast.error(`Falha: ${err.message}`),
    });

    // ── Update subscription mutation ──
    const updateSubscriptionMutation = useMutation({
        mutationFn: async ({ orgId, planId }: { orgId: string; planId: string }) => {
            await supabase
                .from("organization_subscriptions")
                .update({ status: "canceled" })
                .eq("organization_id", orgId)
                .eq("status", "active");

            const endDate = new Date();
            endDate.setFullYear(endDate.getFullYear() + 1);

            const { error } = await supabase.from("organization_subscriptions").insert({
                organization_id: orgId,
                plan_id: planId,
                status: "active",
                current_period_start: new Date().toISOString(),
                current_period_end: endDate.toISOString(),
            });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-organizations"] });
            toast.success("Plano atualizado com sucesso!");
        },
        onError: (err: Error) => toast.error(`Falha ao atualizar plano: ${err.message}`),
    });

    // ── Impersonation ──
    const generateImpersonationLink = async (userId: string): Promise<string | null> => {
        try {
            const { data, error } = await supabase.functions.invoke("admin-impersonate", {
                body: { target_user_id: userId },
            });
            if (error) throw new Error(error.message);
            if (data?.error) throw new Error(data.error);
            toast.success("Link de acesso gerado com sucesso!");
            return data.action_link as string;
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Erro desconhecido";
            toast.error(`Falha ao gerar link: ${message}`);
            return null;
        }
    };

    return {
        orgs,
        isLoading,
        plansList,
        updateMutation,
        updateSubscriptionMutation,
        generateImpersonationLink,
    };
}
