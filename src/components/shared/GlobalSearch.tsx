import { useEffect, useState } from "react";
import { Calculator, Calendar, FileText, Search, Settings, User } from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";

export function GlobalSearch() {
    const [open, setOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [results, setResults] = useState<{ clients: any[]; processes: any[]; leads: any[] }>({ clients: [], processes: [], leads: [] });
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { user } = useAuth();

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

    useEffect(() => {
        if (!searchTerm || searchTerm.length < 2 || !user) {
            setResults({ clients: [], processes: [], leads: [] });
            return;
        }

        const fetchResults = async () => {
            setIsLoading(true);
            try {
                // Query Clientes
                const { data: clients } = await supabase
                    .from("clientes")
                    .select("id, nome, email")
                    .ilike("nome", `%${searchTerm}%`)
                    .limit(3);

                // Query Processos
                const { data: processes } = await supabase
                    .from("processos")
                    .select("id, numero_cnj, cliente_nome")
                    .or(`numero_cnj.ilike.%${searchTerm}%,cliente_nome.ilike.%${searchTerm}%`)
                    .limit(3);

                // Query Leads CRM
                const { data: leads } = await supabase
                    .from("crm_leads")
                    .select("id, name, contact_name")
                    .ilike("name", `%${searchTerm}%`)
                    .limit(3);

                setResults({
                    clients: clients || [],
                    processes: processes || [],
                    leads: leads || [],
                });
            } catch (error) {
                console.error("Search error:", error);
            } finally {
                setIsLoading(false);
            }
        };

        const debounce = setTimeout(fetchResults, 300);
        return () => clearTimeout(debounce);
    }, [searchTerm, user]);

    const onSelect = (path: string) => {
        setOpen(false);
        navigate(path);
    };

    return (
        <CommandDialog open={open} onOpenChange={setOpen}>
            <CommandInput
                placeholder="O que você procura? (ex: processos, clientes...)"
                value={searchTerm}
                onValueChange={setSearchTerm}
            />
            <CommandList>
                <CommandEmpty>
                    {isLoading ? "Buscando..." : "Nenhum resultado encontrado."}
                </CommandEmpty>

                {(results.clients.length > 0 || results.processes.length > 0 || results.leads.length > 0) && (
                    <CommandGroup heading="Resultados do Banco">
                        {results.clients.map((c) => (
                            <CommandItem key={c.id} onSelect={() => onSelect(`/dashboard/clientes?id=${c.id}`)}>
                                <User className="mr-2 h-4 w-4 text-blue-500" />
                                <span>{c.nome}</span>
                                <span className="ml-2 text-xs text-muted-foreground">{c.email}</span>
                            </CommandItem>
                        ))}
                        {results.processes.map((p) => (
                            <CommandItem key={p.id} onSelect={() => onSelect(`/dashboard/processos?id=${p.id}`)}>
                                <FileText className="mr-2 h-4 w-4 text-orange-500" />
                                <span>{p.numero_cnj || 'Sem CNJ'}</span>
                                <span className="ml-2 text-xs text-muted-foreground">{p.cliente_nome}</span>
                            </CommandItem>
                        ))}
                        {results.leads.map((l) => (
                            <CommandItem key={l.id} onSelect={() => onSelect(`/dashboard/crm`)}>
                                <Search className="mr-2 h-4 w-4 text-emerald-500" />
                                <span>{l.name}</span>
                                <span className="ml-2 text-xs text-muted-foreground">{l.contact_name}</span>
                            </CommandItem>
                        ))}
                    </CommandGroup>
                )}

                <CommandSeparator />

                <CommandGroup heading="Acesso Rápido">
                    <CommandItem onSelect={() => onSelect("/dashboard/agenda")}>
                        <Calendar className="mr-2 h-4 w-4" />
                        <span>Ver Agenda</span>
                    </CommandItem>
                    <CommandItem onSelect={() => onSelect("/dashboard/calculadora")}>
                        <Calculator className="mr-2 h-4 w-4" />
                        <span>Calculadora Jurídica</span>
                    </CommandItem>
                    <CommandItem onSelect={() => onSelect("/dashboard/configuracoes")}>
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Configurações</span>
                        <CommandShortcut>⌘S</CommandShortcut>
                    </CommandItem>
                </CommandGroup>
            </CommandList>
        </CommandDialog>
    );
}

function CommandShortcut({
    className,
    ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
    return (
        <span
            className={`ml-auto text-xs tracking-widest text-muted-foreground ${className}`}
            {...props}
        />
    )
}
