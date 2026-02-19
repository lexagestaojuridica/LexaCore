import { useState } from "react";
import { Plus, Search, Edit2, Trash2, Eye, TrendingUp, DollarSign, Target, ArrowUpRight, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import FormField from "@/components/shared/FormField";
import { Separator } from "@/components/ui/separator";
import { useCrm, CrmDeal } from "@/contexts/CrmContext";

const DEAL_STAGES = [
    { name: "Qualificação", emoji: "🔍" }, { name: "Proposta", emoji: "📋" }, { name: "Negociação", emoji: "🤝" },
    { name: "Contrato", emoji: "📝" }, { name: "Fechado/Ganho", emoji: "🏆" }, { name: "Perdido", emoji: "❌" },
];

const STAGE_COLORS: Record<string, string> = {
    "Qualificação": "bg-blue-50 text-blue-700 border-blue-200", "Proposta": "bg-violet-50 text-violet-700 border-violet-200",
    "Negociação": "bg-amber-50 text-amber-700 border-amber-200", "Contrato": "bg-orange-50 text-orange-700 border-orange-200",
    "Fechado/Ganho": "bg-emerald-50 text-emerald-700 border-emerald-200", "Perdido": "bg-red-50 text-red-600 border-red-200",
};

const formatCurrency = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
const probColor = (p: number) => p >= 70 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : p >= 30 ? "bg-amber-50 text-amber-600 border-amber-200" : "bg-red-50 text-red-600 border-red-200";
const probBarColor = (p: number) => p >= 70 ? "bg-emerald-500" : p >= 30 ? "bg-amber-500" : "bg-red-400";

type FormState = { name: string; contactName: string; value: string; probability: string; stage: string; dueDate: string; notes: string };
const emptyForm: FormState = { name: "", contactName: "", value: "", probability: "50", stage: "Qualificação", dueDate: "", notes: "" };

export default function CrmDealsTable() {
    const { deals, contacts, addDeal, updateDeal, deleteDeal: deleteDealCtx } = useCrm();
    const [search, setSearch] = useState("");
    const [stageFilter, setStageFilter] = useState("todos");
    const [dialogOpen, setDialogOpen] = useState(false);
    const [viewDialogOpen, setViewDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [form, setForm] = useState<FormState>(emptyForm);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [selectedDeal, setSelectedDeal] = useState<CrmDeal | null>(null);

    const filtered = deals.filter((d) => {
        const q = search.toLowerCase();
        const matchSearch = !q || d.name.toLowerCase().includes(q) || d.contactName.toLowerCase().includes(q);
        const matchStage = stageFilter === "todos" || d.stage === stageFilter;
        return matchSearch && matchStage;
    });

    const openCreate = () => { setForm(emptyForm); setEditingId(null); setDialogOpen(true); };
    const openEdit = (deal: CrmDeal) => {
        setForm({ name: deal.name, contactName: deal.contactName, value: String(deal.value), probability: String(deal.probability), stage: deal.stage, dueDate: deal.dueDate, notes: deal.notes });
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

    const activeDeals = deals.filter((d) => d.stage !== "Fechado/Ganho" && d.stage !== "Perdido");
    const totalPipeline = activeDeals.reduce((s, d) => s + d.value, 0);
    const avgValue = activeDeals.length > 0 ? totalPipeline / activeDeals.length : 0;
    const wonDeals = deals.filter((d) => d.stage === "Fechado/Ganho");
    const lostDeals = deals.filter((d) => d.stage === "Perdido");
    const convRate = wonDeals.length + lostDeals.length > 0 ? Math.round((wonDeals.length / (wonDeals.length + lostDeals.length)) * 100) : 0;

    return (
        <div className="space-y-5">
            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                    { label: "Total Pipeline", value: formatCurrency(totalPipeline), icon: DollarSign, color: "text-primary", bg: "bg-primary/8", accent: "bg-primary" },
                    { label: "Valor Médio", value: formatCurrency(avgValue), icon: TrendingUp, color: "text-primary", bg: "bg-primary/8", accent: "bg-primary" },
                    { label: "Taxa de Conversão", value: `${convRate}%`, icon: Target, color: "text-emerald-600", bg: "bg-emerald-50", accent: "bg-emerald-500" },
                    { label: "Deals Ativos", value: activeDeals.length, icon: ArrowUpRight, color: "text-foreground", bg: "bg-muted", accent: "bg-foreground/20" },
                ].map((kpi) => (
                    <Card key={kpi.label} className="border-border/50 overflow-hidden group hover:shadow-md transition-all duration-300">
                        <CardContent className="p-5"><div className="flex items-center justify-between mb-3"><p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{kpi.label}</p><div className={`flex h-9 w-9 items-center justify-center rounded-xl ${kpi.bg} transition-transform group-hover:scale-110`}><kpi.icon className={`h-4 w-4 ${kpi.color}`} /></div></div><p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p></CardContent>
                        <div className={`h-0.5 ${kpi.accent} opacity-60`} />
                    </Card>
                ))}
            </div>

            {/* Filters */}
            <Card className="border-border/50">
                <CardContent className="flex flex-wrap items-center gap-3 p-3">
                    <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Buscar negócio..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" /></div>
                    <Select value={stageFilter} onValueChange={setStageFilter}><SelectTrigger className="w-[170px] h-9"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todos">Todas Etapas</SelectItem>{DEAL_STAGES.map((s) => <SelectItem key={s.name} value={s.name}>{s.emoji} {s.name}</SelectItem>)}</SelectContent></Select>
                    <Button className="gap-1.5 shadow-sm" onClick={openCreate}><Plus className="h-4 w-4" /> Novo Negócio</Button>
                </CardContent>
            </Card>

            {/* Table */}
            <Card className="border-border/50 overflow-hidden">
                <CardContent className="p-0">
                    {filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center"><div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-3"><Briefcase className="h-7 w-7 text-muted-foreground/30" /></div><p className="text-sm font-medium text-muted-foreground">Nenhum negócio encontrado</p></div>
                    ) : (
                        <div className="overflow-x-auto"><Table><TableHeader><TableRow className="bg-muted/30 hover:bg-muted/30"><TableHead className="font-semibold">Negócio</TableHead><TableHead className="font-semibold">Contato</TableHead><TableHead className="font-semibold">Valor</TableHead><TableHead className="font-semibold">Probabilidade</TableHead><TableHead className="font-semibold">Etapa</TableHead><TableHead className="font-semibold">Previsão</TableHead><TableHead className="text-right font-semibold">Ações</TableHead></TableRow></TableHeader>
                            <TableBody>{filtered.map((d) => (
                                <TableRow key={d.id} className="group hover:bg-muted/20 transition-colors">
                                    <TableCell><div className="flex items-center gap-2.5"><div className="h-8 w-8 rounded-lg bg-primary/8 flex items-center justify-center shrink-0"><Briefcase className="h-3.5 w-3.5 text-primary/70" /></div><span className="font-medium text-sm">{d.name}</span></div></TableCell>
                                    <TableCell><div className="flex items-center gap-2"><div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground">{d.contactName.charAt(0)}</div><span className="text-muted-foreground text-sm">{d.contactName}</span></div></TableCell>
                                    <TableCell><span className="font-bold text-primary text-sm">{formatCurrency(d.value)}</span></TableCell>
                                    <TableCell><div className="flex items-center gap-2 min-w-[100px]"><div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden"><div className={`h-full rounded-full ${probBarColor(d.probability)} transition-all`} style={{ width: `${d.probability}%` }} /></div><Badge variant="outline" className={`text-[10px] min-w-[38px] justify-center ${probColor(d.probability)}`}>{d.probability}%</Badge></div></TableCell>
                                    <TableCell><Badge variant="outline" className={`text-[10px] ${STAGE_COLORS[d.stage] || ""}`}>{DEAL_STAGES.find((s) => s.name === d.stage)?.emoji} {d.stage}</Badge></TableCell>
                                    <TableCell className="text-muted-foreground text-sm">{d.dueDate ? new Date(d.dueDate + "T00:00:00").toLocaleDateString("pt-BR") : "—"}</TableCell>
                                    <TableCell><div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-all"><Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => { setSelectedDeal(d); setViewDialogOpen(true); }}><Eye className="h-3.5 w-3.5" /></Button><Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => openEdit(d)}><Edit2 className="h-3.5 w-3.5" /></Button><Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive" onClick={() => { setSelectedDeal(d); setDeleteDialogOpen(true); }}><Trash2 className="h-3.5 w-3.5" /></Button></div></TableCell>
                                </TableRow>
                            ))}</TableBody></Table></div>
                    )}
                </CardContent>
            </Card>

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
                            <p className="text-[10px] text-muted-foreground/60">💡 Se o contato não existir, será criado automaticamente</p>
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

            {/* View Dialog */}
            <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}><DialogContent className="max-w-md">{selectedDeal && (<><DialogHeader><DialogTitle className="flex items-center gap-2"><Briefcase className="h-4 w-4" /> {selectedDeal.name}</DialogTitle></DialogHeader><div className="space-y-4 pt-2"><div className="grid grid-cols-2 gap-4 text-sm"><div><span className="text-[10px] uppercase tracking-wider text-muted-foreground">Contato</span><p className="font-medium mt-0.5">{selectedDeal.contactName}</p></div><div><span className="text-[10px] uppercase tracking-wider text-muted-foreground">Valor</span><p className="font-bold text-primary mt-0.5">{formatCurrency(selectedDeal.value)}</p></div><div><span className="text-[10px] uppercase tracking-wider text-muted-foreground">Probabilidade</span><div className="flex items-center gap-2 mt-1"><div className="flex-1 h-2 rounded-full bg-muted overflow-hidden"><div className={`h-full rounded-full ${probBarColor(selectedDeal.probability)}`} style={{ width: `${selectedDeal.probability}%` }} /></div><Badge variant="outline" className={`text-xs ${probColor(selectedDeal.probability)}`}>{selectedDeal.probability}%</Badge></div></div><div><span className="text-[10px] uppercase tracking-wider text-muted-foreground">Etapa</span><p className="mt-0.5"><Badge variant="outline" className={`text-xs ${STAGE_COLORS[selectedDeal.stage] || ""}`}>{selectedDeal.stage}</Badge></p></div></div>{selectedDeal.notes && (<><Separator /><div><span className="text-[10px] uppercase tracking-wider text-muted-foreground">Observações</span><p className="text-sm mt-1 whitespace-pre-wrap">{selectedDeal.notes}</p></div></>)}<div className="flex justify-end gap-2 pt-2"><Button variant="outline" onClick={() => setViewDialogOpen(false)}>Fechar</Button><Button onClick={() => { setViewDialogOpen(false); openEdit(selectedDeal); }}>Editar</Button></div></div></>)}</DialogContent></Dialog>

            {/* Delete Dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}><DialogContent className="max-w-sm"><DialogHeader><DialogTitle>Excluir Negócio</DialogTitle></DialogHeader><p className="text-sm text-muted-foreground">Tem certeza que deseja excluir <strong className="text-foreground">{selectedDeal?.name}</strong>?</p><div className="flex justify-end gap-2 pt-2"><Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancelar</Button><Button variant="destructive" onClick={handleDelete}>Excluir</Button></div></DialogContent></Dialog>
        </div>
    );
}
