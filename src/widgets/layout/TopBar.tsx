"use client";

import { useState, useEffect } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { useRouter, usePathname } from "next/navigation";
import { SidebarTrigger } from "@/shared/ui/sidebar";
import {
    Search, RefreshCcw, Bell, Moon, Sun,
    Settings, LogOut, ChevronDown, User, Plus, ShieldAlert
} from "lucide-react";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger
} from "@/shared/ui/dropdown-menu";
import { Button } from "@/shared/ui/button";
import { useTheme } from "@/shared/components/ThemeProvider";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/shared/lib/utils";
import { LanguageSwitcher } from "@/shared/components/LanguageSwitcher";
import dynamic from "next/dynamic";
const NotificationsDropdown = dynamic(() => import("@/features/meu-dia/components/NotificationsDropdown").then(mod => ({ default: mod.NotificationsDropdown })), { ssr: false });
const FacilitadorBar = dynamic(() => import("@/features/meu-dia/components/FacilitadorBar"), { ssr: false });
const ChatWidget = dynamic(() => import("@/features/chat/components/ChatWidget"), { ssr: false });

// Route → i18n key mapping for dynamic TopBar title
const PAGE_TITLE_KEYS: Record<string, string> = {
    "/dashboard": "nav.dashboard",
    "/dashboard/processos": "processes.title",
    "/dashboard/clientes": "clients.title",
    "/dashboard/agenda": "agenda.title",
    "/dashboard/financeiro": "financial.title",
    "/dashboard/ia": "ia.title",
    "/dashboard/bi": "bi.title",
    "/dashboard/noticias": "news.title",
    "/dashboard/crm": "crm.title",
    "/dashboard/workflow": "workflow.title",
    "/dashboard/minutas": "minutas.title",
    "/dashboard/configuracoes": "settings.title",
    "/dashboard/timesheet": "timesheet.title",
    "/dashboard/chat": "chat.title",
    "/dashboard/unidades": "units.title",
};

export function TopBar() {
    const { signOut } = useAuth();
    const { user } = useUser();
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const { t } = useTranslation();
    const navigate = useRouter();

    useEffect(() => {
        setMounted(true);
    }, []);
    const pathname = usePathname();
    const queryClient = useQueryClient();

    const handleLogout = async () => {
        queryClient.clear();
        await signOut();
        navigate.push("/auth");
    };

    const handleRefresh = () => {
        window.location.reload();
    };

    const openGlobalSearch = () => {
        const e = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true });
        document.dispatchEvent(e);
    };

    const displayName = user?.fullName || user?.primaryEmailAddress?.emailAddress || "";
    const avatarUrl = user?.imageUrl;
    const initials = displayName
        .split(" ")
        .map((n: string) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();

    // Dynamic Page Title using i18n
    const titleKey = pathname ? PAGE_TITLE_KEYS[pathname] : null;
    const currentTitle = titleKey ? t(titleKey) : "Dashboard";

    return (
        <header className="sticky top-0 z-40 flex h-14 w-full items-center justify-between border-b border-border bg-background px-4 transition-all duration-300">

            {/* Left Axis: Sidebar Toggle + Title */}
            <div className="flex items-center gap-3 w-1/4">
                <SidebarTrigger className="shrink-0 text-slate-400 hover:text-lexa-blue transition-colors" />
                <h1 className="text-xs font-medium tracking-[0.15em] text-slate-500 uppercase font-sans">
                    {currentTitle}
                </h1>
            </div>

            {/* Center Axis: Global Search */}
            <div className="flex-1 flex justify-center">
                <div className="relative w-full max-w-xl group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-lexa-blue transition-colors" />
                    <input
                        type="search"
                        placeholder={t("cmdK.searchPlaceholder")}
                        className="h-10 w-full rounded-xl bg-muted pl-11 pr-12 text-sm text-foreground border border-transparent focus:border-primary/30 focus:bg-card focus:ring-4 focus:ring-primary/5 transition-all outline-none placeholder:text-muted-foreground"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                        <kbd className="hidden md:inline-flex h-5 items-center gap-1 rounded border border-slate-200 bg-white px-1.5 font-mono text-[10px] font-medium text-slate-400">
                            ⌘K
                        </kbd>
                    </div>
                </div>
            </div>

            {/* Right Axis: Tools & Profile */}
            <div className="flex items-center gap-2 md:gap-4 w-1/4 justify-end">

                {/* Desktop Tools */}
                <div className="hidden md:flex items-center gap-1">
                    <LanguageSwitcher />

                    <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg" onClick={handleRefresh}>
                        <RefreshCcw className="h-4 w-4" />
                    </Button>

                    <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg" onClick={() => setTheme(theme === "light" ? "dark" : "light")}>
                        {mounted && theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                    </Button>

                    <NotificationsDropdown />

                    <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
                        <svg className="h-4 w-4" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                    </Button>
                </div>

                {/* User Profile Dropdown */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-9 px-1.5 gap-2 hover:bg-slate-100 rounded-xl group transition-all">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-lexa-blue text-[10px] font-bold text-white overflow-hidden shadow-sm shadow-lexa-blue/20">
                                {avatarUrl ? (
                                    <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
                                ) : (
                                    "L"
                                )}
                            </div>
                            <div className="hidden md:flex flex-col items-start gap-0">
                                <span className="text-xs font-semibold text-slate-700 leading-none">
                                    Lexa
                                </span>
                            </div>
                            <ChevronDown className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-600 transition-colors" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[280px] p-2" sideOffset={8}>
                        <DropdownMenuLabel className="font-normal p-2.5">
                            <div className="flex flex-col space-y-2">
                                <p className="text-sm font-semibold leading-none text-foreground truncate">{displayName}</p>
                                {displayName !== user?.primaryEmailAddress?.emailAddress && (
                                    <p className="text-xs leading-none text-muted-foreground truncate">{user?.primaryEmailAddress?.emailAddress}</p>
                                )}
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => navigate.push("/dashboard/configuracoes")}>
                            <Settings className="h-4 w-4 text-muted-foreground" />
                            <span>{t("nav.settings")}</span>
                        </DropdownMenuItem>
                        {user?.primaryEmailAddress?.emailAddress === "lexagestaojuridica@gmail.com" && (
                            <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="cursor-pointer gap-2 text-rose-600 focus:text-rose-700 focus:bg-rose-500/10" onClick={() => navigate.push("/admin/hq")}>
                                    <ShieldAlert className="h-4 w-4" />
                                    <span>SaaS Backoffice</span>
                                </DropdownMenuItem>
                            </>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="cursor-pointer gap-2 text-destructive focus:text-destructive focus:bg-destructive/10" onClick={handleLogout}>
                            <LogOut className="h-4 w-4" />
                            <span>{t("common.logout")}</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

            </div>
        </header>
    );
}
