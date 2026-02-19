import { useState } from "react";
import {
    Users, Search, Phone, Mail, Building2, MapPin, Star, Eye,
    LayoutGrid, List, MessageSquarePlus, Filter, Plus, Edit2, Trash2,
    UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import FormField from "@/components/shared/FormField";
import { useCrm, CrmContact } from "@/contexts/CrmContext";

// ── Tag colors ─────────────────────────────────────────
const TAG_COLORS: Record<string, string> = {
    "VIP": "bg-amber-100 text-amber-700 border-amber-200",
    "Recorrente": "bg-blue-100 text-blue-700 border-blue-200",
    "Processo Ativo": "bg-emerald-100 text-emerald-700 border-emerald-200",
    "Novo": "bg-violet-100 text-violet-700 border-violet-200",
    "Indicação": "bg-rose-100 text-rose-700 border-rose-200",
};

const ALL_TAGS = ["VIP", "Recorrente", "Processo Ativo", "Novo", "Indicação"];

function StarRating({ score, onChange }: { score: number; onChange?: (s: number) => void }) {
    return (
        <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((s) => (
                <Star
                    key={s}
                    className={`h-3 w-3 ${s <= score ? "fill-amber-400 text-amber-400" : "text-muted-foreground/20"} ${onChange ? "cursor-pointer hover:scale-110 transition-transform" : ""}`}
                    onClick={() => onChange?.(s)}
                />
            ))}
        </div>
    );
}

const emptyContact: { name: string; email: string; phone: string; type: "pessoa_fisica" | "pessoa_juridica"; company: string; city: string; state: string; tags: string[]; score: number; notes: string } = { name: "", email: "", phone: "", type: "pessoa_fisica", company: "", city: "", state: "", tags: [], score: 1, notes: "" };

