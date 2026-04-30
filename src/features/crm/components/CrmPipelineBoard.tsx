"use client";

import { useState, DragEvent } from "react";
import { Plus, GripVertical, User, Calendar, DollarSign, Trash2, Edit2 } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Card } from "@/shared/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Textarea } from "@/shared/ui/textarea";
import FormField from "@/shared/components/FormField";
import { useCrm } from "@/features/crm/contexts/CrmContext";
import { useTranslation } from "react-i18next";
import type { CrmLead } from "../types";
import { cn } from "@/shared/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const formatCurrency = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

type FormState = { name: string; contactName: string; value: string; priority: "alta" | "media" | "baixa"; date: string; notes: string; stageId: string };
const emptyForm: FormState = { name: "", contactName: "", value: "", priority: "media", date: "", notes: "", stageId: "novo_lead" };

export default function CrmPipelineBoard() {
    const { t } = useTranslation();
    const { leads, contacts, addLead, updateLead, deleteLead } = useCrm();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [form, setForm] = useState<FormState>(emptyForm);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [draggedId, setDraggedId] = useState<string | null>(null);
    const [dragOverStage, setDragOverStage] = useState<string | null>(null);

    const STAGES = [
        { id: "novo_lead", title: t("crm.pipeline.stages.novo_lead"), color: "bg-blue-500", gradient: "from-blue-500/20 to-blue-500/5", emoji: "🎯" },
        { id: "contato_feito", title: t("crm.pipeline.stages.contato_feito"), color: "bg-amber-500", gradient: "from-amber-500/20 to-amber-500/5", emoji: "📞" },
        { id: "proposta_enviada", title: t("crm.pipeline.stages.proposta_enviada"), color: "bg-violet-500", gradient: "from-violet-500/20 to-violet-500/5", emoji: "📋" },
        { id: "em_negociacao", title: t("crm.pipeline.stages.em_negociacao"), color: "bg-orange-500", gradient: "from-orange-500/20 to-orange-500/5", emoji: "🤝" },
        { id: "fechado_ganho", title: t("crm.pipeline.stages.fechado_ganho"), color: "bg-emerald-500", gradient: "from-emerald-500/20 to-emerald-500/5", emoji: "🏆" },
        { id: "perdido", title: t("crm.pipeline.stages.perdido"), color: "bg-red-400", gradient: "from-red-400/20 to-red-400/5", emoji: "❌" },
    ];

    const PRIORITY_CONFIG = {
        alta: { label: t("crm.pipeline.priorityLevels.high"), dot: "bg-red-500", text: "text-red-500" },
        media: { label: t("crm.pipeline.priorityLevels.medium"), dot: "bg-amber-500", text: "text-amber-500" },
        baixa: { label: t("crm.pipeline.priorityLevels.low"), dot: "bg-slate-400", text: "text-slate-400" },
    };

    const totalPipeline = leads.reduce((s, l) => s + l.value, 0);

    const openCreate = (stageId?: string) => {
        setForm({ ...emptyForm, stageId: stageId || "novo_lead" });
        setEditingId(null);
        setDialogOpen(true);
    };

    const openEdit = (lead: CrmLead) => {
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

    const handleDragStart = (e: DragEvent, id: string) => { e.dataTransfer.effectAllowed = "move"; setDraggedId(id); };
    const handleDragOver = (e: DragEvent, stageId: string) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDragOverStage(stageId); };
    const handleDrop = (e: DragEvent, stageId: string) => {
        e.preventDefault();
        if (draggedId) updateLead(draggedId, { stageId });
        setDraggedId(null); setDragOverStage(null);
    };
    const handleDragEnd = () => { setDraggedId(null); setDragOverStage(null); };

    return (
        <div className="space-y-4">
            {/* Header Actions */}
            <div className="flex items-center justify-between bg-card/50 border border-border/40 p-3 rounded-2xl">
                <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                    <p className="text-xs text-muted-foreground font-medium">{t("crm.pipeline.dragHint")}</p>
                </div>
                <Button onClick={() => openCreate()} className="gap-2 shadow-sm rounded-xl h-9">
                    <Plus className="h-4 w-4" /> {t("crm.pipeline.newLead")}
                </Button>
            </div>

            {/* Kanban Board */}
            <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar" style={{ minHeight: "calc(100vh - 400px)" }}>
                {STAGES.map((stage) => {
                    const stageLeads = leads.filter((l) => l.stageId === stage.id);
                    const stageTotal = stageLeads.reduce((s, l) => s + l.value, 0);
                    const isOver = dragOverStage === stage.id;
                    const progress = totalPipeline > 0 ? (stageTotal / totalPipeline) * 100 : 0;

                    return (
                        <div key={stage.id}
                            className={cn(
                                "min-w-[280px] flex-1 rounded-2xl border flex flex-col transition-all duration-300",
                                isOver ? "border-primary/40 bg-primary/[0.03] ring-2 ring-primary/15" : "border-border/40 bg-muted/20"
                            )}
                            onDragOver={(e) => handleDragOver(e, stage.id)}
                            onDragLeave={() => setDragOverStage(null)}
                            onDrop={(e) => handleDrop(e, stage.id)}
                        >
                            {/* Column Header */}
                            <div className={cn("p-4 rounded-t-2xl bg-gradient-to-b border-b border-border/40", stage.gradient)}>
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2.5">
                                        <span className="text-lg">{stage.emoji}</span>
                                        <div className="min-w-0">
                                            <h3 className="text-sm font-bold text-foreground truncate">{stage.title}</h3>
                                        </div>
                                        <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-extrabold bg-background/80 shadow-sm border-border/20">
                                            {stageLeads.length}
                                        </Badge>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-background/60" onClick={() => openCreate(stage.id)}>
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </div>
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-bold text-primary/80">{formatCurrency(stageTotal)}</span>
                                        <span className="text-[10px] font-medium text-muted-foreground">{progress.toFixed(0)}%</span>
                                    </div>
                                    <div className="h-1.5 rounded-full bg-background/40 overflow-hidden shadow-inner">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${Math.max(progress, 2)}%` }}
                                            className={cn("h-full rounded-full transition-all duration-700 ease-out", stage.color)}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Cards Container */}
                            <div className="p-3 space-y-3 flex-1 overflow-y-auto">
                                <AnimatePresence mode="popLayout">
                                    {stageLeads.map((lead) => (
                                        <motion.div
                                            key={lead.id}
                                            layout
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            draggable
                                            onDragStart={(e: any) => handleDragStart(e, lead.id)}
                                            onDragEnd={handleDragEnd}
                                        >
                                            <Card
                                                className={cn(
                                                    "cursor-grab active:cursor-grabbing border-border/40 bg-background hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group/card",
                                                    draggedId === lead.id && "opacity-40 scale-95 border-primary shadow-none"
                                                )}
                                            >
                                                <div className="p-4 space-y-3">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="flex items-center gap-2 min-w-0 flex-1">
                                                            <GripVertical className="h-3.5 w-3.5 text-muted-foreground/10 shrink-0 group-hover/card:text-muted-foreground/40 transition-colors" />
                                                            <p className="text-[14px] font-bold text-foreground truncate leading-tight tracking-tight">
                                                                {lead.name}
                                                            </p>
                                                        </div>
                                                        <div className="flex items-center gap-0 shrink-0 opacity-0 group-hover/card:opacity-100 transition-all">
                                                            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={() => openEdit(lead)}>
                                                                <Edit2 className="h-3.5 w-3.5" />
                                                            </Button>
                                                            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-muted-foreground hover:text-destructive" onClick={() => deleteLead(lead.id)}>
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2 bg-muted/30 p-2 rounded-xl">
                                                        <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 shrink-0 shadow-sm">
                                                            <User className="h-3 w-3 text-primary" />
                                                        </div>
                                                        <span className="text-[12px] font-medium text-muted-foreground truncate">{lead.contactName}</span>
                                                    </div>

                                                    <div className="flex items-center justify-between pt-1">
                                                        <span className="text-sm font-black text-primary">{formatCurrency(lead.value)}</span>
                                                        <div className="flex items-center gap-2 px-2 py-1 rounded-full bg-muted/50 border border-border/20">
                                                            <div className={cn("h-1.5 w-1.5 rounded-full", PRIORITY_CONFIG[lead.priority].dot)} />
                                                            <span className={cn("text-[10px] font-bold uppercase tracking-wider", PRIORITY_CONFIG[lead.priority].text)}>
                                                                {PRIORITY_CONFIG[lead.priority].label}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {lead.date && (
                                                        <div className="flex items-center gap-1.5 text-muted-foreground/60 mt-1">
                                                            <Calendar className="h-3 w-3" />
                                                            <span className="text-[11px] font-medium">
                                                                {new Date(lead.date + "T00:00:00").toLocaleDateString("pt-BR")}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </Card>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                                {stageLeads.length === 0 && (
                                    <div className="flex flex-col items-center justify-center py-12 text-center opacity-40">
                                        <div className="h-12 w-12 rounded-2xl bg-muted/50 flex items-center justify-center mb-3 border-2 border-dashed border-border/50">
                                            <Plus className="h-5 w-5 text-muted-foreground/30" />
                                        </div>
                                        <p className="text-[12px] font-medium text-muted-foreground/60">{t("crm.pipeline.emptyStage")}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-md rounded-[28px] border-none shadow-2xl p-0 overflow-hidden">
                    <div className="bg-gradient-to-br from-primary to-primary/80 p-6 text-white">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-white">
                                {editingId ? <Edit2 className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                                {editingId ? t("crm.pipeline.editLead") : t("crm.pipeline.newLead")}
                            </DialogTitle>
                        </DialogHeader>
                    </div>
                    <form onSubmit={handleSubmit} className="p-6 space-y-5 bg-background">
                        <FormField
                            label={t("crm.pipeline.leadName")}
                            value={form.name}
                            onChange={(v) => setForm((p) => ({ ...p, name: v }))}
                            placeholder={t("crm.pipeline.placeholderName")}
                            required
                        />
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">{t("crm.pipeline.contact")}</label>
                            <div className="relative">
                                <input
                                    list="contact-suggestions"
                                    value={form.contactName}
                                    onChange={(e) => setForm((p) => ({ ...p, contactName: e.target.value }))}
                                    placeholder={t("crm.pipeline.placeholderContact")}
                                    required
                                    className="flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary transition-all shadow-sm"
                                />
                                <datalist id="contact-suggestions">
                                    {contacts.map((c) => <option key={c.id} value={c.name} />)}
                                </datalist>
                            </div>
                            <p className="text-[10px] text-muted-foreground/60 flex items-center gap-1">
                                <span className="inline-block h-1 w-1 rounded-full bg-primary" /> {t("crm.pipeline.contactHint")}
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <FormField label={t("crm.pipeline.value")} value={form.value} onChange={(v) => setForm((p) => ({ ...p, value: v }))} placeholder="0" type="number" />
                            <FormField label={t("crm.pipeline.date")} value={form.date} onChange={(v) => setForm((p) => ({ ...p, date: v }))} type="date" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">{t("crm.pipeline.priority")}</label>
                                <Select value={form.priority} onValueChange={(v: "alta" | "media" | "baixa") => setForm((p) => ({ ...p, priority: v }))}>
                                    <SelectTrigger className="h-11 bg-background rounded-xl border-border/60 shadow-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl shadow-xl border-border/40">
                                        <SelectItem value="alta">🔴 {t("crm.pipeline.priorityLevels.high")}</SelectItem>
                                        <SelectItem value="media">🟡 {t("crm.pipeline.priorityLevels.medium")}</SelectItem>
                                        <SelectItem value="baixa">⚪ {t("crm.pipeline.priorityLevels.low")}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">{t("crm.pipeline.stage")}</label>
                                <Select value={form.stageId} onValueChange={(v) => setForm((p) => ({ ...p, stageId: v }))}>
                                    <SelectTrigger className="h-11 bg-background rounded-xl border-border/60 shadow-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl shadow-xl border-border/40">
                                        {STAGES.map((s) => <SelectItem key={s.id} value={s.id}>{s.emoji} {s.title}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">{t("crm.pipeline.notes")}</label>
                            <Textarea
                                value={form.notes}
                                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                                rows={3}
                                placeholder={t("crm.pipeline.placeholderNotes")}
                                className="bg-background rounded-xl border-border/60 shadow-sm focus-visible:ring-primary/20 transition-all"
                            />
                        </div>
                        <div className="flex justify-end gap-3 pt-3">
                            <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)} className="rounded-xl">
                                {t("common.cancel")}
                            </Button>
                            <Button type="submit" className="gap-2 rounded-xl shadow-lg shadow-primary/20 h-11 px-6">
                                {editingId ? t("crm.pipeline.saveLead") : t("crm.pipeline.createLead")}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
