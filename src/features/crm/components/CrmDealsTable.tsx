"use client";

import { useState } from "react";
import { useDebounce } from "@/shared/hooks/useDebounce";
import { Plus, Search, Edit2, Trash2, Eye, TrendingUp, DollarSign, Target, ArrowUpRight, Briefcase, Zap } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Card, CardContent } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/shared/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Textarea } from "@/shared/ui/textarea";
import FormField from "@/shared/components/FormField";
import { Separator } from "@/shared/ui/separator";
import { useCrm } from "@/features/crm/contexts/CrmContext";
import { CrmDeal } from "@/features/crm/types";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { db as supabase } from "@/integrations/supabase/db";
import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { cn } from "@/shared/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const DEAL_STAGES = [
    { name: "Qualificação", emoji: "🔍" }, { name: "Proposta", emoji: "📋" }, { name: "Negociação", emoji: "🤝" },
    { name: "Contrato", emoji: "📝" }, { name: "Fechado/Ganho", emoji: "🏆" }, { name: "Perdido", emoji: "❌" },
];

const STAGE_COLORS: Record<string, string> = {
    "Qualificação": "border-t-blue-500 bg-blue-50/30", "Proposta": "border-t-violet-500 bg-violet-50/30",
    "Negociação": "border-t-amber-500 bg-amber-50/30", "Contrato": "border-t-orange-500 bg-orange-50/30",
    "Fechado/Ganho": "border-t-emerald-500 bg-emerald-50/30", "Perdido": "border-t-red-500 bg-red-50/30",
};

const formatCurrency = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
const probColor = (p: number) => p >= 70 ? "text-emerald-700 bg-emerald-100/50" : p >= 30 ? "text-amber-600 bg-amber-100/50" : "text-red-600 bg-red-100/50";
const probBarColor = (p: number) => p >= 70 ? "bg-emerald-500" : p >= 30 ? "bg-amber-500" : "bg-red-400";

type FormState = { name: string; contactName: string; value: string; probability: string; stage: string; dueDate: string; notes: string };
const emptyForm: FormState = { name: "", contactName: "", value: "", probability: "50", stage: "Qualificação", dueDate: "", notes: "" };

