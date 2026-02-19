import { useState } from "react";
import { TrendingUp, Users, Activity, Briefcase } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CrmProvider, useCrm } from "@/contexts/CrmContext";
import CrmPipelineBoard from "@/components/crm/CrmPipelineBoard";
import CrmContactsList from "@/components/crm/CrmContactsList";
import CrmActivitiesTimeline from "@/components/crm/CrmActivitiesTimeline";
import CrmDealsTable from "@/components/crm/CrmDealsTable";

const formatCurrencyShort = (v: number) => {
    if (v >= 1000) return `R$ ${(v / 1000).toFixed(0)}k`;
    return `R$ ${v}`;
};

function CrmPageInner() {
    const [activeTab, setActiveTab] = useState("pipeline");
    const { leads, contacts, deals } = useCrm();

    const totalPipeline = leads.reduce((s, l) => s + l.value, 0);
    const activeDeals = deals.filter((d) => d.stage !== "Fechado/Ganho" && d.stage !== "Perdido");
    const wonDeals = deals.filter((d) => d.stage === "Fechado/Ganho");
    const lostDeals = deals.filter((d) => d.stage === "Perdido");
    const convRate = wonDeals.length + lostDeals.length > 0
        ? Math.round((wonDeals.length / (wonDeals.length + lostDeals.length)) * 100) : 0;

    const tabConfig = [
        { value: "pipeline", label: "Pipeline", icon: TrendingUp },
        { value: "contatos", label: "Contatos", icon: Users },
        { value: "atividades", label: "Atividades", icon: Activity },
        { value: "negocios", label: "Negócios", icon: Briefcase },
    ];

    return (
        <div className="space-y-6">
            {/* Premium Header */}
            <div className="relative overflow-hidden rounded-2xl bg-primary p-7">
                <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/5" />
                <div className="absolute -right-4 top-12 h-24 w-24 rounded-full bg-white/5" />

                <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold text-primary-foreground tracking-tight">CRM</h1>
                        <p className="text-sm text-primary-foreground/60 mt-0.5">
                            Gerencie seu pipeline de vendas, contatos e atividades
                        </p>
                    </div>

                    <div className="flex items-center gap-6">
                        {[
                            { label: "Pipeline", value: formatCurrencyShort(totalPipeline) },
                            { label: "Contatos", value: contacts.length },
                            { label: "Conversão", value: `${convRate}%` },
                        ].map((stat) => (
                            <div key={stat.label} className="text-right">
                                <p className="text-lg font-bold text-primary-foreground">{stat.value}</p>
                                <p className="text-[10px] uppercase tracking-wider text-primary-foreground/40">{stat.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="h-12 p-1 bg-muted/50 border border-border/50 rounded-xl max-w-xl">
                    {tabConfig.map((tab) => (
                        <TabsTrigger
                            key={tab.value}
                            value={tab.value}
                            className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm transition-all data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:font-semibold"
                        >
                            <tab.icon className="h-4 w-4" />
                            <span className="hidden sm:inline">{tab.label}</span>
                        </TabsTrigger>
                    ))}
                </TabsList>

                <TabsContent value="pipeline" className="mt-5"><CrmPipelineBoard /></TabsContent>
                <TabsContent value="contatos" className="mt-5"><CrmContactsList /></TabsContent>
                <TabsContent value="atividades" className="mt-5"><CrmActivitiesTimeline /></TabsContent>
                <TabsContent value="negocios" className="mt-5"><CrmDealsTable /></TabsContent>
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
