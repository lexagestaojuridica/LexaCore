import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    useSidebar,
} from "@/shared/ui/sidebar";
import { NavLink } from "@/widgets/layout/NavLink";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip";
import {
    LogOut,
    Building2,
    CreditCard,
    BarChart3,
    ShieldAlert,
    Settings,
    Headset,
} from "lucide-react";
import { StaticImageData } from "next/image";
import iconLexa from "@/assets/icon-lexa.png";

const getIconSrc = (icon: string | StaticImageData) => {
    return typeof icon === 'string' ? icon : icon.src;
};

const adminNavItems = [
    { title: "Executivo (SaaS)", url: "/admin/hq", icon: BarChart3 },
    { title: "Escritórios & Clientes", url: "/admin/hq/organizations", icon: Building2 },
    { title: "Planos & Assinaturas", url: "/admin/hq/plans", icon: CreditCard },
    { title: "Auditoria & Logs", url: "/admin/hq/audit", icon: ShieldAlert },
    { title: "Suporte Master", url: "/admin/hq/support", icon: Headset },
    { title: "Configurações Globais", url: "/admin/hq/settings", icon: Settings },
];

export function AdminSidebar() {
    const { state } = useSidebar();
    const collapsed = state === "collapsed";
    const logoSrc = getIconSrc(iconLexa);

    return (
        <Sidebar collapsible="icon" className="bg-zinc-950 border-r border-zinc-900">
            <div className="flex h-14 shrink-0 items-center justify-center border-b border-zinc-900 px-3 bg-zinc-950">
                {collapsed ? (
                    <img src={logoSrc} alt="LEXA" className="h-8 w-8 object-contain opacity-80" />
                ) : (
                    <div className="flex items-center gap-2">
                        <img src={logoSrc} alt="LEXA" className="h-6 w-6 object-contain" />
                        <span className="text-white font-bold tracking-wider text-sm">BACKOFFICE</span>
                    </div>
                )}
            </div>
            <SidebarContent className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-4 bg-zinc-950">
                <div className="mb-2 px-3 text-[10px] font-semibold tracking-wider text-zinc-500 uppercase">
                    {!collapsed && "Administração Master"}
                </div>
                <nav className="flex flex-col gap-1">
                    {adminNavItems.map((item) => (
                        <Tooltip delayDuration={0} key={item.title}>
                            <TooltipTrigger asChild>
                                <NavLink
                                    to={item.url}
                                    end={item.url === "/admin/hq"}
                                    className="sidebar-nav-link group flex items-center gap-3 rounded-md px-3 py-2 text-[13px] text-zinc-400 font-medium transition-all duration-200 hover:bg-zinc-900 hover:text-white"
                                    activeClassName="bg-indigo-600/10 text-indigo-400 font-semibold border-l-2 border-indigo-500 !rounded-l-none"
                                >
                                    <item.icon className="h-4 w-4 shrink-0" />
                                    {!collapsed && <span className="truncate">{item.title}</span>}
                                </NavLink>
                            </TooltipTrigger>
                            {collapsed && <TooltipContent side="right" className="bg-zinc-800 text-white border-zinc-700">{item.title}</TooltipContent>}
                        </Tooltip>
                    ))}
                </nav>
            </SidebarContent>
            <SidebarFooter className="shrink-0 border-t border-zinc-900 p-3 bg-zinc-950">
                <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                        <a href="/dashboard" className="flex items-center gap-2 rounded-md px-3 py-2 text-[13px] text-zinc-400 font-medium transition-all hover:bg-zinc-900 hover:text-white">
                            <LogOut className="h-4 w-4 rotate-180" />
                            {!collapsed && <span>Voltar ao Dashboard</span>}
                        </a>
                    </TooltipTrigger>
                    {collapsed && <TooltipContent side="right" className="bg-zinc-800 text-white border-zinc-700">Voltar ao Dashboard</TooltipContent>}
                </Tooltip>
            </SidebarFooter>
        </Sidebar>
    );
}
