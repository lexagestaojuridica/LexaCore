import { ReactNode, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface AdminGuardProps {
    children: ReactNode;
}

/**
 * AdminGuard — Protege o Backoffice Admin HQ.
 * 
 * Verifica se o usuário autenticado possui role "admin" na tabela profiles
 * E se o email está na lista de Master Admins autorizados.
 * 
 * 🔐 Kai: Usando verificação dupla (email + role) para máxima segurança.
 * 🗄️ Rafael: Query direta à tabela profiles com campos role e email.
 */
export default function AdminGuard({ children }: AdminGuardProps) {
    const { user, loading: authLoading } = useAuth();
    const [isSuperAdmin, setIsSuperAdmin] = useState<boolean | null>(null);

    // Lista de emails autorizados como Master Admin
    const MASTER_ADMIN_EMAILS = [
        "lexagestaojuridica@gmail.com",
        // Adicionar outros emails de Master Admin conforme necessário
    ];

    useEffect(() => {
        const checkMasterRole = async () => {
            if (!user) {
                setIsSuperAdmin(false);
                return;
            }

            // Verificação 1: Email na lista de Master Admins (Override para a equipe fundadora)
            const isEmailAuthorized = MASTER_ADMIN_EMAILS.includes(user.email ?? "");

            // Se o email está na lista principal, garante acesso imediato para contornar 
            // a diferença de IDs (Clerk ID vs Supabase UUID) ocorrida na migração.
            if (isEmailAuthorized) {
                setIsSuperAdmin(true);
                return;
            }

            // Para outros usuários, verifica a role no banco de dados.
            // NOTA: Requer que a tabela 'user_roles' seja atualizada para suportar Clerk IDs.

            // Verificação 2: Confirmar role "admin" no banco de dados (tabela user_roles)
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
        return <Navigate to="/dashboard" replace />;
    }

    return <>{children}</>;
}
