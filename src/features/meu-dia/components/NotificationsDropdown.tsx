import { Bell, AlertTriangle, Info, CheckCircle, InfoIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useRealtimeNotifications, RealtimeNotification } from "@/features/meu-dia/hooks/useRealtimeNotifications";
import { formatDistanceToNow, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";

const urgencyStyles: Record<string, string> = {
  critical: "border-l-destructive bg-destructive/5",
  warning: "border-l-amber-500 bg-amber-500/5",
  success: "border-l-green-500 bg-green-500/5",
  info: "border-l-primary bg-primary/5",
};

const urgencyIcon: Record<string, JSX.Element> = {
  critical: <AlertTriangle className="h-4 w-4 text-destructive" />,
  warning: <AlertTriangle className="h-4 w-4 text-amber-500" />,
  success: <CheckCircle className="h-4 w-4 text-green-500" />,
  info: <InfoIcon className="h-4 w-4 text-primary" />,
};

export function NotificationsDropdown() {
  const { notifications, isLoading, markAsRead, markAllAsRead } = useRealtimeNotifications();
  const navigate = useNavigate();
  const criticalCount = notifications.filter((d) => d.type === "critical").length;
  const totalCount = notifications.length;

  const handleNotificationClick = (notif: RealtimeNotification) => {
    markAsRead(notif.id);
    if (notif.link) {
      navigate(notif.link);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 text-muted-foreground hover:text-foreground"
        >
          <Bell className="h-4 w-4" />
          {totalCount > 0 && (
            <span
              className={cn(
                "absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white",
                criticalCount > 0 ? "bg-destructive" : "bg-primary"
              )}
            >
              {totalCount > 9 ? "9+" : totalCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end" sideOffset={8}>
        <div className="border-b border-border px-4 py-3 flex items-center justify-between">
          <div>
            <h4 className="text-sm font-semibold text-foreground">Notificações</h4>
            <p className="text-xs text-muted-foreground">
              Atualizações em tempo real
            </p>
          </div>
          {totalCount > 0 && (
            <Button variant="ghost" size="sm" className="h-auto p-1 text-xs px-2" onClick={markAllAsRead}>
              Marcar lidas
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-80">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center">
              <Bell className="mb-2 h-8 w-8 text-muted-foreground/20" />
              <p className="text-sm text-muted-foreground">
                Nenhuma notificação não lida
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={cn(
                    "flex w-full items-start gap-3 border-l-2 px-4 py-3 text-left transition-colors hover:bg-muted/40",
                    urgencyStyles[n.type]
                  )}
                >
                  <div className="mt-0.5 shrink-0">{urgencyIcon[n.type]}</div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {n.title}
                    </p>
                    {n.description && (
                      <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                        {n.description}
                      </p>
                    )}
                    <p
                      className="mt-1 text-[10px] font-medium text-muted-foreground"
                    >
                      {formatDistanceToNow(parseISO(n.created_at), { addSuffix: true, locale: ptBR })}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
