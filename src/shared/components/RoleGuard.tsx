import { ReactNode } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { db as supabase } from "@/integrations/supabase/db";

type AppRole = "admin" | "advogado" | "estagiario" | "financeiro" | "cliente";

interface RoleGuardProps {
    allowedRoles: AppRole[];
    children: ReactNode;
    fallback?: ReactNode;
}

export default function RoleGuard({ allowedRoles, children, fallback = null }: RoleGuardProps) {
    const { isLoaded: authLoaded } = useAuth();
    const { user, isLoaded: userLoaded } = useUser();

    const { data: userRoleData, isLoading } = useQuery({
        queryKey: ["user-role", user?.id],
        queryFn: async () => {
            const { data } = await (supabase as any).from("user_roles").select("role").eq("user_id", user!.id).maybeSingle();
            return data;
        },
        enabled: !!user,
        staleTime: 1000 * 60 * 30,
        gcTime: 1000 * 60 * 60,
    });

    if (!authLoaded || !userLoaded || isLoading) return <div className="p-4 flex justify-center"><div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

    const role = (userRoleData?.role as AppRole) ?? (user?.publicMetadata?.app_role as AppRole) ?? "admin";

    if (role === "admin") return <>{children}</>;

    if (!allowedRoles.includes(role)) {
        return <>{fallback}</>;
    }

    return <>{children}</>;
}
