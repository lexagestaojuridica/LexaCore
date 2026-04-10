"use client";

import { Badge } from "@/shared/ui/badge";

export function UpcomingEvents() {
    const events = [
        {
            title: "Reunião com TechBrasil - Estratégia Trabalhista",
            time: "10:00 • Escritório",
            date: "10 ABR",
            category: "Reunião",
        },
    ];

    return (
        <div className="bg-white rounded-[24px] border border-lexa-grey-200 p-8 w-full flex flex-col h-full shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 tracking-tight mb-8">
                Próximos Compromissos
            </h3>

            <div className="space-y-4">
                {events.map((e, i) => (
                    <div key={i} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl group hover:bg-slate-100 transition-colors cursor-pointer">
                        <div className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-lexa-blue/5 text-lexa-blue shrink-0">
                            <span className="text-[10px] font-bold leading-none">{e.date.split(' ')[0]}</span>
                            <span className="text-[10px] font-black leading-none uppercase">{e.date.split(' ')[1]}</span>
                        </div>
                        <div className="flex-1 flex flex-col gap-1 min-w-0">
                            <h4 className="text-sm font-bold text-slate-700 tracking-tight truncate">
                                {e.title}
                            </h4>
                            <p className="text-[10px] text-slate-400 font-medium truncate">
                                {e.time}
                            </p>
                        </div>
                        <Badge variant="secondary" className="bg-slate-200/50 text-slate-500 border-transparent text-[10px] lowercase font-medium h-6 px-3 rounded-lg">
                            {e.category.toLowerCase()}
                        </Badge>
                    </div>
                ))}
            </div>
        </div>
    );
}
