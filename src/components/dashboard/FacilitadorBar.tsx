import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
    ChevronDown, ChevronUp, Plus, X, ExternalLink, Pencil, RotateCcw, Search, Star, StarOff, HelpCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";

// ─── Types ────────────────────────────────────────────────────

interface FacilitadorLink {
    id: string;
    label: string;
    url: string;
    emoji: string;
    category: string;
    pinned?: boolean;
}

// ─── Default links ────────────────────────────────────────────

const DEFAULT_LINKS: FacilitadorLink[] = [
    { id: "gmail", label: "Gmail", url: "https://mail.google.com", emoji: "📧", category: "Comunicação" },
    { id: "outlook", label: "Outlook", url: "https://outlook.live.com", emoji: "📨", category: "Comunicação" },
    { id: "whatsapp", label: "WhatsApp Web", url: "https://web.whatsapp.com", emoji: "💬", category: "Comunicação" },
    { id: "pje", label: "PJe", url: "https://pje.jus.br", emoji: "⚖️", category: "Tribunais" },
    { id: "esaj", label: "e-SAJ (TJSP)", url: "https://esaj.tjsp.jus.br", emoji: "🏛️", category: "Tribunais" },
    { id: "projudi", label: "Projudi", url: "https://projudi.tjpr.jus.br", emoji: "📋", category: "Tribunais" },
    { id: "stj", label: "STJ", url: "https://www.stj.jus.br", emoji: "⚖️", category: "Tribunais" },
    { id: "stf", label: "STF", url: "https://portal.stf.jus.br", emoji: "🏛️", category: "Tribunais" },
    { id: "trt", label: "TRT", url: "https://www.trt.jus.br", emoji: "👷", category: "Tribunais" },
    { id: "trf", label: "TRF", url: "https://www.cjf.jus.br", emoji: "🔱", category: "Tribunais" },
    { id: "jusbrasil", label: "Jusbrasil", url: "https://www.jusbrasil.com.br", emoji: "🔍", category: "Jurídico" },
    { id: "dje", label: "DJe", url: "https://dje.tjsp.jus.br", emoji: "📰", category: "Jurídico" },
    { id: "oab", label: "OAB Federal", url: "https://www.oab.org.br", emoji: "📜", category: "Jurídico" },
    { id: "legjur", label: "LegisWeb", url: "https://www.legisweb.com.br", emoji: "📚", category: "Jurídico" },
    { id: "receita", label: "Receita Federal", url: "https://www.gov.br/receitafederal/pt-br", emoji: "🏦", category: "Governo" },
    { id: "inss", label: "INSS / CNIS", url: "https://meu.inss.gov.br", emoji: "🪪", category: "Governo" },
    { id: "pgfn", label: "PGFN / CND", url: "https://www.pgfn.fazenda.gov.br", emoji: "🧾", category: "Governo" },
    { id: "govbr", label: "Gov.br", url: "https://www.gov.br", emoji: "🇧🇷", category: "Governo" },
    { id: "sefaz", label: "SEFAZ", url: "https://www.sefaz.sp.gov.br", emoji: "💰", category: "Governo" },
];

const STORAGE_KEY = "lexa_facilitador_links";

function loadLinks(): FacilitadorLink[] {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) return JSON.parse(stored);
    } catch { }
    return DEFAULT_LINKS;
}

function saveLinks(links: FacilitadorLink[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(links));
}

// ─── Component ────────────────────────────────────────────────

