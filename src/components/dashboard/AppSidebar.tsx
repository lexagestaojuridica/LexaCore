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
import logoLexaWhite from "@/assets/logo-lexa-white.png";
import iconLexa from "@/assets/icon-lexa.png";

// ─── Nav structure grouped by journey ───────────────────────

const navGroups = [
  {
    labelKey: "groups.main",
    defaultOpen: true,
    items: [
      { titleKey: "nav.dashboard", url: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    labelKey: "groups.operational",
    defaultOpen: false,
    items: [
      { titleKey: "nav.processes", url: "/dashboard/processos", icon: Scale },
      { titleKey: "nav.agenda", url: "/dashboard/agenda", icon: CalendarDays },
      { titleKey: "nav.timesheet", url: "/dashboard/timesheet", icon: Timer },
      { titleKey: "nav.chat", url: "/dashboard/chat", icon: MessageSquare },
      { titleKey: "nav.workflow", url: "/dashboard/workflow", icon: GitBranch },
    ],
  },
  {
    labelKey: "groups.relationship",
    defaultOpen: false,
    items: [
      { titleKey: "nav.clients", url: "/dashboard/clientes", icon: Users },
      { titleKey: "nav.crm", url: "/dashboard/crm", icon: Target },
    ],
  },
  {
    labelKey: "groups.documents",
    defaultOpen: false,
    items: [
      { titleKey: "nav.minutas", url: "/dashboard/minutas", icon: FileEdit },
      { titleKey: "nav.certificates", url: "/dashboard/certificados", icon: Award },
      { titleKey: "nav.wiki", url: "/dashboard/wiki", icon: BookOpen },
      { titleKey: "nav.calculator", url: "/dashboard/calculadora", icon: Calculator },
    ],
  },
  {
    labelKey: "groups.financial",
    defaultOpen: false,
    items: [
      { titleKey: "nav.financial", url: "/dashboard/financeiro", icon: DollarSign },
    ],
  },
  {
    labelKey: "groups.intelligence",
    defaultOpen: false,
    items: [
      { titleKey: "nav.bi", url: "/dashboard/bi", icon: BarChart3 },
      { titleKey: "nav.ia", url: "/dashboard/ia", icon: Bot },
      { titleKey: "nav.news", url: "/dashboard/noticias", icon: Newspaper },
    ],
  },
  {
    labelKey: "groups.admin",
    defaultOpen: false,
    items: [
      { titleKey: "nav.units", url: "/dashboard/unidades", icon: Building2 },
    ],
  },
];

// ─── NavItem ─────────────────────────────────────────────────

function NavItem({ item, collapsed, t }: { item: { titleKey: string; url: string; icon: any }; collapsed: boolean; t: (k: string) => string }) {
  const title = t(item.titleKey);
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
              {title}
            </span>
          )}
        </NavLink>
      </TooltipTrigger>
      {collapsed && <TooltipContent side="right">{title}</TooltipContent>}
    </Tooltip>
  );
}

// ─── NavGroup ─────────────────────────────────────────────────

function NavGroup({
  group,
  collapsed,
  t,
}: {
  group: (typeof navGroups)[0];
  collapsed: boolean;
  t: (k: string) => string;
}) {
  const [open, setOpen] = useState(group.defaultOpen);

  return (
    <div className="mb-0.5">
      {!collapsed && (
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center justify-between px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/35 hover:text-sidebar-foreground/60 transition-colors"
        >
          <span>{t(group.labelKey)}</span>
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
            <NavItem key={item.titleKey} item={item} collapsed={collapsed} t={t} />
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
          <img src={logoLexaWhite} alt="LEXA" className="h-14 w-auto max-w-[140px] object-contain" />
        )}
      </div>

      {/* Nav Groups */}
      <SidebarContent className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-3">
        {navGroups.map((group) => (
          <NavGroup key={group.labelKey} group={group} collapsed={collapsed} t={t} />
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
            <TooltipContent side="right">{t("nav.settings")}</TooltipContent>
          </Tooltip>
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-sidebar-foreground/35 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                title={t("common.logout")}
                onClick={() => { resetOnboardingTour(); window.location.reload(); }}
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">{t("common.logout")}</TooltipContent>
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
            <TooltipContent side="right">{t("common.logout")}</TooltipContent>
          </Tooltip>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
