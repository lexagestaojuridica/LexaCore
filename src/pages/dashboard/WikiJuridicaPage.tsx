import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
    BookOpen, Plus, Search, Edit2, Trash2, Eye, Tag, Star, StarOff,
    ChevronRight, X, BookMarked, FileText, Lightbulb, Scale, Hash,
    ArrowUpRight, ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types ────────────────────────────────────────────────────

interface WikiEntry {
    id: string;
    organization_id: string;
    user_id: string;
    title: string;
    content: string;
    category: string;
    tags: string[];
    is_pinned: boolean;
    is_public: boolean;
    created_at: string;
    updated_at: string;
    views: number;
}

// ─── Categories ───────────────────────────────────────────────

const CATEGORIES = [
    { value: "tese", label: "Teses Jurídicas", icon: Scale, color: "text-primary bg-primary/10" },
    { value: "modelo", label: "Modelos e Precedentes", icon: FileText, color: "text-emerald-600 bg-emerald-500/10" },
    { value: "procedimento", label: "Procedimentos Internos", icon: BookMarked, color: "text-amber-600 bg-amber-500/10" },
    { value: "jurisprudencia", label: "Jurisprudência", icon: BookOpen, color: "text-violet-600 bg-violet-500/10" },
    { value: "dica", label: "Dicas & Best Practices", icon: Lightbulb, color: "text-orange-600 bg-orange-500/10" },
    { value: "outro", label: "Outros", icon: Hash, color: "text-muted-foreground bg-muted" },
];

const getCat = (value: string) => CATEGORIES.find((c) => c.value === value) ?? CATEGORIES[5];

// ─── Skeleton ──────────────────────────────────────────────────

function WikiSkeleton() {
    return (
        <div className="space-y-3">
            {[1, 2, 3].map((n) => (
                <div key={n} className="rounded-xl border border-border/60 p-4 space-y-2 animate-pulse">
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-muted/50" />
                        <div className="h-4 flex-1 rounded bg-muted/50" />
                    </div>
                    <div className="h-3 w-3/4 rounded bg-muted/40" />
                </div>
            ))}
        </div>
    );
}

