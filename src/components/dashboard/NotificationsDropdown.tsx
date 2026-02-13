import { Bell, AlertTriangle, Clock, Gavel, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useUpcomingDeadlines, DeadlineNotification } from "@/hooks/useUpcomingDeadlines";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";

const urgencyStyles = {
  critical: "border-l-destructive bg-destructive/5",
  warning: "border-l-amber-500 bg-amber-500/5",
  info: "border-l-primary bg-primary/5",
};

const urgencyIcon = {
  critical: <AlertTriangle className="h-4 w-4 text-destructive" />,
  warning: <Clock className="h-4 w-4 text-amber-500" />,
  info: <CalendarClock className="h-4 w-4 text-primary" />,
};

export function NotificationsDropdown() {
  const { data: deadlines = [], isLoading } = useUpcomingDeadlines();
  const navigate = useNavigate();
  const criticalCount = deadlines.filter((d) => d.urgency === "critical").length;
  const totalCount = deadlines.length;

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
        <div className="border-b border-border px-4 py-3">
          <h4 className="text-sm font-semibold text-foreground">Notificações</h4>
          <p className="text-xs text-muted-foreground">
            Prazos e audiências próximos
          </p>
        </div>
        <ScrollArea className="max-h-80">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : deadlines.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center">
              <Bell className="mb-2 h-8 w-8 text-muted-foreground/20" />
              <p className="text-sm text-muted-foreground">
                Nenhum prazo próximo
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {deadlines.map((d) => (
                <button
                  key={d.id}
                  onClick={() => navigate("/dashboard/agenda")}
                  className={cn(
                    "flex w-full items-start gap-3 border-l-2 px-4 py-3 text-left transition-colors hover:bg-muted/40",
                    urgencyStyles[d.urgency]
                  )}
                >
                  <div className="mt-0.5 shrink-0">{urgencyIcon[d.urgency]}</div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {d.title}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {format(parseISO(d.start_time), "dd/MM · HH:mm", {
                        locale: ptBR,
                      })}
                    </p>
                    <p
                      className={cn(
                        "mt-0.5 text-xs font-medium",
                        d.isOverdue
                          ? "text-destructive"
                          : d.urgency === "warning"
                          ? "text-amber-600"
                          : "text-muted-foreground"
                      )}
                    >
                      {d.timeLabel}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
        {deadlines.length > 0 && (
          <div className="border-t border-border p-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              onClick={() => navigate("/dashboard/agenda")}
            >
              Ver todos na agenda
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
