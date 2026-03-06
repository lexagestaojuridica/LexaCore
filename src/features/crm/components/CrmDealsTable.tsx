import { useState, useEffect } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { Plus, Search, Edit2, Trash2, Eye, TrendingUp, DollarSign, Target, ArrowUpRight, Briefcase, Zap, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import FormField from "@/components/shared/FormField";
import { Separator } from "@/components/ui/separator";
import { useCrm, CrmDeal } from "@/features/crm/contexts/CrmContext";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

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
    const { deals, contacts, addDeal, updateDeal, deleteDeal: deleteDealCtx } = useCrm();
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const navigate = useNavigate();

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
            const { data } = await supabase.from("profiles").select("organization_id").eq("user_id", user!.id).single();
            return data;
        },
        enabled: !!user,
    });

    const orgId = profile?.organization_id;

    // Convert Deal to Client and Process Mutation
    const convertMutation = useMutation({
        mutationFn: async (deal: CrmDeal) => {
            if (!orgId) throw new Error("Org ID not found");

            // 1. Create client
            const { data: client, error: clientErr } = await supabase.from("clients").insert({
                name: deal.contactName,
                organization_id: orgId,
                status: "ativo",
                type: "pf"
            }).select().single();

            if (clientErr) throw clientErr;

            // 2. Create Processo
            const { error: processErr } = await supabase.from("processos_juridicos").insert({
                organization_id: orgId,
                title: `Contrato: ${deal.name}`,
                client_id: client.id,
                status: "ativo",
                estimated_value: deal.value,
                notes: `Origem: CRM.\nContato original: ${deal.contactName}\nObs: ${deal.notes || ''}`,
                responsible_user_id: user!.id
            });

            if (processErr) throw processErr;
        },
        onSuccess: () => {
            toast.success("Cliente e Processo gerados com sucesso!");
            setWinDialogOpen(null);
            queryClient.invalidateQueries({ queryKey: ["processos"] });
            queryClient.invalidateQueries({ queryKey: ["clients"] });
            // Optional: navigate("/dashboard/processos");
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

    const onDragEnd = (result: { destination: { droppableId: string } | null; source: { droppableId: string }; draggableId: string }) => {
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

    const activeDeals = deals.filter((d) => d.stage !== "Fechado/Ganho" && d.stage !== "Perdido");
    const totalPipeline = activeDeals.reduce((s, d) => s + d.value, 0);
    const avgValue = activeDeals.length > 0 ? totalPipeline / activeDeals.length : 0;
    const wonDeals = deals.filter((d) => d.stage === "Fechado/Ganho");
    const lostDeals = deals.filter((d) => d.stage === "Perdido");
    const convRate = wonDeals.length + lostDeals.length > 0 ? Math.round((wonDeals.length / (wonDeals.length + lostDeals.length)) * 100) : 0;

    return (
        <div className="space-y-6">
            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: "Total Pipeline", value: formatCurrency(totalPipeline), icon: DollarSign, color: "text-primary", bg: "bg-primary/10", accent: "bg-primary" },
                    { label: "Valor Médio", value: formatCurrency(avgValue), icon: TrendingUp, color: "text-primary", bg: "bg-primary/10", accent: "bg-primary" },
                    { label: "Taxa de Conversão", value: `${convRate}%`, icon: Target, color: "text-emerald-600", bg: "bg-emerald-50", accent: "bg-emerald-500" },
                    { label: "Deals Ativos", value: activeDeals.length, icon: ArrowUpRight, color: "text-foreground", bg: "bg-muted", accent: "bg-foreground/20" },
                ].map((kpi) => (
                    <Card key={kpi.label} className="border-border/50 overflow-hidden group hover:shadow-sm transition-all duration-300">
                        <CardContent className="p-5">
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{kpi.label}</p>
                                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${kpi.bg} transition-transform group-hover:scale-110`}><kpi.icon className={`h-4 w-4 ${kpi.color}`} /></div>
                            </div>
                            <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
                        </CardContent>
                        <div className={`h-0.5 ${kpi.accent} opacity-60`} />
                    </Card>
                ))}
            </div>

            {/* Header and Add Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-card border border-border/60 shadow-sm">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input placeholder="Buscar negócio..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-background/50 h-9" />
                </div>
                <Button className="gap-2 shadow-sm" onClick={openCreate}><Plus className="h-4 w-4" /> Novo Negócio</Button>
            </div>

            {/* KANBAN BOARD */}
            <DragDropContext onDragEnd={onDragEnd}>
                <div className="flex gap-4 overflow-x-auto pb-4 h-[65vh] snap-x pt-2 px-1">
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
                                            "flex flex-col flex-shrink-0 w-80 rounded-xl border border-border/60 shadow-sm transition-all",
                                            STAGE_COLORS[stage.name] || "border-t-muted bg-muted/20",
                                            "border-t-4",
                                            snapshot.isDraggingOver && "bg-muted/40 border-dashed"
                                        )}
                                    >
                                        <div className="px-4 py-3 bg-card/60 rounded-t-lg backdrop-blur flex items-center justify-between border-b border-border/40">
                                            <div className="flex items-center gap-2">
                                                <span className="text-base">{stage.emoji}</span>
                                                <h3 className="text-sm font-semibold tracking-tight text-foreground/80">{stage.name}</h3>
                                            </div>
                                            <Badge variant="secondary" className="text-[10px] font-bold">{columnDeals.length}</Badge>
                                        </div>
                                        {colTotal > 0 && (
                                            <div className="px-4 py-1.5 bg-background/40 text-[10px] uppercase font-bold text-muted-foreground flex justify-between border-b border-border/40">
                                                <span>Total</span>
                                                <span className="text-primary">{formatCurrency(colTotal)}</span>
                                            </div>
                                        )}
                                        <div className="flex-1 p-3 overflow-y-auto space-y-3 custom-scrollbar min-h-[150px]">
                                            {columnDeals.map((deal, index) => (
                                                <Draggable key={deal.id} draggableId={deal.id} index={index}>
                                                    {(dragProvided, dragSnapshot) => (
                                                        <div
                                                            ref={dragProvided.innerRef}
                                                            {...dragProvided.draggableProps}
                                                            {...dragProvided.dragHandleProps}
                                                            style={{ ...dragProvided.draggableProps.style }}
                                                            className={cn(
                                                                "group relative flex flex-col rounded-lg border border-border/60 bg-card p-3 shadow-sm transition-all hover:border-primary/40",
                                                                dragSnapshot.isDragging && "shadow-xl rotate-1 scale-105 z-50 border-primary"
                                                            )}
                                                        >
                                                            <div className="flex justify-between items-start mb-2">
                                                                <h4 className="text-sm font-medium text-foreground leading-tight line-clamp-2 pr-6">{deal.name}</h4>
                                                                <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground" onClick={() => openEdit(deal)}>
                                                                    <Edit2 className="h-3 w-3" />
                                                                </Button>
                                                            </div>
                                                            <div className="flex items-center gap-2 mb-3">
                                                                <div className="h-5 w-5 rounded-md bg-muted flex items-center justify-center text-[9px] font-bold text-muted-foreground shrink-0">{deal.contactName.charAt(0)}</div>
                                                                <span className="text-xs text-muted-foreground truncate">{deal.contactName}</span>
                                                            </div>
                                                            <div className="flex items-end justify-between mt-auto pt-2 border-t border-border/40">
                                                                <div>
                                                                    <p className="text-[10px] text-muted-foreground font-medium uppercase mb-0.5">Valor</p>
                                                                    <span className="font-bold text-sm text-primary">{formatCurrency(deal.value)}</span>
                                                                </div>
                                                                <Badge variant="outline" className={cn("text-[9px] px-1.5 h-4 border-none", probColor(deal.probability))}>{deal.probability}%</Badge>
                                                            </div>

                                                            {/* Context actions */}
                                                            <div className="absolute top-2 right-9 flex gap-1 bg-card border border-border/50 rounded-md shadow-sm p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <Button variant="ghost" size="icon" className="h-5 w-5 rounded-sm" onClick={() => { setSelectedDeal(deal); setViewDialogOpen(true); }}>
                                                                    <Eye className="h-3 w-3" />
                                                                </Button>
                                                                <Button variant="ghost" size="icon" className="h-5 w-5 rounded-sm text-destructive hover:bg-destructive/10" onClick={() => { setSelectedDeal(deal); setDeleteDialogOpen(true); }}>
                                                                    <Trash2 className="h-3 w-3" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </Draggable>
                                            ))}
                                            {provided.placeholder}
                                        </div>
                                    </div>
                                )}
                            </Droppable>
                        );
                    })}
                </div>
            </DragDropContext>

            {/* Create/Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader><DialogTitle className="flex items-center gap-2">{editingId ? <Edit2 className="h-4 w-4" /> : <Plus className="h-4 w-4" />} {editingId ? "Editar Negócio" : "Novo Negócio"}</DialogTitle></DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                        <FormField label="Nome do Negócio" value={form.name} onChange={(v) => setForm((p) => ({ ...p, name: v }))} placeholder="Ex: Consultoria Tributária" required />
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Contato</label>
                            <input list="deal-contact-suggestions" value={form.contactName} onChange={(e) => setForm((p) => ({ ...p, contactName: e.target.value }))} placeholder="Nome do contato (novo ou existente)" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />
                            <datalist id="deal-contact-suggestions">{contacts.map((c) => <option key={c.id} value={c.name} />)}</datalist>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <FormField label="Valor (R$)" value={form.value} onChange={(v) => setForm((p) => ({ ...p, value: v }))} placeholder="0" type="number" />
                            <FormField label="Probabilidade (%)" value={form.probability} onChange={(v) => setForm((p) => ({ ...p, probability: v }))} placeholder="50" type="number" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Etapa</label><Select value={form.stage} onValueChange={(v) => setForm((p) => ({ ...p, stage: v }))}><SelectTrigger className="h-10 bg-background"><SelectValue /></SelectTrigger><SelectContent>{DEAL_STAGES.map((s) => <SelectItem key={s.name} value={s.name}>{s.emoji} {s.name}</SelectItem>)}</SelectContent></Select></div>
                            <FormField label="Previsão" value={form.dueDate} onChange={(v) => setForm((p) => ({ ...p, dueDate: v }))} type="date" />
                        </div>
                        <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Observações</label><Textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} rows={3} placeholder="Notas..." className="bg-background" /></div>
                        <div className="flex justify-end gap-2 pt-2"><Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button><Button type="submit" className="gap-1.5">{editingId ? "Salvar" : <><Plus className="h-3.5 w-3.5" /> Criar</>}</Button></div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Smart Prompt: Won Deal */}
            <Dialog open={!!winDialogOpen} onOpenChange={(o) => !o && setWinDialogOpen(null)}>
                <DialogContent className="max-w-md border-emerald-500/20 shadow-emerald-500/10">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-emerald-600">
                            <Zap className="h-5 w-5" /> Negócio Fechado!
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-3">
                        <p className="text-sm">Parabéns pelo fechamento de <strong>{winDialogOpen?.name}</strong>!</p>
                        <p className="text-sm text-muted-foreground text-pretty">
                            Deseja automatizar o próximo passo e converter <strong>{winDialogOpen?.contactName}</strong>
                            em Cliente ativo e já abrir a ficha de <strong>Processo / Caso Jurídico</strong>?
                        </p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setWinDialogOpen(null)}>Não, apenas manter como ganho</Button>
                        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2" onClick={() => winDialogOpen && convertMutation.mutate(winDialogOpen)} disabled={convertMutation.isPending}>
                            <Briefcase className="h-4 w-4" /> Importar para Processos
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* View Dialog */}
            <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}><DialogContent className="max-w-md">{selectedDeal && (<><DialogHeader><DialogTitle className="flex items-center gap-2"><Briefcase className="h-4 w-4" /> {selectedDeal.name}</DialogTitle></DialogHeader><div className="space-y-4 pt-2"><div className="grid grid-cols-2 gap-4 text-sm"><div><span className="text-[10px] uppercase tracking-wider text-muted-foreground">Contato</span><p className="font-medium mt-0.5">{selectedDeal.contactName}</p></div><div><span className="text-[10px] uppercase tracking-wider text-muted-foreground">Valor</span><p className="font-bold text-primary mt-0.5">{formatCurrency(selectedDeal.value)}</p></div><div><span className="text-[10px] uppercase tracking-wider text-muted-foreground">Probabilidade</span><div className="flex items-center gap-2 mt-1"><div className="flex-1 h-2 rounded-full bg-muted overflow-hidden"><div className={`h-full rounded-full ${probBarColor(selectedDeal.probability)}`} style={{ width: `${selectedDeal.probability}%` }} /></div><Badge variant="outline" className={`text-[10px] px-1.5 h-4 border-none ${probColor(selectedDeal.probability)}`}>{selectedDeal.probability}%</Badge></div></div><div><span className="text-[10px] uppercase tracking-wider text-muted-foreground">Etapa</span><p className="mt-0.5"><Badge variant="outline" className={`text-xs border-none bg-muted`}>{selectedDeal.stage}</Badge></p></div></div>{selectedDeal.notes && (<><Separator /><div><span className="text-[10px] uppercase tracking-wider text-muted-foreground">Observações</span><p className="text-sm mt-1 whitespace-pre-wrap">{selectedDeal.notes}</p></div></>)}<div className="flex justify-end gap-2 pt-2"><Button variant="outline" onClick={() => setViewDialogOpen(false)}>Fechar</Button><Button onClick={() => { setViewDialogOpen(false); openEdit(selectedDeal); }}>Editar</Button></div></div></>)}</DialogContent></Dialog>

            {/* Delete Dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}><DialogContent className="max-w-sm"><DialogHeader><DialogTitle>Excluir Negócio</DialogTitle></DialogHeader><p className="text-sm text-muted-foreground">Tem certeza que deseja excluir <strong className="text-foreground">{selectedDeal?.name}</strong>?</p><div className="flex justify-end gap-2 pt-2"><Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancelar</Button><Button variant="destructive" onClick={handleDelete}>Excluir</Button></div></DialogContent></Dialog>
        </div>
    );
}
