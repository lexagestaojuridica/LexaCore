import { useGoogleCalendar } from "@/features/agenda/hooks/useGoogleCalendar";
import { useMicrosoftCalendar } from "@/features/agenda/hooks/useMicrosoftCalendar";
import { useAppleCalendar } from "@/features/agenda/hooks/useAppleCalendar";
import { Plus, Calendar as CalendarIcon, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface CalendarEmptyStateProps {
    showTitle?: boolean;
}

export function CalendarEmptyState({ showTitle = false }: CalendarEmptyStateProps) {
    const navigate = useRouter();
    const gcal = useGoogleCalendar();
    const mscal = useMicrosoftCalendar();
    const appleCal = useAppleCalendar();

    const isAnyConnected = gcal.isConnected || mscal.isConnected || appleCal.isConnected;

    if (isAnyConnected) {
        return (
            <div className="flex flex-col items-center py-8 text-center bg-muted/5 border-2 border-dashed border-border/40 rounded-2xl">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                    <CheckCircle2 className="h-6 w-6 text-primary" />
                </div>
                <p className="text-sm font-semibold text-foreground/80 mb-1">Tudo pronto!</p>
                <p className="text-xs text-muted-foreground max-w-[200px]">Nenhum compromisso marcado para este período.</p>
                <Button variant="link" size="sm" className="mt-2 text-xs font-bold uppercase tracking-wider" onClick={() => window.dispatchEvent(new CustomEvent('calendar-open-create'))}>
                    <Plus className="h-4 w-4 mr-1" /> Criar Compromisso
                </Button>
            </div>
        );
    }

    return (
        <div className="group relative flex flex-col p-8 items-center text-center bg-card/40 backdrop-blur-md border border-border/40 rounded-2xl transition-all duration-500 hover:bg-card/60 overflow-hidden">
            <div className="p-3.5 rounded-2xl bg-primary/10 text-primary mb-4 relative z-10 transition-transform duration-500 group-hover:scale-110">
                <CalendarIcon className="w-8 h-8" />
            </div>

            <div className="relative z-10 space-y-2">
                <h3 className="text-lg font-bold tracking-tight text-foreground">Sincronize sua Agenda</h3>
                <p className="text-sm text-muted-foreground max-w-[300px] leading-relaxed">
                    Integre com Google, Outlook ou Apple para visualizar seus prazos e compromissos automaticamente.
                </p>
            </div>

            <Button
                onClick={() => navigate.push("/dashboard/configuracoes?tab=integracoes")}
                className="mt-6 px-8 gap-2 group-hover:shadow-lg group-hover:shadow-primary/20 transition-all duration-300 relative z-10"
            >
                Configurar Integrações
                <Plus className="w-4 h-4" />
            </Button>

            <div className="absolute bottom-0 left-0 h-1 w-0 group-hover:w-full bg-primary transition-all duration-700 ease-out" />
        </div>
    );
}
