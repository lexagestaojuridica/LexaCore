import { trpc } from "@/shared/lib/trpc";

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
  const deadlinesQuery = trpc.agenda.getUpcomingDeadlines.useQuery(undefined, {
    refetchInterval: 60_000,
  });

  return {
    data: (deadlinesQuery.data || []) as DeadlineNotification[],
    isLoading: deadlinesQuery.isLoading,
    error: deadlinesQuery.error
  };
}
