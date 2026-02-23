import { useState } from "react";
import { TrendingUp, Users, Activity, Briefcase, Plus, Filter, Download, Search, BarChart3 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CrmProvider, useCrm } from "@/contexts/CrmContext";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import CrmPipelineBoard from "@/components/crm/CrmPipelineBoard";
import CrmContactsList from "@/components/crm/CrmContactsList";
import CrmActivitiesTimeline from "@/components/crm/CrmActivitiesTimeline";
import CrmDealsTable from "@/components/crm/CrmDealsTable";
import { cn } from "@/lib/utils";

const formatCurrencyShort = (v: number) => {
    if (v >= 1000000) return `R$ ${(v / 1000000).toFixed(1)}M`;
    if (v >= 1000) return `R$ ${(v / 1000).toFixed(0)}k`;
    return `R$ ${v}`;
};

const formatCurrency = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

function CrmPageInner() {
    const [activeTab, setActiveTab] = useState("pipeline");
    const { leads, contacts, deals } = useCrm();
    const { t } = useTranslation();

    const totalPipeline = leads.reduce((s, l) => s + l.value, 0);
    const activeDeals = deals.filter((d) => d.stage !== "Fechado/Ganho" && d.stage !== "Perdido");
    const wonDeals = deals.filter((d) => d.stage === "Fechado/Ganho");
    const lostDeals = deals.filter((d) => d.stage === "Perdido");
    const convRate = wonDeals.length + lostDeals.length > 0
        ? Math.round((wonDeals.length / (wonDeals.length + lostDeals.length)) * 100) : 0;

    const tabConfig = [
        { value: "pipeline", label: "Pipeline", icon: TrendingUp, count: leads.length },
        { value: "contatos", label: "Contatos", icon: Users, count: contacts.length },
        { value: "atividades", label: "Atividades", icon: Activity },
        { value: "negocios", label: "Negócios", icon: Briefcase, count: deals.length },
    ];

    return (
        <div className="space-y-5">
            {/* Compact Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                        <TrendingUp className="h-4.5 w-4.5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-semibold text-foreground tracking-tight">{t("nav.crm")}</h1>
                        <p className="text-sm text-muted-foreground">Gerencie seu pipeline de vendas e relacionamentos</p>
                    </div>
                </div>
            </div>

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

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="h-10 p-1 bg-muted/50 border border-border/50 rounded-xl max-w-xl">
                    {tabConfig.map((tab) => (
                        <TabsTrigger
                            key={tab.value}
                            value={tab.value}
                            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs transition-all data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:font-semibold"
                        >
                            <tab.icon className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">{tab.label}</span>
                            {tab.count !== undefined && (
                                <Badge variant="secondary" className="h-4 px-1 text-[9px] font-bold ml-0.5">
                                    {tab.count}
                                </Badge>
                            )}
                        </TabsTrigger>
                    ))}
                </TabsList>

                <TabsContent value="pipeline" className="mt-4"><CrmPipelineBoard /></TabsContent>
                <TabsContent value="contatos" className="mt-4"><CrmContactsList /></TabsContent>
                <TabsContent value="atividades" className="mt-4"><CrmActivitiesTimeline /></TabsContent>
                <TabsContent value="negocios" className="mt-4"><CrmDealsTable /></TabsContent>
            </Tabs>
        </div>
    );
}

export default function CrmPage() {
    return (
        <CrmProvider>
            <CrmPageInner />
        </CrmProvider>
    );
}
