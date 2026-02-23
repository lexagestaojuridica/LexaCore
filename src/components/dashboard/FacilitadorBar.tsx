import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
    ChevronDown, ChevronUp, Plus, X, ExternalLink, Pencil, RotateCcw, Search, Star, StarOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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
const COLLAPSED_KEY = "lexa_facilitador_collapsed";

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
    const [collapsed, setCollapsed] = useState(() => {
        try {
            const stored = localStorage.getItem(COLLAPSED_KEY);
            // Default to collapsed (true) if never set
            return stored === null ? true : stored === "true";
        } catch { return true; }
    });
    const [links, setLinks] = useState<FacilitadorLink[]>(loadLinks);
    const [editOpen, setEditOpen] = useState(false);
    const [addOpen, setAddOpen] = useState(false);
    const [newLink, setNewLink] = useState({ label: "", url: "", emoji: "🔗" });
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => { saveLinks(links); }, [links]);
    useEffect(() => { localStorage.setItem(COLLAPSED_KEY, String(collapsed)); }, [collapsed]);

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
        return sortedLinks.filter((l) => l.label.toLowerCase().includes(q) || l.category.toLowerCase().includes(q));
    }, [sortedLinks, searchQuery]);

    const categories = useMemo(() => Array.from(new Set(displayLinks.map((l) => l.category))), [displayLinks]);

    return (
        <div className="border-b border-border/50 bg-card/60 backdrop-blur-sm">
            <div className={cn("flex items-center px-4 transition-all", collapsed ? "py-1" : "py-0")}>
                {!collapsed && (
                    <div className="flex flex-1 items-center gap-1 overflow-x-auto scrollbar-hide py-1.5">
                        {/* Search within bar */}
                        <div className="relative mr-1 shrink-0">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground/50" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Buscar..."
                                className="h-7 w-24 sm:w-32 rounded-md bg-muted/40 border-none pl-7 pr-2 text-[11px] text-muted-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary/30 transition-all"
                            />
                        </div>

                        {/* Category groups */}
                        {categories.map((cat) => {
                            const catLinks = displayLinks.filter((l) => l.category === cat);
                            return (
                                <div key={cat} className="flex items-center gap-0.5 mr-2">
                                    <span className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/40 mr-1 whitespace-nowrap">
                                        {cat}
                                    </span>
                                    {catLinks.map((link) => (
                                        <Tooltip key={link.id} delayDuration={200}>
                                            <TooltipTrigger asChild>
                                                <a
                                                    href={link.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className={cn(
                                                        "group flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-all whitespace-nowrap",
                                                        link.pinned && "bg-primary/5 text-primary/80"
                                                    )}
                                                >
                                                    <span className="text-sm leading-none">{link.emoji}</span>
                                                    <span className="hidden sm:inline">{link.label}</span>
                                                    {link.pinned && <Star className="h-2 w-2 fill-primary/50 text-primary/50" />}
                                                    <ExternalLink className="h-2.5 w-2.5 opacity-0 group-hover:opacity-60 transition-opacity" />
                                                </a>
                                            </TooltipTrigger>
                                            <TooltipContent side="bottom" className="text-xs">
                                                {link.label} — {link.url}
                                            </TooltipContent>
                                        </Tooltip>
                                    ))}
                                    <div className="ml-1 h-4 w-px bg-border/60" />
                                </div>
                            );
                        })}

                        {/* Add button */}
                        <Tooltip delayDuration={0}>
                            <TooltipTrigger asChild>
                                <button onClick={() => setAddOpen(true)} className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground/50 hover:bg-muted hover:text-foreground transition-all">
                                    <Plus className="h-3 w-3" />
                                </button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom">Adicionar link</TooltipContent>
                        </Tooltip>

                        {/* Edit button */}
                        <Tooltip delayDuration={0}>
                            <TooltipTrigger asChild>
                                <button onClick={() => setEditOpen(true)} className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground/50 hover:bg-muted hover:text-foreground transition-all">
                                    <Pencil className="h-3 w-3" />
                                </button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom">Gerenciar links</TooltipContent>
                        </Tooltip>
                    </div>
                )}

                {collapsed && (
                    <span className="flex-1 text-xs font-medium text-muted-foreground/50 uppercase tracking-widest">
                        Facilitador
                    </span>
                )}

                <button
                    onClick={() => setCollapsed((c) => !c)}
                    className="ml-2 flex items-center gap-1 rounded px-1.5 py-1 text-[10px] text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                >
                    {collapsed ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
                    {!collapsed && <span className="hidden sm:inline">Facilitador</span>}
                </button>
            </div>

            {/* ── Add Link Dialog ── */}
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="font-semibold">Adicionar Link Rápido</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <div className="flex gap-2">
                            <div className="space-y-1.5">
                                <label className="text-xs text-muted-foreground">Emoji</label>
                                <Input value={newLink.emoji} onChange={(e) => setNewLink({ ...newLink, emoji: e.target.value })} className="h-10 w-16 text-center text-lg" maxLength={2} />
                            </div>
                            <div className="flex-1 space-y-1.5">
                                <label className="text-xs text-muted-foreground">Nome</label>
                                <Input value={newLink.label} onChange={(e) => setNewLink({ ...newLink, label: e.target.value })} placeholder="Ex: TJMG" />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs text-muted-foreground">URL</label>
                            <Input value={newLink.url} onChange={(e) => setNewLink({ ...newLink, url: e.target.value })} placeholder="https://..." />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAddOpen(false)}>Cancelar</Button>
                        <Button onClick={handleAdd}>Adicionar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Manage Links Dialog ── */}
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <div className="flex items-center justify-between">
                            <DialogTitle className="font-semibold">Gerenciar Links</DialogTitle>
                            <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground" onClick={handleReset}>
                                <RotateCcw className="h-3 w-3" /> Restaurar padrão
                            </Button>
                        </div>
                    </DialogHeader>
                    <div className="max-h-96 overflow-y-auto space-y-1 py-2">
                        {links.map((link, idx) => (
                            <div key={link.id} className="flex items-center gap-2 rounded-lg border border-border/50 px-3 py-2">
                                <span className="text-base">{link.emoji}</span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-foreground">{link.label}</p>
                                    <p className="text-xs text-muted-foreground truncate">{link.url}</p>
                                </div>
                                <div className="flex items-center gap-0.5">
                                    <button onClick={() => handleTogglePin(link.id)} className="p-1 text-muted-foreground hover:text-primary transition-colors" title={link.pinned ? "Desafixar" : "Fixar"}>
                                        {link.pinned ? <Star className="h-3.5 w-3.5 fill-primary text-primary" /> : <StarOff className="h-3.5 w-3.5" />}
                                    </button>
                                    <button onClick={() => handleMoveUp(link.id)} disabled={idx === 0} className="p-1 text-muted-foreground/50 hover:text-foreground transition-colors disabled:opacity-30">
                                        <ChevronUp className="h-3 w-3" />
                                    </button>
                                    <button onClick={() => handleMoveDown(link.id)} disabled={idx === links.length - 1} className="p-1 text-muted-foreground/50 hover:text-foreground transition-colors disabled:opacity-30">
                                        <ChevronDown className="h-3 w-3" />
                                    </button>
                                    <a href={link.url} target="_blank" rel="noopener noreferrer" className="p-1 text-muted-foreground hover:text-foreground transition-colors">
                                        <ExternalLink className="h-3.5 w-3.5" />
                                    </a>
                                    <button onClick={() => handleRemove(link.id)} className="p-1 text-muted-foreground/50 hover:text-destructive transition-colors">
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAddOpen(true)} className="gap-2">
                            <Plus className="h-3.5 w-3.5" /> Novo Link
                        </Button>
                        <Button onClick={() => setEditOpen(false)}>Pronto</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
