import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
    Search, RefreshCcw, Bell, Moon, Sun,
    Settings, LogOut, ChevronDown, User, Plus
} from "lucide-react";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme-provider";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { NotificationsDropdown } from "../dashboard/NotificationsDropdown";
import FacilitadorBar from "../dashboard/FacilitadorBar";
import ChatWidget from "./ChatWidget";

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
    const { user, signOut } = useAuth();
    const { theme, setTheme } = useTheme();
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const queryClient = useQueryClient();

    const handleLogout = async () => {
        queryClient.clear();
        await signOut();
        navigate("/auth");
    };

    const handleRefresh = () => {
        window.location.reload();
    };

    const openGlobalSearch = () => {
        const e = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true });
        document.dispatchEvent(e);
    };

    const displayName = user?.user_metadata?.full_name || user?.email || "";
    const avatarUrl = user?.user_metadata?.avatar_url;
    const initials = displayName
        .split(" ")
        .map((n: string) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();

    // Dynamic Page Title using i18n
    const titleKey = PAGE_TITLE_KEYS[location.pathname];
    const currentTitle = titleKey ? t(titleKey) : "Dashboard";

    return (
        <header className="sticky top-0 z-40 flex h-14 w-full items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">

            {/* Left Axis: Sidebar Toggle + Title */}
            <div className="flex items-center gap-3">
                <SidebarTrigger className="shrink-0 text-muted-foreground hover:text-foreground" />
                <div className="h-5 w-px bg-border/40" />
                <h1 className="text-base font-semibold tracking-tight text-foreground md:text-lg">
                    {currentTitle}
                </h1>
            </div>

            {/* Right Axis: Tools & Profile */}
            <div className="flex items-center gap-1.5 md:gap-3">

                {/* Global Search Button */}
                <Button
                    variant="outline"
                    className="hidden md:flex h-9 w-60 items-center justify-between bg-muted/50 px-3 text-muted-foreground hover:bg-muted/80 hover:text-foreground border-border/50 transition-colors"
                    onClick={openGlobalSearch}
                >
                    <div className="flex items-center gap-2">
                        <Search className="h-4 w-4" />
                        <span className="text-sm font-normal">{t("cmdK.searchPlaceholder")}</span>
                    </div>
                    <kbd className="pointer-events-none inline-flex h-5 items-center gap-1 rounded border border-border/50 bg-background/50 px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                        <span className="text-xs">⌘</span>K
                    </kbd>
                </Button>

                <Button variant="ghost" size="icon" className="md:hidden h-9 w-9 text-muted-foreground hover:text-foreground" onClick={openGlobalSearch}>
                    <Search className="h-4 w-4" />
                </Button>

                <div className="h-5 w-px bg-border/50 hidden md:block mx-1" />

                {/* Refesh Page */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all active:rotate-180"
                    onClick={handleRefresh}
                    title="Recarregar Dados"
                >
                    <RefreshCcw className="h-4 w-4" />
                </Button>

                {/* Facilitador (Quick Links) */}
                <FacilitadorBar />

                {/* Theme Toggle */}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                    className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-muted/80"
                    title="Alternar Tema"
                >
                    {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                </Button>

                {/* Language Switcher */}
                <LanguageSwitcher />

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
                    <DropdownMenuContent align="end" className="w-56" sideOffset={8}>
                        <DropdownMenuLabel className="font-normal">
                            <div className="flex flex-col space-y-1">
                                <p className="text-sm font-medium leading-none text-foreground">{displayName}</p>
                                <p className="text-xs leading-none text-muted-foreground truncate">{user?.email}</p>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => navigate("/dashboard/configuracoes")}>
                            <Settings className="h-4 w-4 text-muted-foreground" />
                            <span>{t("nav.settings")}</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="cursor-pointer gap-2 text-rose-500 focus:text-rose-600 focus:bg-rose-500/10" onClick={handleLogout}>
                            <LogOut className="h-4 w-4" />
                            <span>{t("common.logout")}</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

            </div>
        </header>
    );
}
