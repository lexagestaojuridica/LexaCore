"use client";

import { useState } from "react";
import { useDebounce } from "@/shared/hooks/useDebounce";
import {
    Users, Search, Phone, Mail, Building2, MapPin, Star, Eye,
    LayoutGrid, List, MessageSquarePlus, Filter, Edit2, Trash2,
    UserPlus,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Card, CardContent } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Textarea } from "@/shared/ui/textarea";
import FormField from "@/shared/components/FormField";
import { useCrm } from "@/features/crm/contexts/CrmContext";
import { useTranslation } from "react-i18next";
import type { CrmContact, CrmLead, CrmDeal, CrmActivity } from "../types";
import { cn } from "@/shared/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

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
                    className={cn(
                        "h-3.5 w-3.5 transition-all",
                        s <= score ? "fill-amber-400 text-amber-400" : "text-muted-foreground/20",
                        onChange && "cursor-pointer hover:scale-125"
                    )}
                    onClick={() => onChange?.(s)}
                />
            ))}
        </div>
    );
}

const emptyContact: any = { name: "", email: "", phone: "", type: "pessoa_fisica", company: "", city: "", state: "", tags: [], score: 1, notes: "" };

export default function CrmContactsList() {
    const { t } = useTranslation();
    const { contacts, leads, deals, activities, addContact, updateContact, deleteContact, addActivity } = useCrm();
    const [search, setSearch] = useState("");
    const debouncedSearch = useDebounce(search, 400);
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
        const q = debouncedSearch.toLowerCase();
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
            addActivity({ type: activityType as any, title: `${activityType} — ${selectedContact.name}`, description: activityNote, contactName: selectedContact.name, date: new Date().toISOString().split("T")[0], time: new Date().toTimeString().slice(0, 5), completed: false });
        }
        setActivityDialogOpen(false);
    };

    const toggleTag = (tag: string) => {
        setForm((p: any) => ({ ...p, tags: p.tags.includes(tag) ? p.tags.filter((t: string) => t !== tag) : [...p.tags, tag] }));
    };

    const getContactStats = (id: string) => {
        const contactLeads = leads.filter((l: CrmLead) => l.contactId === id);
        const contactDeals = deals.filter((d: CrmDeal) => d.contactId === id);
        const contactActivities = activities.filter((a: CrmActivity) => a.contactId === id);
        const lastActivity = contactActivities.sort((a: CrmActivity, b: CrmActivity) => `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`))[0];
        return { leadsCount: contactLeads.length, dealsCount: contactDeals.length, activitiesCount: contactActivities.length, lastActivity };
    };

    return (
        <div className="space-y-5">
            {/* Professional Filters */}
            <Card className="border-border/40 shadow-sm bg-card/50 overflow-hidden rounded-2xl">
                <CardContent className="flex flex-wrap items-center gap-4 p-4">
                    <div className="relative flex-1 min-w-[280px]">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder={t("crm.contacts.searchPlaceholder")}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 h-11 bg-background border-border/60 rounded-xl"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Select value={typeFilter} onValueChange={setTypeFilter}>
                            <SelectTrigger className="w-[180px] h-11 rounded-xl bg-background border-border/60 shadow-sm">
                                <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl shadow-xl">
                                <SelectItem value="todos">{t("common.all")}</SelectItem>
                                <SelectItem value="pessoa_fisica">{t("clients.pf")}</SelectItem>
                                <SelectItem value="pessoa_juridica">{t("clients.pj")}</SelectItem>
                            </SelectContent>
                        </Select>
                        <div className="flex items-center bg-muted/30 border border-border/60 rounded-xl p-1 h-11">
                            <Button variant={viewMode === "grid" ? "background" : "ghost"} size="icon" className={cn("h-9 w-9 rounded-lg shadow-none", viewMode === "grid" && "bg-background shadow-sm")} onClick={() => setViewMode("grid")}><LayoutGrid className="h-4 w-4" /></Button>
                            <Button variant={viewMode === "table" ? "background" : "ghost"} size="icon" className={cn("h-9 w-9 rounded-lg shadow-none", viewMode === "table" && "bg-background shadow-sm")} onClick={() => setViewMode("table")}><List className="h-4 w-4" /></Button>
                        </div>
                    </div>
                    <Button className="gap-2 shadow-lg shadow-primary/10 h-11 px-6 rounded-xl" onClick={openCreate}>
                        <UserPlus className="h-4 w-4" /> {t("crm.contacts.newContact")}
                    </Button>
                </CardContent>
            </Card>

            {/* Content Area */}
            {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center bg-muted/5 border-2 border-dashed border-border/40 rounded-3xl m-4">
                    <div className="h-16 w-16 rounded-3xl bg-primary/10 flex items-center justify-center mb-4"><Users className="h-8 w-8 text-primary" /></div>
                    <h3 className="text-lg font-bold text-foreground tracking-tight">{t("crm.contacts.noContacts")}</h3>
                    <p className="text-sm text-muted-foreground max-w-xs mt-1">{t("crm.contacts.noContactsDesc")}</p>
                </div>
            ) : viewMode === "grid" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    <AnimatePresence>
                        {filtered.map((c, idx) => {
                            const stats = getContactStats(c.id);
                            return (
                                <motion.div
                                    key={c.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.3, delay: idx * 0.05 }}
                                >
                                    <Card className="border-border/40 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group overflow-hidden bg-card/60 backdrop-blur-sm rounded-2xl">
                                        <CardContent className="p-5 space-y-4">
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary font-black text-lg shrink-0 shadow-inner">
                                                        {c.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-bold text-foreground truncate tracking-tight">{c.name}</p>
                                                        <div className="flex items-center gap-1.5 mt-1">
                                                            <Badge variant="outline" className="text-[10px] font-extrabold uppercase border-primary/20 bg-primary/5 text-primary">
                                                                {c.type === "pessoa_juridica" ? "PJ" : "PF"}
                                                            </Badge>
                                                            {c.source === "lead" && <Badge variant="outline" className="text-[9px] bg-blue-50 text-blue-600 border-blue-200">Lead</Badge>}
                                                        </div>
                                                    </div>
                                                </div>
                                                <StarRating score={c.score} />
                                            </div>

                                            <div className="space-y-2 py-1">
                                                {c.email && <div className="flex items-center gap-2.5 text-xs text-muted-foreground"><Mail className="h-3.5 w-3.5 shrink-0 opacity-40" /><span className="truncate font-medium">{c.email}</span></div>}
                                                {c.phone && <div className="flex items-center gap-2.5 text-xs text-muted-foreground"><Phone className="h-3.5 w-3.5 shrink-0 opacity-40" /><span className="font-medium">{c.phone}</span></div>}
                                                {(c.city || c.company) && <div className="flex items-center gap-2.5 text-xs text-muted-foreground">{c.company ? <Building2 className="h-3.5 w-3.5 shrink-0 opacity-40" /> : <MapPin className="h-3.5 w-3.5 shrink-0 opacity-40" />}<span className="truncate font-medium">{c.company || `${c.city}/${c.state}`}</span></div>}
                                            </div>

                                            {c.tags.length > 0 && (
                                                <div className="flex flex-wrap gap-1.5 pt-1">
                                                    {c.tags.map((tag) => (
                                                        <Badge key={tag} variant="outline" className={cn("text-[9px] px-2 py-0.5 font-bold uppercase border-none rounded-full", TAG_COLORS[tag])}>
                                                            {tag}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            )}

                                            <div className="flex items-center justify-between pt-3 border-t border-border/40 mt-1">
                                                <div className="flex items-center gap-1.5">
                                                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-sm" />
                                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                                        {stats.activitiesCount} {t("crm.tabs.activities")}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl bg-muted/40" onClick={() => { setSelectedContact(c); setViewDialogOpen(true); }}><Eye className="h-4 w-4" /></Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl bg-muted/40" onClick={() => openEdit(c)}><Edit2 className="h-4 w-4" /></Button>
                                                    <Button variant="secondary" size="sm" className="h-8 px-3 text-[11px] font-bold gap-1.5 rounded-xl shadow-sm" onClick={() => openActivity(c)}><MessageSquarePlus className="h-3.5 w-3.5" /></Button>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>
            ) : (
                <Card className="border-border/40 overflow-hidden rounded-2xl shadow-sm bg-card/50 backdrop-blur-sm">
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/30 hover:bg-muted/30 border-b border-border/60">
                                        <TableHead className="font-bold text-[11px] uppercase tracking-wider">{t("crm.contacts.fullName")}</TableHead>
                                        <TableHead className="font-bold text-[11px] uppercase tracking-wider">{t("crm.contacts.type")}</TableHead>
                                        <TableHead className="font-bold text-[11px] uppercase tracking-wider">{t("common.email")}</TableHead>
                                        <TableHead className="font-bold text-[11px] uppercase tracking-wider">{t("common.phone")}</TableHead>
                                        <TableHead className="font-bold text-[11px] uppercase tracking-wider">{t("crm.contacts.score")}</TableHead>
                                        <TableHead className="font-bold text-[11px] uppercase tracking-wider">{t("crm.contacts.tags")}</TableHead>
                                        <TableHead className="text-right font-bold text-[11px] uppercase tracking-wider">{t("common.actions")}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filtered.map((c) => (
                                        <TableRow key={c.id} className="group hover:bg-primary/[0.02] border-b border-border/40 transition-colors">
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary font-black text-xs shrink-0 shadow-inner">
                                                        {c.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <span className="font-bold text-sm tracking-tight">{c.name}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell><Badge variant="outline" className="text-[10px] font-black border-primary/20 bg-primary/5 text-primary">{c.type === "pessoa_juridica" ? "PJ" : "PF"}</Badge></TableCell>
                                            <TableCell className="text-muted-foreground font-medium text-xs">{c.email || "—"}</TableCell>
                                            <TableCell className="text-muted-foreground font-medium text-xs">{c.phone || "—"}</TableCell>
                                            <TableCell><StarRating score={c.score} /></TableCell>
                                            <TableCell>
                                                <div className="flex flex-wrap gap-1">
                                                    {c.tags.map((tag) => (
                                                        <Badge key={tag} variant="outline" className={cn("text-[9px] px-2 py-0.5 font-bold border-none rounded-full", TAG_COLORS[tag])}>
                                                            {tag}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" onClick={() => openEdit(c)}><Edit2 className="h-4 w-4" /></Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" onClick={() => openActivity(c)}><MessageSquarePlus className="h-4 w-4" /></Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-muted-foreground hover:text-destructive" onClick={() => { setSelectedContact(c); setDeleteDialogOpen(true); }}><Trash2 className="h-4 w-4" /></Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Dialogs - Professional Styling */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-md rounded-[32px] border-none shadow-2xl p-0 overflow-hidden">
                    <div className="bg-gradient-to-br from-primary to-primary/90 p-7 text-white">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-3 text-white">
                                {editingId ? <Edit2 className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
                                {editingId ? t("crm.contacts.editContact") : t("crm.contacts.newContact")}
                            </DialogTitle>
                        </DialogHeader>
                    </div>
                    <form onSubmit={handleSubmit} className="p-7 space-y-5 bg-background">
                        <FormField label={t("crm.contacts.fullName")} value={form.name} onChange={(v) => setForm((p: any) => ({ ...p, name: v }))} placeholder="Ex: João da Silva" required />
                        <div className="grid grid-cols-2 gap-4">
                            <FormField label={t("common.email")} value={form.email} onChange={(v) => setForm((p: any) => ({ ...p, email: v }))} placeholder="email@exemplo.com" type="email" />
                            <FormField label={t("common.phone")} value={form.phone} onChange={(v) => setForm((p: any) => ({ ...p, phone: v }))} placeholder="(00) 00000-0000" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">{t("crm.contacts.type")}</label>
                                <Select value={form.type} onValueChange={(v: any) => setForm((p: any) => ({ ...p, type: v }))}>
                                    <SelectTrigger className="h-11 bg-background rounded-xl border-border/60 shadow-sm"><SelectValue /></SelectTrigger>
                                    <SelectContent className="rounded-xl border-border/40 shadow-xl">
                                        <SelectItem value="pessoa_fisica">{t("clients.pf")}</SelectItem>
                                        <SelectItem value="pessoa_juridica">{t("clients.pj")}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <FormField label={t("crm.contacts.company")} value={form.company} onChange={(v) => setForm((p: any) => ({ ...p, company: v }))} placeholder="Nome da empresa" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <FormField label={t("crm.contacts.city")} value={form.city} onChange={(v) => setForm((p: any) => ({ ...p, city: v }))} />
                            <FormField label={t("crm.contacts.state")} value={form.state} onChange={(v) => setForm((p: any) => ({ ...p, state: v }))} placeholder="UF" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">{t("crm.contacts.score")}</label>
                            <div className="bg-muted/30 p-2.5 rounded-xl border border-border/20 inline-block">
                                <StarRating score={form.score} onChange={(s) => setForm((p: any) => ({ ...p, score: s }))} />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">{t("crm.contacts.tags")}</label>
                            <div className="flex flex-wrap gap-2">
                                {ALL_TAGS.map((tag) => (
                                    <Badge
                                        key={tag}
                                        variant="outline"
                                        className={cn(
                                            "text-[10px] font-bold uppercase cursor-pointer transition-all px-3 py-1 rounded-full border-border/40",
                                            form.tags.includes(tag) ? TAG_COLORS[tag] + " ring-2 ring-primary/20 scale-105" : "bg-muted/20 opacity-60 hover:opacity-100"
                                        )}
                                        onClick={() => toggleTag(tag)}
                                    >
                                        {tag}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 pt-3">
                            <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)} className="rounded-xl">
                                {t("common.cancel")}
                            </Button>
                            <Button type="submit" className="gap-2 rounded-xl shadow-lg shadow-primary/20 h-11 px-8 font-bold">
                                {editingId ? t("common.save") : t("common.create")}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* View Contact Dialog */}
            <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
                <DialogContent className="max-w-md rounded-[32px] border-none shadow-2xl p-0 overflow-hidden">
                    {selectedContact && (() => {
                        const stats = getContactStats(selectedContact.id);
                        return (<>
                            <div className="bg-gradient-to-br from-primary to-primary/80 p-8 text-white">
                                <div className="flex items-center gap-5">
                                    <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white/20 backdrop-blur-md shadow-inner text-white font-black text-3xl ring-1 ring-white/30">
                                        {selectedContact.name.charAt(0)}
                                    </div>
                                    <div className="min-w-0">
                                        <h2 className="text-2xl font-black tracking-tight truncate">{selectedContact.name}</h2>
                                        <div className="flex items-center gap-2 mt-2">
                                            <Badge variant="outline" className="text-[10px] font-bold bg-white/20 text-white border-none rounded-full">
                                                {selectedContact.type === "pessoa_juridica" ? "PJ" : "PF"}
                                            </Badge>
                                            <StarRating score={selectedContact.score} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="p-7 space-y-6 bg-background">
                                <div className="grid grid-cols-2 gap-6 text-sm">
                                    {selectedContact.email && <div><span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t("common.email")}</span><p className="font-semibold mt-1 truncate">{selectedContact.email}</p></div>}
                                    {selectedContact.phone && <div><span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t("common.phone")}</span><p className="font-semibold mt-1">{selectedContact.phone}</p></div>}
                                    {selectedContact.company && <div><span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t("crm.contacts.company")}</span><p className="font-semibold mt-1 truncate">{selectedContact.company}</p></div>}
                                    {selectedContact.city && <div><span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Local</span><p className="font-semibold mt-1">{selectedContact.city}/{selectedContact.state}</p></div>}
                                </div>
                                <div className="flex items-center gap-2 rounded-2xl bg-muted/30 p-4 border border-border/20">
                                    <div className="flex-1 text-center"><p className="font-black text-xl text-primary">{stats.leadsCount}</p><p className="text-[9px] font-bold uppercase tracking-tighter text-muted-foreground opacity-60">Leads</p></div>
                                    <div className="h-8 w-px bg-border/40" />
                                    <div className="flex-1 text-center"><p className="font-black text-xl text-primary">{stats.dealsCount}</p><p className="text-[9px] font-bold uppercase tracking-tighter text-muted-foreground opacity-60">Deals</p></div>
                                    <div className="h-8 w-px bg-border/40" />
                                    <div className="flex-1 text-center"><p className="font-black text-xl text-primary">{stats.activitiesCount}</p><p className="text-[9px] font-bold uppercase tracking-tighter text-muted-foreground opacity-60">Ativ.</p></div>
                                </div>
                                {selectedContact.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 pt-1">
                                        {selectedContact.tags.map((tag) => (
                                            <Badge key={tag} variant="outline" className={cn("text-[10px] font-bold px-3 py-1 border-none rounded-full", TAG_COLORS[tag])}>
                                                {tag}
                                            </Badge>
                                        ))}
                                    </div>
                                )}
                                <div className="flex justify-end gap-3 pt-2">
                                    <Button variant="ghost" onClick={() => setViewDialogOpen(false)} className="rounded-xl">{t("common.close")}</Button>
                                    <Button onClick={() => { setViewDialogOpen(false); openEdit(selectedContact); }} className="rounded-xl px-8 font-bold shadow-lg shadow-primary/10">{t("common.edit")}</Button>
                                </div>
                            </div>
                        </>);
                    })()}</DialogContent>
            </Dialog>

            {/* Activity Dialog */}
            <Dialog open={activityDialogOpen} onOpenChange={setActivityDialogOpen}>
                <DialogContent className="max-w-md rounded-[32px] border-none shadow-2xl p-0 overflow-hidden">
                    <div className="bg-primary/5 p-7 border-b border-border/20">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-primary">
                                <MessageSquarePlus className="h-5 w-5" /> {t("crm.contacts.registerActivity")}
                            </DialogTitle>
                        </DialogHeader>
                    </div>
                    {selectedContact && (
                        <div className="p-7 space-y-5 bg-background">
                            <div className="flex items-center gap-3 rounded-2xl bg-muted/40 p-3 border border-border/20">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold text-sm shadow-inner">{selectedContact.name.charAt(0)}</div>
                                <div className="min-w-0">
                                    <p className="text-sm font-bold truncate tracking-tight">{selectedContact.name}</p>
                                    <p className="text-[11px] text-muted-foreground/60">{selectedContact.email || selectedContact.phone || "—"}</p>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">{t("crm.contacts.activityType")}</label>
                                <Select value={activityType} onValueChange={setActivityType}>
                                    <SelectTrigger className="h-11 bg-background rounded-xl border-border/60 shadow-sm"><SelectValue /></SelectTrigger>
                                    <SelectContent className="rounded-xl shadow-xl">
                                        <SelectItem value="ligacao">📞 {t("crm.tabs.activities")} - Ligação</SelectItem>
                                        <SelectItem value="email">✉️ E-mail</SelectItem>
                                        <SelectItem value="reuniao">📅 Reunião</SelectItem>
                                        <SelectItem value="tarefa">✅ Tarefa</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">{t("common.description")}</label>
                                <Textarea
                                    value={activityNote}
                                    onChange={(e) => setActivityNote(e.target.value)}
                                    rows={4}
                                    placeholder={t("crm.contacts.activityDesc")}
                                    className="bg-background rounded-xl border-border/60 shadow-sm focus-visible:ring-primary/20 transition-all"
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <Button variant="ghost" onClick={() => setActivityDialogOpen(false)} className="rounded-xl">{t("common.cancel")}</Button>
                                <Button onClick={handleActivitySubmit} className="rounded-xl px-8 font-bold shadow-lg shadow-primary/20">{t("common.confirm")}</Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Delete Dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent className="max-w-sm rounded-[28px] border-none shadow-2xl p-6">
                    <DialogHeader><DialogTitle className="font-bold text-lg">{t("common.delete")}</DialogTitle></DialogHeader>
                    <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                        Tem certeza que deseja excluir o contato <strong className="text-foreground">{selectedContact?.name}</strong>? Esta ação é irreversível.
                    </p>
                    <div className="flex justify-end gap-3 pt-6">
                        <Button variant="ghost" onClick={() => setDeleteDialogOpen(false)} className="rounded-xl">{t("common.cancel")}</Button>
                        <Button variant="destructive" onClick={handleDelete} className="rounded-xl px-8 font-bold shadow-lg shadow-destructive/10">{t("common.delete")}</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
