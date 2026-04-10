import { useState } from "react";
import { useDebounce } from "@/shared/hooks/useDebounce";
import { Search, Filter, Eye, UserCircle, ArrowRightLeft } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Card, CardContent } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { useWorkflow } from "@/features/workflow/contexts/WorkflowContext";
import { WorkflowInstance } from "../types";
import WorkflowDetail from "./WorkflowDetail";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
    pendente: { label: "Pendente", className: "bg-slate-100 text-slate-600 border-slate-200" },
    em_andamento: { label: "Em andamento", className: "bg-blue-50 text-blue-600 border-blue-200" },
    concluido: { label: "Concluído", className: "bg-emerald-50 text-emerald-600 border-emerald-200" },
    atrasado: { label: "Atrasado", className: "bg-red-50 text-red-600 border-red-200" },
};

const PRIORITY_DOT: Record<string, string> = { alta: "bg-red-500", media: "bg-amber-500", baixa: "bg-slate-400" };

export default function WorkflowTeamView() {
    const { instances, sectors, members, getSector, reassignWorkflow } = useWorkflow();
    const [search, setSearch] = useState("");
    const debouncedSearch = useDebounce(search, 400);
    const [sectorFilter, setSectorFilter] = useState("todos");
    const [statusFilter, setStatusFilter] = useState("todos");
    const [selectedInstance, setSelectedInstance] = useState<WorkflowInstance | null>(null);
    const [detailOpen, setDetailOpen] = useState(false);
    const [reassignOpen, setReassignOpen] = useState(false);
    const [reassignTarget, setReassignTarget] = useState("");

    const filtered = instances.filter((w) => {
        const q = debouncedSearch.toLowerCase();
        const matchSearch = !q || w.templateName.toLowerCase().includes(q) || w.assignedToName.toLowerCase().includes(q);
        const matchSector = sectorFilter === "todos" || w.sectorId === sectorFilter;
        const matchStatus = statusFilter === "todos" || w.status === statusFilter;
        return matchSearch && matchSector && matchStatus;
    });

    const handleReassign = () => {
        if (selectedInstance && reassignTarget) {
            reassignWorkflow(selectedInstance.id, reassignTarget);
            setReassignOpen(false);
            setSelectedInstance(null);
        }
    };

    return (
        <div className="space-y-5">
            {/* Filters */}
            <Card className="border-border/50">
                <CardContent className="flex flex-wrap items-center gap-3 p-3">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
                    </div>
                    <Select value={sectorFilter} onValueChange={setSectorFilter}>
                        <SelectTrigger className="w-[150px] h-9"><Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" /><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="todos">Todos Setores</SelectItem>
                            {sectors.map((s) => <SelectItem key={s.id} value={s.id}>{s.emoji} {s.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[150px] h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="todos">Todos Status</SelectItem>
                            <SelectItem value="em_andamento">Em andamento</SelectItem>
                            <SelectItem value="pendente">Pendente</SelectItem>
                            <SelectItem value="concluido">Concluído</SelectItem>
                            <SelectItem value="atrasado">Atrasado</SelectItem>
                        </SelectContent>
                    </Select>
                </CardContent>
            </Card>

            {/* Table */}
            <Card className="border-border/50 overflow-hidden">
                <CardContent className="p-0">
                    {filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-3"><UserCircle className="h-7 w-7 text-muted-foreground/30" /></div>
                            <p className="text-sm font-medium text-muted-foreground">Nenhum workflow da equipe encontrado</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                                        <TableHead className="font-semibold">Workflow</TableHead>
                                        <TableHead className="font-semibold">Responsável</TableHead>
                                        <TableHead className="font-semibold">Setor</TableHead>
                                        <TableHead className="font-semibold">Progresso</TableHead>
                                        <TableHead className="font-semibold">Status</TableHead>
                                        <TableHead className="font-semibold">Prazo</TableHead>
                                        <TableHead className="text-right font-semibold">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filtered.map((w) => {
                                        const completed = w.steps.filter((s) => s.completed).length;
                                        const total = w.steps.length;
                                        const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
                                        const sector = getSector(w.sectorId);
                                        const statusCfg = STATUS_CONFIG[w.status];

                                        return (
                                            <TableRow key={w.id} className="group hover:bg-muted/20 transition-colors">
                                                <TableCell>
                                                    <div className="flex items-center gap-2.5">
                                                        <span className="text-base">{w.templateEmoji}</span>
                                                        <div>
                                                            <p className="font-medium text-sm">{w.templateName}</p>
                                                            <div className="flex items-center gap-1 mt-0.5">
                                                                <div className={`h-1.5 w-1.5 rounded-full ${PRIORITY_DOT[w.priority]}`} />
                                                                <span className="text-[10px] text-muted-foreground capitalize">{w.priority}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">{w.assignedToName.split(" ").map(n => n[0]).slice(0, 2).join("")}</div>
                                                        <span className="text-sm text-muted-foreground">{w.assignedToName}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>{sector && <Badge variant="outline" className="text-[10px]">{sector.emoji} {sector.name}</Badge>}</TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2 min-w-[120px]">
                                                        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                                                            <div className={`h-full rounded-full ${progress === 100 ? "bg-emerald-500" : "bg-primary"} transition-all`} style={{ width: `${progress}%` }} />
                                                        </div>
                                                        <span className="text-[11px] font-medium text-muted-foreground min-w-[35px] text-right">{progress}%</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell><Badge variant="outline" className={`text-[10px] ${statusCfg.className}`}>{statusCfg.label}</Badge></TableCell>
                                                <TableCell className="text-sm text-muted-foreground">{w.deadline ? new Date(w.deadline + "T00:00:00").toLocaleDateString("pt-BR") : "—"}</TableCell>
                                                <TableCell>
                                                    <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => { setSelectedInstance(w); setDetailOpen(true); }}><Eye className="h-3.5 w-3.5" /></Button>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => { setSelectedInstance(w); setReassignTarget(""); setReassignOpen(true); }}><ArrowRightLeft className="h-3.5 w-3.5" /></Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            <WorkflowDetail instance={selectedInstance} open={detailOpen} onOpenChange={setDetailOpen} />

            {/* Reassign Dialog */}
            <Dialog open={reassignOpen} onOpenChange={setReassignOpen}>
                <DialogContent className="max-w-sm">
                    <DialogHeader><DialogTitle className="flex items-center gap-2"><ArrowRightLeft className="h-4 w-4" /> Reatribuir Workflow</DialogTitle></DialogHeader>
                    {selectedInstance && (
                        <div className="space-y-4 pt-2">
                            <div className="flex items-center gap-2 rounded-lg bg-muted/30 p-3">
                                <span className="text-base">{selectedInstance.templateEmoji}</span>
                                <div>
                                    <p className="text-sm font-medium">{selectedInstance.templateName}</p>
                                    <p className="text-[11px] text-muted-foreground">Atual: {selectedInstance.assignedToName}</p>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Novo Responsável</label>
                                <Select value={reassignTarget} onValueChange={setReassignTarget}>
                                    <SelectTrigger className="h-10 bg-background"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                    <SelectContent>{members.map((m) => <SelectItem key={m.id} value={m.id}>{m.avatar} — {m.name} ({m.role})</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <Button variant="outline" onClick={() => setReassignOpen(false)}>Cancelar</Button>
                                <Button onClick={handleReassign} disabled={!reassignTarget}>Reatribuir</Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
