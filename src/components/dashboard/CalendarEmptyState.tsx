import { useGoogleCalendar } from "@/hooks/useGoogleCalendar";
import { useMicrosoftCalendar } from "@/hooks/useMicrosoftCalendar";
import { useAppleCalendar } from "@/hooks/useAppleCalendar";
import { Loader2, Plus, Calendar as CalendarIcon, CheckCircle2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useState } from "react";
import { AppleCalendarAuthDialog } from "./AppleCalendarAuthDialog";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { HoverElevate } from "@/components/shared/AnimatedTransitions";

interface CalendarEmptyStateProps {
    showTitle?: boolean;
}

export function CalendarEmptyState({ showTitle = false }: CalendarEmptyStateProps) {
    const gcal = useGoogleCalendar();
    const mscal = useMicrosoftCalendar();
    const appleCal = useAppleCalendar();
    const [isAppleDialogOpen, setIsAppleDialogOpen] = useState(false);

    const handleAppleClick = () => {
        if (!appleCal.isConnected) {
            setIsAppleDialogOpen(true);
        } else {
            toast({
                title: "Conectado",
                description: "Apple Calendar já está conectado.",
            });
        }
    };

    const calendars = [
        {
            id: 'apple',
            name: 'Apple Calendar',
            description: 'Sincronize o Calendário da Apple com a Lexa.',
            icon: (
                <div className="w-10 h-10 bg-white border border-black/5 rounded-xl flex flex-col items-center justify-center overflow-hidden shadow-inner group-hover:shadow-md transition-all duration-300">
                    <div className="bg-[#FF3B30] w-full h-[14px] text-[8px] font-bold text-white text-center leading-tight pt-[2px] uppercase tracking-tighter">Março</div>
                    <div className="text-black text-lg font-bold leading-tight -mt-[1px]">05</div>
                </div>
            ),
            connected: appleCal.isConnected,
            connecting: appleCal.connecting,
            onClick: handleAppleClick,
            color: 'from-zinc-200 to-zinc-400',
            accent: 'bg-zinc-500'
        },
        {
            id: 'google',
            name: 'Google Calendar',
            description: 'Sincronização entre o Google Agenda e a Lexa.',
            icon: (
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-inner group-hover:shadow-md transition-all duration-300">
                    <svg className="h-6 w-6" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                </div>
            ),
            connected: gcal.isConnected,
            connecting: gcal.connecting,
            onClick: () => !gcal.connecting && gcal.connect(),
            color: 'from-blue-400 to-emerald-400',
            accent: 'bg-blue-500'
        },
        {
            id: 'outlook',
            name: 'Outlook Calendar',
            description: 'Sincronização entre o Calendário Outlook e a Lexa.',
            icon: (
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-inner group-hover:shadow-md transition-all duration-300">
                    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none">
                        <path d="M11 3H3v8h8V3z" fill="#00A4EF" />
                        <path d="M11 13H3v8h8v-8z" fill="#00A4EF" />
                        <path d="M21 3h-8v8h8V3z" fill="#00A4EF" />
                        <path d="M21 13h-8v8h8v-8z" fill="#00A4EF" />
                    </svg>
                </div>
            ),
            connected: mscal.isConnected,
            connecting: mscal.connecting,
            onClick: () => !mscal.connecting && mscal.connect(),
            color: 'from-sky-400 to-indigo-500',
            accent: 'bg-sky-500'
        }
    ];

    return (
        <div className="flex flex-col w-full py-4 space-y-6 overflow-visible">
            {showTitle && (
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 px-1">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                                <CalendarIcon className="w-4 h-4" />
                            </div>
                            <h3 className="text-xl font-bold tracking-tight text-foreground">Calendários</h3>
                        </div>
                        <p className="text-sm text-muted-foreground font-medium">Sincronize sua rotina jurídica com um clique.</p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 w-full">
                {calendars.map((cal) => (
                    <HoverElevate key={cal.id} className="h-full">
                        <div
                            onClick={cal.onClick}
                            className={cn(
                                "group relative flex flex-col p-6 h-full min-h-[180px] rounded-2xl transition-all duration-500 overflow-hidden cursor-pointer border border-border/40",
                                "bg-card/40 backdrop-blur-md hover:bg-card/60 hover:border-border/80",
                                cal.connected && "border-primary/30 bg-primary/5"
                            )}
                        >
                            {/* Background decoration */}
                            <div className={cn(
                                "absolute -right-8 -top-8 w-24 h-24 rounded-full blur-3xl opacity-10 transition-all duration-500 group-hover:scale-150 group-hover:opacity-20",
                                cal.accent
                            )} />

                            <div className="flex items-start justify-between mb-6 relative z-10">
                                {cal.icon}
                                <div className="flex items-center gap-2">
                                    {cal.connecting ? (
                                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                                    ) : cal.connected ? (
                                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-bold uppercase tracking-wider">
                                            <CheckCircle2 className="w-3 h-3" />
                                            Conectado
                                        </div>
                                    ) : (
                                        <div className="p-1.5 rounded-full bg-muted/50 text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                                            <Plus className="w-4 h-4" />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="relative z-10 mt-auto">
                                <h4 className="text-lg font-bold text-foreground mb-1 group-hover:text-primary transition-colors duration-300 capitalize">
                                    {cal.name}
                                </h4>
                                <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                                    {cal.description}
                                </p>
                            </div>

                            {/* Hover bar indicator */}
                            <div className={cn(
                                "absolute bottom-0 left-0 h-1 w-0 group-hover:w-full transition-all duration-700 ease-out",
                                cal.accent
                            )} />
                        </div>
                    </HoverElevate>
                ))}
            </div>

            <AppleCalendarAuthDialog
                open={isAppleDialogOpen}
                onOpenChange={setIsAppleDialogOpen}
            />
        </div>
    );
}
