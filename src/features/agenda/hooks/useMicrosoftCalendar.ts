import { useState, useEffect, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { db as supabase, supabaseClient } from "@/integrations/supabase/db";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const db = supabase;

interface MicrosoftCalendarConnection {
    id: string;
    user_id: string;
    organization_id: string;
    access_token: string;
    refresh_token: string | null;
    token_expires_at: string;
    last_sync_at: string | null;
    sync_enabled: boolean;
    created_at: string;
}

interface MicrosoftAuthResponse {
    access_token: string;
    refresh_token: string | null;
    expires_in: number;
    error?: string;
    url?: string;
}

export function useMicrosoftCalendar() {
    const { user } = useUser();
    const queryClient = useQueryClient();
    const [connecting, setConnecting] = useState(false);

    const { data: connection, isLoading: loadingConnection } = useQuery({
        queryKey: ["microsoft-calendar-connection", user?.id],
        queryFn: async () => {
            if (!user?.id) return null;
            const { data, error } = await db
                .from("microsoft_calendar_tokens")
                .select("*")
                .eq("user_id", String(user.id))
                .maybeSingle();
            if (error) throw error;
            return data as MicrosoftCalendarConnection | null;
        },
        enabled: !!user?.id,
    });

    const isConnected = !!connection;
    const lastSyncAt = connection?.last_sync_at;
    const syncEnabled = connection?.sync_enabled ?? false;

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        const handleCodeFromUrl = async () => {
            const searchParams = new URLSearchParams(window.location.search);
            const code = searchParams.get("code");
            const state = searchParams.get("state");

            if (!code || state !== "microsoft") return;

            console.log("Microsoft Auth: Código detectado na URL, processando...", { code: code.substring(0, 10) + "...", state });

            if (!user?.id) {
                console.log("Microsoft Auth: Usuário ainda não carregado, aguardando...");
                return;
            }

            setConnecting(true);
            try {
                console.log("Microsoft Auth: Trocando código por token...");
                // Clear URL params
                const url = new URL(window.location.href);
                url.searchParams.delete("code");
                url.searchParams.delete("state");
                window.history.replaceState({}, document.title, url.pathname);

                const redirectUri = `${window.location.origin}/dashboard/agenda`;

                const { data: tokenData, error } = await supabase.functions.invoke("microsoft-calendar-auth", {
                    body: { action: "exchange_code", code, redirect_uri: redirectUri },
                });

                if (error) throw error;
                if (!tokenData || tokenData.error) throw new Error(tokenData?.error || "Unknown auth error");

                console.log("Microsoft Auth: Token obtido, buscando perfil...");
                const { data: profile } = await db
                    .from("profiles")
                    .select("organization_id")
                    .eq("user_id", String(user.id))
                    .single();

                if (!profile?.organization_id) throw new Error("Organization not found");

                const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

                console.log("Microsoft Auth: Salvando tokens no banco...");
                const { error: insertError } = await db
                    .from("microsoft_calendar_tokens")
                    .upsert({
                        user_id: user.id,
                        organization_id: profile.organization_id,
                        access_token: tokenData.access_token,
                        refresh_token: tokenData.refresh_token ?? null,
                        token_expires_at: expiresAt,
                    });

                if (insertError) throw insertError;

                queryClient.invalidateQueries({ queryKey: ["microsoft-calendar-connection"] });
                toast.success("Microsoft Calendar conectado com sucesso!");
                console.log("Microsoft Auth: Concluído com sucesso!");
            } catch (err: any) {
                console.error("Microsoft Auth: Erro no processo:", err);
                toast.error(err.message || "Erro ao conectar Microsoft Calendar");
            } finally {
                setConnecting(false);
            }
        };

        handleCodeFromUrl();
    }, [user?.id, queryClient, db, supabase]);

    const connect = useCallback(async () => {
        setConnecting(true);
        try {
            const redirectUri = `${window.location.origin}/dashboard/agenda`;
            const { data, error } = await supabase.functions.invoke("microsoft-calendar-auth", {
                body: { action: "get_auth_url", redirect_uri: redirectUri },
            });

            if (error) throw error;
            if (!data || data.error) throw new Error(data?.error || "Unknown error");

            window.location.href = data.url!;
        } catch (err: unknown) {
            const error = err as Error;
            toast.error(error.message || "Erro ao iniciar conexão");
            setConnecting(false);
        }
    }, []);

    const disconnect = useMutation({
        mutationFn: async () => {
            const { error } = await db
                .from("microsoft_calendar_tokens")
                .delete()
                .eq("user_id", user!.id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["microsoft-calendar-connection"] });
            toast.success("Microsoft Calendar desconectado");
        },
        onError: (err: Error) => toast.error(err.message),
    });

    const importEvents = useMutation({
        mutationFn: async () => {
            const { data, error } = await supabase.functions.invoke("microsoft-calendar-sync", { body: { action: "import" } });
            if (error) throw error;
            if (data.error) throw new Error(data.error);
            return data;
        },
        onSuccess: (data: { imported: number }) => {
            queryClient.invalidateQueries({ queryKey: ["eventos_agenda"] });
            queryClient.invalidateQueries({ queryKey: ["microsoft-calendar-connection"] });
            toast.success(`${data.imported} eventos importados do Microsoft Calendar`);
        },
        onError: (err: Error) => toast.error(err.message || "Erro ao importar"),
    });

    const clearEvents = useMutation({
        mutationFn: async () => {
            const { data, error } = await supabase.functions.invoke("microsoft-calendar-sync", { body: { action: "clear" } });
            if (error) throw error;
            if (data.error) throw new Error(data.error);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["eventos_agenda"] });
            toast.success("Agenda importada limpa com sucesso");
        },
        onError: (err: any) => toast.error(err.message || "Erro ao limpar agenda"),
    });

    const exportEvents = useMutation({
        mutationFn: async () => {
            const { data, error } = await supabase.functions.invoke("microsoft-calendar-sync", { body: { action: "export" } });
            if (error) throw error;
            if (data.error) throw new Error(data.error);
            return data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["microsoft-calendar-connection"] });
            toast.success(`${data.exported} eventos exportados para o Microsoft Calendar`);
        },
        onError: (err: any) => toast.error(err.message || "Erro ao exportar"),
    });

    return {
        isConnected,
        lastSyncAt,
        syncEnabled,
        loadingConnection,
        connecting,
        connect,
        disconnect: disconnect.mutate,
        disconnecting: disconnect.isPending,
        importEvents: importEvents.mutate,
        importing: importEvents.isPending,
        clearEvents: clearEvents.mutate,
        clearing: clearEvents.isPending,
        exportEvents: exportEvents.mutate,
        exporting: exportEvents.isPending,
    };
}
