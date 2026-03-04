import * as React from "react"
import {
    Calculator,
    Calendar,
    CreditCard,
    Settings,
    Smile,
    User,
    LayoutDashboard,
    Briefcase,
    Users,
    Building2,
    FileText,
    MessageSquare,
    Network,
    Sun,
    Moon,
    Laptop,
    Sparkles,
    Search
} from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/contexts/AuthContext"
import { toast } from "sonner"
import { useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { useTheme } from "@/components/theme-provider"

import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "@/components/ui/command"

export function CommandPalette() {
    const [open, setOpen] = React.useState(false)
    const navigate = useNavigate()
    const { t } = useTranslation()
    const { setTheme, theme } = useTheme()
    const { user } = useAuth()
    const [search, setSearch] = React.useState("")
    const [processos, setProcessos] = React.useState<any[]>([])
    const [clientes, setClientes] = React.useState<any[]>([])
    const [loading, setLoading] = React.useState(false)

    React.useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                setOpen((open) => !open)
            }
        }

        document.addEventListener("keydown", down)
        return () => document.removeEventListener("keydown", down)
    }, [])

    const searchData = React.useCallback(async (q: string) => {
        if (q.length < 2) {
            setProcessos([])
            setClientes([])
            return
        }
        setLoading(true)
        try {
            const orgId = (user as any)?.organization_id
            if (!orgId) return

            const [{ data: proc }, { data: cli }] = await Promise.all([
                supabase.from("processos_juridicos").select("id, title, number").eq("organization_id", orgId).ilike("title", `%${q}%`).limit(5) as any,
                supabase.from("clients").select("id, name").eq("organization_id", orgId).ilike("name", `%${q}%`).limit(5) as any
            ])
            setProcessos(proc || [])
            setClientes(cli || [])
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }, [user])

    React.useEffect(() => {
        const timer = setTimeout(() => searchData(search), 300)
        return () => clearTimeout(timer)
    }, [search, searchData])

    const askAruna = (query: string) => {
        setOpen(false)
        const event = new CustomEvent("aruna-ask", { detail: { query } })
        window.dispatchEvent(event)
    }

    const runCommand = React.useCallback((command: () => void) => {
        setOpen(false)
        command()
    }, [])

    return (
        <CommandDialog open={open} onOpenChange={setOpen}>
            <CommandInput
                placeholder="Busque processos, clientes ou pergunte à Aruna..."
                value={search}
                onValueChange={setSearch}
            />
            <CommandList>
                {search.length > 0 && (
                    <CommandGroup heading="Inteligência Aruna IA">
                        <CommandItem onSelect={() => askAruna(search)} className="cursor-pointer">
                            <Sparkles className="mr-2 h-4 w-4 text-accent animate-pulse" />
                            <span>Perguntar para Aruna: <span className="font-semibold text-accent">"{search}"</span></span>
                        </CommandItem>
                    </CommandGroup>
                )}

                {(processos.length > 0 || clientes.length > 0) && (
                    <CommandGroup heading="Resultados da Busca">
                        {processos.map(p => (
                            <CommandItem key={p.id} onSelect={() => runCommand(() => navigate(`/dashboard/processos?id=${p.id}`))}>
                                <Briefcase className="mr-2 h-4 w-4 text-muted-foreground" />
                                <span>Processo: {p.title} <span className="text-[10px] text-muted-foreground ml-2">({p.number})</span></span>
                            </CommandItem>
                        ))}
                        {clientes.map(c => (
                            <CommandItem key={c.id} onSelect={() => runCommand(() => navigate(`/dashboard/clientes?id=${c.id}`))}>
                                <User className="mr-2 h-4 w-4 text-muted-foreground" />
                                <span>Cliente: {c.name}</span>
                            </CommandItem>
                        ))}
                    </CommandGroup>
                )}
                <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>

                <CommandGroup heading="Ações Principais">
                    <CommandItem onSelect={() => runCommand(() => navigate("/dashboard"))}>
                        <LayoutDashboard className="mr-2 h-4 w-4 text-emerald-500" />
                        <span>Meu Dia (Dashboard)</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => navigate("/dashboard/processos"))}>
                        <Briefcase className="mr-2 h-4 w-4 text-indigo-500" />
                        <span>Processos</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => navigate("/dashboard/clientes"))}>
                        <Users className="mr-2 h-4 w-4 text-sky-500" />
                        <span>Clientes</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => navigate("/dashboard/agenda"))}>
                        <Calendar className="mr-2 h-4 w-4 text-amber-500" />
                        <span>Agenda & Compromissos</span>
                    </CommandItem>
                </CommandGroup>

                <CommandSeparator />

                <CommandGroup heading="Módulos Auxiliares">
                    <CommandItem onSelect={() => runCommand(() => navigate("/dashboard/minutas"))}>
                        <FileText className="mr-2 h-4 w-4 text-rose-500" />
                        <span>Minutas Inteligentes</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => navigate("/dashboard/financeiro"))}>
                        <CreditCard className="mr-2 h-4 w-4 text-emerald-500" />
                        <span>Financeiro (Contas)</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => navigate("/dashboard/workflow"))}>
                        <Network className="mr-2 h-4 w-4 text-indigo-500" />
                        <span>Fluxos de Trabalho</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => navigate("/dashboard/chat"))}>
                        <MessageSquare className="mr-2 h-4 w-4 text-zinc-500" />
                        <span>Canais de Comunicação</span>
                    </CommandItem>
                </CommandGroup>

                <CommandSeparator />

                <CommandGroup heading="Administração SaaS (Master)">
                    <CommandItem onSelect={() => runCommand(() => navigate("/admin/hq"))}>
                        <LayoutDashboard className="mr-2 h-4 w-4 text-indigo-600" />
                        <span>Painel Executivo</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => navigate("/admin/hq/organizations"))}>
                        <Building2 className="mr-2 h-4 w-4 text-emerald-500" />
                        <span>Inquilinos & Escritórios</span>
                    </CommandItem>
                </CommandGroup>

                <CommandSeparator />

                <CommandGroup heading="Configurações & Tema">
                    <CommandItem onSelect={() => runCommand(() => navigate("/dashboard/configuracoes"))}>
                        <Settings className="mr-2 h-4 w-4 text-zinc-400" />
                        <span>Configurações do Sistema</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => setTheme(theme === 'dark' ? 'light' : 'dark'))}>
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
    )
}