export default function FacilitadorBar() {
    const [links, setLinks] = useState<FacilitadorLink[]>(loadLinks);
    const [isOpen, setIsOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [addOpen, setAddOpen] = useState(false);
    const [newLink, setNewLink] = useState({ label: "", url: "", emoji: "🔗" });
    const [searchQuery, setSearchQuery] = useState("");
    const searchInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { saveLinks(links); }, [links]);

    // Keyboard shortcut to open Facilitador
    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            // Check for Ctrl + / or Cmd + /
            if (e.key === "/" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setIsOpen((o) => !o);
            }
        };
        document.addEventListener("keydown", down);
        return () => document.removeEventListener("keydown", down);
    }, []);

    // Focus search input when sheet opens
    useEffect(() => {
        if (isOpen) {
            // Small delay to ensure the input is rendered
            setTimeout(() => {
                searchInputRef.current?.focus();
            }, 100);
        } else {
            setSearchQuery(""); // Clear search on close
        }
    }, [isOpen]);

    const handleRemove = (id: string) => {
        setLinks((prev) => prev.filter((l) => l.id !== id));
        toast.success("Link removido");
    };

    const handleTogglePin = (id: string) => {
        setLinks((prev) => prev.map((l) => l.id === id ? { ...l, pinned: !l.pinned } : l));
    };

    const handleMoveUp = (id: string) => {
        setLinks((prev) => {
            const idx = prev.findIndex((l) => l.id === id);
            if (idx <= 0) return prev;
            const next = [...prev];
            [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
            return next;
        });
    };

    const handleMoveDown = (id: string) => {
        setLinks((prev) => {
            const idx = prev.findIndex((l) => l.id === id);
            if (idx < 0 || idx >= prev.length - 1) return prev;
            const next = [...prev];
            [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
            return next;
        });
    };

    const handleAdd = () => {
        if (!newLink.label || !newLink.url) { toast.error("Preencha nome e URL"); return; }
        const url = newLink.url.startsWith("http") ? newLink.url : `https://${newLink.url}`;
        const link: FacilitadorLink = {
            id: crypto.randomUUID(),
            label: newLink.label, url, emoji: newLink.emoji || "🔗",
            category: "Personalizado",
        };
        setLinks((prev) => [...prev, link]);
        setNewLink({ label: "", url: "", emoji: "🔗" });
        setAddOpen(false);
        toast.success("Link adicionado!");
    };

    const handleReset = () => {
        setLinks(DEFAULT_LINKS);
        toast.success("Links restaurados ao padrão");
    };

    // Sort: pinned first, then by category
    const sortedLinks = useMemo(() => {
        return [...links].sort((a, b) => {
            if (a.pinned && !b.pinned) return -1;
            if (!a.pinned && b.pinned) return 1;
            return 0;
        });
    }, [links]);

    const displayLinks = useMemo(() => {
        if (!searchQuery) return sortedLinks;
        const q = searchQuery.toLowerCase();
        return sortedLinks.filter((l) =>
            l.label.toLowerCase().includes(q) ||
            l.category.toLowerCase().includes(q)
        );
    }, [sortedLinks, searchQuery]);

    const categories = useMemo(() => Array.from(new Set(displayLinks.map((l) => l.category))), [displayLinks]);

    return (
        <>
            {/* TopBar trigger button (inline, not floating) */}
            <Tooltip delayDuration={300}>
                <TooltipTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsOpen(true)}
                        className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-muted/80"
                    >
                        <HelpCircle className="h-4 w-4" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="font-semibold">
                    Facilitador <kbd className="ml-1 rounded border bg-muted px-1 py-0.5 text-[10px] text-muted-foreground">Ctrl + /</kbd>
                </TooltipContent>
            </Tooltip>

            {/* ── Side Menu (Sheet) ── */}
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetContent side="right" className="w-[300px] sm:w-[400px] flex flex-col p-0 border-l border-border/50 bg-background/95 backdrop-blur-xl">
                    <SheetHeader className="p-6 pb-4 border-b border-border/50">
                        <div className="flex items-center justify-between">
                            <SheetTitle className="flex items-center gap-2 text-xl font-bold">
                                <span className="bg-primary/10 text-primary p-1.5 rounded-md">
                                    <HelpCircle className="h-5 w-5" />
                                </span>
                                Facilitador
                            </SheetTitle>
                        </div>
                        <div className="relative mt-4">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                            <Input
                                ref={searchInputRef}
                                type="text"
                                placeholder="Buscar atalho..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 h-10 bg-muted/40 border-border/50 focus-visible:ring-primary/30"
                            />
                        </div>
                    </SheetHeader>

                    <ScrollArea className="flex-1 px-6">
                        {displayLinks.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground/50">
                                <Search className="h-8 w-8 mb-2 opacity-20" />
                                <p className="text-sm">Nenhum atalho encontrado</p>
                            </div>
                        ) : (
                            <div className="py-4 space-y-6">
                                {categories.map((cat) => {
                                    const catLinks = displayLinks.filter((l) => l.category === cat);
                                    return (
                                        <div key={cat} className="space-y-3">
                                            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 flex items-center gap-2">
                                                {cat}
                                                <div className="h-px flex-1 bg-border/40" />
                                            </h3>
                                            <div className="grid grid-cols-1 gap-1.5">
                                                {catLinks.map((link) => (
                                                    <a
                                                        key={link.id}
                                                        href={link.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className={cn(
                                                            "group flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-muted/80 transition-all border border-transparent hover:border-border/50",
                                                            link.pinned && "bg-primary/5 hover:bg-primary/10 border-primary/10"
                                                        )}
                                                    >
                                                        <div className="flex items-center gap-3 overflow-hidden">
                                                            <span className="flex items-center justify-center h-8 w-8 rounded-md bg-background shadow-sm text-base shrink-0 group-hover:scale-110 transition-transform">
                                                                {link.emoji}
                                                            </span>
                                                            <div className="flex flex-col min-w-0">
                                                                <span className="text-sm font-medium text-foreground truncate">{link.label}</span>
                                                                <span className="text-[10px] text-muted-foreground truncate">{link.url.replace(/^https?:\/\//, '')}</span>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center opacity-40 group-hover:opacity-100 transition-opacity">
                                                            {link.pinned && <Star className="h-3.5 w-3.5 fill-primary text-primary mr-2" />}
                                                            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                                                        </div>
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </ScrollArea>

                    <div className="p-4 border-t border-border/50 bg-muted/20 flex gap-2">
                        <Button
                            variant="outline"
                            className="flex-1 gap-2 text-xs h-9 bg-background/50 hover:bg-background"
                            onClick={() => { setEditOpen(true); setIsOpen(false); }}
                        >
                            <Pencil className="h-3.5 w-3.5" /> Gerenciar
                        </Button>
                        <Button
                            className="flex-1 gap-2 text-xs h-9"
                            onClick={() => { setAddOpen(true); setIsOpen(false); }}
                        >
                            <Plus className="h-3.5 w-3.5" /> Adicionar
                        </Button>
                    </div>
                </SheetContent>
            </Sheet>

            {/* ── Add Link Dialog ── */}
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="font-semibold">Adicionar Atalho</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="flex gap-3">
                            <div className="space-y-1.5 shrink-0">
                                <label className="text-xs font-medium text-muted-foreground">Emoji</label>
                                <Input value={newLink.emoji} onChange={(e) => setNewLink({ ...newLink, emoji: e.target.value })} className="h-10 w-16 text-center text-lg" maxLength={2} />
                            </div>
                            <div className="flex-1 space-y-1.5">
                                <label className="text-xs font-medium text-muted-foreground">Nome</label>
                                <Input autoFocus value={newLink.label} onChange={(e) => setNewLink({ ...newLink, label: e.target.value })} placeholder="Ex: Tribunal..." />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">URL</label>
                            <Input value={newLink.url} onChange={(e) => setNewLink({ ...newLink, url: e.target.value })} placeholder="https://..." />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setAddOpen(false); setIsOpen(true); }}>Cancelar</Button>
                        <Button onClick={() => { handleAdd(); setIsOpen(true); }}>Adicionar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Manage Links Dialog ── */}
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <div className="flex items-center justify-between">
                            <DialogTitle className="font-semibold">Gerenciar Links</DialogTitle>
                            <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground h-8 px-2" onClick={handleReset}>
                                <RotateCcw className="h-3 w-3" /> Restaurar Padrão
                            </Button>
                        </div>
                    </DialogHeader>
                    <div className="max-h-[60vh] overflow-y-auto space-y-2 py-2 pr-1 custom-scrollbar">
                        {links.map((link, idx) => (
                            <div key={link.id} className="group flex items-center gap-3 rounded-lg border border-border/40 bg-card p-2 hover:border-primary/30 transition-colors">
                                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted/50 text-base shrink-0">
                                    {link.emoji}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-foreground truncate leading-tight">{link.label}</p>
                                    <p className="text-[10px] text-muted-foreground truncate">{link.url.replace(/^https?:\/\//, '')}</p>
                                </div>
                                <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity bg-background/80 backdrop-blur-sm rounded-md p-0.5">
                                    <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleTogglePin(link.id); }} className="p-1.5 rounded-sm hover:bg-muted text-muted-foreground hover:text-primary transition-colors" title={link.pinned ? "Desafixar" : "Fixar no topo"}>
                                        {link.pinned ? <Star className="h-4 w-4 fill-primary text-primary" /> : <StarOff className="h-4 w-4" />}
                                    </button>
                                    <div className="h-4 w-px bg-border/60 mx-0.5" />
                                    <div className="flex flex-col gap-0.5">
                                        <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleMoveUp(link.id); }} disabled={idx === 0} className="p-0.5 rounded-sm hover:bg-muted text-muted-foreground disabled:opacity-30 transition-colors">
                                            <ChevronUp className="h-3 w-3" />
                                        </button>
                                        <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleMoveDown(link.id); }} disabled={idx === links.length - 1} className="p-0.5 rounded-sm hover:bg-muted text-muted-foreground disabled:opacity-30 transition-colors">
                                            <ChevronDown className="h-3 w-3" />
                                        </button>
                                    </div>
                                    <div className="h-4 w-px bg-border/60 mx-0.5" />
                                    <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleRemove(link.id); }} className="p-1.5 rounded-sm hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors" title="Remover link">
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                    <DialogFooter className="pt-2 border-t border-border/40 mt-2">
                        <Button variant="outline" onClick={() => { setEditOpen(false); setAddOpen(true); }} className="gap-2">
                            <Plus className="h-3.5 w-3.5" /> Novo Link
                        </Button>
                        <Button onClick={() => { setEditOpen(false); setIsOpen(true); }}>Pronto</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
