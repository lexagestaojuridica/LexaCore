import { parseISO, format } from "date-fns";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { getCategoryConfig } from "@/features/agenda/utils/categories";
import { isHappeningNow, getDurationLabel } from "../utils/helpers";
import type { Evento } from "../types";

interface TimelineEventProps {
    event: Evento;
    isLast: boolean;
    onNavigate: () => void;
}

export function TimelineEvent({ event, isLast, onNavigate }: TimelineEventProps) {
    const meta = getCategoryConfig(event.category);
    const start = parseISO(event.start_time);
    const end = parseISO(event.end_time);
    const happening = isHappeningNow(event);
    const duration = getDurationLabel(event.start_time, event.end_time);
    const CatIcon = meta.icon;

    return (
        <div className="flex gap-3 cursor-pointer group" onClick={onNavigate}>
            <div className="flex flex-col items-center shrink-0">
                <div className={cn(
                    "h-3 w-3 rounded-full border-2 mt-1 transition-all",
                    happening
                        ? "border-primary bg-primary animate-pulse"
                        : `border-current ${meta.dot.replace("bg-", "text-")} bg-background`
                )} />
                {!isLast && <div className="w-px flex-1 bg-border/60 mt-1" />}
            </div>

            <div className={cn("flex-1 pb-4 min-w-0", happening && "relative")}>
                {happening && (
                    <span className="absolute -top-1 right-0 text-[9px] font-bold uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded-full animate-pulse">
                        Agora
                    </span>
                )}

                <div className={cn(
                    "rounded-xl p-3 border transition-all",
                    happening
                        ? "border-primary/30 bg-primary/5 shadow-sm ring-1 ring-primary/10"
                        : "border-border/40 bg-card group-hover:border-primary/20 group-hover:bg-muted/10"
                )}>
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                                <div className={cn("p-1 rounded bg-transparent text-muted-foreground shrink-0")}>
                                    <CatIcon className="h-4 w-4" />
                                </div>
                                <p className="text-sm font-semibold text-foreground truncate leading-tight">{event.title}</p>
                            </div>
                            <div className="flex items-center gap-2 mt-2 flex-wrap ml-[32px]">
                                <span className={cn("text-[10px] uppercase font-bold tracking-wider", meta.text)}>
                                    {meta.label}
                                </span>
                                <span className="text-muted-foreground/40">•</span>
                                <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {format(start, "HH:mm")} — {format(end, "HH:mm")}
                                </span>
                            </div>
                        </div>
                        <span className="text-xs font-medium text-muted-foreground shrink-0 mt-0.5">
                            {duration}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
