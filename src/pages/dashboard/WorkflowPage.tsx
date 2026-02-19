import { useState } from "react";
import { GitBranch, ClipboardList, Users, Building2, LayoutTemplate } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WorkflowProvider, useWorkflow } from "@/contexts/WorkflowContext";
import WorkflowMyList from "@/components/workflow/WorkflowMyList";
import WorkflowTeamView from "@/components/workflow/WorkflowTeamView";
import WorkflowSectors from "@/components/workflow/WorkflowSectors";
import WorkflowTemplates from "@/components/workflow/WorkflowTemplates";

function WorkflowPageInner() {
    const [activeTab, setActiveTab] = useState("meus");
    const { instances, sectors } = useWorkflow();

    const active = instances.filter((w) => w.status === "em_andamento" || w.status === "pendente").length;

    const tabConfig = [
        { value: "meus", label: "Meus Workflows", icon: ClipboardList },
        { value: "equipe", label: "Equipe", icon: Users },
        { value: "setores", label: "Setores", icon: Building2 },
        { value: "templates", label: "Templates", icon: LayoutTemplate },
    ];

    return (
        <div className="space-y-6">
            {/* Premium Header */}
            <div className="relative overflow-hidden rounded-2xl bg-primary p-7">
                <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/5" />
                <div className="absolute -right-4 top-12 h-24 w-24 rounded-full bg-white/5" />
                <div className="absolute right-20 -bottom-6 h-32 w-32 rounded-full bg-white/[0.03]" />

                <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm ring-1 ring-white/20">
                            <GitBranch className="h-7 w-7 text-primary-foreground" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-primary-foreground tracking-tight">Workflow</h1>
                            <p className="text-sm text-primary-foreground/60 mt-0.5">
                                Gerencie fluxos de trabalho, setores e equipe
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        {[
                            { label: "Ativos", value: active },
                            { label: "Setores", value: sectors.length },
                            { label: "Total", value: instances.length },
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
                <TabsList className="h-12 p-1 bg-muted/50 border border-border/50 rounded-xl max-w-2xl">
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

                <TabsContent value="meus" className="mt-5"><WorkflowMyList /></TabsContent>
                <TabsContent value="equipe" className="mt-5"><WorkflowTeamView /></TabsContent>
                <TabsContent value="setores" className="mt-5"><WorkflowSectors /></TabsContent>
                <TabsContent value="templates" className="mt-5"><WorkflowTemplates /></TabsContent>
            </Tabs>
        </div>
    );
}

export default function WorkflowPage() {
    return (
        <WorkflowProvider>
            <WorkflowPageInner />
        </WorkflowProvider>
    );
}