export default function CrmDealsTable() {
    const { t } = useTranslation();
    const { deals, contacts, addDeal, updateDeal, deleteDeal: deleteDealCtx } = useCrm();
    const { user } = useUser();
    const queryClient = useQueryClient();

    const [search, setSearch] = useState("");
    const debouncedSearch = useDebounce(search, 400);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [viewDialogOpen, setViewDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [winDialogOpen, setWinDialogOpen] = useState<CrmDeal | null>(null);
    const [form, setForm] = useState<FormState>(emptyForm);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [selectedDeal, setSelectedDeal] = useState<CrmDeal | null>(null);

    const { data: profile } = useQuery({
        queryKey: ["profile", user?.id],
        queryFn: async () => {
            if (!user?.id) return null;
            const { data, error } = await supabase.from("profiles").select("organization_id").eq("user_id", user.id).single();
            if (error) throw error;
            return data;
        },
        enabled: !!user?.id,
    });

    const orgId = profile?.organization_id;

    const convertMutation = useMutation({
        mutationFn: async (deal: CrmDeal) => {
            if (!orgId || !user?.id) throw new Error("Org ID or User ID not found");
            const { data: client, error: clientErr } = await supabase.from("clientes").insert({
                name: deal.contactName,
                organization_id: orgId,
                status: "ativo",
                type: "pf"
            }).select().single();
            if (clientErr) throw clientErr;
            const { error: processErr } = await supabase.from("processos_juridicos").insert({
                organization_id: orgId,
                title: `Contrato: ${deal.name}`,
                client_id: client.id,
                status: "ativo",
                estimated_value: deal.value,
                notes: `Origem: CRM.\nContato original: ${deal.contactName}\nObs: ${deal.notes || ''}`,
                responsible_user_id: user.id
            });
            if (processErr) throw processErr;
        },
        onSuccess: () => {
            toast.success("Cliente e Processo gerados com sucesso!");
            setWinDialogOpen(null);
            queryClient.invalidateQueries({ queryKey: ["processos"] });
            queryClient.invalidateQueries({ queryKey: ["clientes"] });
        },
        onError: (err: Error) => toast.error(`Erro: ${err.message}`)
    });

    const filtered = deals.filter((d) => {
        const q = debouncedSearch.toLowerCase();
        return !q || d.name.toLowerCase().includes(q) || d.contactName.toLowerCase().includes(q);
    });

    const openCreate = () => { setForm(emptyForm); setEditingId(null); setDialogOpen(true); };
    const openEdit = (deal: CrmDeal) => {
        setForm({ name: deal.name, contactName: deal.contactName, value: String(deal.value), probability: String(deal.probability), stage: deal.stage, dueDate: deal.dueDate, notes: deal.notes || "" });
        setEditingId(deal.id); setDialogOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name || !form.contactName) return;
        if (editingId) {
            updateDeal(editingId, { name: form.name, contactName: form.contactName, value: Number(form.value) || 0, probability: Number(form.probability) || 50, stage: form.stage, dueDate: form.dueDate, notes: form.notes });
        } else {
            addDeal({ name: form.name, contactName: form.contactName, value: Number(form.value) || 0, probability: Number(form.probability) || 50, stage: form.stage, dueDate: form.dueDate, notes: form.notes });
        }
        setDialogOpen(false); setForm(emptyForm); setEditingId(null);
    };

    const handleDelete = () => { if (selectedDeal) { deleteDealCtx(selectedDeal.id); setDeleteDialogOpen(false); setSelectedDeal(null); } };

    const onDragEnd = (result: any) => {
        if (!result.destination) return;
        const { source, destination, draggableId } = result;
        if (source.droppableId !== destination.droppableId) {
            const destStage = destination.droppableId;
            updateDeal(draggableId, { stage: destStage });
            if (destStage === "Fechado/Ganho") {
                const deal = deals.find(d => d.id === draggableId);
                if (deal) setWinDialogOpen(deal);
            }
        }
    };

    return (
        <div className="space-y-6">
            {/* Header and Add Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-card/50 border border-border/40 shadow-sm">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input placeholder="Buscar negócio..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-background h-11 rounded-xl border-border/60" />
                </div>
                <Button className="gap-2 shadow-lg shadow-primary/10 h-11 px-6 rounded-xl" onClick={openCreate}>
                    <Plus className="h-4 w-4" /> {t("common.new")} {t("crm.tabs.deals")}
                </Button>
            </div>

            {/* KANBAN BOARD */}
            <DragDropContext onDragEnd={onDragEnd}>
                <div className="flex gap-4 overflow-x-auto pb-4 h-[65vh] snap-x pt-2 px-1 custom-scrollbar">
                    {DEAL_STAGES.map((stage) => {
                        const columnDeals = filtered.filter(d => d.stage === stage.name);
                        const colTotal = columnDeals.reduce((s, d) => s + d.value, 0);

                        return (
                            <Droppable key={stage.name} droppableId={stage.name}>
                                {(provided, snapshot) => (
                                    <div
                                        ref={provided.innerRef}
                                        {...provided.droppableProps}
                                        className={cn(
                                            "flex flex-col flex-shrink-0 w-80 rounded-2xl border border-border/40 shadow-sm transition-all bg-muted/20",
                                            STAGE_COLORS[stage.name] || "border-t-muted bg-muted/20",
                                            "border-t-4",
                                            snapshot.isDraggingOver && "bg-muted/40 border-dashed ring-2 ring-primary/20"
                                        )}
                                    >
                                        <div className="px-4 py-3 bg-card/60 rounded-t-lg backdrop-blur flex items-center justify-between border-b border-border/40">
                                            <div className="flex items-center gap-2">
                                                <span className="text-base">{stage.emoji}</span>
                                                <h3 className="text-sm font-bold tracking-tight text-foreground/80">{stage.name}</h3>
                                            </div>
                                            <Badge variant="secondary" className="text-[10px] font-black h-5 px-1.5 bg-background shadow-sm border-border/20">{columnDeals.length}</Badge>
                                        </div>
                                        {colTotal > 0 && (
                                            <div className="px-4 py-2 bg-background/40 text-[9px] uppercase font-black text-muted-foreground flex justify-between border-b border-border/40 tracking-widest">
                                                <span>Total</span>
                                                <span className="text-primary">{formatCurrency(colTotal)}</span>
                                            </div>
                                        )}
                                        <div className="flex-1 p-3 overflow-y-auto space-y-3 custom-scrollbar min-h-[150px]">
                                            <AnimatePresence>
                                                {columnDeals.map((deal, index) => (
                                                    <Draggable key={deal.id} draggableId={deal.id} index={index}>
                                                        {(dragProvided, dragSnapshot) => (
                                                            <motion.div
                                                                ref={dragProvided.innerRef}
                                                                {...dragProvided.draggableProps}
                                                                {...dragProvided.dragHandleProps}
                                                                initial={{ opacity: 0, scale: 0.95 }}
                                                                animate={{ opacity: 1, scale: 1 }}
                                                                className={cn(
                                                                    "group relative flex flex-col rounded-xl border border-border/40 bg-background p-4 shadow-sm transition-all hover:border-primary/40 hover:shadow-md",
                                                                    dragSnapshot.isDragging && "shadow-2xl rotate-2 scale-105 z-50 border-primary ring-4 ring-primary/10"
                                                                )}
                                                            >
                                                                <div className="flex justify-between items-start mb-3">
                                                                    <h4 className="text-sm font-bold text-foreground leading-tight line-clamp-2 pr-6 tracking-tight">{deal.name}</h4>
                                                                    <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                        <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md bg-muted/40" onClick={() => openEdit(deal)}>
                                                                            <Edit2 className="h-3 w-3" />
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-2 mb-4 bg-muted/30 p-2 rounded-xl border border-border/20">
                                                                    <div className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center text-[10px] font-black text-primary shrink-0 shadow-inner">{deal.contactName.charAt(0)}</div>
                                                                    <span className="text-[12px] font-medium text-muted-foreground truncate tracking-tight">{deal.contactName}</span>
                                                                </div>
                                                                <div className="flex items-end justify-between mt-auto pt-3 border-t border-border/40">
                                                                    <div>
                                                                        <p className="text-[9px] text-muted-foreground font-black uppercase mb-1 tracking-widest opacity-60">Valor</p>
                                                                        <span className="font-black text-sm text-primary">{formatCurrency(deal.value)}</span>
                                                                    </div>
                                                                    <Badge variant="outline" className={cn("text-[10px] px-2 h-5 border-none font-black rounded-full", probColor(deal.probability))}>{deal.probability}%</Badge>
                                                                </div>

                                                                {/* Context actions floating */}
                                                                <div className="absolute -bottom-2 right-2 flex gap-1 bg-background border border-border/40 rounded-full shadow-lg p-1 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                                                                    <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={() => { setSelectedDeal(deal); setViewDialogOpen(true); }}>
                                                                        <Eye className="h-3.5 w-3.5" />
                                                                    </Button>
                                                                    <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full text-destructive hover:bg-destructive/10" onClick={() => { setSelectedDeal(deal); setDeleteDialogOpen(true); }}>
                                                                        <Trash2 className="h-3.5 w-3.5" />
                                                                    </Button>
                                                                </div>
                                                            </motion.div>
                                                        )}
                                                    </Draggable>
                                                ))}
                                            </AnimatePresence>
                                            {provided.placeholder}
                                        </div>
                                    </div>
                                )}
                            </Droppable>
                        );
                    })}
                </div>
            </DragDropContext>

            {/* Dialogs - Professional Styling */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-md rounded-[32px] border-none shadow-2xl p-0 overflow-hidden">
                    <div className="bg-gradient-to-br from-violet-600 to-indigo-600 p-7 text-white">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-3 text-white">
                                {editingId ? <Edit2 className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                                {editingId ? "Editar Negócio" : "Novo Negócio"}
                            </DialogTitle>
                        </DialogHeader>
                    </div>
                    <form onSubmit={handleSubmit} className="p-7 space-y-5 bg-background">
                        <FormField label="Nome do Negócio" value={form.name} onChange={(v) => setForm((p) => ({ ...p, name: v }))} placeholder="Ex: Consultoria Tributária" required />
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Contato</label>
                            <input list="deal-contact-suggestions" value={form.contactName} onChange={(e) => setForm((p) => ({ ...p, contactName: e.target.value }))} placeholder="Nome do contato (novo ou existente)" required className="flex h-11 w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all shadow-sm" />
                            <datalist id="deal-contact-suggestions">{contacts.map((c) => <option key={c.id} value={c.name} />)}</datalist>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <FormField label="Valor (R$)" value={form.value} onChange={(v) => setForm((p) => ({ ...p, value: v }))} placeholder="0" type="number" />
                            <FormField label="Probabilidade (%)" value={form.probability} onChange={(v) => setForm((p) => ({ ...p, probability: v }))} placeholder="50" type="number" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Etapa</label>
                                <Select value={form.stage} onValueChange={(v) => setForm((p) => ({ ...p, stage: v }))}>
                                    <SelectTrigger className="h-11 bg-background rounded-xl border-border/60 shadow-sm"><SelectValue /></SelectTrigger>
                                    <SelectContent className="rounded-xl border-border/40 shadow-xl">{DEAL_STAGES.map((s) => <SelectItem key={s.name} value={s.name}>{s.emoji} {s.name}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <FormField label="Previsão" value={form.dueDate} onChange={(v) => setForm((p) => ({ ...p, dueDate: v }))} type="date" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Observações</label>
                            <Textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} rows={3} placeholder="Notas..." className="bg-background rounded-xl border-border/60 shadow-sm" />
                        </div>
                        <div className="flex justify-end gap-3 pt-3">
                            <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)} className="rounded-xl">{t("common.cancel")}</Button>
                            <Button type="submit" className="gap-2 rounded-xl bg-violet-600 hover:bg-violet-700 shadow-lg shadow-violet-200 h-11 px-8 font-bold">{editingId ? t("common.save") : t("common.create")}</Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Smart Prompt: Won Deal */}
            <Dialog open={!!winDialogOpen} onOpenChange={(o) => !o && setWinDialogOpen(null)}>
                <DialogContent className="max-w-md rounded-[32px] border-emerald-500/20 shadow-2xl p-0 overflow-hidden">
                    <div className="bg-gradient-to-br from-emerald-600 to-teal-600 p-8 text-white text-center">
                        <div className="h-20 w-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-md ring-4 ring-white/10">
                            <Zap className="h-10 w-10 text-white fill-white animate-pulse" />
                        </div>
                        <h2 className="text-2xl font-black tracking-tight">Negócio Fechado!</h2>
                        <p className="text-white/80 text-sm mt-1">Parabéns pelo fechamento de {winDialogOpen?.name}</p>
                    </div>
                    <div className="p-8 space-y-6 bg-background">
                        <p className="text-sm text-muted-foreground leading-relaxed text-pretty text-center">
                            Deseja automatizar o próximo passo e converter <strong>{winDialogOpen?.contactName}</strong>
                            em Cliente ativo e já abrir a ficha de <strong>Processo / Caso Jurídico</strong>?
                        </p>
                        <div className="flex flex-col gap-2">
                            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 h-12 rounded-xl font-bold shadow-lg shadow-emerald-200" onClick={() => winDialogOpen && convertMutation.mutate(winDialogOpen)} disabled={convertMutation.isPending}>
                                <Briefcase className="h-4 w-4" /> Importar para Processos
                            </Button>
                            <Button variant="ghost" onClick={() => setWinDialogOpen(null)} className="h-10 rounded-xl text-muted-foreground">Não, apenas manter como ganho</Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* View Dialog */}
            <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
                <DialogContent className="max-w-md rounded-[32px] border-none shadow-2xl p-0 overflow-hidden">
                    {selectedDeal && (
                        <>
                            <div className="bg-muted/30 p-8 border-b border-border/20">
                                <div className="flex items-center gap-4">
                                    <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center shadow-inner">
                                        <Briefcase className="h-7 w-7 text-primary" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black tracking-tight text-foreground">{selectedDeal.name}</h2>
                                        <Badge variant="outline" className="mt-1 bg-background shadow-sm border-border/40 font-bold px-2 py-0.5">{selectedDeal.stage}</Badge>
                                    </div>
                                </div>
                            </div>
                            <div className="p-8 space-y-6 bg-background">
                                <div className="grid grid-cols-2 gap-6">
                                    <div><p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Contato</p><p className="font-bold text-sm">{selectedDeal.contactName}</p></div>
                                    <div><p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Valor</p><p className="font-black text-lg text-primary">{formatCurrency(selectedDeal.value)}</p></div>
                                    <div className="col-span-2">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Probabilidade de Fechamento</p>
                                        <div className="flex items-center gap-4">
                                            <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden shadow-inner">
                                                <div className={cn("h-full rounded-full transition-all duration-1000", probBarColor(selectedDeal.probability))} style={{ width: `${selectedDeal.probability}%` }} />
                                            </div>
                                            <span className={cn("text-xs font-black px-2.5 py-1 rounded-full", probColor(selectedDeal.probability))}>{selectedDeal.probability}%</span>
                                        </div>
                                    </div>
                                </div>
                                {selectedDeal.notes && (
                                    <div className="pt-4 border-t border-border/40">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Observações</p>
                                        <div className="p-4 rounded-2xl bg-muted/20 border border-border/20">
                                            <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">{selectedDeal.notes}</p>
                                        </div>
                                    </div>
                                )}
                                <div className="flex justify-end gap-3 pt-2">
                                    <Button variant="ghost" onClick={() => setViewDialogOpen(false)} className="rounded-xl">Fechar</Button>
                                    <Button onClick={() => { setViewDialogOpen(false); openEdit(selectedDeal); }} className="rounded-xl px-8 font-bold shadow-lg shadow-primary/10">Editar</Button>
                                </div>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* Delete Dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent className="max-w-sm rounded-[28px] p-6 border-none shadow-2xl">
                    <DialogHeader><DialogTitle className="font-bold">Excluir Negócio</DialogTitle></DialogHeader>
                    <p className="text-sm text-muted-foreground mt-2">Tem certeza que deseja excluir <strong className="text-foreground">{selectedDeal?.name}</strong>?</p>
                    <div className="flex justify-end gap-3 pt-6">
                        <Button variant="ghost" onClick={() => setDeleteDialogOpen(false)} className="rounded-xl">Cancelar</Button>
                        <Button variant="destructive" onClick={handleDelete} className="rounded-xl px-8 font-bold shadow-lg shadow-destructive/10">Excluir</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
