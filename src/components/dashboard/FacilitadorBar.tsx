import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useTranslation } from "react-i18next";
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
    const { t } = useTranslation();
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
                        className="h-9 w-9 text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all duration-300 relative group"
                    >
                        <HelpCircle className="h-4 w-4 transition-transform group-hover:scale-110" />
                        <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="font-semibold bg-popover/90 backdrop-blur-md border-border/50">
                    {t('facilitador.title')} <kbd className="ml-1 rounded border border-border/50 bg-muted/50 px-1 py-0.5 text-[10px] text-muted-foreground">Ctrl + /</kbd>
                </TooltipContent>
            </Tooltip>

            {/* ── Side Menu (Sheet) ── */}
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetContent side="right" className="w-full sm:max-w-[440px] flex flex-col p-0 border-l border-border/20 bg-background/80 backdrop-blur-2xl shadow-2xl">
                    <SheetHeader className="p-8 pb-6 bg-gradient-to-b from-background to-transparent shrink-0">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <SheetTitle className="flex items-center gap-3 text-2xl font-bold tracking-tight">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-inner">
                                        <HelpCircle className="h-6 w-6" />
                                    </div>
                                    {t('facilitador.title')}
                                </SheetTitle>
                                <p className="text-[11px] font-medium text-muted-foreground/60 uppercase tracking-widest pl-[52px]">{t('facilitador.hubSubtitle')}</p>
                            </div>
                        </div>
                    </SheetHeader>

                    <div className="px-8 pb-4">
                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
                            <Input
                                ref={searchInputRef}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={t('facilitador.search')}
                                className="pl-10 h-11 bg-muted/30 border-border/40 focus:border-primary/40 focus:ring-primary/10 transition-all rounded-xl placeholder:text-muted-foreground/40"
                            />
                        </div>
                    </div>

                    <ScrollArea className="flex-1 px-8">
                        {sortedLinks.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground/30">
                                <Search className="h-12 w-12 mb-4 opacity-10" />
                                <p className="text-sm font-medium">{t('facilitador.noLinks')}</p>
                            </div>
                        ) : (
                            <div className="py-4 space-y-8 pb-24">
                                {categories.map((cat, catIdx) => {
                                    const catLinks = displayLinks.filter((l) => l.category === cat);
                                    return (
                                        <motion.div
                                            key={cat}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: catIdx * 0.1 }}
                                            className="space-y-4"
                                        >
                                            <div className="flex items-center gap-3">
                                                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50">
                                                    {t(`facilitador.categories.${cat.toLowerCase()}`, cat)}
                                                </h3>
                                                <div className="h-px flex-1 bg-gradient-to-r from-border/50 to-transparent" />
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                {catLinks.map((link) => (
                                                    <motion.a
                                                        key={link.id}
                                                        href={link.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        whileHover={{ y: -2 }}
                                                        whileTap={{ scale: 0.98 }}
                                                        className={cn(
                                                            "group relative flex flex-col p-4 rounded-2xl transition-all duration-300 border bg-card/40 hover:bg-card/60",
                                                            link.pinned
                                                                ? "border-primary/20 bg-primary/[0.02] shadow-[0_8px_32px_rgba(var(--primary),0.05)]"
                                                                : "border-border/40 hover:border-primary/20"
                                                        )}
                                                    >
                                                        <div className="flex items-start justify-between mb-3">
                                                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-background/50 text-xl shadow-sm border border-border/20 group-hover:bg-background transition-colors">
                                                                {link.emoji}
                                                            </div>
                                                            <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity translate-x-1 group-hover:translate-x-0 transition-transform">
                                                                {link.pinned && <Star className="h-3 w-3 fill-primary text-primary" />}
                                                                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                                                            </div>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <p className="text-xs font-bold text-foreground/90 group-hover:text-primary transition-colors truncate">
                                                                {link.label}
                                                            </p>
                                                            <p className="text-[9px] font-medium text-muted-foreground/50 truncate uppercase tracking-wider">
                                                                {link.url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}
                                                            </p>
                                                        </div>
                                                        {link.pinned && (
                                                            <div className="absolute top-0 right-0 p-1">
                                                                <div className="h-1 w-1 rounded-full bg-primary" />
                                                            </div>
                                                        )}
                                                    </motion.a>
                                                ))}
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )}
                    </ScrollArea>

                    <div className="absolute bottom-0 left-0 right-0 p-6 pt-10 bg-gradient-to-t from-background via-background/90 to-transparent border-t border-border/10">
                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                className="flex-1 gap-2 text-[10px] font-bold uppercase tracking-wider h-11 bg-background/50 hover:bg-background border-border/40 hover:border-primary/20 rounded-xl transition-all"
                                onClick={() => { setEditOpen(true); setIsOpen(false); }}
                            >
                                <Pencil className="h-3.5 w-3.5" /> {t('facilitador.manageLinks')}
                            </Button>
                            <Button
                                className="flex-1 gap-2 text-[10px] font-bold uppercase tracking-wider h-11 shadow-[0_8px_16px_rgba(var(--primary),0.2)] rounded-xl transition-all"
                                onClick={() => { setAddOpen(true); setIsOpen(false); }}
                            >
                                <Plus className="h-3.5 w-3.5" /> {t('facilitador.addLink')}
                            </Button>
                        </div>
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