export default function CrmContactsList() {
    const { contacts, leads, deals, activities, addContact, updateContact, deleteContact, addActivity } = useCrm();
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState("todos");
    const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
    const [dialogOpen, setDialogOpen] = useState(false);
    const [viewDialogOpen, setViewDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [activityDialogOpen, setActivityDialogOpen] = useState(false);
    const [form, setForm] = useState(emptyContact);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [selectedContact, setSelectedContact] = useState<CrmContact | null>(null);
    const [activityNote, setActivityNote] = useState("");
    const [activityType, setActivityType] = useState("ligacao");

    const filtered = contacts.filter((c) => {
        const q = search.toLowerCase();
        const matchSearch = !q || c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || c.phone.includes(q) || c.company.toLowerCase().includes(q);
        const matchType = typeFilter === "todos" || c.type === typeFilter;
        return matchSearch && matchType;
    });

    const openCreate = () => { setForm(emptyContact); setEditingId(null); setDialogOpen(true); };
    const openEdit = (c: CrmContact) => {
        setForm({ name: c.name, email: c.email, phone: c.phone, type: c.type, company: c.company, city: c.city, state: c.state, tags: c.tags, score: c.score, notes: c.notes });
        setEditingId(c.id);
        setDialogOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name) return;
        if (editingId) {
            updateContact(editingId, { ...form });
        } else {
            addContact({ ...form, source: "manual" });
        }
        setDialogOpen(false); setForm(emptyContact); setEditingId(null);
    };

    const handleDelete = () => {
        if (selectedContact) { deleteContact(selectedContact.id); setDeleteDialogOpen(false); setSelectedContact(null); }
    };

    const openActivity = (c: CrmContact) => { setSelectedContact(c); setActivityNote(""); setActivityType("ligacao"); setActivityDialogOpen(true); };

    const handleActivitySubmit = () => {
        if (selectedContact && activityNote) {
            addActivity({ type: activityType as any, title: `${activityType === "ligacao" ? "Ligação" : activityType === "email" ? "E-mail" : activityType === "reuniao" ? "Reunião" : "Tarefa"} — ${selectedContact.name}`, description: activityNote, contactName: selectedContact.name, date: new Date().toISOString().split("T")[0], time: new Date().toTimeString().slice(0, 5), completed: false });
        }
        setActivityDialogOpen(false);
    };

    const toggleTag = (tag: string) => {
        setForm((p) => ({ ...p, tags: p.tags.includes(tag) ? p.tags.filter((t) => t !== tag) : [...p.tags, tag] }));
    };

    // Get stats per contact
    const getContactStats = (id: string) => {
        const contactLeads = leads.filter((l) => l.contactId === id);
        const contactDeals = deals.filter((d) => d.contactId === id);
        const contactActivities = activities.filter((a) => a.contactId === id);
        const lastActivity = contactActivities.sort((a, b) => `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`))[0];
        return { leadsCount: contactLeads.length, dealsCount: contactDeals.length, activitiesCount: contactActivities.length, lastActivity };
    };

    return (
        <div className="space-y-5">
            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                    { label: "Total Contatos", value: contacts.length, icon: Users, color: "text-foreground", bg: "bg-muted", accent: "bg-primary" },
                    { label: "Pessoa Física", value: contacts.filter((c) => c.type === "pessoa_fisica").length, icon: Users, color: "text-blue-600", bg: "bg-blue-50", accent: "bg-blue-500" },
                    { label: "Pessoa Jurídica", value: contacts.filter((c) => c.type === "pessoa_juridica").length, icon: Building2, color: "text-violet-600", bg: "bg-violet-50", accent: "bg-violet-500" },
                    { label: "VIP", value: contacts.filter((c) => c.tags.includes("VIP")).length, icon: Star, color: "text-amber-600", bg: "bg-amber-50", accent: "bg-amber-500" },
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
                        <Input placeholder="Buscar contato..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
                    </div>
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                        <SelectTrigger className="w-[150px] h-9"><Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" /><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="todos">Todos</SelectItem>
                            <SelectItem value="pessoa_fisica">Pessoa Física</SelectItem>
                            <SelectItem value="pessoa_juridica">Pessoa Jurídica</SelectItem>
                        </SelectContent>
                    </Select>
                    <div className="flex items-center border border-border rounded-md">
                        <Button variant={viewMode === "grid" ? "secondary" : "ghost"} size="icon" className="h-9 w-9 rounded-r-none" onClick={() => setViewMode("grid")}><LayoutGrid className="h-4 w-4" /></Button>
                        <Button variant={viewMode === "table" ? "secondary" : "ghost"} size="icon" className="h-9 w-9 rounded-l-none" onClick={() => setViewMode("table")}><List className="h-4 w-4" /></Button>
                    </div>
                    <Button className="gap-1.5 shadow-sm" onClick={openCreate}><UserPlus className="h-4 w-4" /> Novo Contato</Button>
                </CardContent>
            </Card>

            {/* Content */}
            {filtered.length === 0 ? (
                <Card className="border-border/50">
                    <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-3"><Users className="h-7 w-7 text-muted-foreground/30" /></div>
                        <p className="text-sm font-medium text-muted-foreground">Nenhum contato encontrado</p>
                        <p className="text-xs text-muted-foreground/50 mt-1">Crie um contato ou adicione um Lead — o contato será criado automaticamente</p>
                    </CardContent>
                </Card>
            ) : viewMode === "grid" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map((c) => {
                        const stats = getContactStats(c.id);
                        return (
                            <Card key={c.id} className="border-border/50 hover:shadow-md transition-all duration-200 group overflow-hidden">
                                <CardContent className="p-4 space-y-3">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-base shrink-0">{c.name.charAt(0).toUpperCase()}</div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-foreground truncate">{c.name}</p>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <Badge variant="outline" className="text-[10px]">{c.type === "pessoa_juridica" ? "PJ" : "PF"}</Badge>
                                                    {c.source === "lead" && <Badge variant="outline" className="text-[9px] bg-blue-50 text-blue-600 border-blue-200">via Lead</Badge>}
                                                    {c.source === "deal" && <Badge variant="outline" className="text-[9px] bg-violet-50 text-violet-600 border-violet-200">via Deal</Badge>}
                                                </div>
                                            </div>
                                        </div>
                                        <StarRating score={c.score} />
                                    </div>

                                    <div className="space-y-1.5">
                                        {c.email && <div className="flex items-center gap-2 text-xs text-muted-foreground"><Mail className="h-3 w-3 shrink-0" /><span className="truncate">{c.email}</span></div>}
                                        {c.phone && <div className="flex items-center gap-2 text-xs text-muted-foreground"><Phone className="h-3 w-3 shrink-0" /><span>{c.phone}</span></div>}
                                        {(c.city || c.company) && <div className="flex items-center gap-2 text-xs text-muted-foreground">{c.company ? <Building2 className="h-3 w-3 shrink-0" /> : <MapPin className="h-3 w-3 shrink-0" />}<span className="truncate">{c.company || `${c.city}/${c.state}`}</span></div>}
                                    </div>

                                    {c.tags.length > 0 && (<div className="flex flex-wrap gap-1">{c.tags.map((tag) => <Badge key={tag} variant="outline" className={`text-[9px] px-1.5 py-0 ${TAG_COLORS[tag] || ""}`}>{tag}</Badge>)}</div>)}

                                    {/* Stats Row */}
                                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground/60">
                                        <span>{stats.leadsCount} leads</span>
                                        <span>·</span>
                                        <span>{stats.dealsCount} negócios</span>
                                        <span>·</span>
                                        <span>{stats.activitiesCount} atividades</span>
                                    </div>

                                    <div className="flex items-center justify-between pt-1 border-t border-border/30">
                                        <span className="text-[10px] text-muted-foreground">
                                            {stats.lastActivity ? `Último: ${new Date(stats.lastActivity.date + "T00:00:00").toLocaleDateString("pt-BR")}` : "Sem atividades"}
                                        </span>
                                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setSelectedContact(c); setViewDialogOpen(true); }}><Eye className="h-3 w-3" /></Button>
                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(c)}><Edit2 className="h-3 w-3" /></Button>
                                            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => openActivity(c)}><MessageSquarePlus className="h-3 w-3" /></Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            ) : (
                <Card className="border-border/50 overflow-hidden">
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader><TableRow className="bg-muted/30 hover:bg-muted/30">
                                    <TableHead className="font-semibold">Contato</TableHead><TableHead className="font-semibold">Tipo</TableHead><TableHead className="font-semibold">E-mail</TableHead><TableHead className="font-semibold">Telefone</TableHead><TableHead className="font-semibold">Score</TableHead><TableHead className="font-semibold">Tags</TableHead><TableHead className="font-semibold">Leads</TableHead><TableHead className="text-right font-semibold">Ações</TableHead>
                                </TableRow></TableHeader>
                                <TableBody>
                                    {filtered.map((c) => {
                                        const stats = getContactStats(c.id);
                                        return (
                                            <TableRow key={c.id} className="group hover:bg-muted/20">
                                                <TableCell><div className="flex items-center gap-2"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-xs shrink-0">{c.name.charAt(0).toUpperCase()}</div><span className="font-medium text-sm">{c.name}</span></div></TableCell>
                                                <TableCell><Badge variant="outline" className="text-[10px]">{c.type === "pessoa_juridica" ? "PJ" : "PF"}</Badge></TableCell>
                                                <TableCell className="text-muted-foreground text-sm">{c.email || "—"}</TableCell>
                                                <TableCell className="text-muted-foreground text-sm">{c.phone || "—"}</TableCell>
                                                <TableCell><StarRating score={c.score} /></TableCell>
                                                <TableCell><div className="flex flex-wrap gap-1">{c.tags.map((tag) => <Badge key={tag} variant="outline" className={`text-[9px] px-1 py-0 ${TAG_COLORS[tag] || ""}`}>{tag}</Badge>)}</div></TableCell>
                                                <TableCell className="text-muted-foreground text-xs">{stats.leadsCount}L / {stats.dealsCount}N</TableCell>
                                                <TableCell>
                                                    <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
                                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(c)}><Edit2 className="h-3.5 w-3.5" /></Button>
                                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openActivity(c)}><MessageSquarePlus className="h-3.5 w-3.5" /></Button>
                                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => { setSelectedContact(c); setDeleteDialogOpen(true); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Create/Edit Contact Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                    <DialogHeader><DialogTitle className="flex items-center gap-2">{editingId ? <Edit2 className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />} {editingId ? "Editar Contato" : "Novo Contato"}</DialogTitle></DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                        <FormField label="Nome Completo" value={form.name} onChange={(v) => setForm((p) => ({ ...p, name: v }))} placeholder="Ex: João da Silva" required />
                        <div className="grid grid-cols-2 gap-3">
                            <FormField label="E-mail" value={form.email} onChange={(v) => setForm((p) => ({ ...p, email: v }))} placeholder="email@exemplo.com" type="email" />
                            <FormField label="Telefone" value={form.phone} onChange={(v) => setForm((p) => ({ ...p, phone: v }))} placeholder="(00) 00000-0000" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tipo</label>
                                <Select value={form.type} onValueChange={(v: any) => setForm((p) => ({ ...p, type: v }))}><SelectTrigger className="h-10 bg-background"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pessoa_fisica">Pessoa Física</SelectItem><SelectItem value="pessoa_juridica">Pessoa Jurídica</SelectItem></SelectContent></Select>
                            </div>
                            <FormField label="Empresa" value={form.company} onChange={(v) => setForm((p) => ({ ...p, company: v }))} placeholder="Nome da empresa" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <FormField label="Cidade" value={form.city} onChange={(v) => setForm((p) => ({ ...p, city: v }))} placeholder="Cidade" />
                            <FormField label="UF" value={form.state} onChange={(v) => setForm((p) => ({ ...p, state: v }))} placeholder="SP" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Score</label>
                            <StarRating score={form.score} onChange={(s) => setForm((p) => ({ ...p, score: s }))} />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tags</label>
                            <div className="flex flex-wrap gap-1.5">
                                {ALL_TAGS.map((tag) => (
                                    <Badge key={tag} variant="outline" className={`text-xs cursor-pointer transition-all ${form.tags.includes(tag) ? TAG_COLORS[tag] + " ring-1 ring-offset-1" : "opacity-50 hover:opacity-80"}`} onClick={() => toggleTag(tag)}>{tag}</Badge>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Observações</label>
                            <Textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} rows={3} placeholder="Notas..." className="bg-background" />
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                            <Button type="submit" className="gap-1.5">{editingId ? "Salvar" : <><UserPlus className="h-3.5 w-3.5" /> Criar</>}</Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* View Contact Dialog */}
            <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
                <DialogContent className="max-w-md">{selectedContact && (() => {
                    const stats = getContactStats(selectedContact.id);
                    return (<>
                        <DialogHeader><DialogTitle className="flex items-center gap-2"><Users className="h-4 w-4" /> {selectedContact.name}</DialogTitle></DialogHeader>
                        <div className="space-y-4 pt-2">
                            <div className="flex items-center gap-3 rounded-xl bg-muted/30 p-4">
                                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xl">{selectedContact.name.charAt(0)}</div>
                                <div><p className="font-semibold">{selectedContact.name}</p><div className="flex items-center gap-2 mt-1"><Badge variant="outline" className="text-[10px]">{selectedContact.type === "pessoa_juridica" ? "PJ" : "PF"}</Badge><StarRating score={selectedContact.score} /></div></div>
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                {selectedContact.email && <div><span className="text-[10px] uppercase tracking-wider text-muted-foreground">E-mail</span><p className="mt-0.5">{selectedContact.email}</p></div>}
                                {selectedContact.phone && <div><span className="text-[10px] uppercase tracking-wider text-muted-foreground">Telefone</span><p className="mt-0.5">{selectedContact.phone}</p></div>}
                                {selectedContact.company && <div><span className="text-[10px] uppercase tracking-wider text-muted-foreground">Empresa</span><p className="mt-0.5">{selectedContact.company}</p></div>}
                                {selectedContact.city && <div><span className="text-[10px] uppercase tracking-wider text-muted-foreground">Local</span><p className="mt-0.5">{selectedContact.city}/{selectedContact.state}</p></div>}
                            </div>
                            <div className="flex items-center gap-4 rounded-lg bg-primary/5 p-3 text-sm">
                                <div className="text-center"><p className="font-bold text-lg text-primary">{stats.leadsCount}</p><p className="text-[10px] text-muted-foreground">Leads</p></div>
                                <div className="text-center"><p className="font-bold text-lg text-primary">{stats.dealsCount}</p><p className="text-[10px] text-muted-foreground">Negócios</p></div>
                                <div className="text-center"><p className="font-bold text-lg text-primary">{stats.activitiesCount}</p><p className="text-[10px] text-muted-foreground">Atividades</p></div>
                            </div>
                            {selectedContact.tags.length > 0 && <div className="flex flex-wrap gap-1">{selectedContact.tags.map((tag) => <Badge key={tag} variant="outline" className={`text-xs ${TAG_COLORS[tag] || ""}`}>{tag}</Badge>)}</div>}
                            <div className="flex justify-end gap-2 pt-2">
                                <Button variant="outline" onClick={() => setViewDialogOpen(false)}>Fechar</Button>
                                <Button onClick={() => { setViewDialogOpen(false); openEdit(selectedContact); }}>Editar</Button>
                            </div>
                        </div>
                    </>);
                })()}</DialogContent>
            </Dialog>

            {/* Activity Dialog */}
            <Dialog open={activityDialogOpen} onOpenChange={setActivityDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader><DialogTitle className="flex items-center gap-2"><MessageSquarePlus className="h-4 w-4" /> Registrar Atividade</DialogTitle></DialogHeader>
                    {selectedContact && (<div className="space-y-4 pt-2">
                        <div className="flex items-center gap-2 rounded-lg bg-muted/40 p-3"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">{selectedContact.name.charAt(0)}</div><div><p className="text-sm font-medium">{selectedContact.name}</p><p className="text-xs text-muted-foreground">{selectedContact.email || selectedContact.phone || "—"}</p></div></div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tipo</label>
                            <Select value={activityType} onValueChange={setActivityType}><SelectTrigger className="h-10 bg-background"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ligacao">📞 Ligação</SelectItem><SelectItem value="email">✉️ E-mail</SelectItem><SelectItem value="reuniao">📅 Reunião</SelectItem><SelectItem value="tarefa">✅ Tarefa</SelectItem></SelectContent></Select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Descrição</label>
                            <Textarea value={activityNote} onChange={(e) => setActivityNote(e.target.value)} rows={3} placeholder="Descreva a atividade..." className="bg-background" />
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="outline" onClick={() => setActivityDialogOpen(false)}>Cancelar</Button>
                            <Button onClick={handleActivitySubmit}>Registrar</Button>
                        </div>
                    </div>)}
                </DialogContent>
            </Dialog>

            {/* Delete Dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent className="max-w-sm">
                    <DialogHeader><DialogTitle>Excluir Contato</DialogTitle></DialogHeader>
                    <p className="text-sm text-muted-foreground">Tem certeza que deseja excluir <strong className="text-foreground">{selectedContact?.name}</strong>?</p>
                    <div className="flex justify-end gap-2 pt-2"><Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancelar</Button><Button variant="destructive" onClick={handleDelete}>Excluir</Button></div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
