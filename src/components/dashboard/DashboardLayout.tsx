import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { NotificationsDropdown } from "./NotificationsDropdown";
import ArunaQuickChat from "@/components/shared/ArunaQuickChat";
import FacilitadorBar from "./FacilitadorBar";
import { useAuth } from "@/contexts/AuthContext";
import { Search } from "lucide-react";
import { useEffect, useCallback, useState } from "react";
import { cn } from "@/lib/utils";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
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
};

// ─── Quick navigation items for Cmd+K ─────────────────────────

const QUICK_NAV = [
  { label: "Meu Dia", url: "/dashboard", group: "Navegação" },
  { label: "Processos", url: "/dashboard/processos", group: "Navegação" },
  { label: "Agenda & Prazos", url: "/dashboard/agenda", group: "Navegação" },
  { label: "Clientes", url: "/dashboard/clientes", group: "Navegação" },
  { label: "Financeiro", url: "/dashboard/financeiro", group: "Navegação" },
  { label: "Workflow", url: "/dashboard/workflow", group: "Navegação" },
  { label: "Minutas & Contratos", url: "/dashboard/minutas", group: "Navegação" },
  { label: "BI & Relatórios", url: "/dashboard/bi", group: "Navegação" },
  { label: "ARUNA IA", url: "/dashboard/ia", group: "Navegação" },
  { label: "Notícias Jurídicas", url: "/dashboard/noticias", group: "Navegação" },
  { label: "CRM", url: "/dashboard/crm", group: "Navegação" },
  { label: "Calculadora", url: "/dashboard/calculadora", group: "Navegação" },
  { label: "Configurações", url: "/dashboard/configuracoes", group: "Navegação" },
];

// ─── GlobalSearch ─────────────────────────────────────────────

function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

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
          <span>⌘</span>K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Buscar módulo, ação..." />
        <CommandList>
          <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
          <CommandGroup heading="Navegação rápida">
            {QUICK_NAV.map((item) => (
              <CommandItem
                key={item.url}
                onSelect={() => handleSelect(item.url)}
                className="cursor-pointer"
              >
                {item.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
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
    </SidebarProvider>
  );
}
