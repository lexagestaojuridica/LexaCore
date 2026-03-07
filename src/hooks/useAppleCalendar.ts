import { useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

export function useAppleCalendar() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [connecting, setConnecting] = useState(false);

    // Check if connected
    const { data: connection, isLoading: loadingConnection } = useQuery({
        queryKey: ["apple-calendar-connection", user?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("apple_calendar_tokens")
                .select("*")
                .eq("user_id", user!.id)
                .maybeSingle();
            if (error) throw error;
            return data;
        },
        enabled: !!user?.id,
    });

    const isConnected = !!connection;
    const lastSyncAt = connection?.last_sync_at;
    const syncEnabled = connection?.sync_enabled ?? false;

    const connect = useCallback(async (apple_id: string, app_specific_password: string) => {
        setConnecting(true);
        try {
            const { data, error } = await supabase.functions.invoke("apple-calendar-auth", {
                body: { action: "verify_and_save", apple_id, app_specific_password },
            });

            if (error) throw error;
            if (data.error) throw new Error(data.error);

            queryClient.invalidateQueries({ queryKey: ["apple-calendar-connection"] });
            toast({ title: "Sucesso", description: "Apple Calendar conectado com sucesso!" });
            return true;
        } catch (err: any) {
            toast({ title: "Erro de Autenticação", description: err.message || "Credenciais inválidas.", variant: "destructive" });
            return false;
        } finally {
            setConnecting(false);
        }
    }, [queryClient]);

    // Disconnect
    const disconnect = useMutation({
        mutationFn: async () => {
            const { error } = await supabase
                .from("apple_calendar_tokens")
                .delete()
                .eq("user_id", user!.id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["apple-calendar-connection"] });
            toast({ title: "Desconectado", description: "Apple Calendar desconectado com sucesso." });
        },
        onError: (err: any) => toast({ title: "Erro na desconexão", description: err.message, variant: "destructive" }),
    });

    // Import events from Apple
    const importEvents = useMutation({
        mutationFn: async () => {
            const { data, error } = await supabase.functions.invoke("apple-calendar-sync", {
                body: { action: "import" },
            });
            if (error) throw error;
            if (data.error) throw new Error(data.error);
            return data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["eventos_agenda"] });
            queryClient.invalidateQueries({ queryKey: ["apple-calendar-connection"] });
            toast({ title: "Sincronizado", description: data.message || "Eventos importados do Apple Calendar" });
        },
        onError: (err: any) => toast({ title: "Erro ao importar", description: err.message || "Não foi possível buscar eventos.", variant: "destructive" }),
    });

    // Clear events from Apple
    const clearEvents = useMutation({
        mutationFn: async () => {
            const { data, error } = await supabase.functions.invoke("apple-calendar-sync", {
                body: { action: "clear" },
            });
            if (error) throw error;
            if (data.error) throw new Error(data.error);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["eventos_agenda"] });
            toast({ title: "Limpeza concluída", description: "Agenda Apple limpa com sucesso do sistema." });
        },
        onError: (err: any) => toast({ title: "Erro ao limpar", description: err.message || "Erro desconhecido.", variant: "destructive" }),
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
    };
}
