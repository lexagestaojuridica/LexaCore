import { ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type AppRole = "admin" | "advogado" | "estagiario" | "financeiro" | "cliente";

interface RoleGuardProps {
    allowedRoles: AppRole[];
    children: ReactNode;
    fallback?: ReactNode;
}

export default function RoleGuard({ allowedRoles, children, fallback = null }: RoleGuardProps) {
    const { user, loading: authLoading } = useAuth();

    const { data: userRoleData, isLoading } = useQuery({
        queryKey: ["user-role", user?.id],
        queryFn: async () => {
            const { data } = await supabase.from("user_roles").select("role").eq("user_id", user!.id).maybeSingle();
            return data;
        },
        enabled: !!user,
        staleTime: 1000 * 60 * 30, // 30 minutes cache (prevent DB hammering on tab changes)
        gcTime: 1000 * 60 * 60, // Keep in garbage collector memory for 1 hour
    });

    if (authLoading || isLoading) return <div className="p-4 flex justify-center"><div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

    const role = (userRoleData?.role as AppRole) ?? (user?.user_metadata?.app_role as AppRole) ?? "admin";

    if (role === "admin") return <>{children}</>;

    if (!allowedRoles.includes(role)) {
        return <>{fallback}</>;
    }

    return <>{children}</>;
}
