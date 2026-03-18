import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { SidebarProvider, SidebarTrigger } from "@/shared/ui/sidebar";
import { AdminSidebar } from "./AdminSidebar";
import { useAuth, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/ui/button";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger
} from "@/shared/ui/dropdown-menu";
import { LogOut, Settings, User, RefreshCw, Moon, Sun, ChevronDown, ArrowLeft } from "lucide-react";
import { useTheme } from "@/shared/components/ThemeProvider";

const ADMIN_TITLES: Record<string, string> = {
    "/admin/hq": "Painel Executivo",
    "/admin/hq/organizations": "Escritórios & Clientes",
    "/admin/hq/plans": "Planos & Assinaturas",
    "/admin/hq/audit": "Auditoria & Logs",
    "/admin/hq/support": "Suporte Master",
    "/admin/hq/settings": "Configurações Globais",
};

export default function AdminLayout({ children }: { children?: React.ReactNode }) {
    const { signOut } = useAuth();
    const { user } = useUser();
    const navigate = useRouter();
    const pathname = usePathname();
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const displayName = user?.fullName || user?.primaryEmailAddress?.emailAddress || "Super Admin";
    const initials = (displayName as string)
        .split(" ")
        .map((n: string) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();

    const pageTitle = pathname ? ADMIN_TITLES[pathname] : "Backoffice";

    return (
        <SidebarProvider>
            <div className="flex min-h-screen w-full bg-zinc-950 text-zinc-50 overflow-hidden font-sans">
                <AdminSidebar />
                <div className="flex flex-1 flex-col min-w-0 transition-all duration-300 ease-in-out">
                    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-4 border-b border-zinc-900 bg-zinc-950/80 px-4 backdrop-blur-md">
                        <SidebarTrigger className="text-zinc-400 hover:text-white" />
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 px-2"
                            onClick={() => navigate.push("/dashboard")}
                        >
                            <ArrowLeft className="h-3.5 w-3.5" />
                            <span className="text-xs font-medium hidden sm:inline">Dashboard</span>
                        </Button>
                        <div className="h-5 w-px bg-zinc-800" />
                        <div className="flex items-center gap-2">
                            <span className="flex h-5 w-5 items-center justify-center rounded bg-indigo-500/20 text-[10px] font-bold text-indigo-400 border border-indigo-500/20">
                                HQ
                            </span>
                            <h1 className="text-sm font-semibold tracking-tight text-zinc-200">
                                {pageTitle}
                            </h1>
                        </div>
                        <div className="ml-auto flex items-center gap-2">
                            <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Online</span>
                            </div>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-800" onClick={() => window.location.reload()}>
                                <RefreshCw className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-800" onClick={() => setTheme(theme === "light" ? "dark" : "light")}>
                                {mounted ? (theme === "light" ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />) : <div className="h-3.5 w-3.5" />}
                            </Button>
                            <div className="h-5 w-px bg-zinc-800 mx-1" />
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-zinc-800 transition-colors">
                                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white shadow-sm ring-1 ring-zinc-950">
                                            {initials}
                                        </div>
                                        <div className="hidden md:flex flex-col items-start leading-none">
                                            <span className="text-sm font-semibold text-zinc-100 truncate max-w-[150px]">{displayName}</span>
                                            <span className="text-[10px] text-indigo-400/80 font-medium">Master Admin</span>
                                        </div>
                                        <ChevronDown className="h-4 w-4 text-zinc-500 hidden md:block ml-1 opacity-50" />
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48 bg-zinc-900 border-zinc-800 text-zinc-200">
                                    <DropdownMenuItem className="text-xs gap-2 cursor-pointer hover:bg-zinc-800 focus:bg-zinc-800" onClick={() => navigate.push("/admin/hq/settings")}>
                                        <Settings className="h-3.5 w-3.5" /> Configurações
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="text-xs gap-2 cursor-pointer hover:bg-zinc-800 focus:bg-zinc-800" onClick={() => navigate.push("/dashboard")}>
                                        <User className="h-3.5 w-3.5" /> Ir para Dashboard
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator className="bg-zinc-800" />
                                    <DropdownMenuItem className="text-xs gap-2 cursor-pointer text-red-400 hover:bg-red-500/10 focus:bg-red-500/10" onClick={() => signOut()}>
                                        <LogOut className="h-3.5 w-3.5" /> Sair
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </header>
                    <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 relative">
                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/10 via-zinc-950 to-zinc-950 pointer-events-none" />
                        <div className="relative z-10 max-w-7xl mx-auto">
                            {children}
                        </div>
                    </main>
                </div>
            </div>
        </SidebarProvider>
    );
}
