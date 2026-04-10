"use client";

import { Badge } from "@/shared/ui/badge";

export function RecentProcesses() {
    const processes = [
        {
            title: "Ação de Cobrança - Maria Oliveira vs Banco XYZ",
            code: "1234567-89.2025.8.26.0100",
            client: "Maria Oliveira Santos",
            status: "Em Andamento",
        },
    ];

    return (
        <div className="bg-white rounded-[24px] border border-lexa-grey-200 p-8 w-full flex flex-col h-full shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 tracking-tight mb-8">
                Processos Recentes
            </h3>

            <div className="space-y-4">
                {processes.map((p, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl group hover:bg-slate-100 transition-colors cursor-pointer">
                        <div className="flex flex-col gap-1">
                            <h4 className="text-sm font-bold text-slate-700 tracking-tight">
                                {p.title}
                            </h4>
                            <p className="text-[10px] text-slate-400 font-medium">
                                {p.code} • {p.client}
                            </p>
                        </div>
                        <Badge variant="secondary" className="bg-lexa-blue/5 text-lexa-blue border-lexa-blue/10 text-[10px] uppercase font-bold tracking-widest h-8 px-4 rounded-xl">
                            {p.status}
                        </Badge>
                    </div>
                ))}
            </div>
        </div>
    );
}
