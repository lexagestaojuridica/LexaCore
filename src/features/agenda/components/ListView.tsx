import { format, isAfter, isToday, parseISO, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDays, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Evento } from "../types";
import { getCategoryConfig } from "../utils/categories";

export function ListView({
    eventos,
    filteredCategories,
    onEdit,
    onDelete
}: {
    eventos: Evento[];
    filteredCategories: string[];
    onEdit: (e: Evento) => void;
    onDelete: (id: string) => void;
}) {
    const now = new Date();
    const upcoming = eventos
        .filter((e) => !filteredCategories.includes(e.category || "") && isAfter(parseISO(e.start_time), addDays(now, -1)))
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
        .slice(0, 30);

    const grouped = upcoming.reduce((acc, e) => {
        const key = format(parseISO(e.start_time), "yyyy-MM-dd");
        if (!acc[key]) acc[key] = [];
        acc[key].push(e);
        return acc;
    }, {} as Record<string, Evento[]>);

    return (
        <div className="space-y-6">
            {Object.entries(grouped).map(([dateKey, events]) => {
                const date = parseISO(dateKey);
                return (
                    <div key={dateKey}>
                        <div className="flex items-center gap-3 mb-3">
                            <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold", isToday(date) ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                                {format(date, "d")}
                            </div>
                            <div>
                                <p className="text-sm font-semibold capitalize">{format(date, "EEEE", { locale: ptBR })}</p>
                                <p className="text-xs text-muted-foreground">{format(date, "d 'de' MMMM", { locale: ptBR })}</p>
                            </div>
                            {isToday(date) && <Badge variant="outline" className="text-[10px]">Hoje</Badge>}
                        </div>
                        <div className="space-y-2 ml-[52px]">
                            {events.map((e) => {
                                const cat = getCategoryConfig(e.category);
                                const CatIcon = cat.icon;
                                return (
                                    <motion.div key={e.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className={cn("group flex items-center gap-3 rounded-lg border px-4 py-3 transition-all hover:shadow-md cursor-pointer", `bg-gradient-to-r ${cat.gradient} border-border/30`)} onClick={() => onEdit(e)}>
                                        <CatIcon className={cn("h-4 w-4 shrink-0", cat.text)} />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium flex items-center gap-1.5">{e.title} {e.recurrence_rule && e.recurrence_rule !== "none" && <span title="Evento Recorrente" className="h-1.5 w-1.5 rounded-full bg-blue-500" />}</p>
                                            {e.description && <p className="text-xs text-muted-foreground truncate mt-0.5">{e.description}</p>}
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <span className="text-xs text-muted-foreground">{format(parseISO(e.start_time), "HH:mm")}–{format(parseISO(e.end_time), "HH:mm")}</span>
                                            <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={(ev) => { ev.stopPropagation(); onDelete(e.id); }}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
            {upcoming.length === 0 && (
                <div className="flex flex-col items-center py-12 text-center">
                    <CalendarDays className="mb-3 h-10 w-10 text-muted-foreground/20" />
                    <p className="text-sm text-muted-foreground">Nenhum evento próximo</p>
                </div>
            )}
        </div>
    );
}
