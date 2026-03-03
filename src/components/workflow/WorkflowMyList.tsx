import { useState } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { Clock, CheckCircle2, AlertTriangle, Inbox, Search, Filter, Calendar, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useWorkflow, WorkflowInstance } from "@/contexts/WorkflowContext";
import WorkflowDetail from "./WorkflowDetail";

const STATUS_CONFIG: Record<string, { label: string; icon: any; color: string; className: string }> = {
    pendente: { label: "Pendente", icon: Inbox, color: "text-slate-500", className: "bg-slate-100 text-slate-600 border-slate-200" },
    em_andamento: { label: "Em andamento", icon: Clock, color: "text-blue-600", className: "bg-blue-50 text-blue-600 border-blue-200" },
    concluido: { label: "Concluído", icon: CheckCircle2, color: "text-emerald-600", className: "bg-emerald-50 text-emerald-600 border-emerald-200" },
    atrasado: { label: "Atrasado", icon: AlertTriangle, color: "text-red-600", className: "bg-red-50 text-red-600 border-red-200" },
};

const PRIORITY_CONFIG: Record<string, { label: string; className: string; dot: string }> = {
    alta: { label: "Alta", className: "bg-red-50 text-red-600 border-red-200", dot: "bg-red-500" },
    media: { label: "Média", className: "bg-amber-50 text-amber-600 border-amber-200", dot: "bg-amber-500" },
    baixa: { label: "Baixa", className: "bg-slate-100 text-slate-500 border-slate-200", dot: "bg-slate-400" },
};

export default function WorkflowMyList() {
    const { instances, sectors, getSector, deleteWorkflow } = useWorkflow();
    const [search, setSearch] = useState("");
    const debouncedSearch = useDebounce(search, 400);
    const [statusFilter, setStatusFilter] = useState("todos");
    const [selectedInstance, setSelectedInstance] = useState<WorkflowInstance | null>(null);
    const [detailOpen, setDetailOpen] = useState(false);

    const filtered = instances.filter((w) => {
        const q = debouncedSearch.toLowerCase();
        const matchSearch = !q || w.templateName.toLowerCase().includes(q) || w.assignedToName.toLowerCase().includes(q);
        const matchStatus = statusFilter === "todos" || w.status === statusFilter;
        return matchSearch && matchStatus;
    });

    const byStatus = (status: string) => instances.filter((w) => w.status === status).length;

    return (
        <div className="space-y-5">
            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                    { label: "Em Andamento", value: byStatus("em_andamento"), icon: Clock, color: "text-blue-600", bg: "bg-blue-50", accent: "bg-blue-500" },
                    { label: "Pendentes", value: byStatus("pendente"), icon: Inbox, color: "text-slate-600", bg: "bg-muted", accent: "bg-foreground/20" },
                    { label: "Concluídos", value: byStatus("concluido"), icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50", accent: "bg-emerald-500" },
                    { label: "Atrasados", value: byStatus("atrasado"), icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50", accent: "bg-red-500" },
                ].map((kpi) => (
                    <Card key={kpi.label} className="border-border/50 overflow-hidden group hover:shadow-md transition-all duration-300">
                        <div className="p-4">
                            <div className="flex items-center justify-between mb-2.5">
                                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{kpi.label}</p>
                                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${kpi.bg} transition-transform group-hover:scale-110`}><kpi.icon className={`h-4 w-4 ${kpi.color}`} /></div>
                            </div>
                            <p className={`text-xl font-bold ${kpi.color}`}>{kpi.value}</p>
                        </div>
                        <div className={`h-0.5 ${kpi.accent} opacity-60`} />
                    </Card>
                ))}
            </div>

            {/* Filters */}
            <Card className="border-border/50">
                <CardContent className="flex flex-wrap items-center gap-3 p-3">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input placeholder="Buscar workflow..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[160px] h-9"><Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" /><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="todos">Todos</SelectItem>
                            <SelectItem value="em_andamento">Em andamento</SelectItem>
                            <SelectItem value="pendente">Pendentes</SelectItem>
                            <SelectItem value="concluido">Concluídos</SelectItem>
                            <SelectItem value="atrasado">Atrasados</SelectItem>
                        </SelectContent>
                    </Select>
                </CardContent>
            </Card>

            {/* Workflow Cards */}
            {filtered.length === 0 ? (
                <Card className="border-border/50">
                    <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-3"><Inbox className="h-7 w-7 text-muted-foreground/30" /></div>
                        <p className="text-sm font-medium text-muted-foreground">Nenhum workflow encontrado</p>
                        <p className="text-xs text-muted-foreground/50 mt-1">Inicie um workflow na aba Templates</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map((w) => {
                        const completed = w.steps.filter((s) => s.completed).length;
                        const total = w.steps.length;
                        const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
                        const statusCfg = STATUS_CONFIG[w.status];
                        const sector = getSector(w.sectorId);
                        const StatusIcon = statusCfg.icon;

                        return (
                            <Card key={w.id} className="border-border/50 hover:shadow-md transition-all duration-200 group overflow-hidden cursor-pointer"
                                onClick={() => { setSelectedInstance(w); setDetailOpen(true); }}>
                                <CardContent className="p-4 space-y-3">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-2.5">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/8 text-lg shrink-0">{w.templateEmoji}</div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-foreground truncate">{w.templateName}</p>
                                                <p className="text-[11px] text-muted-foreground mt-0.5">👤 {w.assignedToName}</p>
                                            </div>
                                        </div>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                                            onClick={(e) => { e.stopPropagation(); deleteWorkflow(w.id); }}>
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>

                                    {/* Progress */}
                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-muted-foreground">{completed}/{total} etapas</span>
                                            <span className={`font-bold ${progress === 100 ? "text-emerald-600" : "text-primary"}`}>{progress}%</span>
                                        </div>
                                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                                            <div className={`h-full rounded-full transition-all duration-500 ${progress === 100 ? "bg-emerald-500" : "bg-primary"}`} style={{ width: `${progress}%` }} />
                                        </div>
                                    </div>

                                    {/* Badges */}
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        <Badge variant="outline" className={`text-[9px] ${statusCfg.className}`}>
                                            <StatusIcon className="h-2.5 w-2.5 mr-0.5" /> {statusCfg.label}
                                        </Badge>
                                        <Badge variant="outline" className={`text-[9px] ${PRIORITY_CONFIG[w.priority].className}`}>{PRIORITY_CONFIG[w.priority].label}</Badge>
                                        {sector && <Badge variant="outline" className="text-[9px]">{sector.emoji} {sector.name}</Badge>}
                                    </div>

                                    {/* Footer */}
                                    <div className="flex items-center justify-between text-[10px] text-muted-foreground/50 pt-1 border-t border-border/30">
                                        <span>Criado: {new Date(w.createdAt).toLocaleDateString("pt-BR")}</span>
                                        {w.deadline && <span className="flex items-center gap-1"><Calendar className="h-2.5 w-2.5" /> {new Date(w.deadline + "T00:00:00").toLocaleDateString("pt-BR")}</span>}
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            <WorkflowDetail instance={selectedInstance} open={detailOpen} onOpenChange={setDetailOpen} />
        </div>
    );
}
