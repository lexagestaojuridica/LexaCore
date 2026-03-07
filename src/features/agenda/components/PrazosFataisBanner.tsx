import { differenceInHours, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Flame } from "lucide-react";
import { motion } from "framer-motion";
import { useUpcomingDeadlines } from "@/features/agenda/hooks/useUpcomingDeadlines";

export function PrazosFataisBanner({ onSelectDate }: { onSelectDate: (d: Date) => void }) {
    const { deadlines, isLoading } = useUpcomingDeadlines();

    // Filter only the critical ones (within next 48h)
    const prazosCriticos = (deadlines || []).filter((e) => {
        const dt = new Date(e.start_time);
        const diff = differenceInHours(dt, new Date());
        return diff >= 0 && diff <= 48;
    }).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

    if (isLoading || prazosCriticos.length === 0) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-xl glass-card border-amber-500/20 shadow-xl shadow-amber-500/5 p-4"
        >
            <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-amber-500 to-orange-600" />
            <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
                <div className="flex items-center gap-3 shrink-0">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/20 text-amber-600 ring-1 ring-amber-500/30 shadow-inner">
                        <Flame className="h-5 w-5 animate-pulse" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-amber-800 dark:text-amber-400">Prazos Fatais Iminentes</h3>
                        <p className="text-xs text-amber-600/80 font-medium">{prazosCriticos.length} compromissos críticos nas próximas 48h</p>
                    </div>
                </div>
                <div className="flex gap-2 min-w-0 overflow-x-auto pb-1 sm:pb-0 scrollbar-hide">
                    {prazosCriticos.map((e) => (
                        <button key={e.id} onClick={() => onSelectDate(new Date(e.start_time))} className="shrink-0 max-w-[220px] flex items-center justify-between gap-4 rounded-lg bg-white/40 dark:bg-black/20 border border-amber-500/10 px-3.5 py-2 text-xs hover:bg-amber-500/10 transition-all hover:scale-[1.02] shadow-sm">
                            <span className="font-bold truncate text-foreground">{e.title}</span>
                            <span className="text-amber-600 font-black shrink-0 tabular-nums">{format(new Date(e.start_time), "dd/MM HH:mm")}</span>
                        </button>
                    ))}
                </div>
            </div>
        </motion.div>
    );
}
