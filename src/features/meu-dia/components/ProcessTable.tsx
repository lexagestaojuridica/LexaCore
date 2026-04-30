"use client";

import { cn } from "@/shared/lib/utils";
import { useTranslation } from "react-i18next";

/** Status tag variants — soft pastel colors */
type ProcessStatus = "active" | "urgent" | "completed" | "waiting";

const STATUS_STYLES: Record<ProcessStatus, string> = {
    active: "bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20",
    urgent: "bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20",
    completed: "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20",
    waiting: "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20",
};

interface Process {
    id: string;
    cnj: string;
    title: string;
    client: string;
    area: string;
    status: ProcessStatus;
    prazo: string;
}

const MOCK_PROCESSES: Process[] = [
    {
        id: "1",
        cnj: "1234567-89.2025.8.26.0100",
        title: "Ação de Cobrança",
        client: "Maria Oliveira Santos",
        area: "civil",
        status: "active",
        prazo: "18 Abr",
    },
    {
        id: "2",
        cnj: "9876543-21.2025.8.26.0050",
        title: "Reclamação Trabalhista",
        client: "TechBrasil Ltda.",
        area: "labor",
        status: "urgent",
        prazo: "12 Abr",
    },
    {
        id: "3",
        cnj: "1122334-55.2024.8.26.0200",
        title: "Revisional de Contrato",
        client: "João P. Ferreira",
        area: "civil",
        status: "waiting",
        prazo: "30 Abr",
    },
    {
        id: "4",
        cnj: "4455667-88.2024.8.26.0300",
        title: "Defesa em Auto de Infração",
        client: "Comercial Norte S.A.",
        area: "tax",
        status: "completed",
        prazo: "—",
    },
    {
        id: "5",
        cnj: "7788991-22.2025.8.26.0010",
        title: "Inventário e Partilha",
        client: "Família Rodrigues",
        area: "family",
        status: "active",
        prazo: "05 Mai",
    },
];

function StatusBadge({ status }: { status: ProcessStatus }) {
    const { t } = useTranslation();
    return (
        <span className={cn(
            "inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-semibold",
            STATUS_STYLES[status]
        )}>
            {t(`dashboard.status.${status}`)}
        </span>
    );
}

export function ProcessTable() {
    const { t } = useTranslation();
    return (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">
                    {t("dashboard.recentProcesses")}
                </h3>
                <span className="text-xs text-muted-foreground">
                    {t("dashboard.processesCount", { count: MOCK_PROCESSES.length })}
                </span>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-border bg-muted/40">
                            <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground w-[180px]">
                                {t("processes.processNumber")}
                            </th>
                            <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                                {t("processes.subject")}
                            </th>
                            <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground hidden md:table-cell">
                                {t("processes.client")}
                            </th>
                            <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground hidden lg:table-cell">
                                {t("processes.areaOfLaw")}
                            </th>
                            <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                                {t("common.status")}
                            </th>
                            <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground hidden sm:table-cell">
                                {t("common.date")}
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {MOCK_PROCESSES.map((process) => (
                            <tr
                                key={process.id}
                                className="hover:bg-muted/30 transition-colors cursor-pointer"
                            >
                                <td className="px-5 py-3.5">
                                    <span className="font-mono text-[11px] text-muted-foreground">
                                        {process.cnj}
                                    </span>
                                </td>
                                <td className="px-4 py-3.5">
                                    <span className="font-medium text-foreground text-[13px]">
                                        {process.title}
                                    </span>
                                </td>
                                <td className="px-4 py-3.5 hidden md:table-cell text-[13px] text-muted-foreground">
                                    {process.client}
                                </td>
                                <td className="px-4 py-3.5 hidden lg:table-cell">
                                    <span className="text-[11px] bg-secondary text-secondary-foreground px-2 py-0.5 rounded font-medium">
                                        {t(`dashboard.areas.${process.area}`)}
                                    </span>
                                </td>
                                <td className="px-4 py-3.5">
                                    <StatusBadge status={process.status} />
                                </td>
                                <td className="px-5 py-3.5 hidden sm:table-cell text-[13px] text-muted-foreground font-medium">
                                    {process.prazo}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
