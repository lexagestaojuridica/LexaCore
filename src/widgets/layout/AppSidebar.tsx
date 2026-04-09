import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  useSidebar,
} from "@/shared/ui/sidebar";
import Image from "next/image";
import { NavLink } from "@/widgets/layout/NavLink";
import { useUser } from "@clerk/nextjs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { cn } from "@/shared/lib/utils";
import { useTranslation } from "react-i18next";
import logoLexaWhite from "@/assets/logo-lexa-white.png";
import iconLexa from "@/assets/icon-lexa.png";
import { useQuery } from "@tanstack/react-query";
import { db as supabase } from "@/integrations/supabase/db";
import { navGroups, type NavItemConfig, type NavGroupConfig } from "./config/sidebar-config";

// ─── Sub-components ───────────────────────────────────────────

function NavItem({ item, collapsed, t }: { item: NavItemConfig; collapsed: boolean; t: (k: string) => string }) {
  const title = t(item.titleKey);
  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <NavLink
          to={item.url}
          end={item.url === "/dashboard"}
          className="sidebar-nav-link group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] text-sidebar-foreground/45 transition-all duration-300 hover:bg-white/5 hover:text-sidebar-foreground"
          activeClassName="bg-white/10 text-primary font-semibold border-r-2 border-accent !rounded-r-none shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]"
        >
          <item.icon className="sidebar-icon h-4 w-4 shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:text-accent" />
          {!collapsed && (
            <span className="truncate font-medium transition-transform duration-300 group-hover:translate-x-1">
              {title}
            </span>
          )}
        </NavLink>
      </TooltipTrigger>
      {collapsed && <TooltipContent side="right" className="font-sans font-bold">{title}</TooltipContent>}
    </Tooltip>
  );
}

function NavGroup({
  group,
  collapsed,
  t,
}: {
  group: NavGroupConfig;
  collapsed: boolean;
  t: (k: string) => string;
}) {
  const [open, setOpen] = useState(group.defaultOpen);

  return (
    <div className="mb-0.5">
      {!collapsed && (
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center justify-between px-2.5 py-2 mt-4 text-[9px] font-bold uppercase tracking-[0.15em] text-sidebar-foreground/30 hover:text-sidebar-foreground/50 transition-colors font-display"
        >
          <span>{t(group.labelKey)}</span>
          <ChevronDown
            className={cn(
              "h-2.5 w-2.5 transition-transform duration-300 opacity-50",
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

// ─── Main Component ───────────────────────────────────────────

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { user } = useUser();
  const { t } = useTranslation();

  const { data: userRoleData } = useQuery({
    queryKey: ["user-role", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000,    // 1 hour
  });

  const role = (userRoleData?.role) ?? (user?.publicMetadata?.app_role as string) ?? "admin";

  return (
    <Sidebar collapsible="icon" className="border-r border-white/5 bg-sidebar-background shadow-2xl">
      <div className="flex h-20 shrink-0 items-center justify-center border-b border-white/5 px-4 mb-2">
        {collapsed ? (
          <Image src={iconLexa} alt="LEXA" width={32} height={32} className="h-8 w-8 object-contain animate-pulse" />
        ) : (
          <Image src={logoLexaWhite} alt="LEXA" width={140} height={64} className="h-16 w-auto max-w-[140px] object-contain" />
        )}
      </div>

      <SidebarContent className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-3">
        {navGroups.map((group) => {
          const filteredItems = group.items.filter((item) =>
            !item.allowedRoles || item.allowedRoles.includes(role) || role === "admin"
          );
          if (filteredItems.length === 0) return null;

          return (
            <NavGroup
              key={group.labelKey}
              group={{ ...group, items: filteredItems }}
              collapsed={collapsed}
              t={t}
            />
          );
        })}
      </SidebarContent>

      <SidebarFooter className="shrink-0 border-t border-sidebar-border/50 p-2.5" />
    </Sidebar>
  );
}
