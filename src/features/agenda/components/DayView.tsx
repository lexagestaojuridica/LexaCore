import { useMemo } from "react";
import { format, isSameDay, parseISO, differenceInMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Clock, Briefcase } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/shared/ui/badge";
import { cn } from "@/shared/lib/utils";
import { Evento } from "../types";
import { getCategoryConfig } from "../utils/categories";
import { calculateEventCollisions } from "../utils/collisions";


export function DayView({ eventos, selectedDate, onEdit, onEventDrop, filteredCategories }: {
    eventos: Evento[];
    selectedDate: Date;
    onEdit: (e: Evento) => void;
    onEventDrop: (id: string, newStart: Date) => void;
    filteredCategories: string[];
}) {
    const hours = Array.from({ length: 17 }, (_, i) => i + 6); // 6am to 10pm

    const dayEvents = eventos
        .filter((e) => isSameDay(parseISO(e.start_time), selectedDate) && !filteredCategories.includes(e.category || ""))
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

    const now = new Date();
    const nowHour = now.getHours();
    const nowMinute = now.getMinutes();
    const showNowLine = isSameDay(selectedDate, now) && nowHour >= 6 && nowHour <= 22;

    const eventLayouts = useMemo(() => calculateEventCollisions(dayEvents), [dayEvents]);

    return (
        <div className="space-y-0">
            <div className="text-center pb-4">
                <p className="text-2xl font-bold capitalize">{format(selectedDate, "EEEE", { locale: ptBR })}</p>
                <p className="text-sm text-muted-foreground">{format(selectedDate, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
            </div>

            <div className="relative border-b border-border/40 pb-6" style={{ height: `${hours.length * 80}px` }}>
                {hours.map((hour, idx) => {
                    const isNowHour = showNowLine && nowHour === hour;
                    return (
                        <div
                            key={hour}
                            className="absolute w-full flex border-t border-border/40 transition-colors"
                            style={{ top: `${idx * 80}px`, height: '80px' }}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                                e.preventDefault();
                                const eventId = e.dataTransfer.getData("eventId");
                                if (eventId) {
                                    const newDate = new Date(selectedDate);
                                    newDate.setHours(hour, 0, 0, 0);
                                    onEventDrop(eventId, newDate);
                                }
                            }}
                        >
                            {isNowHour && (
                                <div
                                    className="absolute left-14 right-0 z-20 flex items-center pointer-events-none"
                                    style={{ top: `${(nowMinute / 60) * 80}px` }}
                                >
                                    <div className="h-2.5 w-2.5 rounded-full bg-red-500 -ml-1 shrink-0 shadow-sm" />
                                    <div className="h-px flex-1 bg-red-500" />
                                    <span className="text-[9px] font-bold text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded-full ml-1 shrink-0">
                                        {`${nowHour.toString().padStart(2, "0")}:${nowMinute.toString().padStart(2, "0")}`}
                                    </span>
                                </div>
                            )}

                            <div className={cn(
                                "w-16 shrink-0 pr-3 pt-1 text-right text-xs bg-background/50 z-10",
                                isNowHour ? "text-red-500 font-bold" : "text-muted-foreground"
                            )}>
                                {`${hour.toString().padStart(2, "0")}:00`}
                            </div>

                            <div className="flex-1 pl-3 border-l border-border/40 relative h-full" />
                        </div>
                    );
                })}

                <div className="absolute left-[76px] right-2 top-0 bottom-0 pointer-events-none">
                    {dayEvents.map((e) => {
                        const cat = getCategoryConfig(e.category);
                        const start = parseISO(e.start_time);
                        const end = parseISO(e.end_time);

                        const startHour = start.getHours() + (start.getMinutes() / 60);
                        const endHour = end.getHours() + (end.getMinutes() / 60);

                        const minHour = hours[0];
                        const topPx = Math.max(0, (startHour - minHour) * 80);
                        const durationPx = Math.max(24, (endHour - startHour) * 80);

                        const layout = eventLayouts.get(e.id) || { width: 100, left: 0 };
                        const CatIcon = cat.icon;

                        if (startHour > hours[hours.length - 1] + 1 || endHour < minHour) return null;

                        return (
                            <motion.div
                                key={e.id}
                                draggable
                                onDragStart={(evt: any) => evt.dataTransfer.setData("eventId", e.id)}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                style={{
                                    top: `${topPx}px`,
                                    height: `${durationPx}px`,
                                    left: `${layout.left}%`,
                                    width: `calc(${layout.width}% - 4px)`,
                                }}
                                className={cn(
                                    "absolute group rounded-md px-3 py-2 cursor-pointer border transition-shadow hover:shadow-lg hover:z-30 z-20 pointer-events-auto overflow-hidden",
                                    `bg-gradient-to-br ${cat.gradient} border-${cat.dot.replace('bg-', '')}/40`
                                )}
                                onClick={() => onEdit(e)}
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-1.5 truncate">
                                        <CatIcon className={cn("h-3.5 w-3.5 shrink-0", cat.text)} />
                                        <span className="text-sm font-semibold text-foreground truncate">{e.title}</span>
                                    </div>
                                    {e.recurrence_rule && e.recurrence_rule !== "none" && (
                                        <Badge variant="outline" className="text-[8px] px-1 py-0 h-3.5 leading-none shrink-0 bg-background/50 border-blue-500/30">Recorrente</Badge>
                                    )}
                                </div>

                                <div className="flex flex-col gap-0.5">
                                    <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-1">
                                        <Clock className="h-2.5 w-2.5" />
                                        {format(start, "HH:mm")} – {format(end, "HH:mm")}
                                    </span>

                                    {durationPx > 50 && e.process_id && (
                                        <span className="text-[10px] font-medium text-primary flex items-center gap-1 mt-1 truncate">
                                            <Briefcase className="h-2.5 w-2.5" />
                                            Proc. {e.process_id.substring(0, 8)}...
                                        </span>
                                    )}
                                    {durationPx > 70 && e.description && (
                                        <span className="text-[10px] text-muted-foreground/80 italic truncate w-full mt-1">
                                            {e.description}
                                        </span>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
