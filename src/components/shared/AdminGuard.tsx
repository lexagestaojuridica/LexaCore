import { ReactNode, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface AdminGuardProps {
    children: ReactNode;
}

export default function AdminGuard({ children }: AdminGuardProps) {
    const { user, loading: authLoading } = useAuth();
    const [isSuperAdmin, setIsSuperAdmin] = useState<boolean | null>(null);

    useEffect(() => {
        const checkMasterRole = async () => {
            if (!user) {
                setIsSuperAdmin(false);
                return;
            }

            // For now, the ONLY user who can access the SaaS Admin is the platform owner.
            if (user.email === "lexagestaojuridica@gmail.com") {
                setIsSuperAdmin(true);
            } else {
                // Secondary check: query profiles just in case (leftover logic for future usage)
                const { data } = await supabase
                    .from("profiles")
                    .select("id")
                    .eq("id", user.id)
                    .single();

                // Block by default if not strictly authorized above
                setIsSuperAdmin(false);
            }
        };

        if (!authLoading) {
            checkMasterRole();
        }
    }, [user, authLoading]);

    if (authLoading || isSuperAdmin === null) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-zinc-950">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
                    <p className="text-sm font-medium text-zinc-400">Autenticando acesso restrito...</p>
                </div>
            </div>
        );
    }

    if (!isSuperAdmin) {
        // Kick them back to normal dashboard if they aren't a Master Admin
        return <Navigate to="/dashboard" replace />;
    }

    return <>{children}</>;
}
