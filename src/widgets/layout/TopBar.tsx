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
import { NotificationsDropdown } from "@/features/meu-dia/components/NotificationsDropdown";
import FacilitadorBar from "@/features/meu-dia/components/FacilitadorBar";
import ChatWidget from "@/features/chat/components/ChatWidget";

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
    const { t } = useTranslation();
    const navigate = useRouter();
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
        <header className="sticky top-0 z-40 flex h-14 w-full items-center justify-between border-b border-border/40 glass px-4 transition-all duration-300">

            {/* Left Axis: Sidebar Toggle + Title */}
            <div className="flex items-center gap-3 w-1/3">
                <SidebarTrigger className="shrink-0 text-foreground/60 hover:text-primary transition-colors" />
                <div className="h-4 w-px bg-border/40" />
                <h1 className="text-sm font-bold tracking-tight text-foreground md:text-base font-display uppercase tracking-[0.05em]">
                    {currentTitle}
                </h1>
            </div>

            {/* Center Axis: Global Search */}
            <div className="flex-1 flex justify-center w-1/3">
                <Button
                    variant="outline"
                    className="hidden md:flex h-9 w-64 lg:w-80 items-center justify-between bg-muted/50 px-3 text-muted-foreground hover:bg-muted/80 hover:text-foreground border-border/50 transition-colors"
                    onClick={openGlobalSearch}
                >
                    <div className="flex items-center gap-2 overflow-hidden mr-2">
                        <Search className="h-4 w-4 shrink-0" />
                        <span className="text-sm font-normal truncate">{t("cmdK.searchPlaceholder")}</span>
                    </div>
                    <kbd className="pointer-events-none inline-flex h-5 items-center gap-1 rounded border border-border/50 bg-background/50 px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                        <span className="text-xs">⌘</span>K
                    </kbd>
                </Button>
            </div>

            {/* Right Axis: Tools & Profile */}
            <div className="flex items-center gap-1.5 md:gap-3">

                <Button variant="ghost" size="icon" className="md:hidden h-9 w-9 text-muted-foreground hover:text-foreground" onClick={openGlobalSearch}>
                    <Search className="h-4 w-4" />
                </Button>

                <div className="h-5 w-px bg-border/50 hidden md:block mx-1" />

                {/* Refesh Page */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="hidden md:flex h-9 w-9 items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all active:rotate-180"
                    onClick={handleRefresh}
                    title="Refresh"
                >
                    <RefreshCcw className="h-4 w-4" />
                </Button>

                {/* Facilitador (Quick Links) */}
                <div className="hidden md:block">
                    <FacilitadorBar />
                </div>

                {/* Theme Toggle */}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                    className="hidden md:flex h-9 w-9 items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80"
                    title="Alternar Tema"
                >
                    {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                </Button>

                {/* Language Switcher */}
                <div className="hidden md:block">
                    <LanguageSwitcher />
                </div>

                {/* Notifications Dropdown */}
                <NotificationsDropdown />

                {/* Global Chat Widget */}
                <ChatWidget />

                <div className="h-5 w-px bg-border/50 hidden md:block mx-1" />

                {/* User Profile Dropdown */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-9 px-2 gap-2 hover:bg-muted/80 pl-2">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary overflow-hidden ring-1 ring-primary/20">
                                {avatarUrl ? (
                                    <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
                                ) : (
                                    initials
                                )}
                            </div>
                            <span className="hidden md:inline-flex text-sm font-medium text-foreground max-w-[120px] truncate">
                                {displayName}
                            </span>
                            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground hidden md:block" />
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
