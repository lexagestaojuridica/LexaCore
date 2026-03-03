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
    Laptop
} from "lucide-react"
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

    const runCommand = React.useCallback((command: () => void) => {
        setOpen(false)
        command()
    }, [])

    return (
        <CommandDialog open={open} onOpenChange={setOpen}>
            <CommandInput placeholder="Digite um comando ou busque..." />
            <CommandList>
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
