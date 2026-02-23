import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  LayoutDashboard, Scale, Users, CalendarDays, DollarSign, Bot,
  LogOut, Settings, BarChart3, Calculator, Newspaper, Target,
  GitBranch, FileEdit, ChevronDown, Award, Timer, BookOpen, RotateCcw,
  MessageSquare, Building2,
} from "lucide-react";
import { resetOnboardingTour } from "./OnboardingTour";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import logoLexa from "@/assets/logo-lexa.png";
import iconLexa from "@/assets/icon-lexa.png";

// ─── Nav structure grouped by journey ───────────────────────

const navGroups = [
  {
    label: "Início",
    defaultOpen: true,
    items: [
      { title: "Meu Dia", url: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Operacional",
    defaultOpen: false,
    items: [
      { title: "Processos", url: "/dashboard/processos", icon: Scale },
      { title: "Agenda & Prazos", url: "/dashboard/agenda", icon: CalendarDays },
      { title: "Timesheet", url: "/dashboard/timesheet", icon: Timer },
      { title: "Chat Interno", url: "/dashboard/chat", icon: MessageSquare },
      { title: "Workflow", url: "/dashboard/workflow", icon: GitBranch },
    ],
  },
  {
    label: "Relacionamento",
    defaultOpen: false,
    items: [
      { title: "Clientes", url: "/dashboard/clientes", icon: Users },
      { title: "CRM", url: "/dashboard/crm", icon: Target },
    ],
  },
  {
    label: "Documentos",
    defaultOpen: false,
    items: [
      { title: "Minutas & Contratos", url: "/dashboard/minutas", icon: FileEdit },
      { title: "Certificados", url: "/dashboard/certificados", icon: Award },
      { title: "Wiki Jurídica", url: "/dashboard/wiki", icon: BookOpen },
      { title: "Calculadora", url: "/dashboard/calculadora", icon: Calculator },
    ],
  },
  {
    label: "Financeiro",
    defaultOpen: false,
    items: [
      { title: "Financeiro", url: "/dashboard/financeiro", icon: DollarSign },
    ],
  },
  {
    label: "Inteligência",
    defaultOpen: false,
    items: [
      { title: "BI & Relatórios", url: "/dashboard/bi", icon: BarChart3 },
      { title: "ARUNA IA", url: "/dashboard/ia", icon: Bot },
      { title: "Notícias Jurídicas", url: "/dashboard/noticias", icon: Newspaper },
    ],
  },
  {
    label: "Administração",
    defaultOpen: false,
    items: [
      { title: "Unidades / Franquias", url: "/dashboard/unidades", icon: Building2 },
    ],
  },
];

// ─── NavItem ─────────────────────────────────────────────────

function NavItem({ item, collapsed }: { item: { title: string; url: string; icon: any }; collapsed: boolean }) {
  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <NavLink
          to={item.url}
          end={item.url === "/dashboard"}
          className="sidebar-nav-link group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] text-sidebar-foreground/60 transition-all duration-200 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
          activeClassName="bg-gradient-to-r from-sidebar-accent to-transparent text-sidebar-foreground font-medium border-l-2 border-accent !rounded-l-none"
        >
          <item.icon className="sidebar-icon h-4 w-4 shrink-0" />
          {!collapsed && (
            <span className="truncate transition-transform duration-200 group-hover:translate-x-0.5">
              {item.title}
            </span>
          )}
        </NavLink>
      </TooltipTrigger>
      {collapsed && <TooltipContent side="right">{item.title}</TooltipContent>}
    </Tooltip>
  );
}

// ─── NavGroup ─────────────────────────────────────────────────

function NavGroup({
  group,
  collapsed,
}: {
  group: (typeof navGroups)[0];
  collapsed: boolean;
}) {
  const [open, setOpen] = useState(group.defaultOpen);

  return (
    <div className="mb-0.5">
      {!collapsed && (
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center justify-between px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/35 hover:text-sidebar-foreground/60 transition-colors"
        >
          <span>{group.label}</span>
          <ChevronDown
            className={cn(
              "h-3 w-3 transition-transform duration-200",
              !open && "-rotate-90"
            )}
          />
        </button>
      )}
      {collapsed && (
        <div className="my-1 mx-2 h-px bg-sidebar-border/30" />
      )}
      {(open || collapsed) && (
        <nav className="flex flex-col gap-0.5">
          {group.items.map((item) => (
            <NavItem key={item.title} item={item} collapsed={collapsed} />
          ))}
        </nav>
      )}
    </div>
  );
}

// ─── AppSidebar ───────────────────────────────────────────────

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { user, signOut } = useAuth();
  const { t } = useTranslation();

  const displayName = user?.user_metadata?.full_name || user?.email || "";
  const avatarUrl = user?.user_metadata?.avatar_url;
  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <Sidebar collapsible="icon">
      {/* Logo */}
      <div className="flex h-14 shrink-0 items-center justify-center border-b border-sidebar-border/50 px-3">
        {collapsed ? (
          <img src={iconLexa} alt="LEXA" className="h-8 w-8 object-contain" />
        ) : (
          <img src={logoLexa} alt="LEXA" className="h-14 w-auto max-w-[140px] object-contain" />
        )}
      </div>

      {/* Nav Groups */}
      <SidebarContent className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-3">
        {navGroups.map((group) => (
          <NavGroup key={group.label} group={group} collapsed={collapsed} />
        ))}
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="shrink-0 border-t border-sidebar-border/50 p-2.5">
        <div className="flex items-center gap-2.5">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName}
              className="h-8 w-8 shrink-0 rounded-full object-cover ring-1 ring-sidebar-accent/50"
            />
          ) : (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/80 text-[11px] font-semibold text-accent-foreground">
              {initials}
            </div>
          )}
          {!collapsed && (
            <div className="flex flex-1 flex-col overflow-hidden">
              <span className="truncate text-xs font-medium text-sidebar-foreground">
                {displayName}
              </span>
              <span className="truncate text-[10px] text-sidebar-foreground/35">
                {user?.email}
              </span>
            </div>
          )}
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-sidebar-foreground/35 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                asChild
              >
                <NavLink to="/dashboard/configuracoes">
                  <Settings className="h-3.5 w-3.5" />
                </NavLink>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Configurações</TooltipContent>
          </Tooltip>
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-sidebar-foreground/35 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                title="Rever tour de boas-vindas"
                onClick={() => { resetOnboardingTour(); window.location.reload(); }}
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Rever Tour de Boas-Vindas</TooltipContent>
          </Tooltip>
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-sidebar-foreground/35 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                onClick={signOut}
              >
                <LogOut className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Sair</TooltipContent>
          </Tooltip>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
