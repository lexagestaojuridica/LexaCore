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
  LayoutDashboard,
  Scale,
  Users,
  CalendarDays,
  DollarSign,
  Bot,
  LogOut,
  Settings,
  BarChart3,
  Calculator,
  Newspaper,
} from "lucide-react";
import logoLexaWhite from "@/assets/logo-lexa-white.png";
import iconLexa from "@/assets/icon-lexa.png";

const mainNav = [
  { title: "Visão Geral", url: "/dashboard", icon: LayoutDashboard },
  { title: "Processos", url: "/dashboard/processos", icon: Scale },
  { title: "Clientes", url: "/dashboard/clientes", icon: Users },
  { title: "Agenda", url: "/dashboard/agenda", icon: CalendarDays },
  { title: "Financeiro", url: "/dashboard/financeiro", icon: DollarSign },
  { title: "Aruna IA", url: "/dashboard/ia", icon: Bot },
  { title: "BI", url: "/dashboard/bi", icon: BarChart3 },
  { title: "Calculadora", url: "/dashboard/calculadora", icon: Calculator },
  { title: "Notícias", url: "/dashboard/noticias", icon: Newspaper },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { user, signOut } = useAuth();

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
      <div className="flex h-14 shrink-0 items-center justify-center border-b border-sidebar-border px-3">
        {collapsed ? (
          <img src={iconLexa} alt="LEXA" className="h-8 w-8 object-contain" />
        ) : (
          <img src={logoLexaWhite} alt="LEXA" className="h-14 w-auto max-w-[140px] object-contain" />
        )}
      </div>

      {/* Nav */}
      <SidebarContent className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-2">
        <nav className="flex flex-col gap-0.5">
          {mainNav.map((item) => (
            <Tooltip key={item.title} delayDuration={0}>
              <TooltipTrigger asChild>
              <NavLink
                  to={item.url}
                  end={item.url === "/dashboard"}
                  className="sidebar-nav-link group flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] text-sidebar-foreground/55 transition-all duration-200 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                  activeClassName="bg-gradient-to-r from-accent/20 to-transparent text-sidebar-foreground font-medium border-l-2 border-accent !rounded-l-none"
                >
                  <item.icon className="sidebar-icon h-4 w-4 shrink-0" />
                  {!collapsed && <span className="truncate transition-transform duration-200 group-hover:translate-x-0.5">{item.title}</span>}
                </NavLink>
              </TooltipTrigger>
              {collapsed && <TooltipContent side="right">{item.title}</TooltipContent>}
            </Tooltip>
          ))}
        </nav>

        {/* Settings */}
        <div className="mt-auto pt-2 border-t border-sidebar-border/40">
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <NavLink
                to="/dashboard/configuracoes"
                className="sidebar-nav-link group flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] text-sidebar-foreground/55 transition-all duration-200 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                activeClassName="bg-gradient-to-r from-accent/20 to-transparent text-sidebar-foreground font-medium border-l-2 border-accent !rounded-l-none"
              >
                <Settings className="sidebar-icon h-4 w-4 shrink-0" />
                {!collapsed && <span className="transition-transform duration-200 group-hover:translate-x-0.5">Configurações</span>}
              </NavLink>
            </TooltipTrigger>
            {collapsed && <TooltipContent side="right">Configurações</TooltipContent>}
          </Tooltip>
        </div>
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="shrink-0 border-t border-sidebar-border p-2.5">
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
