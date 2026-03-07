import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CalendarDays, ExternalLink, Download, Upload, Unplug, Trash2 } from "lucide-react";
import { useGoogleCalendar } from "@/features/agenda/hooks/useGoogleCalendar";
import { useMicrosoftCalendar } from "@/features/agenda/hooks/useMicrosoftCalendar";
import { useAppleCalendar } from "@/features/agenda/hooks/useAppleCalendar";

export function CalendarsIntegrationDialog({
    open,
    onOpenChange
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const gcal = useGoogleCalendar();
    const mscal = useMicrosoftCalendar();
    const appleCal = useAppleCalendar();

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="font-semibold">Integrações de Calendário</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <p className="text-sm text-muted-foreground mb-2">Conecte sua agenda com outros serviços ou exporte seus eventos.</p>

                    {/* Google Calendar */}
                    <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/30 transition-colors group">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/5 text-blue-500 group-hover:bg-blue-500/10 transition-colors">
                            <CalendarDays className="h-4.5 w-4.5" />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <p className="text-sm font-medium">Google Calendar</p>
                                {gcal.isConnected && <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                            </div>
                            <p className="text-[11px] text-muted-foreground">{gcal.isConnected ? "Sincronizado" : "OAuth 2.0"}</p>
                        </div>
                        {gcal.isConnected ? (
                            <div className="space-y-2">
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" className="gap-1.5 text-xs flex-1" onClick={() => gcal.importEvents()} disabled={gcal.importing}>
                                        {gcal.importing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />} Importar
                                    </Button>
                                    <Button variant="outline" size="sm" className="gap-1.5 text-xs flex-1" onClick={() => gcal.exportEvents()} disabled={gcal.exporting}>
                                        {gcal.exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />} Exportar
                                    </Button>
                                    <Button variant="ghost" size="sm" className="px-2 text-destructive hover:bg-destructive/10" onClick={() => gcal.disconnect()} title="Desconectar"><Unplug className="h-4 w-4" /></Button>
                                </div>
                                <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs border-destructive/30 text-destructive hover:bg-destructive/10" onClick={() => gcal.clearEvents()} disabled={gcal.clearing}>
                                    {gcal.clearing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                                    Limpar Agenda Importada
                                </Button>
                            </div>
                        ) : (
                            <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs border-blue-500/30 text-blue-600 hover:bg-blue-500/10" onClick={() => gcal.connect()} disabled={gcal.connecting}>
                                {gcal.connecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ExternalLink className="h-3.5 w-3.5" />}
                                Conectar Google Account
                            </Button>
                        )}
                    </div>

                    {/* Microsoft Calendar */}
                    <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/30 transition-colors group">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/5 text-indigo-500 group-hover:bg-indigo-500/10 transition-colors">
                            <CalendarDays className="h-4.5 w-4.5" />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <p className="text-sm font-medium">Microsoft 365</p>
                                {mscal.isConnected && <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                            </div>
                            <p className="text-[11px] text-muted-foreground">{mscal.isConnected ? "Sincronizado" : "Outlook / Exchange"}</p>
                        </div>
                        {mscal.isConnected ? (
                            <div className="space-y-2">
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" className="gap-1.5 text-xs flex-1" onClick={() => mscal.importEvents()} disabled={mscal.importing}>
                                        {mscal.importing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />} Importar
                                    </Button>
                                    <Button variant="outline" size="sm" className="gap-1.5 text-xs flex-1" onClick={() => mscal.exportEvents()} disabled={mscal.exporting}>
                                        {mscal.exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />} Exportar
                                    </Button>
                                    <Button variant="ghost" size="sm" className="px-2 text-destructive hover:bg-destructive/10" onClick={() => mscal.disconnect()} title="Desconectar"><Unplug className="h-4 w-4" /></Button>
                                </div>
                                <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs border-destructive/30 text-destructive hover:bg-destructive/10" onClick={() => mscal.clearEvents()} disabled={mscal.clearing}>
                                    {mscal.clearing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                                    Limpar Agenda Importada
                                </Button>
                            </div>
                        ) : (
                            <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs border-indigo-500/30 text-indigo-600 hover:bg-indigo-500/10" onClick={() => mscal.connect()} disabled={mscal.connecting}>
                                {mscal.connecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ExternalLink className="h-3.5 w-3.5" />}
                                Conectar Microsoft 365
                            </Button>
                        )}
                    </div>

                    {/* Apple Calendar */}
                    <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/30 transition-colors group">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200">
                            <CalendarDays className="h-4.5 w-4.5" />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <p className="text-sm font-medium">Apple Calendar</p>
                                {appleCal.isConnected && <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                            </div>
                            <p className="text-[11px] text-muted-foreground">{appleCal.isConnected ? "Sincronizado" : "CalDAV"}</p>
                        </div>
                        {appleCal.isConnected ? (
                            <div className="space-y-2">
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" className="gap-1.5 text-xs flex-1" onClick={() => appleCal.importEvents()} disabled={appleCal.importing}>
                                        {appleCal.importing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />} Importar
                                    </Button>
                                    <Button variant="outline" size="sm" className="gap-1.5 text-xs flex-1 border-dashed text-muted-foreground cursor-not-allowed" disabled title="Em Breve">
                                        <Upload className="h-3.5 w-3.5" /> Exportar
                                    </Button>
                                    <Button variant="ghost" size="sm" className="px-2 text-destructive hover:bg-destructive/10" onClick={() => appleCal.disconnect()} title="Desconectar"><Unplug className="h-4 w-4" /></Button>
                                </div>
                                <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs border-destructive/30 text-destructive hover:bg-destructive/10" onClick={() => appleCal.clearEvents()} disabled={appleCal.clearing}>
                                    {appleCal.clearing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                                    Limpar Agenda Importada
                                </Button>
                            </div>
                        ) : (
                            <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs border-neutral-500/30 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-500/10 cursor-not-allowed" disabled>
                                Para conectar, use o novo menu inicial de integrações!
                            </Button>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