// ─── Rich text display ─────────────────────────────────────────
function ContentDisplay({ content }: { content: string }) {
    return (
        <div
            className="prose prose-sm dark:prose-invert max-w-none text-sm text-foreground leading-relaxed whitespace-pre-wrap"
            style={{ fontFamily: "inherit" }}
        >
            {content}
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────

export default function WikiJuridicaPage() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [search, setSearch] = useState("");
    const [filterCat, setFilterCat] = useState("all");
    const [filterPin, setFilterPin] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [viewEntry, setViewEntry] = useState<WikiEntry | null>(null);
    const [editEntry, setEditEntry] = useState<WikiEntry | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [form, setForm] = useState({
        title: "", content: "", category: "tese", tags: "", is_pinned: false,
    });

    const { data: profile } = useQuery({
        queryKey: ["profile", user?.id],
        queryFn: async () => {
            const { data } = await supabase.from("profiles").select("organization_id").eq("user_id", user!.id).single();
            return data;
        },
        enabled: !!user,
    });
    const orgId = profile?.organization_id;

    const { data: entries = [], isLoading } = useQuery({
        queryKey: ["wiki", orgId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("wiki_juridica" as any)
                .select("*")
                .eq("organization_id", orgId!)
                .order("is_pinned", { ascending: false })
                .order("updated_at", { ascending: false });
            if (error) return [] as WikiEntry[];
            return (data ?? []) as WikiEntry[];
        },
        enabled: !!orgId,
    });

    const createMutation = useMutation({
        mutationFn: async (payload: any) => {
            const { error } = await supabase.from("wiki_juridica" as any).insert(payload);
            if (error) throw error;
        },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["wiki"] }); toast.success("Artigo criado!"); closeDialog(); },
        onError: () => toast.error("Erro ao criar. Execute a migration SQL da Wiki."),
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, ...payload }: any) => {
            const { error } = await supabase.from("wiki_juridica" as any).update(payload).eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["wiki"] });
            toast.success("Artigo atualizado!");
            closeDialog();
            if (viewEntry) setViewEntry(null);
        },
        onError: () => toast.error("Erro ao atualizar"),
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from("wiki_juridica" as any).delete().eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["wiki"] }); toast.success("Artigo excluído"); setDeleteId(null); setViewEntry(null); },
    });

    const togglePin = (entry: WikiEntry) => updateMutation.mutate({ id: entry.id, is_pinned: !entry.is_pinned });

    const closeDialog = () => {
        setDialogOpen(false); setEditEntry(null);
        setForm({ title: "", content: "", category: "tese", tags: "", is_pinned: false });
    };

    const openEdit = (entry: WikiEntry) => {
        setEditEntry(entry);
        setForm({ title: entry.title, content: entry.content, category: entry.category, tags: entry.tags.join(", "), is_pinned: entry.is_pinned });
        setDialogOpen(true);
    };

    const openCreate = () => { setEditEntry(null); setForm({ title: "", content: "", category: "tese", tags: "", is_pinned: false }); setDialogOpen(true); };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.title.trim() || !form.content.trim()) { toast.error("Título e conteúdo são obrigatórios"); return; }
        const tags = form.tags.split(",").map((t) => t.trim()).filter(Boolean);
        const payload = {
            title: form.title.trim(), content: form.content.trim(),
            category: form.category, tags, is_pinned: form.is_pinned,
        };
        if (editEntry) {
            updateMutation.mutate({ id: editEntry.id, ...payload });
        } else {
            createMutation.mutate({ ...payload, organization_id: orgId!, user_id: user!.id, views: 0, is_public: false });
        }
    };

    // Filter
    const filtered = entries.filter((e) => {
        const matchCat = filterCat === "all" || e.category === filterCat;
        const matchPin = !filterPin || e.is_pinned;
        const q = search.toLowerCase();
        const matchSearch = !q || e.title.toLowerCase().includes(q) || e.content.toLowerCase().includes(q) || e.tags.some((t) => t.toLowerCase().includes(q));
        return matchCat && matchPin && matchSearch;
    });

    // Stats
    const totalByCategory = CATEGORIES.map((c) => ({ ...c, count: entries.filter((e) => e.category === c.value).length })).filter((c) => c.count > 0);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-foreground">Wiki Jurídica</h1>
                    <p className="text-sm text-muted-foreground">Base de conhecimento interna do escritório</p>
                </div>
                <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Novo Artigo</Button>
            </div>

            {/* Category stats */}
            {totalByCategory.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => setFilterCat("all")}
                        className={cn("flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-all", filterCat === "all" ? "border-primary/50 bg-primary/5 text-primary font-medium" : "border-border/60 text-muted-foreground hover:border-primary/30")}
                    >
                        Todos <span className="font-bold">{entries.length}</span>
                    </button>
                    {totalByCategory.map((c) => {
                        const Icon = c.icon;
                        return (
                            <button
                                key={c.value}
                                onClick={() => setFilterCat(filterCat === c.value ? "all" : c.value)}
                                className={cn("flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-all", filterCat === c.value ? "border-primary/50 bg-primary/5 text-primary font-medium" : "border-border/60 text-muted-foreground hover:border-primary/30")}
                            >
                                <Icon className="h-3 w-3" />
                                {c.label} <span className="font-bold">{c.count}</span>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Search + Filters */}
            <Card className="border-border/60">
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar artigos, tags, teses..." className="pl-9" />
                    </div>
                    <button
                        onClick={() => setFilterPin(!filterPin)}
                        className={cn("flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-all shrink-0", filterPin ? "border-amber-500/50 bg-amber-500/5 text-amber-600" : "border-border/60 text-muted-foreground hover:border-amber-500/30")}
                    >
                        <Star className={cn("h-3.5 w-3.5", filterPin && "fill-current")} /> Fixados
                    </button>
                </CardContent>
            </Card>

            {/* Entries grid */}
            {isLoading ? (
                <WikiSkeleton />
            ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center py-16 text-center">
                    <BookOpen className="mb-4 h-12 w-12 text-muted-foreground/20" />
                    <p className="text-sm text-muted-foreground">{entries.length === 0 ? "Nenhum artigo ainda." : "Nenhum resultado encontrado."}</p>
                    {entries.length === 0 && <Button variant="outline" size="sm" className="mt-3 gap-1.5 text-xs" onClick={openCreate}><Plus className="h-3 w-3" /> Criar primeiro artigo</Button>}
                </div>
            ) : (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    <AnimatePresence>
                        {filtered.map((entry, i) => {
                            const cat = getCat(entry.category);
                            const Icon = cat.icon;
                            return (
                                <motion.div
                                    key={entry.id}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.03 }}
                                    className="group rounded-xl border border-border/60 bg-card p-4 hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer"
                                    onClick={() => setViewEntry(entry)}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", cat.color)}>
                                            <Icon className="h-4 w-4" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-1.5">
                                                {entry.is_pinned && <Star className="h-3 w-3 text-amber-500 fill-current shrink-0" />}
                                                <p className="text-sm font-semibold text-foreground leading-tight line-clamp-1">{entry.title}</p>
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">{entry.content.slice(0, 120)}</p>
                                        </div>
                                    </div>
                                    {entry.tags.length > 0 && (
                                        <div className="mt-3 flex flex-wrap gap-1">
                                            {entry.tags.slice(0, 3).map((t) => (
                                                <span key={t} className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">#{t}</span>
                                            ))}
                                            {entry.tags.length > 3 && <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">+{entry.tags.length - 3}</span>}
                                        </div>
                                    )}
                                    <div className="mt-3 flex items-center justify-between border-t border-border/40 pt-2">
                                        <span className="text-[10px] text-muted-foreground">{format(new Date(entry.updated_at), "dd/MM/yyyy", { locale: ptBR })}</span>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={(e) => { e.stopPropagation(); togglePin(entry); }} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-amber-500 transition-colors"><Star className={cn("h-3 w-3", entry.is_pinned && "fill-current text-amber-500")} /></button>
                                            <button onClick={(e) => { e.stopPropagation(); openEdit(entry); }} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"><Edit2 className="h-3 w-3" /></button>
                                            <button onClick={(e) => { e.stopPropagation(); setDeleteId(entry.id); }} className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="h-3 w-3" /></button>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>
            )}

            {/* View Dialog */}
            <Dialog open={!!viewEntry} onOpenChange={(o) => !o && setViewEntry(null)}>
                <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto p-0">
                    {viewEntry && (() => {
                        const cat = getCat(viewEntry.category);
                        const Icon = cat.icon;
                        return (
                            <>
                                <div className="flex items-start justify-between gap-4 border-b border-border bg-card px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", cat.color)}>
                                            <Icon className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <DialogTitle className="text-base font-semibold leading-tight">{viewEntry.title}</DialogTitle>
                                            <p className="text-xs text-muted-foreground mt-0.5">{cat.label} · {format(new Date(viewEntry.updated_at), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setViewEntry(null)}><X className="h-4 w-4" /></Button>
                                </div>
                                <div className="space-y-4 px-6 py-5">
                                    <ContentDisplay content={viewEntry.content} />
                                    {viewEntry.tags.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border/60">
                                            {viewEntry.tags.map((t) => <Badge key={t} variant="secondary" className="text-xs">#{t}</Badge>)}
                                        </div>
                                    )}
                                    <div className="flex justify-end gap-2 pt-2">
                                        <Button variant="outline" onClick={() => setViewEntry(null)}>Fechar</Button>
                                        <Button onClick={() => { setViewEntry(null); openEdit(viewEntry); }}>Editar</Button>
                                    </div>
                                </div>
                            </>
                        );
                    })()}
                </DialogContent>
            </Dialog>

            {/* Create/Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={(o) => !o && closeDialog()}>
                <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto p-0">
                    <div className="flex items-center justify-between border-b border-border bg-card px-6 py-4">
                        <div>
                            <DialogTitle className="text-lg font-semibold">{editEntry ? "Editar Artigo" : "Novo Artigo"}</DialogTitle>
                            <p className="text-xs text-muted-foreground">Base de conhecimento jurídico</p>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={closeDialog}><X className="h-4 w-4" /></Button>
                    </div>
                    <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Título *</label>
                            <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Nome da tese, modelo ou procedimento..." required />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Categoria</label>
                                <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tags (separadas por vírgula)</label>
                                <Input value={form.tags} onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))} placeholder="STJ, trabalhista, dano moral..." />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Conteúdo *</label>
                            <Textarea value={form.content} onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))} rows={10} placeholder="Descreva a tese jurídica, o modelo, os fundamentos legais, jurisprudência relevante..." required className="font-mono text-sm" />
                        </div>
                        <div className="flex items-center gap-3">
                            <input type="checkbox" id="pin" checked={form.is_pinned} onChange={(e) => setForm((f) => ({ ...f, is_pinned: e.target.checked }))} className="rounded" />
                            <label htmlFor="pin" className="text-sm text-muted-foreground cursor-pointer flex items-center gap-1.5"><Star className="h-3.5 w-3.5 text-amber-500" /> Fixar no topo</label>
                        </div>
                        <Separator />
                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={closeDialog}>Cancelar</Button>
                            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>{editEntry ? "Salvar" : "Criar Artigo"}</Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Dialog */}
            <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
                <DialogContent className="max-w-sm">
                    <DialogHeader><DialogTitle>Excluir Artigo</DialogTitle></DialogHeader>
                    <p className="text-sm text-muted-foreground">Esta ação não pode ser desfeita.</p>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="outline" onClick={() => setDeleteId(null)}>Cancelar</Button>
                        <Button variant="destructive" onClick={() => deleteId && deleteMutation.mutate(deleteId)}>Excluir</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
