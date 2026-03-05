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
        <div className="flex gap-4 cursor-pointer group" onClick={onNavigate}>
            <div className="flex flex-col items-center shrink-0">
                <div className={cn(
                    "h-2.5 w-2.5 rounded-full mt-2 transition-all",
                    happening
                        ? "bg-primary shadow-[0_0_8px_rgba(var(--primary),0.5)] animate-pulse"
                        : "bg-muted-foreground/30 group-hover:bg-primary/50"
                )} />
                {!isLast && <div className="w-px flex-1 bg-border/40 mt-2" />}
            </div>

            <div className={cn("flex-1 pb-6 min-w-0 transition-all", happening && "translate-x-1")}>
                <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                            <span className={cn("text-[10px] font-bold uppercase tracking-wider", meta.text)}>
                                {format(start, "HH:mm")}
                            </span>
                            <h4 className={cn(
                                "text-sm font-semibold truncate transition-colors",
                                happening ? "text-foreground" : "text-foreground/80 group-hover:text-foreground"
                            )}>
                                {event.title}
                            </h4>
                        </div>
                        <span className="text-[10px] font-medium text-muted-foreground/60 shrink-0 uppercase tracking-widest group-hover:text-muted-foreground transition-colors">
                            {duration}
                        </span>
                    </div>

                    <div className="flex items-center gap-2 mt-0.5 ml-0">
                        <div className={cn("p-1 rounded-md bg-muted/30 text-muted-foreground transition-colors group-hover:bg-primary/5 group-hover:text-primary")}>
                            <CatIcon className="h-3 w-3" />
                        </div>
                        <span className="text-[10px] text-muted-foreground/70 truncate flex items-center gap-1.5">
                            {meta.label}
                            {happening && (
                                <>
                                    <span className="h-1 w-1 rounded-full bg-primary/40" />
                                    <span className="text-primary font-bold px-1.5 py-0.5 bg-primary/5 rounded-full animate-pulse">
                                        AGORA
                                    </span>
                                </>
                            )}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
