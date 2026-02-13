import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export function useGoogleCalendar() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [connecting, setConnecting] = useState(false);

  // Check if connected
  const { data: connection, isLoading: loadingConnection } = useQuery({
    queryKey: ["google-calendar-connection", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("google_calendar_tokens" as any)
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
    enabled: !!user?.id,
  });

  const isConnected = !!connection;
  const lastSyncAt = connection?.last_sync_at;
  const syncEnabled = connection?.sync_enabled ?? false;

  // Listen for OAuth callback
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.data?.type === "google-calendar-callback" && event.data?.code) {
        setConnecting(true);
        try {
          const redirectUri = `${window.location.origin}/dashboard/agenda`;

          const { data: tokenData, error } = await supabase.functions.invoke("google-calendar-auth", {
            body: {
              action: "exchange_code",
              code: event.data.code,
              redirect_uri: redirectUri,
            },
          });

          if (error) throw error;
          if (tokenData.error) throw new Error(tokenData.error);

          // Get user profile for org_id
          const { data: profile } = await supabase
            .from("profiles")
            .select("organization_id")
            .eq("user_id", user!.id)
            .single();

          if (!profile?.organization_id) throw new Error("Organization not found");

          const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

          // Store tokens
          const { error: insertError } = await supabase
            .from("google_calendar_tokens" as any)
            .upsert({
              user_id: user!.id,
              organization_id: profile.organization_id,
              access_token: tokenData.access_token,
              refresh_token: tokenData.refresh_token,
              token_expires_at: expiresAt,
            } as any);

          if (insertError) throw insertError;

          queryClient.invalidateQueries({ queryKey: ["google-calendar-connection"] });
          toast.success("Google Calendar conectado com sucesso!");
        } catch (err: any) {
          toast.error(err.message || "Erro ao conectar Google Calendar");
        } finally {
          setConnecting(false);
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [user, queryClient]);

  // Start OAuth flow
  const connect = useCallback(async () => {
    setConnecting(true);
    try {
      const redirectUri = `${window.location.origin}/dashboard/agenda`;

      const { data, error } = await supabase.functions.invoke("google-calendar-auth", {
        body: { action: "get_auth_url", redirect_uri: redirectUri },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      // Open OAuth in popup
      const popup = window.open(data.url, "google-oauth", "width=500,height=600,menubar=no,toolbar=no");

      // Poll for the popup closing or redirect
      const interval = setInterval(() => {
        try {
          if (popup?.closed) {
            clearInterval(interval);
            setConnecting(false);
            return;
          }
          const popupUrl = popup?.location?.href;
          if (popupUrl && popupUrl.startsWith(window.location.origin)) {
            const url = new URL(popupUrl);
            const code = url.searchParams.get("code");
            if (code) {
              popup?.close();
              clearInterval(interval);
              window.postMessage({ type: "google-calendar-callback", code }, window.location.origin);
            }
          }
        } catch {
          // Cross-origin - ignore
        }
      }, 500);
    } catch (err: any) {
      toast.error(err.message || "Erro ao iniciar conexão");
      setConnecting(false);
    }
  }, []);

  // Disconnect
  const disconnect = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("google_calendar_tokens" as any)
        .delete()
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["google-calendar-connection"] });
      toast.success("Google Calendar desconectado");
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Import events from Google
  const importEvents = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("google-calendar-sync", {
        body: { action: "import" },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["eventos_agenda"] });
      queryClient.invalidateQueries({ queryKey: ["google-calendar-connection"] });
      toast.success(`${data.imported} eventos importados do Google Calendar`);
    },
    onError: (err: any) => toast.error(err.message || "Erro ao importar"),
  });

  // Export events to Google
  const exportEvents = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("google-calendar-sync", {
        body: { action: "export" },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["google-calendar-connection"] });
      toast.success(`${data.exported} eventos exportados para o Google Calendar`);
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
    exportEvents: exportEvents.mutate,
    exporting: exportEvents.isPending,
  };
}
