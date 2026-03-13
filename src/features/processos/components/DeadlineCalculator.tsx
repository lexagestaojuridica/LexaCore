import { useState, useEffect } from "react";
import { Timer, Calendar as CalendarIcon, ArrowRight } from "lucide-react";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { addBusinessDays } from "@/shared/lib/utils";
import { cn } from "@/shared/lib/utils";

export function DeadlineCalculator() {
    const [days, setDays] = useState("15");
    const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
    const [resultDate, setResultDate] = useState<Date | null>(null);

    useEffect(() => {
        if (days && startDate) {
            const date = new Date(startDate);
            // Corrige offset de fuso horário local ao criar Date de string yyyy-MM-dd
            date.setMinutes(date.getMinutes() + date.getTimezoneOffset());
            const result = addBusinessDays(date, Number(days));
            setResultDate(result);
        }
    }, [days, startDate]);

    return (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 space-y-4 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/20 text-primary rounded-lg shadow-inner">
                    <Timer className="h-5 w-5" />
                </div>
                <div>
                    <h3 className="text-sm font-bold text-primary">Assistente de Prazos (CPC)</h3>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Cálculo em dias úteis</p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Data de Início</label>
                    <Input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="h-9 bg-background/50 border-border/40 focus:ring-primary/20 outline-none"
                    />
                </div>
                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Dias Úteis</label>
                    <Input
                        type="number"
                        value={days}
                        onChange={(e) => setDays(e.target.value)}
                        className="h-9 bg-background/50 border-border/40 focus:ring-primary/20 outline-none"
                        placeholder="Ex: 15"
                    />
                </div>
            </div>

            {resultDate && (
                <div className="flex items-center justify-between p-3 bg-background/40 rounded-xl border border-border/20">
                    <div className="flex flex-col">
                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Prazo Final</span>
                        <span className="text-sm font-bold text-primary">
                            {format(resultDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                        </span>
                    </div>
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <ArrowRight className="h-4 w-4" />
                    </div>
                </div>
            )}

            <p className="text-[9px] text-center text-muted-foreground italic">
                * Considera sábados, domingos e feriados nacionais brasileiros.
            </p>
        </div>
    );
}
