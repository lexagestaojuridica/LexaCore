import { format, isSameDay, parseISO, startOfWeek, addDays, eachDayOfInterval, differenceInMinutes, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/shared/lib/utils";
import { Evento } from "../types";
import { getCategoryConfig } from "../utils/categories";

export function WeekView({
    eventos,
    selectedDate,
    onSelectDate,
    onEdit,
    onEventDrop,
    filteredCategories
}: {
    eventos: Evento[];
    selectedDate: Date;
    onSelectDate: (d: Date) => void;
    onEdit: (e: Evento) => void;
    onEventDrop: (id: string, newStart: Date) => void;
    filteredCategories: string[];
}) {
    const weekStart = startOfWeek(selectedDate, { locale: ptBR });
    const weekDays = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) });
    const hours = Array.from({ length: 14 }, (_, i) => i + 7); // 7am to 8pm

    const filtered = eventos.filter((e) => !filteredCategories.includes(e.category || ""));

    return (
        <div className="overflow-x-auto select-none">
            <div className="min-w-[700px]">
                {/* Day headers */}
                <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border">
                    <div className="p-2" />
                    {weekDays.map((day) => (
                        <button
                            key={day.toISOString()}
                            onClick={() => onSelectDate(day)}
                            className={cn(
                                "p-2 text-center border-l border-border transition-colors hover:bg-muted/30",
                                isToday(day) && "bg-primary/5",
                                isSameDay(day, selectedDate) && "bg-primary/10"
                            )}
                        >
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{format(day, "EEE", { locale: ptBR })}</p>
                            <p className={cn("text-lg font-semibold mt-0.5", isToday(day) ? "text-primary" : "text-foreground")}>{format(day, "d")}</p>
                        </button>
                    ))}
                </div>

                {/* Time grid */}
                <div className="grid grid-cols-[60px_repeat(7,1fr)]">
                    {hours.map((hour) => (
                        <div key={hour} className="contents">
                            <div className="p-1.5 text-right text-[10px] text-muted-foreground border-b border-border/50 h-14 flex items-start justify-end pr-2">
                                {`${hour}:00`}
                            </div>
                            {weekDays.map((day) => {
                                const dayHourEvents = filtered.filter((e) => {
                                    const start = parseISO(e.start_time);
                                    return isSameDay(start, day) && start.getHours() === hour;
                                });
                                return (
                                    <div
                                        key={`${day.toISOString()}-${hour}`}
                                        className="relative border-l border-b border-border/50 h-14 p-0.5 hover:bg-muted/10 transition-colors"
                                        onDragOver={(e) => e.preventDefault()}
                                        onDrop={(e) => {
                                            e.preventDefault();
                                            const eventId = e.dataTransfer.getData("eventId");
                                            if (eventId) {
                                                const newDate = new Date(day);
                                                newDate.setHours(hour, 0, 0, 0);
                                                onEventDrop(eventId, newDate);
                                            }
                                        }}
                                    >
                                        {dayHourEvents.map((e) => {
                                            const cat = getCategoryConfig(e.category);
                                            const start = parseISO(e.start_time);
                                            const end = parseISO(e.end_time);
                                            const durationMin = differenceInMinutes(end, start);
                                            const heightPx = Math.max(20, (durationMin / 60) * 56);
                                            return (
                                                <div
                                                    key={e.id}
                                                    draggable
                                                    onDragStart={(evt) => evt.dataTransfer.setData("eventId", e.id)}
                                                    className={cn(
                                                        "absolute left-0.5 right-0.5 rounded-md px-1.5 py-0.5 text-[10px] overflow-hidden cursor-pointer z-10 border transition-all hover:shadow-md hover:z-20",
                                                        `bg-gradient-to-r ${cat.gradient} border-border/30`
                                                    )}
                                                    style={{ height: `${Math.min(heightPx, 100)}px`, top: `${(start.getMinutes() / 60) * 56}px` }}
                                                    onClick={() => onEdit(e)}
                                                >
                                                    <p className={cn("font-medium truncate", cat.text)}>{e.title}</p>
                                                    <p className="text-muted-foreground truncate">{format(start, "HH:mm")}–{format(end, "HH:mm")}</p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
