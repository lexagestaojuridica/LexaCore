import { useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/shared/hooks/use-toast";

const db = supabase as any;

export function useAppleCalendar() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [connecting, setConnecting] = useState(false);

    const { data: connection, isLoading: loadingConnection } = useQuery({
        queryKey: ["apple-calendar-connection", user?.id],
        queryFn: async () => {
            const { data, error } = await db
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

    const disconnect = useMutation({
        mutationFn: async () => {
            const { error } = await db
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

    const importEvents = useMutation({
        mutationFn: async () => {
            const { data, error } = await supabase.functions.invoke("apple-calendar-sync", {
                body: { action: "import" },
            });
            if (error) throw error;
            if (data.error) throw new Error(data.error);
            return data;
        },
        onSuccess: (data: any) => {
            queryClient.invalidateQueries({ queryKey: ["eventos_agenda"] });
            queryClient.invalidateQueries({ queryKey: ["apple-calendar-connection"] });
            toast({ title: "Importação concluída", description: `${data.imported} eventos importados do Apple Calendar.` });
        },
        onError: (err: any) => toast({ title: "Erro na importação", description: err.message, variant: "destructive" }),
    });

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
            toast({ title: "Agenda limpa", description: "Eventos importados removidos com sucesso." });
        },
        onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
    });

    const exportEvents = useMutation({
        mutationFn: async () => {
            const { data, error } = await supabase.functions.invoke("apple-calendar-sync", {
                body: { action: "export" },
            });
            if (error) throw error;
            if (data.error) throw new Error(data.error);
            return data;
        },
        onSuccess: (data: any) => {
            queryClient.invalidateQueries({ queryKey: ["apple-calendar-connection"] });
            toast({ title: "Exportação concluída", description: `${data.exported} eventos exportados para o Apple Calendar.` });
        },
        onError: (err: any) => toast({ title: "Erro na exportação", description: err.message, variant: "destructive" }),
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
