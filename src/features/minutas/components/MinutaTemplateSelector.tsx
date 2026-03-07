import { useState } from "react";
import { Search, FileText, ChevronRight, FilePlus, Bot, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useMinutas, CATEGORY_CONFIG, LibraryTemplate } from "@/features/minutas/contexts/MinutasContext";
import { autoFillTemplate } from "@/lib/DocumentTemplateEngine";
import { useNavigate } from "react-router-dom";

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    processo: any;
}

export function MinutaTemplateSelector({ open, onOpenChange, processo }: Props) {
    const { library, createDocument, setOpenDocument } = useMinutas();
    const [search, setSearch] = useState("");
    const navigate = useNavigate();

    const filtered = library.filter(t =>
        t.title.toLowerCase().includes(search.toLowerCase()) ||
        t.description.toLowerCase().includes(search.toLowerCase()) ||
        t.area.toLowerCase().includes(search.toLowerCase())
    );

    const handleSelect = (template: LibraryTemplate) => {
        // Auto-fill variables
        const filledVars = autoFillTemplate(template.variables, processo);

        // Create new document for the user
        const newId = createDocument({
            title: `${template.title} - ${processo.cliente_nome}`,
            category: template.category,
            content: template.content, // Editor will apply vars if we want, or we can replace now
            variables: filledVars,
            tags: [template.area, "Automated"],
            favorite: false,
            source: "library"
        });

        // Open editor
        setOpenDocument(newId);
        onOpenChange(false);
        navigate("/dashboard/minutas");
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {/* Using Dialog as a mini-modal for template selection */}
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary border border-primary/20 shadow-sm">
                            <Sparkles className="h-5 w-5" />
                        </div>
                        <div className="text-left">
                            <DialogTitle className="text-xl font-bold font-display">Gerador de Minutas Inteligente</DialogTitle>
                            <DialogDescription>
                                Selecione um modelo para auto-preencher com os dados de <strong>{processo.cliente_nome}</strong>
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="space-y-6 mt-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar modelos (Ex: Procuração, Petição Inicial...)"
                            className="pl-10 h-12 bg-muted/30 border-border/40 rounded-xl"
                        />
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                        {filtered.length > 0 ? filtered.map((template) => (
                            <div
                                key={template.id}
                                className="group flex items-center justify-between p-4 rounded-2xl border border-border/50 bg-card hover:border-primary/40 hover:bg-primary/[0.02] transition-all cursor-pointer shadow-sm active:scale-[0.98]"
                                onClick={() => handleSelect(template)}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`h-12 w-12 rounded-xl flex items-center justify-center text-white shadow-md ${CATEGORY_CONFIG[template.category].color}`}>
                                        <FileText className="h-6 w-6" />
                                    </div>
                                    <div className="text-left">
                                        <div className="flex items-center gap-2">
                                            <p className="font-bold text-foreground text-sm leading-tight">{template.title}</p>
                                            <Badge variant="outline" className="text-[9px] uppercase tracking-wider h-4 px-1.5">{template.area}</Badge>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{template.description}</p>
                                    </div>
                                </div>
                                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors group-hover:translate-x-1" />
                            </div>
                        )) : (
                            <div className="text-center py-10 opacity-50">Nenhum modelo encontrado.</div>
                        )}
                    </div>

                    <div className="pt-4 border-t border-border/40">
                        <Button variant="ghost" className="w-full gap-2 text-xs font-bold text-muted-foreground uppercase tracking-widest" asChild>
                            <a href="/dashboard/minutas">
                                <FilePlus className="h-4 w-4" /> Ir para Biblioteca Completa
                            </a>
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
