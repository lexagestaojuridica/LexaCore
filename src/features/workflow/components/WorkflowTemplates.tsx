import { useState } from "react";
import { Play, Clock, Users, Briefcase, Sparkles } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import FormField from "@/shared/components/FormField";
import { useWorkflow } from "@/features/workflow/contexts/WorkflowContext";

const CATEGORY_COLORS: Record<string, string> = {
    Geral: "bg-blue-50 text-blue-700 border-blue-200",
    Processual: "bg-violet-50 text-violet-700 border-violet-200",
    Empresarial: "bg-amber-50 text-amber-700 border-amber-200",
    Cível: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

export default function WorkflowTemplates() {
    const { templates, sectors, members, startWorkflow } = useWorkflow();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<string>("");
    const [sectorId, setSectorId] = useState("");
    const [assignedTo, setAssignedTo] = useState("");
    const [priority, setPriority] = useState<"alta" | "media" | "baixa">("media");
    const [deadline, setDeadline] = useState("");

    const openStart = (templateId: string) => {
        setSelectedTemplate(templateId);
        setSectorId(sectors[0]?.id || "");
        setAssignedTo("");
        setPriority("media");
        setDeadline("");
        setDialogOpen(true);
    };

    const handleStart = () => {
        if (!selectedTemplate || !sectorId || !assignedTo) return;
        startWorkflow(selectedTemplate, sectorId, assignedTo, priority, deadline);
        setDialogOpen(false);
    };

    const selectedSector = sectors.find((s) => s.id === sectorId);
    const sectorMembers = selectedSector
        ? [selectedSector.coordinatorId, ...selectedSector.memberIds]
            .map((id) => members.find((m) => m.id === id))
            .filter(Boolean)
        : members;

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-base font-semibold text-foreground">Templates de Workflow</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Selecione um modelo para iniciar um novo fluxo de trabalho</p>
                </div>
                <Badge variant="outline" className="text-xs">{templates.length} modelos</Badge>
            </div>

            {/* Template Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map((t) => (
                    <Card key={t.id} className="border-border/50 hover:shadow-md transition-all duration-200 group overflow-hidden">
                        <CardContent className="p-5 space-y-3">
                            <div className="flex items-start gap-3">
                                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/8 text-xl shrink-0 transition-transform group-hover:scale-105">{t.emoji}</div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-foreground">{t.name}</p>
                                    <Badge variant="outline" className={`text-[9px] mt-1 ${CATEGORY_COLORS[t.category] || ""}`}>{t.category}</Badge>
                                </div>
                            </div>

                            <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">{t.description}</p>

                            <div className="flex items-center gap-3 text-[10px] text-muted-foreground/60">
                                <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{t.steps.length} etapas</span>
                            </div>

                            {/* Steps Preview */}
                            <div className="border-t border-border/30 pt-2.5 space-y-1">
                                {t.steps.slice(0, 3).map((step, i) => (
                                    <div key={i} className="flex items-center gap-2 text-[11px] text-muted-foreground">
                                        <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/20 shrink-0" />
                                        <span className="truncate">{step.title}</span>
                                    </div>
                                ))}
                                {t.steps.length > 3 && <p className="text-[10px] text-muted-foreground/40 pl-3.5">+{t.steps.length - 3} etapas...</p>}
                            </div>

                            <Button className="w-full gap-1.5 shadow-sm mt-1" size="sm" onClick={() => openStart(t.id)}>
                                <Play className="h-3.5 w-3.5" /> Iniciar Workflow
                            </Button>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Start Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4" /> Iniciar Workflow
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-2">
                        {selectedTemplate && (
                            <div className="flex items-center gap-3 rounded-xl bg-muted/30 p-3">
                                <span className="text-xl">{templates.find((t) => t.id === selectedTemplate)?.emoji}</span>
                                <div>
                                    <p className="font-semibold text-sm">{templates.find((t) => t.id === selectedTemplate)?.name}</p>
                                    <p className="text-[11px] text-muted-foreground">{templates.find((t) => t.id === selectedTemplate)?.steps.length} etapas</p>
                                </div>
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Setor</label>
                            <Select value={sectorId} onValueChange={(v) => { setSectorId(v); setAssignedTo(""); }}>
                                <SelectTrigger className="h-10 bg-background"><SelectValue placeholder="Selecione o setor" /></SelectTrigger>
                                <SelectContent>{sectors.map((s) => <SelectItem key={s.id} value={s.id}>{s.emoji} {s.name}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Atribuir para</label>
                            <Select value={assignedTo} onValueChange={setAssignedTo}>
                                <SelectTrigger className="h-10 bg-background"><SelectValue placeholder="Selecione o advogado" /></SelectTrigger>
                                <SelectContent>{sectorMembers.map((m) => m && <SelectItem key={m.id} value={m.id}>{m.avatar} — {m.name} ({m.role})</SelectItem>)}</SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Prioridade</label>
                                <Select value={priority} onValueChange={(v: any) => setPriority(v)}>
                                    <SelectTrigger className="h-10 bg-background"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="alta">🔴 Alta</SelectItem>
                                        <SelectItem value="media">🟡 Média</SelectItem>
                                        <SelectItem value="baixa">⚪ Baixa</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <FormField label="Prazo" value={deadline} onChange={setDeadline} type="date" />
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                            <Button className="gap-1.5" onClick={handleStart} disabled={!sectorId || !assignedTo}><Play className="h-3.5 w-3.5" /> Iniciar</Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
