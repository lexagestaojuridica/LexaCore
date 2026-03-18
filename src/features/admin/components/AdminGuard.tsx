import { ReactNode, useEffect, useState } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { db as supabase } from "@/integrations/supabase/db";

interface AdminGuardProps {
    children: ReactNode;
}

export default function AdminGuard({ children }: AdminGuardProps) {
    const { isLoaded: authLoaded } = useAuth();
    const { user, isLoaded: userLoaded } = useUser();
    const [isSuperAdmin, setIsSuperAdmin] = useState<boolean | null>(null);
    const router = useRouter();

    const MASTER_ADMIN_EMAILS = [
        "lexagestaojuridica@gmail.com",
    ];

    useEffect(() => {
        const checkMasterRole = async () => {
            if (!user) {
                setIsSuperAdmin(false);
                return;
            }

            const isEmailAuthorized = MASTER_ADMIN_EMAILS.includes(user.primaryEmailAddress?.emailAddress ?? "");

            if (isEmailAuthorized) {
                setIsSuperAdmin(true);
                return;
            }

            try {
                const { data, error } = await supabase
                    .from("user_roles")
                    .select("role")
                    .eq("user_id", user.id)
                    .eq("role", "admin")
                    .maybeSingle();

                if (error) {
                    console.error("[AdminGuard] Erro ao verificar role:", error.message);
                    setIsSuperAdmin(false);
                    return;
                }

                setIsSuperAdmin(!!data);
            } catch (err) {
                console.error("[AdminGuard] Exceção inesperada:", err);
                setIsSuperAdmin(false);
            }
        };

        if (authLoaded && userLoaded) {
            checkMasterRole();
        }
    }, [user, authLoaded, userLoaded]);

    useEffect(() => {
        if (isSuperAdmin === false) {
            router.replace("/dashboard");
        }
    }, [isSuperAdmin, router]);

    if (!authLoaded || !userLoaded || isSuperAdmin === null) {
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
        return null;
    }

    return <>{children}</>;
}
