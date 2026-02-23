import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { NotificationsDropdown } from "./NotificationsDropdown";
import ArunaQuickChat from "@/components/shared/ArunaQuickChat";
import FacilitadorBar from "./FacilitadorBar";
import { OnboardingTour } from "./OnboardingTour";
import { LanguageSwitcher } from "@/components/shared/LanguageSwitcher";
import { useAuth } from "@/contexts/AuthContext";
import {
  Search, Moon, Sun, Scale, Users, CalendarDays, DollarSign,
  Briefcase, FileText, BarChart3, Clock, Settings, MessageSquare,
  Building2, Zap, BookOpen, Newspaper, Cpu, Calculator, Layers,
  Award, Plus
} from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";

// ─── Page title map ────────────────────────────────────────────

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Meu Dia",
  "/dashboard/processos": "Processos Jurídicos",
  "/dashboard/clientes": "Clientes",
  "/dashboard/agenda": "Agenda & Prazos",
  "/dashboard/financeiro": "Financeiro",
  "/dashboard/ia": "ARUNA IA",
  "/dashboard/bi": "BI & Relatórios",
  "/dashboard/calculadora": "Calculadora",
  "/dashboard/noticias": "Notícias Jurídicas",
  "/dashboard/crm": "CRM",
  "/dashboard/workflow": "Workflow",
  "/dashboard/minutas": "Minutas & Contratos",
  "/dashboard/configuracoes": "Configurações",
  "/dashboard/timesheet": "Timesheet",
  "/dashboard/certificados": "Certificados",
  "/dashboard/wiki": "Wiki Jurídica",
  "/dashboard/chat": "Chat Interno",
  "/dashboard/unidades": "Unidades / Franquias",
};

// ─── Quick navigation items for Cmd+K ─────────────────────────

const QUICK_NAV = [
  { label: "Meu Dia", url: "/dashboard", group: "Navegação", icon: CalendarDays },
  { label: "Processos", url: "/dashboard/processos", group: "Navegação", icon: Scale },
  { label: "Agenda & Prazos", url: "/dashboard/agenda", group: "Navegação", icon: CalendarDays },
  { label: "Clientes", url: "/dashboard/clientes", group: "Navegação", icon: Users },
  { label: "Financeiro", url: "/dashboard/financeiro", group: "Navegação", icon: DollarSign },
  { label: "Workflow", url: "/dashboard/workflow", group: "Navegação", icon: Layers },
  { label: "Minutas & Contratos", url: "/dashboard/minutas", group: "Navegação", icon: FileText },
  { label: "BI & Relatórios", url: "/dashboard/bi", group: "Navegação", icon: BarChart3 },
  { label: "Timesheet", url: "/dashboard/timesheet", group: "Navegação", icon: Clock },
  { label: "Certificados", url: "/dashboard/certificados", group: "Navegação", icon: Award },
  { label: "Wiki Jurídica", url: "/dashboard/wiki", group: "Navegação", icon: BookOpen },
  { label: "CRM", url: "/dashboard/crm", group: "Navegação", icon: Briefcase },
  { label: "ARUNA IA", url: "/dashboard/ia", group: "Navegação", icon: Cpu },
  { label: "Notícias Jurídicas", url: "/dashboard/noticias", group: "Navegação", icon: Newspaper },
  { label: "Chat Interno", url: "/dashboard/chat", group: "Navegação", icon: MessageSquare },
  { label: "Unidades / Franquias", url: "/dashboard/unidades", group: "Navegação", icon: Building2 },
  { label: "Configurações", url: "/dashboard/configuracoes", group: "Navegação", icon: Settings },
];

const QUICK_ACTIONS = [
  { label: "Novo Processo", url: "/dashboard/processos", group: "Ações Rápidas", icon: Plus, hint: "Criar processo jurídico" },
  { label: "Novo Compromisso", url: "/dashboard/agenda", group: "Ações Rápidas", icon: CalendarDays, hint: "Agendar evento" },
  { label: "Novo Cliente", url: "/dashboard/clientes", group: "Ações Rápidas", icon: Users, hint: "Cadastrar cliente" },
  { label: "Iniciar Timer", url: "/dashboard/timesheet", group: "Ações Rápidas", icon: Clock, hint: "Registrar horas" },
  { label: "Nova Minuta", url: "/dashboard/minutas", group: "Ações Rápidas", icon: FileText, hint: "Gerar documento" },
  { label: "Perguntar à ARUNA", url: "/dashboard/ia", group: "Ações Rápidas", icon: Zap, hint: "Assistente IA" },
];

// ─── GlobalSearch ─────────────────────────────────────────────

function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const isMac = typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === "k" && (e.metaKey || e.ctrlKey))) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const handleSelect = (url: string) => {
    navigate(url);
    setOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Buscar...</span>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-border/60 bg-background px-1.5 py-0.5 text-[10px] font-medium">
          <span>{isMac ? "⌘" : "Ctrl"}</span>K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Buscar módulo, ação, atalho..." />
        <CommandList>
          <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
          <CommandGroup heading="⚡ Ações Rápidas">
            {QUICK_ACTIONS.map((item) => (
              <CommandItem
                key={item.label}
                onSelect={() => handleSelect(item.url)}
                className="cursor-pointer"
              >
                <item.icon className="mr-2 h-4 w-4 text-primary" />
                <span className="font-medium">{item.label}</span>
                <span className="ml-auto text-[10px] text-muted-foreground">{item.hint}</span>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="📍 Navegação">
            {QUICK_NAV.map((item) => (
              <CommandItem
                key={item.url}
                onSelect={() => handleSelect(item.url)}
                className="cursor-pointer"
              >
                <item.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                {item.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}

// ─── DarkModeToggle ───────────────────────────────────────────

function DarkModeToggle() {
  const [dark, setDark] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("lexa-dark") === "true" || document.documentElement.classList.contains("dark");
  });

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("lexa-dark", "true");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("lexa-dark", "false");
    }
  }, [dark]);

  return (
    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => setDark((d) => !d)}>
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}

// ─── DashboardLayout ──────────────────────────────────────────

export default function DashboardLayout() {
  const location = useLocation();
  const pageTitle = PAGE_TITLES[location.pathname] ?? "";
  const { user } = useAuth();
  const displayName = user?.user_metadata?.full_name?.split(" ")[0] || "";

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex flex-1 flex-col min-w-0">

          {/* ── Header ── */}
          <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border/60 bg-card/90 backdrop-blur-md px-4 gap-4">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="shrink-0" />
              {pageTitle && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground/40 text-sm">/</span>
                  <h2 className="text-sm font-semibold text-foreground tracking-tight">
                    {pageTitle}
                  </h2>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <GlobalSearch />
              <LanguageSwitcher />
              <DarkModeToggle />
              <NotificationsDropdown />

              {/* Avatar with greeting */}
              {displayName && (
                <div className="hidden lg:flex items-center gap-2 rounded-lg px-2.5 py-1 text-xs text-muted-foreground">
                  <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                  <span>{displayName}</span>
                </div>
              )}
            </div>
          </header>

          {/* ── Facilitador Bar ── */}
          <FacilitadorBar />

          {/* ── Page Content ── */}
          <main className="flex-1 overflow-auto bg-background p-6">
            <Outlet />
          </main>

        </div>
      </div>
      <ArunaQuickChat />
      <OnboardingTour />
    </SidebarProvider>
  );
}
