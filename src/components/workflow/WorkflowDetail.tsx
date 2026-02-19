import { useState } from "react";
import { CheckCircle2, Circle, Plus, MessageSquare, Calendar, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import FormField from "@/components/shared/FormField";
import { useWorkflow, WorkflowInstance } from "@/contexts/WorkflowContext";

const PRIORITY_CONFIG = {
    alta: { label: "Alta", className: "bg-red-50 text-red-600 border-red-200" },
    media: { label: "Média", className: "bg-amber-50 text-amber-600 border-amber-200" },
    baixa: { label: "Baixa", className: "bg-slate-100 text-slate-500 border-slate-200" },
};

const STATUS_CONFIG = {
    pendente: { label: "Pendente", className: "bg-slate-100 text-slate-600 border-slate-200" },
    em_andamento: { label: "Em andamento", className: "bg-blue-50 text-blue-600 border-blue-200" },
    concluido: { label: "Concluído", className: "bg-emerald-50 text-emerald-600 border-emerald-200" },
    atrasado: { label: "Atrasado", className: "bg-red-50 text-red-600 border-red-200" },
};

interface Props {
    instance: WorkflowInstance | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function WorkflowDetail({ instance, open, onOpenChange }: Props) {
    const { completeStep, uncompleteStep, updateStepNotes, addCustomStep, getSector } = useWorkflow();
    const [addStepOpen, setAddStepOpen] = useState(false);
    const [newStepTitle, setNewStepTitle] = useState("");
    const [newStepDesc, setNewStepDesc] = useState("");
    const [expandedStep, setExpandedStep] = useState<string | null>(null);

    if (!instance) return null;

    const completed = instance.steps.filter((s) => s.completed).length;
    const total = instance.steps.length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
    const sector = getSector(instance.sectorId);

    const handleAddStep = () => {
        if (!newStepTitle) return;
        addCustomStep(instance.id, newStepTitle, newStepDesc);
        setNewStepTitle(""); setNewStepDesc(""); setAddStepOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-base">
                        <span className="text-lg">{instance.templateEmoji}</span>
                        {instance.templateName}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 pt-1">
                    {/* Info Bar */}
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className={STATUS_CONFIG[instance.status].className}>{STATUS_CONFIG[instance.status].label}</Badge>
                        <Badge variant="outline" className={PRIORITY_CONFIG[instance.priority].className}>{PRIORITY_CONFIG[instance.priority].label}</Badge>
                        {sector && <Badge variant="outline" className="text-[10px]">{sector.emoji} {sector.name}</Badge>}
                        <span className="text-xs text-muted-foreground ml-auto">👤 {instance.assignedToName}</span>
                    </div>

                    {/* Progress */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                            <span className="font-medium text-foreground">{completed}/{total} etapas concluídas</span>
                            <span className={`font-bold ${progress === 100 ? "text-emerald-600" : "text-primary"}`}>{progress}%</span>
                        </div>
                        <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-500 ease-out ${progress === 100 ? "bg-emerald-500" : "bg-primary"}`} style={{ width: `${progress}%` }} />
                        </div>
                    </div>

                    {/* Steps */}
                    <div className="space-y-1.5">
                        {instance.steps.map((step, idx) => (
                            <Card key={step.id} className={`border-border/40 transition-all duration-200 ${step.completed ? "opacity-70" : ""}`}>
                                <div className="p-3">
                                    <div className="flex items-start gap-3">
                                        <button
                                            onClick={() => step.completed ? uncompleteStep(instance.id, step.id) : completeStep(instance.id, step.id)}
                                            className="mt-0.5 shrink-0 transition-transform hover:scale-110"
                                        >
                                            {step.completed
                                                ? <CheckCircle2 className="h-5 w-5 text-emerald-500 fill-emerald-500/20" />
                                                : <Circle className="h-5 w-5 text-muted-foreground/30 hover:text-primary/50" />
                                            }
                                        </button>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2">
                                                <p className={`text-sm font-medium leading-tight ${step.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
                                                    <span className="text-muted-foreground/40 mr-1.5 text-xs">{idx + 1}.</span>
                                                    {step.title}
                                                </p>
                                                <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => setExpandedStep(expandedStep === step.id ? null : step.id)}>
                                                    {expandedStep === step.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                                </Button>
                                            </div>
                                            <p className="text-[11px] text-muted-foreground/60 mt-0.5 leading-relaxed">{step.description}</p>
                                        </div>
                                    </div>

                                    {expandedStep === step.id && (
                                        <div className="mt-3 ml-8 space-y-2">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1"><MessageSquare className="h-3 w-3" /> Notas</label>
                                                <Textarea
                                                    value={step.notes}
                                                    onChange={(e) => updateStepNotes(instance.id, step.id, e.target.value)}
                                                    rows={2}
                                                    placeholder="Adicionar notas..."
                                                    className="bg-muted/30 text-xs"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </Card>
                        ))}
                    </div>

                    {/* Add Custom Step */}
                    {addStepOpen ? (
                        <Card className="border-dashed border-primary/30 bg-primary/[0.02]">
                            <div className="p-3 space-y-3">
                                <FormField label="Título da Etapa" value={newStepTitle} onChange={setNewStepTitle} placeholder="Ex: Enviar relatório" required />
                                <div className="space-y-1">
                                    <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Descrição</label>
                                    <Textarea value={newStepDesc} onChange={(e) => setNewStepDesc(e.target.value)} rows={2} placeholder="Descrição..." className="bg-background text-xs" />
                                </div>
                                <div className="flex justify-end gap-2">
                                    <Button variant="ghost" size="sm" onClick={() => { setAddStepOpen(false); setNewStepTitle(""); setNewStepDesc(""); }}>Cancelar</Button>
                                    <Button size="sm" className="gap-1" onClick={handleAddStep}><Plus className="h-3 w-3" /> Adicionar</Button>
                                </div>
                            </div>
                        </Card>
                    ) : (
                        <Button variant="outline" className="w-full gap-1.5 border-dashed text-muted-foreground hover:text-foreground" onClick={() => setAddStepOpen(true)}>
                            <Plus className="h-3.5 w-3.5" /> Adicionar etapa personalizada
                        </Button>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-2 border-t border-border/30 text-xs text-muted-foreground">
                        <span>Criado em {new Date(instance.createdAt).toLocaleDateString("pt-BR")}</span>
                        {instance.deadline && (
                            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Prazo: {new Date(instance.deadline + "T00:00:00").toLocaleDateString("pt-BR")}</span>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
