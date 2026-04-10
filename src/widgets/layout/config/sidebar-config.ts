import {
    LayoutDashboard, Scale, Users, CalendarDays, DollarSign, Bot,
    Newspaper, Target, BarChart3, GitBranch, FileEdit,
    Timer, MessageSquare
} from "lucide-react";

export interface NavItemConfig {
    titleKey: string;
    url: string;
    icon: any;
    allowedRoles?: string[];
}

export interface NavGroupConfig {
    labelKey: string;
    defaultOpen: boolean;
    items: NavItemConfig[];
}

export const navGroups: NavGroupConfig[] = [
    {
        labelKey: "groups.main",
        defaultOpen: true,
        items: [
            { titleKey: "nav.dashboard", url: "/dashboard", icon: LayoutDashboard },
            { titleKey: "Newsletter", url: "/dashboard/newsletter", icon: Newspaper },
        ],
    },
    {
        labelKey: "groups.operational",
        defaultOpen: false,
        items: [
            { titleKey: "nav.processes", url: "/dashboard/processos", icon: Scale },
            { titleKey: "nav.agenda", url: "/dashboard/agenda", icon: CalendarDays },
            { titleKey: "nav.minutas", url: "/dashboard/minutas", icon: FileEdit },
            { titleKey: "nav.timesheet", url: "/dashboard/timesheet", icon: Timer },
            { titleKey: "nav.chat", url: "/dashboard/chat", icon: MessageSquare }, // Note: MessageSquare was in imports but I'll make sure it's here
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
        labelKey: "groups.intelligence",
        defaultOpen: false,
        items: [
            { titleKey: "nav.ia", url: "/dashboard/ia", icon: Bot },
            { titleKey: "B.I.", url: "/dashboard/bi", icon: BarChart3 },
            { titleKey: "Relatórios", url: "/dashboard/relatorios", icon: FileEdit },
        ],
    },
    {
        labelKey: "groups.management",
        defaultOpen: false,
        items: [
            { titleKey: "nav.financial", url: "/dashboard/financeiro", icon: DollarSign, allowedRoles: ["admin", "advogado", "financeiro"] },
        ],
    },
];
