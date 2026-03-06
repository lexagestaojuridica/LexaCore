import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

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
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [connecting, setConnecting] = useState(false);

    // Check if connected
    const { data: connection, isLoading: loadingConnection } = useQuery({
        queryKey: ["microsoft-calendar-connection", user?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("microsoft_calendar_tokens" as any)
                .select("*")
                .eq("user_id", user!.id)
                .maybeSingle();
            if (error) throw error;
            return data as unknown as MicrosoftCalendarConnection | null;
        },
        enabled: !!user?.id,
    });

    const isConnected = !!connection;
    const lastSyncAt = connection?.last_sync_at;
    const syncEnabled = connection?.sync_enabled ?? false;

    // Check URL for OAuth callback code on mount (only once)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        const handleCodeFromUrl = async () => {
            const searchParams = new URLSearchParams(window.location.search);
            const code = searchParams.get("code");

            // Sometimes Microsoft redirects back with a session_state or state but we focus on 'code'
            if (!code || window.location.pathname !== "/dashboard/agenda") return;

            // Ensure we only process if there is a 'code' and no existing active connection logic just ran or something to prevent double firing.
            // But since we replace the state, it should only run once.

            setConnecting(true);
            try {
                // Remove code from URL immediately for clean UI
                window.history.replaceState({}, document.title, window.location.pathname);

                const redirectUri = `${window.location.origin}/dashboard/agenda`;

                const { data: tokenData, error } = await supabase.functions.invoke<MicrosoftAuthResponse>("microsoft-calendar-auth", {
                    body: {
                        action: "exchange_code",
                        code,
                        redirect_uri: redirectUri,
                    },
                });

                if (error) throw error;
                if (!tokenData || tokenData.error) throw new Error(tokenData?.error || "Unknown auth error");

                // Get user profile for org_id
                const { data: profile } = await supabase
                    .from("profiles")
                    .select("organization_id")
                    .eq("user_id", user!.id)
                    .single();

                if (!profile?.organization_id) throw new Error("Organization not found");

                const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

                // Store tokens
                const { error: insertError } = await (supabase
                    .from("microsoft_calendar_tokens" as any)
                    .upsert({
                        user_id: user!.id,
                        organization_id: profile.organization_id,
                        access_token: tokenData.access_token,
                        refresh_token: tokenData.refresh_token,
                        token_expires_at: expiresAt,
                    }));

                if (insertError) throw insertError;

                queryClient.invalidateQueries({ queryKey: ["microsoft-calendar-connection"] });
                toast.success("Microsoft Calendar conectado com sucesso!");
            } catch (err: any) {
                toast.error(err.message || "Erro ao conectar Microsoft Calendar");
            } finally {
                setConnecting(false);
            }
        };

        handleCodeFromUrl();
    }, [user?.id, queryClient]);

    // Start OAuth flow
    const connect = useCallback(async () => {
        setConnecting(true);
        try {
            const redirectUri = `${window.location.origin}/dashboard/agenda`;

            const { data, error } = await supabase.functions.invoke<MicrosoftAuthResponse>("microsoft-calendar-auth", {
                body: { action: "get_auth_url", redirect_uri: redirectUri },
            });

            if (error) throw error;
            if (data.error) throw new Error(data.error);

            // Redirect full page
            window.location.href = data.url;
        } catch (err: unknown) {
            const error = err as Error;
            toast.error(error.message || "Erro ao iniciar conexão");
            setConnecting(false);
        }
    }, []);

    // Disconnect
    const disconnect = useMutation({
        mutationFn: async () => {
            const { error } = await supabase
                .from("microsoft_calendar_tokens" as any)
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

    // Import events from Microsoft
    const importEvents = useMutation({
        mutationFn: async () => {
            const { data, error } = await supabase.functions.invoke("microsoft-calendar-sync", {
                body: { action: "import" },
            });
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

    // Clear events from Microsoft
    const clearEvents = useMutation({
        mutationFn: async () => {
            const { data, error } = await supabase.functions.invoke("microsoft-calendar-sync", {
                body: { action: "clear" },
            });
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

    // Export events to Microsoft
    const exportEvents = useMutation({
        mutationFn: async () => {
            const { data, error } = await supabase.functions.invoke("microsoft-calendar-sync", {
                body: { action: "export" },
            });
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
