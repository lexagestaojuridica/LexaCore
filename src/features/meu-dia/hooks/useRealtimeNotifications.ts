import { useState, useEffect } from "react";
import { db as supabase } from "@/integrations/supabase/db";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";

export interface RealtimeNotification {
    id: string;
    user_id: string | null;
    title: string;
    description: string | null;
    type: "info" | "warning" | "critical" | "success";
    link: string | null;
    is_read: boolean;
    created_at: string;
}

export function useRealtimeNotifications() {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    // Buscar notificações iniciais do banco
    const { data: notifications = [], isLoading } = useQuery({
        queryKey: ["notifications", user?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("notifications")
                .select("id, title, description, type, link, is_read, created_at")
                .eq("is_read", false)
                .order("created_at", { ascending: false })
                .limit(20);

            if (error) throw error;
            return (data ?? []) as RealtimeNotification[];
        },
        enabled: !!user?.id,
    });

    useEffect(() => {
        if (!user?.id) return;

        // Escutar novos inserts no canal 'public:notifications'
        const channel = supabase
            .channel('schema-db-changes')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                },
                (payload: { new: any }) => {
                    // Se for para este usuário ou global
                    const newNotif = payload.new as RealtimeNotification;
                    if (newNotif.user_id === user.id || newNotif.user_id === null) {
                        queryClient.setQueryData(["notifications", user.id], (oldData: RealtimeNotification[] | undefined) => {
                            if (!oldData) return [newNotif];
                            return [newNotif, ...oldData].slice(0, 20); // Keep max 20 unread
                        });
                    }
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'notifications',
                },
                (payload: { new: any }) => {
                    // Se foi lida, remove da lista de não lidas
                    const updated = payload.new as RealtimeNotification;
                    if (updated.is_read) {
                        queryClient.setQueryData(["notifications", user.id], (oldData: RealtimeNotification[] | undefined) => {
                            if (!oldData) return [];
                            return oldData.filter(n => n.id !== updated.id);
                        });
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user?.id, queryClient]);

    const markAsRead = async (id: string) => {
        // Update no banco
        await supabase.from("notifications").update({ is_read: true }).eq("id", id);

        // Update otimista na UI
        queryClient.setQueryData(["notifications", user?.id], (oldData: RealtimeNotification[] | undefined) => {
            if (!oldData) return [];
            return oldData.filter(n => n.id !== id);
        });
    };

    const markAllAsRead = async () => {
        const unreadIds = notifications.map(n => n.id);
        if (unreadIds.length === 0) return;

        await supabase.from("notifications").update({ is_read: true }).in("id", unreadIds);
        queryClient.setQueryData(["notifications", user?.id], []);
    };

    return {
        notifications,
        isLoading,
        markAsRead,
        markAllAsRead
    };
}
