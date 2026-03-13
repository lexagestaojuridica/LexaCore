import { useState } from "react";
import { TrendingUp, Users, Activity, Briefcase, Plus, Filter, Download, Search, BarChart3 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { CrmProvider, useCrm } from "@/features/crm/contexts/CrmContext";
import { useTranslation } from "react-i18next";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import CrmPipelineBoard from "@/features/crm/components/CrmPipelineBoard";
import CrmContactsList from "@/features/crm/components/CrmContactsList";
import CrmActivitiesTimeline from "@/features/crm/components/CrmActivitiesTimeline";
import CrmDealsTable from "@/features/crm/components/CrmDealsTable";
import CrmOverviewBoard from "@/features/crm/components/CrmOverviewBoard";
import { cn } from "@/shared/lib/utils";

function CrmPageInner() {
    const [activeTab, setActiveTab] = useState("pipeline");
    const { leads, contacts, deals } = useCrm();
    const { t } = useTranslation();

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

            <CrmOverviewBoard />

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
