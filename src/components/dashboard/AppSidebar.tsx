import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
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
  FileText,
  Bot,
  LogOut,
  Settings,
  ChevronRight,
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
  { title: "Documentos", url: "/dashboard/documentos", icon: FileText },
  { title: "Aruna IA", url: "/dashboard/ia", icon: Bot },
  { title: "Business Intelligence", url: "/dashboard/bi", icon: BarChart3 },
  { title: "Calculadora", url: "/dashboard/calculadora", icon: Calculator },
  { title: "Notícias", url: "/dashboard/noticias", icon: Newspaper },
];

const bottomNav = [
  { title: "Configurações", url: "/dashboard/configuracoes", icon: Settings },
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
      <div className="flex h-20 items-center justify-center border-b border-sidebar-border px-4">
        {collapsed ? (
          <img src={iconLexa} alt="LEXA" className="h-10 w-10 object-contain" />
        ) : (
          <img src={logoLexaWhite} alt="LEXA" className="h-20 w-auto max-w-[180px] object-contain" />
        )}
      </div>

      <SidebarContent className="px-2 py-4">
        <SidebarGroup>
          {!collapsed && (
            <SidebarGroupLabel className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/30">
              Menu Principal
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              {mainNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      end={item.url === "/dashboard"}
                      className="sidebar-nav-link group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-sidebar-foreground/60 transition-all duration-200 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium !text-sidebar-accent-foreground"
                    >
                      <item.icon className="h-[18px] w-[18px] shrink-0" />
                      <span className="flex-1">{item.title}</span>
                      {!collapsed && (
                        <ChevronRight className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-50" />
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-auto">
          {!collapsed && (
            <SidebarGroupLabel className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/30">
              Sistema
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {bottomNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      className="sidebar-nav-link group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-sidebar-foreground/60 transition-all duration-200 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    >
                      <item.icon className="h-[18px] w-[18px] shrink-0" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-3">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName}
              className="h-9 w-9 shrink-0 rounded-full object-cover ring-2 ring-sidebar-accent"
            />
          ) : (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
              {initials}
            </div>
          )}
          {!collapsed && (
            <div className="flex flex-1 flex-col overflow-hidden">
              <span className="truncate text-xs font-medium text-sidebar-foreground">
                {displayName}
              </span>
              <span className="truncate text-[10px] text-sidebar-foreground/40">
                {user?.email}
              </span>
            </div>
          )}
          {!collapsed && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                  onClick={signOut}
                >
                  <LogOut className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Sair</TooltipContent>
            </Tooltip>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
