import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface Subscription {
    id: string;
    plan_id: string;
    status: string;
    current_period_end: string | null;
    organization_id: string;
    trial_ends_at: string | null;
    plans?: {
        name: string;
        slug: string;
        price_cents: number;
        max_users: number;
    };
}

export function useBilling() {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    // Get current subscription
    const { data: subscription, isLoading: loadingSub } = useQuery({
        queryKey: ["subscription", user?.id],
        queryFn: async () => {
            // First get profile for org_id
            const { data: profile } = await supabase
                .from("profiles")
                .select("organization_id")
                .eq("user_id", user!.id)
                .single();

            if (!profile?.organization_id) return null;

            const { data, error } = await supabase
                .from("subscriptions")
                .select("*, plans(*)")
                .eq("organization_id", profile.organization_id)
                .maybeSingle();

            if (error && error.code !== "PGRST116") throw error;
            return data as unknown as Subscription;
        },
        enabled: !!user,
    });

    // Create checkout session
    const checkoutMutation = useMutation({
        mutationFn: async ({ planId, interval = "month" }: { planId: string; interval?: string }) => {
            const { data, error } = await supabase.functions.invoke("billing-gateway", {
                body: { action: "create-checkout", planId, interval },
            });

            if (error) throw error;
            return data;
        },
        onSuccess: (data) => {
            if (data?.url) {
                window.location.href = data.url;
            }
        },
        onError: (err) => {
            console.error("Checkout error:", err);
            toast.error("Erro ao iniciar faturamento. Tente novamente.");
        },
    });

    // Create portal session
    const portalMutation = useMutation({
        mutationFn: async () => {
            const { data, error } = await supabase.functions.invoke("billing-gateway", {
                body: { action: "create-portal" },
            });

            if (error) throw error;
            return data;
        },
        onSuccess: (data) => {
            if (data?.url) {
                window.location.href = data.url;
            }
        },
        onError: (err) => {
            console.error("Portal error:", err);
            toast.error("Erro ao abrir portal do cliente.");
        },
    });

    return {
        subscription,
        isLoading: loadingSub,
        createCheckout: checkoutMutation.mutate,
        isProcessingCheckout: checkoutMutation.isPending,
        openPortal: portalMutation.mutate,
        isProcessingPortal: portalMutation.isPending,
    };
}
