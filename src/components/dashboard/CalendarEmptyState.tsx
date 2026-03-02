import { useGoogleCalendar } from "@/hooks/useGoogleCalendar";
import { useMicrosoftCalendar } from "@/hooks/useMicrosoftCalendar";
import { useAppleCalendar } from "@/hooks/useAppleCalendar";
import { Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useState } from "react";
import { AppleCalendarAuthDialog } from "./AppleCalendarAuthDialog";

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

    return (
        <div className="flex flex-col items-start justify-center py-8 px-6 glass-card rounded-2xl border border-border/40 w-full relative">
            <div className="mb-6">
                <h3 className="text-xl font-semibold text-foreground mb-1">Calendários</h3>
                <p className="text-sm text-muted-foreground">Sincronize suas tarefas e seu calendário.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                {/* Apple Calendar Card */}
                <div
                    onClick={handleAppleClick}
                    className={`group flex flex-col p-5 bg-background/50 hover:bg-muted/30 dark:bg-card/30 dark:hover:bg-muted/20 border border-border/40 rounded-xl cursor-pointer transition-all duration-300 hover:shadow-sm hover:-translate-y-0.5 relative ${appleCal.isConnected ? 'ring-2 ring-primary/50' : ''}`}
                >
                    <div className="mb-4 flex items-center justify-between">
                        <div className="w-9 h-9 bg-white border border-black/5 rounded-lg flex flex-col items-center justify-center overflow-hidden shadow-sm group-hover:scale-105 transition-transform duration-300">
                            <div className="bg-red-500 w-full h-[12px] text-[7px] font-bold text-white text-center leading-tight pt-[2px]">Monday</div>
                            <div className="text-black text-xs font-semibold leading-tight mt-[1px]">17</div>
                        </div>
                        {appleCal.connecting && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                    </div>
                    <h4 className="font-semibold text-foreground mb-1.5 group-hover:text-primary transition-colors">Apple Calendar</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                        Sincronize o Calendário da Apple com a Lexa.
                    </p>
                </div>

                {/* Google Calendar Card */}
                <div
                    onClick={() => !gcal.connecting && gcal.connect()}
                    className="group flex flex-col p-5 bg-background/50 hover:bg-muted/30 dark:bg-card/30 dark:hover:bg-muted/20 border border-border/40 rounded-xl cursor-pointer transition-all duration-300 hover:shadow-sm hover:-translate-y-0.5 relative"
                >
                    <div className="mb-4 flex items-center justify-between">
                        <svg className="h-9 w-9 group-hover:scale-105 transition-transform duration-300" viewBox="0 0 24 24">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                        {gcal.connecting && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                    </div>
                    <h4 className="font-semibold text-foreground mb-1.5 group-hover:text-primary transition-colors">Google Calendar</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                        Sincronização entre o Google Agenda e a Lexa.
                    </p>
                </div>

                {/* Outlook Calendar Card */}
                <div
                    onClick={() => !mscal.connecting && mscal.connect()}
                    className="group flex flex-col p-5 bg-background/50 hover:bg-muted/30 dark:bg-card/30 dark:hover:bg-muted/20 border border-border/40 rounded-xl cursor-pointer transition-all duration-300 hover:shadow-sm hover:-translate-y-0.5 relative"
                >
                    <div className="mb-4 flex items-center justify-between">
                        <svg className="h-9 w-9 group-hover:scale-105 transition-transform duration-300" viewBox="0 0 24 24" fill="none">
                            <path d="M11 3H3v8h8V3z" fill="#00A4EF" />
                            <path d="M11 13H3v8h8v-8z" fill="#00A4EF" />
                            <path d="M21 3h-8v8h8V3z" fill="#00A4EF" />
                            <path d="M21 13h-8v8h8v-8z" fill="#00A4EF" />
                        </svg>
                        {mscal.connecting && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                    </div>
                    <h4 className="font-semibold text-foreground mb-1.5 group-hover:text-primary transition-colors">Outlook Calendar</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                        Sincronização entre o Calendário Outlook e a Lexa.
                    </p>
                </div>
            </div>

            <AppleCalendarAuthDialog
                open={isAppleDialogOpen}
                onOpenChange={setIsAppleDialogOpen}
            />
        </div>
    );
}
