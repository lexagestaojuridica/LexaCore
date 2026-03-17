import { useMemo } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from "recharts";
import { format, addDays, isSameDay, startOfToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarClock } from "lucide-react";
import type { Evento } from "../types";

interface DeadlinesChartProps {
  eventos: Evento[];
}

export function DeadlinesChart({ eventos }: DeadlinesChartProps) {
  const data = useMemo(() => {
    const today = startOfToday();
    const next7Days = Array.from({ length: 7 }).map((_, i) => addDays(today, i));

    return next7Days.map((date) => {
      const dayEvents = eventos.filter((e) =>
        isSameDay(new Date(e.start_time), date) &&
        (e.category === "prazo" || e.category === "audiencia")
      );

      return {
        name: format(date, "EEEEEE", { locale: ptBR }).toUpperCase(),
        fullDate: format(date, "dd/MM"),
        prazos: dayEvents.filter(e => e.category === "prazo").length,
        audiencias: dayEvents.filter(e => e.category === "audiencia").length,
        total: dayEvents.length,
        isToday: isSameDay(date, today),
      };
    });
  }, [eventos]);

  const maxTicks = Math.max(...data.map(d => d.total), 4); // At least 4 as max on Y axis

  return (
    <div className="bg-card border border-border/40 rounded-xl p-5 w-full flex flex-col h-full hover:border-border/80 transition-all duration-200">
      <div className="flex items-center gap-2 mb-6">
        <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500">
          <CalendarClock className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">Previsão D-7</h3>
          <p className="text-xs text-muted-foreground">Prazos e audiências críticas</p>
        </div>
      </div>

      <div className="flex-1 w-full min-h-[140px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              dy={10}
            />
            <YAxis
              hide={false}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              tickCount={5}
              domain={[0, maxTicks]}
            />
            <Tooltip
              cursor={{ fill: "hsl(var(--muted)/0.4)", radius: 4 }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-popover/95 backdrop-blur-sm border border-border/50 text-popover-foreground text-xs p-3 rounded-lg shadow-xl ring-1 ring-black/5 flex flex-col gap-2">
                      <span className="font-semibold text-foreground border-b border-border/50 pb-1 mb-1">{data.fullDate}</span>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-amber-500 font-medium">Prazos</span>
                        <span className="font-bold">{data.prazos}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-indigo-500 font-medium">Audiências</span>
                        <span className="font-bold">{data.audiencias}</span>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="total" radius={[4, 4, 4, 4]} maxBarSize={32}>
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.total === 0 ? "hsl(var(--muted)/0.3)" : entry.isToday ? "hsl(var(--destructive))" : "hsl(var(--primary))"}
                  className="transition-all duration-300"
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
