"use client";

import { useState, useMemo } from "react";
import { TrendingUp, Users, Activity, Briefcase, DollarSign, Sparkles } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { CrmProvider, useCrm } from "@/features/crm/contexts/CrmContext";
import { useTranslation } from "react-i18next";
import { Badge } from "@/shared/ui/badge";
import { Card } from "@/shared/ui/card";
import CrmPipelineBoard from "@/features/crm/components/CrmPipelineBoard";
import CrmContactsList from "@/features/crm/components/CrmContactsList";
import CrmActivitiesTimeline from "@/features/crm/components/CrmActivitiesTimeline";
import CrmDealsTable from "@/features/crm/components/CrmDealsTable";
import CrmOverviewBoard from "@/features/crm/components/CrmOverviewBoard";
import { cn } from "@/shared/lib/utils";
import { motion } from "framer-motion";

const formatCurrency = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

function CrmPageInner() {
    const [activeTab, setActiveTab] = useState("pipeline");
    const { leads, contacts, deals } = useCrm();
    const { t } = useTranslation();

    const totalPipeline = useMemo(() => leads.reduce((s, l) => s + l.value, 0), [leads]);
    const wonValue = useMemo(() => leads.filter((l) => l.stageId === "fechado_ganho").reduce((s, l) => s + l.value, 0), [leads]);

    const kpis = [
        { label: t("crm.overview.totalPipeline"), value: formatCurrency(totalPipeline), icon: DollarSign, color: "text-primary", bg: "bg-primary/10", accent: "bg-primary" },
        { label: t("crm.overview.activeLeads"), value: leads.length, icon: TrendingUp, color: "text-blue-600", bg: "bg-blue-50", accent: "bg-blue-500" },
        { label: t("crm.overview.wonValue"), value: formatCurrency(wonValue), icon: Sparkles, color: "text-emerald-600", bg: "bg-emerald-50", accent: "bg-emerald-500" },
        { label: t("crm.overview.contacts"), value: contacts.length, icon: Users, color: "text-violet-600", bg: "bg-violet-50", accent: "bg-violet-500" },
    ];

    const tabConfig = [
        { value: "pipeline", label: t("crm.tabs.pipeline"), icon: TrendingUp, count: leads.length },
        { value: "contatos", label: t("crm.tabs.contacts"), icon: Users, count: contacts.length },
        { value: "atividades", label: t("crm.tabs.activities"), icon: Activity },
        { value: "negocios", label: t("crm.tabs.deals"), icon: Briefcase, count: deals.length },
    ];

    return (
        <div className="space-y-6">
            {/* Professional Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center shadow-inner">
                        <TrendingUp className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-foreground tracking-tight">{t("crm.title")}</h1>
                        <p className="text-sm text-muted-foreground">{t("crm.subtitle")}</p>
                    </div>
                </div>
            </div>

            {/* Unified KPI Strip */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {kpis.map((kpi, idx) => (
                    <motion.div
                        key={kpi.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: idx * 0.1 }}
                    >
                        <Card className="border-border/50 overflow-hidden group hover:shadow-lg transition-all duration-300">
                            <div className="p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{kpi.label}</p>
                                    <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg transition-transform group-hover:scale-110", kpi.bg)}>
                                        <kpi.icon className={cn("h-4 w-4", kpi.color)} />
                                    </div>
                                </div>
                                <p className={cn("text-xl font-extrabold tracking-tight", kpi.color)}>{kpi.value}</p>
                            </div>
                            <div className={cn("h-1 w-full opacity-40", kpi.accent)} />
                        </Card>
                    </motion.div>
                ))}
            </div>

            <CrmOverviewBoard />

            {/* Tabs & Content */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                    <TabsList className="h-11 p-1.5 bg-muted/30 border border-border/40 rounded-2xl w-full sm:w-auto">
                        {tabConfig.map((tab) => (
                            <TabsTrigger
                                key={tab.value}
                                value={tab.value}
                                className="flex items-center gap-2 rounded-xl px-4 py-2 text-xs transition-all data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:font-bold"
                            >
                                <tab.icon className="h-4 w-4" />
                                <span>{tab.label}</span>
                                {tab.count !== undefined && (
                                    <Badge variant="secondary" className="h-5 min-w-[20px] justify-center text-[10px] font-extrabold ml-1 bg-primary/5 text-primary border-primary/10">
                                        {tab.count}
                                    </Badge>
                                )}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </div>

                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2 }}
                >
                    <TabsContent value="pipeline" className="m-0"><CrmPipelineBoard /></TabsContent>
                    <TabsContent value="contatos" className="m-0"><CrmContactsList /></TabsContent>
                    <TabsContent value="atividades" className="m-0"><CrmActivitiesTimeline /></TabsContent>
                    <TabsContent value="negocios" className="m-0"><CrmDealsTable /></TabsContent>
                </motion.div>
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
