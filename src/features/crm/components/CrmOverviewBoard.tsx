import { TrendingUp, Users, Activity, Briefcase, Plus, Filter, Download, Search, BarChart3 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useCrm } from "@/features/crm/contexts/CrmContext";
import { cn } from "@/lib/utils";

const formatCurrencyShort = (v: number) => {
    if (v >= 1000000) return `R$ ${(v / 1000000).toFixed(1)}M`;
    if (v >= 1000) return `R$ ${(v / 1000).toFixed(0)}k`;
    return `R$ ${v}`;
};

const formatCurrency = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

export default function CrmOverviewBoard() {
    const { leads, contacts, deals } = useCrm();

    const totalPipeline = leads.reduce((s, l) => s + l.value, 0);
    const activeDeals = deals.filter((d) => d.stage !== "Fechado/Ganho" && d.stage !== "Perdido");
    const wonDeals = deals.filter((d) => d.stage === "Fechado/Ganho");
    const lostDeals = deals.filter((d) => d.stage === "Perdido");
    const convRate = wonDeals.length + lostDeals.length > 0
        ? Math.round((wonDeals.length / (wonDeals.length + lostDeals.length)) * 100) : 0;

    return (
        <div className="space-y-5">
            {/* KPI Strip */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                    { label: "Pipeline Total", value: formatCurrency(totalPipeline), change: `${leads.length} leads`, color: "text-primary", bg: "bg-primary/5 border-primary/10" },
                    { label: "Conversão", value: `${convRate}%`, change: `${wonDeals.length} ganhos`, color: "text-emerald-600", bg: "bg-emerald-500/5 border-emerald-500/10" },
                    { label: "Negócios Ativos", value: String(activeDeals.length), change: formatCurrencyShort(activeDeals.reduce((s, d) => s + d.value, 0)), color: "text-blue-600", bg: "bg-blue-500/5 border-blue-500/10" },
                    { label: "Contatos", value: String(contacts.length), change: "base ativa", color: "text-violet-600", bg: "bg-violet-500/5 border-violet-500/10" },
                ].map((kpi) => (
                    <div key={kpi.label} className={cn("rounded-xl border p-3.5 transition-shadow hover:shadow-sm", kpi.bg)}>
                        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{kpi.label}</p>
                        <p className={cn("text-xl font-bold mt-1 leading-none", kpi.color)}>{kpi.value}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">{kpi.change}</p>
                    </div>
                ))}
            </div>

            {/* Funnel visualization */}
            <div className="bg-card border border-border/50 rounded-xl p-4">
                <h3 className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-1.5">
                    <BarChart3 className="h-3.5 w-3.5 text-primary" /> Funil de Vendas
                </h3>
                <div className="flex items-end gap-1 h-16">
                    {[
                        { label: "Lead", count: leads.filter(l => l.stageId === "novo_lead").length, color: "bg-blue-500" },
                        { label: "Contato", count: leads.filter(l => l.stageId === "contato_feito").length, color: "bg-amber-500" },
                        { label: "Proposta", count: leads.filter(l => l.stageId === "proposta_enviada").length, color: "bg-violet-500" },
                        { label: "Negociação", count: leads.filter(l => l.stageId === "em_negociacao").length, color: "bg-orange-500" },
                        { label: "Ganho", count: leads.filter(l => l.stageId === "fechado_ganho").length, color: "bg-emerald-500" },
                        { label: "Perdido", count: leads.filter(l => l.stageId === "perdido").length, color: "bg-red-400" },
                    ].map((stage) => {
                        const maxCount = Math.max(...leads.map(() => 1), leads.filter(l => l.stageId === "novo_lead").length, 1);
                        const height = maxCount > 0 ? Math.max(8, (stage.count / maxCount) * 64) : 8;
                        return (
                            <div key={stage.label} className="flex-1 flex flex-col items-center gap-1">
                                <span className="text-[10px] font-bold text-foreground">{stage.count}</span>
                                <div className={cn("w-full rounded-t-md transition-all", stage.color)} style={{ height: `${height}px`, opacity: stage.count > 0 ? 1 : 0.2 }} />
                                <span className="text-[8px] text-muted-foreground font-medium uppercase tracking-wider">{stage.label}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
