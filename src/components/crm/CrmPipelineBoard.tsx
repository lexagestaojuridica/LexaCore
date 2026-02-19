import { useState, DragEvent } from "react";
import { Plus, GripVertical, User, Calendar, DollarSign, Trash2, Edit2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import FormField from "@/components/shared/FormField";
import { useCrm } from "@/contexts/CrmContext";

// ── Stages ─────────────────────────────────────────────
const STAGES = [
    { id: "novo_lead", title: "Novo Lead", color: "bg-blue-500", gradient: "from-blue-500/20 to-blue-500/5", emoji: "🎯" },
    { id: "contato_feito", title: "Contato Feito", color: "bg-amber-500", gradient: "from-amber-500/20 to-amber-500/5", emoji: "📞" },
    { id: "proposta_enviada", title: "Proposta Enviada", color: "bg-violet-500", gradient: "from-violet-500/20 to-violet-500/5", emoji: "📋" },
    { id: "em_negociacao", title: "Em Negociação", color: "bg-orange-500", gradient: "from-orange-500/20 to-orange-500/5", emoji: "🤝" },
    { id: "fechado_ganho", title: "Fechado / Ganho", color: "bg-emerald-500", gradient: "from-emerald-500/20 to-emerald-500/5", emoji: "🏆" },
    { id: "perdido", title: "Perdido", color: "bg-red-400", gradient: "from-red-400/20 to-red-400/5", emoji: "❌" },
];

const PRIORITY_CONFIG = {
    alta: { label: "Alta", dot: "bg-red-500" },
    media: { label: "Média", dot: "bg-amber-500" },
    baixa: { label: "Baixa", dot: "bg-slate-400" },
};

const formatCurrency = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

type FormState = { name: string; contactName: string; value: string; priority: "alta" | "media" | "baixa"; date: string; notes: string; stageId: string };
const emptyForm: FormState = { name: "", contactName: "", value: "", priority: "media", date: "", notes: "", stageId: "novo_lead" };

export default function CrmPipelineBoard() {
    const { leads, contacts, addLead, updateLead, deleteLead } = useCrm();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [form, setForm] = useState<FormState>(emptyForm);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [draggedId, setDraggedId] = useState<string | null>(null);
    const [dragOverStage, setDragOverStage] = useState<string | null>(null);

    const openCreate = (stageId?: string) => {
        setForm({ ...emptyForm, stageId: stageId || "novo_lead" });
        setEditingId(null);
        setDialogOpen(true);
    };

    const openEdit = (lead: typeof leads[0]) => {
        setForm({ name: lead.name, contactName: lead.contactName, value: String(lead.value), priority: lead.priority, date: lead.date, notes: lead.notes, stageId: lead.stageId });
        setEditingId(lead.id);
        setDialogOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name || !form.contactName) return;
        if (editingId) {
            updateLead(editingId, { name: form.name, contactName: form.contactName, value: Number(form.value) || 0, priority: form.priority, date: form.date, notes: form.notes, stageId: form.stageId });
        } else {
            addLead({ name: form.name, contactName: form.contactName, value: Number(form.value) || 0, priority: form.priority, date: form.date, notes: form.notes, stageId: form.stageId });
        }
        setDialogOpen(false);
        setForm(emptyForm);
        setEditingId(null);
    };

    // Drag & Drop
    const handleDragStart = (e: DragEvent, id: string) => { e.dataTransfer.effectAllowed = "move"; setDraggedId(id); };
    const handleDragOver = (e: DragEvent, stageId: string) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDragOverStage(stageId); };
    const handleDrop = (e: DragEvent, stageId: string) => {
        e.preventDefault();
        if (draggedId) updateLead(draggedId, { stageId });
        setDraggedId(null); setDragOverStage(null);
    };
    const handleDragEnd = () => { setDraggedId(null); setDragOverStage(null); };

    const totalPipeline = leads.reduce((s, l) => s + l.value, 0);
    const wonValue = leads.filter((l) => l.stageId === "fechado_ganho").reduce((s, l) => s + l.value, 0);

    return (
        <div className="space-y-5">
            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                    { label: "Total Pipeline", value: formatCurrency(totalPipeline), icon: DollarSign, color: "text-primary", bg: "bg-primary/8", accent: "bg-primary" },
                    { label: "Leads Ativos", value: leads.length, icon: User, color: "text-foreground", bg: "bg-muted", accent: "bg-foreground/20" },
                    { label: "Ganhos", value: formatCurrency(wonValue), icon: Sparkles, color: "text-emerald-600", bg: "bg-emerald-50", accent: "bg-emerald-500" },
                    { label: "Contatos", value: contacts.length, icon: User, color: "text-foreground", bg: "bg-muted", accent: "bg-foreground/20" },
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

            {/* Actions */}
            <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Arraste cards entre as colunas para atualizar o status</p>
                <Button onClick={() => openCreate()} className="gap-2 shadow-sm"><Plus className="h-4 w-4" /> Novo Lead</Button>
            </div>

            {/* Kanban */}
            <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: 480 }}>
                {STAGES.map((stage) => {
                    const stageLeads = leads.filter((l) => l.stageId === stage.id);
                    const stageTotal = stageLeads.reduce((s, l) => s + l.value, 0);
                    const isOver = dragOverStage === stage.id;
                    const progress = totalPipeline > 0 ? (stageTotal / totalPipeline) * 100 : 0;

                    return (
                        <div key={stage.id}
                            className={`min-w-[220px] flex-1 rounded-xl border flex flex-col transition-all duration-300 ${isOver ? "border-primary/40 bg-primary/[0.03] ring-2 ring-primary/15 scale-[1.01]" : "border-border/50 bg-card/50"}`}
                            onDragOver={(e) => handleDragOver(e, stage.id)} onDragLeave={() => setDragOverStage(null)} onDrop={(e) => handleDrop(e, stage.id)}
                        >
                            <div className={`p-3 rounded-t-xl bg-gradient-to-b ${stage.gradient}`}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm">{stage.emoji}</span>
                                        <span className="text-[13px] font-semibold text-foreground">{stage.title}</span>
                                        <Badge variant="outline" className="h-5 min-w-[20px] justify-center text-[10px] font-bold px-1.5 bg-background/80">{stageLeads.length}</Badge>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md hover:bg-background/60" onClick={() => openCreate(stage.id)}><Plus className="h-3 w-3" /></Button>
                                </div>
                                <div className="mt-2 space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-medium text-muted-foreground">{formatCurrency(stageTotal)}</span>
                                        <span className="text-[9px] text-muted-foreground/60">{progress.toFixed(0)}%</span>
                                    </div>
                                    <div className="h-1 rounded-full bg-border/40 overflow-hidden">
                                        <div className={`h-full rounded-full ${stage.color} transition-all duration-500 ease-out`} style={{ width: `${Math.max(progress, 2)}%` }} />
                                    </div>
                                </div>
                            </div>

                            <div className="p-2 space-y-2 flex-1 min-h-[80px]">
                                {stageLeads.map((lead) => (
                                    <Card key={lead.id} draggable onDragStart={(e) => handleDragStart(e, lead.id)} onDragEnd={handleDragEnd}
                                        className={`cursor-grab active:cursor-grabbing border-border/40 bg-card hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 group/card ${draggedId === lead.id ? "opacity-30 scale-95 rotate-1" : ""}`}
                                    >
                                        <div className="p-3 space-y-2">
                                            <div className="flex items-start justify-between gap-1.5">
                                                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                                    <GripVertical className="h-3 w-3 text-muted-foreground/20 shrink-0 group-hover/card:text-muted-foreground/50 transition-colors" />
                                                    <p className="text-[13px] font-medium text-foreground truncate leading-tight">{lead.name}</p>
                                                </div>
                                                <div className="flex items-center gap-0 shrink-0 opacity-0 group-hover/card:opacity-100 transition-all">
                                                    <Button variant="ghost" size="icon" className="h-6 w-6 rounded" onClick={() => openEdit(lead)}><Edit2 className="h-2.5 w-2.5" /></Button>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6 rounded text-muted-foreground hover:text-destructive" onClick={() => deleteLead(lead.id)}><Trash2 className="h-2.5 w-2.5" /></Button>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/8 shrink-0"><User className="h-2.5 w-2.5 text-primary/70" /></div>
                                                <span className="text-[11px] text-muted-foreground truncate">{lead.contactName}</span>
                                            </div>
                                            <div className="flex items-center justify-between pt-0.5">
                                                <span className="text-xs font-bold text-primary">{formatCurrency(lead.value)}</span>
                                                <div className="flex items-center gap-1">
                                                    <div className={`h-1.5 w-1.5 rounded-full ${PRIORITY_CONFIG[lead.priority].dot}`} />
                                                    <span className={`text-[10px] font-medium ${lead.priority === "alta" ? "text-red-500" : lead.priority === "media" ? "text-amber-500" : "text-slate-400"}`}>{PRIORITY_CONFIG[lead.priority].label}</span>
                                                </div>
                                            </div>
                                            {lead.date && (
                                                <div className="flex items-center gap-1 text-muted-foreground/50">
                                                    <Calendar className="h-2.5 w-2.5" />
                                                    <span className="text-[10px]">{new Date(lead.date + "T00:00:00").toLocaleDateString("pt-BR")}</span>
                                                </div>
                                            )}
                                        </div>
                                    </Card>
                                ))}
                                {stageLeads.length === 0 && (
                                    <div className="flex flex-col items-center justify-center py-10 text-center">
                                        <div className="h-10 w-10 rounded-xl bg-muted/50 flex items-center justify-center mb-2"><Plus className="h-4 w-4 text-muted-foreground/30" /></div>
                                        <p className="text-[11px] text-muted-foreground/40">Arraste leads aqui</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader><DialogTitle className="flex items-center gap-2">{editingId ? <Edit2 className="h-4 w-4" /> : <Plus className="h-4 w-4" />} {editingId ? "Editar Lead" : "Novo Lead"}</DialogTitle></DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                        <FormField label="Nome do Lead" value={form.name} onChange={(v) => setForm((p) => ({ ...p, name: v }))} placeholder="Ex: Contrato Empresarial" required />
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Contato</label>
                            <div className="relative">
                                <input
                                    list="contact-suggestions"
                                    value={form.contactName}
                                    onChange={(e) => setForm((p) => ({ ...p, contactName: e.target.value }))}
                                    placeholder="Nome do contato (novo ou existente)"
                                    required
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                />
                                <datalist id="contact-suggestions">
                                    {contacts.map((c) => <option key={c.id} value={c.name} />)}
                                </datalist>
                            </div>
                            <p className="text-[10px] text-muted-foreground/60">💡 Se o contato não existir, será criado automaticamente</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <FormField label="Valor (R$)" value={form.value} onChange={(v) => setForm((p) => ({ ...p, value: v }))} placeholder="0" type="number" />
                            <FormField label="Data Prevista" value={form.date} onChange={(v) => setForm((p) => ({ ...p, date: v }))} type="date" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Prioridade</label>
                                <Select value={form.priority} onValueChange={(v: any) => setForm((p) => ({ ...p, priority: v }))}><SelectTrigger className="h-10 bg-background"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="alta">🔴 Alta</SelectItem><SelectItem value="media">🟡 Média</SelectItem><SelectItem value="baixa">⚪ Baixa</SelectItem></SelectContent></Select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Etapa</label>
                                <Select value={form.stageId} onValueChange={(v) => setForm((p) => ({ ...p, stageId: v }))}><SelectTrigger className="h-10 bg-background"><SelectValue /></SelectTrigger><SelectContent>{STAGES.map((s) => <SelectItem key={s.id} value={s.id}>{s.emoji} {s.title}</SelectItem>)}</SelectContent></Select>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Observações</label>
                            <Textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} rows={3} placeholder="Notas..." className="bg-background" />
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                            <Button type="submit" className="gap-1.5">{editingId ? "Salvar" : <><Plus className="h-3.5 w-3.5" /> Criar Lead</>}</Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
