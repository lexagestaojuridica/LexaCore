import { useState } from "react";
import { useDebounce } from "@/shared/hooks/useDebounce";
import { Search, Download, ExternalLink, Filter, BookOpen, TrendingUp, Library } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Card, CardContent } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { useMinutas, CATEGORY_CONFIG, DocumentCategory } from "@/features/minutas/contexts/MinutasContext";

export default function MinutasLibrary({ onOpenEditor }: { onOpenEditor: (id: string) => void }) {
    const { library, duplicateFromLibrary } = useMinutas();
    const [search, setSearch] = useState("");
    const debouncedSearch = useDebounce(search, 400);
    const [catFilter, setCatFilter] = useState("todos");
    const [areaFilter, setAreaFilter] = useState("todos");

    const areas = [...new Set(library.map((t) => t.area))];

    const filtered = library.filter((t) => {
        const q = debouncedSearch.toLowerCase();
        const matchSearch = !q || t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q);
        const matchCat = catFilter === "todos" || t.category === catFilter;
        const matchArea = areaFilter === "todos" || t.area === areaFilter;
        return matchSearch && matchCat && matchArea;
    });

    const handleUse = (templateId: string) => {
        const newDocId = duplicateFromLibrary(templateId);
        if (newDocId) onOpenEditor(newDocId);
    };

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-base font-semibold text-foreground flex items-center gap-2"><BookOpen className="h-4 w-4" /> Biblioteca de Modelos</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Modelos jurídicos pré-prontos — use como base para seus documentos</p>
                </div>
                <Badge variant="outline" className="text-xs">{library.length} modelos disponíveis</Badge>
            </div>

            {/* Filters */}
            <Card className="border-border/50">
                <CardContent className="flex flex-wrap items-center gap-3 p-3">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input placeholder="Buscar modelo..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
                    </div>
                    <Select value={catFilter} onValueChange={setCatFilter}>
                        <SelectTrigger className="w-[150px] h-9"><Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" /><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="todos">Todas Categorias</SelectItem>
                            {Object.entries(CATEGORY_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.emoji} {v.label}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Select value={areaFilter} onValueChange={setAreaFilter}>
                        <SelectTrigger className="w-[140px] h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="todos">Todas Áreas</SelectItem>
                            {areas.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </CardContent>
            </Card>

            {/* Template Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((t) => {
                    const cat = CATEGORY_CONFIG[t.category];
                    return (
                        <Card key={t.id} className="border-border/50 hover:shadow-md transition-all duration-200 group overflow-hidden">
                            <div className={`h-1.5 ${cat.color}`} />
                            <CardContent className="p-4 space-y-3">
                                <div className="flex items-start gap-3">
                                    <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${cat.color}/10 text-lg shrink-0 transition-transform group-hover:scale-105`}>{cat.emoji}</div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-semibold text-foreground leading-tight">{t.title}</p>
                                        <div className="flex items-center gap-1.5 mt-1">
                                            <Badge variant="outline" className="text-[9px]">{cat.label}</Badge>
                                            <Badge variant="outline" className="text-[9px] bg-primary/5 text-primary border-primary/20">{t.area}</Badge>
                                        </div>
                                    </div>
                                </div>

                                <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">{t.description}</p>

                                <div className="flex items-center gap-3 text-[10px] text-muted-foreground/50">
                                    <span className="flex items-center gap-1">📝 {t.variables.length} campos variáveis</span>
                                    <span className="flex items-center gap-1"><TrendingUp className="h-2.5 w-2.5" /> {t.downloads.toLocaleString()} usos</span>
                                </div>

                                {/* Variable preview */}
                                {t.variables.length > 0 && (
                                    <div className="flex flex-wrap gap-1 pt-1 border-t border-border/30">
                                        {t.variables.slice(0, 4).map((v) => (
                                            <span key={v.key} className="text-[9px] bg-amber-50 text-amber-700 border border-amber-200 rounded px-1.5 py-0.5">{`{{${v.key}}}`}</span>
                                        ))}
                                        {t.variables.length > 4 && <span className="text-[9px] text-muted-foreground/40">+{t.variables.length - 4}</span>}
                                    </div>
                                )}

                                <Button className="w-full gap-1.5 shadow-sm" size="sm" onClick={() => handleUse(t.id)}>
                                    <Download className="h-3.5 w-3.5" /> Usar Modelo
                                </Button>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {filtered.length === 0 && (
                <Card className="border-border/50"><CardContent className="flex flex-col items-center justify-center py-20 text-center"><div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-3"><BookOpen className="h-7 w-7 text-muted-foreground/30" /></div><p className="text-sm font-medium text-muted-foreground">Nenhum modelo encontrado</p></CardContent></Card>
            )}
        </div>
    );
}
