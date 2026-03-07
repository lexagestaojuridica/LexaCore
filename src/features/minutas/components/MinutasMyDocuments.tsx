import { useState } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { Search, Star, Grid2X2, List, Plus, Trash2, Edit2, Copy, Eye, FileText, Heart, Clock, BarChart3, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import FormField from "@/components/shared/FormField";
import { useMinutas, CATEGORY_CONFIG, DocumentCategory } from "@/features/minutas/contexts/MinutasContext";

export default function MinutasMyDocuments({ onOpenEditor }: { onOpenEditor: (id: string) => void }) {
    const { documents, createDocument, updateDocument, deleteDocument, toggleFavorite } = useMinutas();
    const [search, setSearch] = useState("");
    const debouncedSearch = useDebounce(search, 400);
    const [catFilter, setCatFilter] = useState("todos");
    const [favFilter, setFavFilter] = useState(false);
    const [createOpen, setCreateOpen] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [form, setForm] = useState({ title: "", category: "peticoes" as DocumentCategory, tags: "" });

    const filtered = documents.filter((d) => {
        const q = debouncedSearch.toLowerCase();
        const matchSearch = !q || d.title.toLowerCase().includes(q) || d.tags.some((t) => t.toLowerCase().includes(q));
        const matchCat = catFilter === "todos" || d.category === catFilter;
        const matchFav = !favFilter || d.favorite;
        return matchSearch && matchCat && matchFav;
    });

    const handleCreate = () => {
        if (!form.title) return;
        const id = createDocument({
            title: form.title, category: form.category,
            content: `<h1>${form.title}</h1><p><br></p><p>Comece a redigir aqui...</p>`,
            variables: [], tags: form.tags ? form.tags.split(",").map((t) => t.trim()) : [],
            favorite: false, source: "manual",
        });
        setCreateOpen(false);
        setForm({ title: "", category: "peticoes", tags: "" });
        onOpenEditor(id);
    };

    const totalDocs = documents.length;
    const favCount = documents.filter((d) => d.favorite).length;
    const thisWeek = documents.filter((d) => {
        const diff = Date.now() - new Date(d.updatedAt).getTime();
        return diff < 7 * 24 * 60 * 60 * 1000;
    }).length;
    const topCategory = Object.entries(
        documents.reduce<Record<string, number>>((acc, d) => { acc[d.category] = (acc[d.category] || 0) + 1; return acc; }, {})
    ).sort((a, b) => b[1] - a[1])[0];

    return (
        <div className="space-y-5">
            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                    { label: "Total Minutas", value: totalDocs, icon: FileText, color: "text-foreground", bg: "bg-muted", accent: "bg-primary" },
                    { label: "Favoritos", value: favCount, icon: Heart, color: "text-amber-600", bg: "bg-amber-50", accent: "bg-amber-500" },
                    { label: "Editados esta Semana", value: thisWeek, icon: Clock, color: "text-blue-600", bg: "bg-blue-50", accent: "bg-blue-500" },
                    { label: "Mais Usada", value: topCategory ? CATEGORY_CONFIG[topCategory[0] as DocumentCategory]?.label || "—" : "—", icon: BarChart3, color: "text-emerald-600", bg: "bg-emerald-50", accent: "bg-emerald-500" },
                ].map((kpi) => (
                    <Card key={kpi.label} className="border-border/50 overflow-hidden group hover:shadow-md transition-all duration-300">
                        <div className="p-4"><div className="flex items-center justify-between mb-2.5"><p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{kpi.label}</p><div className={`flex h-8 w-8 items-center justify-center rounded-lg ${kpi.bg} transition-transform group-hover:scale-110`}><kpi.icon className={`h-4 w-4 ${kpi.color}`} /></div></div><p className={`text-xl font-bold ${kpi.color}`}>{kpi.value}</p></div>
                        <div className={`h-0.5 ${kpi.accent} opacity-60`} />
                    </Card>
                ))}
            </div>

            {/* Filters */}
            <Card className="border-border/50">
                <CardContent className="flex flex-wrap items-center gap-3 p-3">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input placeholder="Buscar minuta..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
                    </div>
                    <Select value={catFilter} onValueChange={setCatFilter}>
                        <SelectTrigger className="w-[150px] h-9"><Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" /><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="todos">Todas</SelectItem>
                            {Object.entries(CATEGORY_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.emoji} {v.label}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Button variant={favFilter ? "default" : "ghost"} size="sm" className="gap-1 h-9" onClick={() => setFavFilter(!favFilter)}>
                        <Star className={`h-3.5 w-3.5 ${favFilter ? "fill-current" : ""}`} /> Favoritos
                    </Button>
                    <Button className="gap-1.5 shadow-sm h-9" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> Nova Minuta</Button>
                </CardContent>
            </Card>

            {/* Document Grid */}
            {filtered.length === 0 ? (
                <Card className="border-border/50"><CardContent className="flex flex-col items-center justify-center py-20 text-center"><div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-3"><FileText className="h-7 w-7 text-muted-foreground/30" /></div><p className="text-sm font-medium text-muted-foreground">Nenhuma minuta encontrada</p><p className="text-xs text-muted-foreground/50 mt-1">Crie uma nova ou importe da Biblioteca</p></CardContent></Card>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map((doc) => {
                        const cat = CATEGORY_CONFIG[doc.category];
                        return (
                            <Card key={doc.id} className="border-border/50 hover:shadow-md transition-all duration-200 group overflow-hidden cursor-pointer"
                                onClick={() => onOpenEditor(doc.id)}>
                                <div className={`h-1 ${cat.color}`} />
                                <CardContent className="p-4 space-y-2.5">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${cat.color}/10 text-base shrink-0`}>{cat.emoji}</div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-foreground truncate">{doc.title}</p>
                                                <Badge variant="outline" className="text-[9px] mt-0.5">{cat.label}</Badge>
                                            </div>
                                        </div>
                                        <button onClick={(e) => { e.stopPropagation(); toggleFavorite(doc.id); }} className="shrink-0 transition-transform hover:scale-110">
                                            <Star className={`h-4 w-4 ${doc.favorite ? "fill-amber-400 text-amber-400" : "text-muted-foreground/20 hover:text-amber-300"}`} />
                                        </button>
                                    </div>

                                    {/* Tags */}
                                    {doc.tags.length > 0 && (
                                        <div className="flex flex-wrap gap-1">
                                            {doc.tags.map((tag) => <Badge key={tag} variant="outline" className="text-[9px] bg-muted/30">{tag}</Badge>)}
                                        </div>
                                    )}

                                    {/* Stats */}
                                    <div className="flex items-center justify-between text-[10px] text-muted-foreground/50 pt-1 border-t border-border/30">
                                        <span>Editado: {new Date(doc.updatedAt).toLocaleDateString("pt-BR")}</span>
                                        <div className="flex items-center gap-2">
                                            {doc.source === "library" && <Badge variant="outline" className="text-[8px] bg-violet-50 text-violet-600 border-violet-200">Biblioteca</Badge>}
                                            <span>{doc.usageCount}x usado</span>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all pt-1">
                                        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 flex-1" onClick={(e) => { e.stopPropagation(); onOpenEditor(doc.id); }}><Edit2 className="h-3 w-3" /> Editar</Button>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteConfirm(doc.id); }}><Trash2 className="h-3 w-3" /></Button>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Create Dialog */}
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader><DialogTitle className="flex items-center gap-2"><Plus className="h-4 w-4" /> Nova Minuta</DialogTitle></DialogHeader>
                    <div className="space-y-4 pt-2">
                        <FormField label="Título" value={form.title} onChange={(v) => setForm((p) => ({ ...p, title: v }))} placeholder="Ex: Petição — Caso Silva" required />
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Categoria</label>
                            <Select value={form.category} onValueChange={(v: any) => setForm((p) => ({ ...p, category: v }))}>
                                <SelectTrigger className="h-10 bg-background"><SelectValue /></SelectTrigger>
                                <SelectContent>{Object.entries(CATEGORY_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.emoji} {v.label}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <FormField label="Tags (separadas por vírgula)" value={form.tags} onChange={(v) => setForm((p) => ({ ...p, tags: v }))} placeholder="Ex: Trabalhista, Urgente" />
                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
                            <Button className="gap-1.5" onClick={handleCreate}><Plus className="h-3.5 w-3.5" /> Criar e Editar</Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Delete Confirm */}
            <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
                <DialogContent className="max-w-sm">
                    <DialogHeader><DialogTitle>Excluir Minuta</DialogTitle></DialogHeader>
                    <p className="text-sm text-muted-foreground">Tem certeza? Esta ação não pode ser desfeita.</p>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
                        <Button variant="destructive" onClick={() => { if (deleteConfirm) deleteDocument(deleteConfirm); setDeleteConfirm(null); }}>Excluir</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
