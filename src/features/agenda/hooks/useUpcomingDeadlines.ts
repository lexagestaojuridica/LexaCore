import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { addDays, formatDistanceToNow, parseISO, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface DeadlineNotification {
  id: string;
  title: string;
  start_time: string;
  category: string | null;
  description: string | null;
  process_id: string | null;
  timeLabel: string;
  isOverdue: boolean;
  urgency: "critical" | "warning" | "info";
}

export function useUpcomingDeadlines() {
  const { user } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ["profile-deadlines", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("organization_id").eq("user_id", user!.id).single();
      return data;
    },
    enabled: !!user?.id,
  });
  const orgId = profile?.organization_id;

  return useQuery({
    queryKey: ["upcoming-deadlines", orgId],
    queryFn: async () => {
      const now = new Date().toISOString();
      const in7Days = addDays(new Date(), 7).toISOString();

      // Fetch prazos (deadlines) and audiencias coming up in the next 7 days or overdue
      const { data, error } = await supabase
        .from("eventos_agenda")
        .select("*")
        .eq("organization_id", orgId!)
        .in("category", ["prazo", "audiencia"])
        .lte("start_time", in7Days)
        .order("start_time", { ascending: true });

      if (error) throw error;

      const notifications: DeadlineNotification[] = (data || [])
        .filter((e) => {
          const eventDate = parseISO(e.start_time);
          // Include overdue (up to 3 days past) and upcoming (next 7 days)
          const threeDaysAgo = addDays(new Date(), -3);
          return eventDate >= threeDaysAgo;
        })
        .map((e) => {
          const eventDate = parseISO(e.start_time);
          const overdue = isPast(eventDate);
          const hoursUntil = (eventDate.getTime() - Date.now()) / (1000 * 60 * 60);

          let urgency: "critical" | "warning" | "info" = "info";
          if (overdue) urgency = "critical";
          else if (hoursUntil <= 24) urgency = "critical";
          else if (hoursUntil <= 72) urgency = "warning";

          return {
            id: e.id,
            title: e.title,
            start_time: e.start_time,
            category: e.category,
            description: e.description,
            process_id: e.process_id,
            timeLabel: overdue
              ? `Vencido há ${formatDistanceToNow(eventDate, { locale: ptBR })}`
              : `Vence em ${formatDistanceToNow(eventDate, { locale: ptBR })}`,
            isOverdue: overdue,
            urgency,
          };
        });

      return notifications;
    },
    enabled: !!orgId,
    refetchInterval: 60_000, // refresh every minute
  });
}
