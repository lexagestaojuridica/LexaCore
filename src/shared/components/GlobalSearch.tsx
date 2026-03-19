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
} from "@/shared/ui/command";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useUser } from "@clerk/nextjs";
import { useTheme } from "@/shared/components/ThemeProvider";
import { supabase } from "@/integrations/supabase/client";


export function GlobalSearch() {
    const [open, setOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [results, setResults] = useState<{ clients: any[]; processes: any[] }>({ clients: [], processes: [] });
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useRouter();
    const { t } = useTranslation();
    const { user } = useUser();
    const { theme, setTheme } = useTheme();


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
            const { data: profile } = await supabase.from("profiles").select("organization_id").eq("user_id", user.id).maybeSingle();
            // @ts-expect-error: organization_id might be missing from profile if the query fails or schema is incomplete
            const orgId = profile?.organization_id;
            if (!orgId) return;

            const [procRes, cliRes] = await Promise.all([
                supabase.from("processos_juridicos" as any).select("id, title, number").eq("organization_id", orgId).ilike("title", `%${q}%`).limit(5),
                supabase.from("clients" as any).select("id, name").eq("organization_id", orgId).ilike("name", `%${q}%`).limit(5)
            ]);
            const proc = procRes.data;
            const cli = cliRes.data;

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
        navigate.push(path);
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
                    <CommandGroup heading={t("globalSearch.arunaIntelligence") || "Inteligência Aruna IA"}>
                        <CommandItem onSelect={() => askAruna(searchTerm)} className="cursor-pointer">
                            <Sparkles className="mr-2 h-4 w-4 text-accent animate-pulse" />
                            <span>{t("globalSearch.askAruna") || "Perguntar para Aruna"}: <span className="font-semibold text-accent">"{searchTerm}"</span></span>
                        </CommandItem>
                    </CommandGroup>
                )}

                {(results.clients.length > 0 || results.processes.length > 0) && (
                    <CommandGroup heading={t("globalSearch.searchResults") || "Resultados da Busca"}>
                        {results.processes.map((p) => (
                            <CommandItem key={p.id} value={`processo-${p.id}-${p.title}`} onSelect={() => onSelect(`/dashboard/processos?id=${p.id}`)}>
                                <Briefcase className="mr-2 h-4 w-4 text-orange-500" />
                                <span>{t("nav.processes") || "Processo"}: {p.title} <span className="text-[10px] text-muted-foreground ml-2">({p.number})</span></span>
                            </CommandItem>
                        ))}
                        {results.clients.map((c) => (
                            <CommandItem key={c.id} value={`cliente-${c.id}-${c.name}`} onSelect={() => onSelect(`/dashboard/clientes?id=${c.id}`)}>
                                <User className="mr-2 h-4 w-4 text-blue-500" />
                                <span>{t("nav.clients") || "Cliente"}: {c.name}</span>
                            </CommandItem>
                        ))}
                    </CommandGroup>
                )}

                <CommandSeparator />

                <CommandGroup heading={t("common.mainActions") || "Ações Principais"}>
                    <CommandItem value="Dashboard Meu Dia" onSelect={() => onSelect("/dashboard")}>
                        <LayoutDashboard className="mr-2 h-4 w-4 text-emerald-500" />
                        <span>{t("nav.dashboard") || "Meu Dia (Dashboard)"}</span>
                    </CommandItem>
                    <CommandItem value="Processos Juridicos" onSelect={() => onSelect("/dashboard/processos")}>
                        <Briefcase className="mr-2 h-4 w-4 text-indigo-500" />
                        <span>{t("nav.processes") || "Processos"}</span>
                    </CommandItem>
                    <CommandItem value="Agenda e Prazos" onSelect={() => onSelect("/dashboard/agenda")}>
                        <Calendar className="mr-2 h-4 w-4 text-amber-500" />
                        <span>{t("nav.agenda") || "Agenda & Compromissos"}</span>
                    </CommandItem>
                </CommandGroup>

                <CommandSeparator />

                <CommandGroup heading={t("common.auxiliaryModules") || "Módulos Auxiliares"}>
                    <CommandItem value="Minutas e Contratos" onSelect={() => onSelect("/dashboard/minutas")}>
                        <FileText className="mr-2 h-4 w-4 text-rose-500" />
                        <span>{t("nav.minutas") || "Minutas Inteligentes"}</span>
                    </CommandItem>
                    <CommandItem value="Financeiro Gestao" onSelect={() => onSelect("/dashboard/financeiro")}>
                        <CreditCard className="mr-2 h-4 w-4 text-emerald-500" />
                        <span>{t("nav.financial") || "Financeiro (Contas)"}</span>
                    </CommandItem>
                    <CommandItem value="Workflow Fluxos" onSelect={() => onSelect("/dashboard/workflow")}>
                        <Network className="mr-2 h-4 w-4 text-indigo-500" />
                        <span>{t("nav.workflow") || "Fluxos de Trabalho"}</span>
                    </CommandItem>
                    <CommandItem value="Chat Canais" onSelect={() => onSelect("/dashboard/chat")}>
                        <MessageSquare className="mr-2 h-4 w-4 text-zinc-500" />
                        <span>{t("nav.chat") || "Canais de Comunicação"}</span>
                    </CommandItem>
                </CommandGroup>

                <CommandSeparator />

                <CommandGroup heading={t("globalSearch.adminSaaS") || "Administração SaaS (Master)"}>
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

                <CommandGroup heading={t("globalSearch.settingsTheme") || "Configurações & Tema"}>
                    <CommandItem value="Configuracoes Sistema" onSelect={() => onSelect("/dashboard/configuracoes")}>
                        <Settings className="mr-2 h-4 w-4 text-zinc-400" />
                        <span>{t("common.settings") || "Configurações do Sistema"}</span>
                    </CommandItem>
                    <CommandItem value="Alternar Tema" onSelect={() => { setTheme(theme === 'dark' ? 'light' : 'dark'); setOpen(false); }}>
                        {theme === 'dark' ? (
                            <Sun className="mr-2 h-4 w-4 text-amber-500" />
                        ) : (
                            <Moon className="mr-2 h-4 w-4 text-indigo-500" />
                        )}
                        <span>{t("globalSearch.themeToggle") || "Alternar Tema Claro/Escuro"}</span>
                    </CommandItem>
                </CommandGroup>
            </CommandList>
        </CommandDialog>
    );
}
