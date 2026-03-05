import { useEffect, useState, useCallback } from "react";
import {
    Calculator, Calendar, FileText, Search, Settings, User,
    Briefcase, Users, LayoutDashboard, MessageSquare, Network,
    Sparkles, Sun, Moon, Building2, CreditCard, Laptop
} from "lucide-react";
import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "@/components/ui/command";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/components/theme-provider";
import { supabase } from "@/integrations/supabase/client";

export function GlobalSearch() {
    const [open, setOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [results, setResults] = useState<{ clients: any[]; processes: any[] }>({ clients: [], processes: [] });
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { user } = useAuth();
    const { theme, setTheme } = useTheme();
    const [facilitadorLinks, setFacilitadorLinks] = useState<any[]>([]);

    useEffect(() => {
        const stored = localStorage.getItem("lexa_facilitador_links");
        if (stored) {
            try {
                setFacilitadorLinks(JSON.parse(stored));
            } catch (e) {
                console.error("Failed to parse facilitador links", e);
            }
        }
    }, [open]);

    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((open) => !open);
            }
        };
        document.addEventListener("keydown", down);
        return () => document.removeEventListener("keydown", down);
    }, []);

    const fetchResults = useCallback(async (q: string) => {
        if (!q || q.length < 2 || !user) {
            setResults({ clients: [], processes: [] });
            return;
        }

        setIsLoading(true);
        try {
            const orgId = (user as any)?.organization_id;
            if (!orgId) return;

            const [{ data: proc }, { data: cli }] = await Promise.all([
                supabase.from("processos_juridicos").select("id, title, number").eq("organization_id", orgId).ilike("title", `%${q}%`).limit(5),
                supabase.from("clients").select("id, name").eq("organization_id", orgId).ilike("name", `%${q}%`).limit(5)
            ]);

            setResults({
                processes: proc || [],
                clients: cli || [],
            });
        } catch (error) {
            console.error("Search error:", error);
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        const debounce = setTimeout(() => fetchResults(searchTerm), 300);
        return () => clearTimeout(debounce);
    }, [searchTerm, fetchResults]);

    const onSelect = (path: string) => {
        setOpen(false);
        navigate(path);
    };

    const askAruna = (query: string) => {
        setOpen(false);
        const event = new CustomEvent("aruna-ask", { detail: { query } });
        window.dispatchEvent(event);
    };

    return (
        <CommandDialog open={open} onOpenChange={setOpen}>
            <CommandInput
                placeholder={t("cmdK.searchPlaceholder") || "Busque processos, clientes ou pergunte à Aruna..."}
                value={searchTerm}
                onValueChange={setSearchTerm}
            />
            <CommandList>
                <CommandEmpty>
                    {isLoading ? t("common.searching") : t("common.noResults")}
                </CommandEmpty>

                {searchTerm.length > 0 && (
                    <CommandGroup heading="Inteligência Aruna IA">
                        <CommandItem onSelect={() => askAruna(searchTerm)} className="cursor-pointer">
                            <Sparkles className="mr-2 h-4 w-4 text-accent animate-pulse" />
                            <span>Perguntar para Aruna: <span className="font-semibold text-accent">"{searchTerm}"</span></span>
                        </CommandItem>
                    </CommandGroup>
                )}

                {(results.clients.length > 0 || results.processes.length > 0) && (
                    <CommandGroup heading="Resultados da Busca">
                        {results.processes.map((p) => (
                            <CommandItem key={p.id} value={`processo-${p.id}-${p.title}`} onSelect={() => onSelect(`/dashboard/processos?id=${p.id}`)}>
                                <Briefcase className="mr-2 h-4 w-4 text-orange-500" />
                                <span>Processo: {p.title} <span className="text-[10px] text-muted-foreground ml-2">({p.number})</span></span>
                            </CommandItem>
                        ))}
                        {results.clients.map((c) => (
                            <CommandItem key={c.id} value={`cliente-${c.id}-${c.name}`} onSelect={() => onSelect(`/dashboard/clientes?id=${c.id}`)}>
                                <User className="mr-2 h-4 w-4 text-blue-500" />
                                <span>Cliente: {c.name}</span>
                            </CommandItem>
                        ))}
                    </CommandGroup>
                )}

                <CommandSeparator />

                {facilitadorLinks.length > 0 && (
                    <CommandGroup heading="Atalhos / Facilitador">
                        {facilitadorLinks
                            .filter(l => !searchTerm || l.label.toLowerCase().includes(searchTerm.toLowerCase()))
                            .slice(0, 5)
                            .map((link) => (
                                <CommandItem key={link.id} value={`link-${link.label}`} onSelect={() => { window.open(link.url, "_blank"); setOpen(false); }}>
                                    <span className="mr-2 h-4 w-4 flex items-center justify-center text-sm">{link.emoji}</span>
                                    <span>{link.label}</span>
                                    <span className="ml-2 text-[10px] text-muted-foreground truncate opacity-50">{link.url.replace(/^https?:\/\//, '')}</span>
                                </CommandItem>
                            ))
                        }
                    </CommandGroup>
                )}

                <CommandSeparator />

                <CommandGroup heading="Ações Principais">
                    <CommandItem value="Dashboard Meu Dia" onSelect={() => onSelect("/dashboard")}>
                        <LayoutDashboard className="mr-2 h-4 w-4 text-emerald-500" />
                        <span>Meu Dia (Dashboard)</span>
                    </CommandItem>
                    <CommandItem value="Processos Juridicos" onSelect={() => onSelect("/dashboard/processos")}>
                        <Briefcase className="mr-2 h-4 w-4 text-indigo-500" />
                        <span>Processos</span>
                    </CommandItem>
                    <CommandItem value="Agenda e Prazos" onSelect={() => onSelect("/dashboard/agenda")}>
                        <Calendar className="mr-2 h-4 w-4 text-amber-500" />
                        <span>Agenda & Compromissos</span>
                    </CommandItem>
                </CommandGroup>

                <CommandSeparator />

                <CommandGroup heading="Módulos Auxiliares">
                    <CommandItem value="Minutas e Contratos" onSelect={() => onSelect("/dashboard/minutas")}>
                        <FileText className="mr-2 h-4 w-4 text-rose-500" />
                        <span>Minutas Inteligentes</span>
                    </CommandItem>
                    <CommandItem value="Financeiro Gestao" onSelect={() => onSelect("/dashboard/financeiro")}>
                        <CreditCard className="mr-2 h-4 w-4 text-emerald-500" />
                        <span>Financeiro (Contas)</span>
                    </CommandItem>
                    <CommandItem value="Workflow Fluxos" onSelect={() => onSelect("/dashboard/workflow")}>
                        <Network className="mr-2 h-4 w-4 text-indigo-500" />
                        <span>Fluxos de Trabalho</span>
                    </CommandItem>
                    <CommandItem value="Chat Canais" onSelect={() => onSelect("/dashboard/chat")}>
                        <MessageSquare className="mr-2 h-4 w-4 text-zinc-500" />
                        <span>Canais de Comunicação</span>
                    </CommandItem>
                </CommandGroup>

                <CommandSeparator />

                <CommandGroup heading="Administração SaaS (Master)">
                    <CommandItem value="Painel Executivo Admin" onSelect={() => onSelect("/admin/hq")}>
                        <LayoutDashboard className="mr-2 h-4 w-4 text-indigo-600" />
                        <span>Painel Executivo</span>
                    </CommandItem>
                    <CommandItem value="Inquilinos Escritorios" onSelect={() => onSelect("/admin/hq/organizations")}>
                        <Building2 className="mr-2 h-4 w-4 text-emerald-500" />
                        <span>Inquilinos & Escritórios</span>
                    </CommandItem>
                </CommandGroup>

                <CommandSeparator />

                <CommandGroup heading="Configurações & Tema">
                    <CommandItem value="Configuracoes Sistema" onSelect={() => onSelect("/dashboard/configuracoes")}>
                        <Settings className="mr-2 h-4 w-4 text-zinc-400" />
                        <span>Configurações do Sistema</span>
                    </CommandItem>
                    <CommandItem value="Alternar Tema" onSelect={() => { setTheme(theme === 'dark' ? 'light' : 'dark'); setOpen(false); }}>
                        {theme === 'dark' ? (
                            <Sun className="mr-2 h-4 w-4 text-amber-500" />
                        ) : (
                            <Moon className="mr-2 h-4 w-4 text-indigo-500" />
                        )}
                        <span>Alternar Tema Claro/Escuro</span>
                    </CommandItem>
                </CommandGroup>
            </CommandList>
        </CommandDialog>
    );
}
