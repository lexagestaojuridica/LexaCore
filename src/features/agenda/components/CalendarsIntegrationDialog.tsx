import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Separator } from "@/shared/ui/separator";
import { useGoogleCalendar } from "@/features/agenda/hooks/useGoogleCalendar";
import { useMicrosoftCalendar } from "@/features/agenda/hooks/useMicrosoftCalendar";
import { useAppleCalendar } from "@/features/agenda/hooks/useAppleCalendar";
import {
  CalendarDays,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  ArrowRightLeft,
  Trash2,
  Plus,
  HelpCircle
} from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { AppleCalendarAuthDialog } from "./AppleCalendarAuthDialog";
import { useState } from "react";

interface CalendarsIntegrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CalendarsIntegrationDialog({
  open,
  onOpenChange,
}: CalendarsIntegrationDialogProps) {
  const { t } = useTranslation();
  const gcal = useGoogleCalendar();
  const mscal = useMicrosoftCalendar();
  const appleCal = useAppleCalendar();
  const [appleDialogOpen, setAppleDialogOpen] = useState(false);

  const services = [
    {
      id: "google",
      title: t("agenda.integrations.google.title"),
      description: t("agenda.integrations.google.description"),
      icon: CalendarDays,
      iconColor: "text-blue-500",
      bgColor: "bg-blue-500/10",
      hook: gcal,
      provider: "Google"
    },
    {
      id: "microsoft",
      title: t("agenda.integrations.microsoft.title"),
      description: t("agenda.integrations.microsoft.description"),
      icon: CalendarDays,
      iconColor: "text-indigo-500",
      bgColor: "bg-indigo-500/10",
      hook: mscal,
      provider: "Microsoft"
    },
    {
      id: "apple",
      title: t("agenda.integrations.apple.title"),
      description: t("agenda.integrations.apple.description"),
      icon: CalendarDays,
      iconColor: "text-zinc-500",
      bgColor: "bg-zinc-500/10",
      hook: appleCal,
      provider: "Apple",
      isApple: true
    }
  ];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden border-none shadow-2xl rounded-[24px]">
          <DialogHeader className="p-6 pb-4 bg-gradient-to-br from-muted/50 to-background">
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2 rounded-xl bg-primary/10">
                <RefreshCw className="h-5 w-5 text-primary" />
              </div>
              <DialogTitle className="text-xl font-display font-semibold tracking-tight">
                {t("agenda.integrations.title")}
              </DialogTitle>
            </div>
            <DialogDescription className="text-sm text-muted-foreground ml-11">
              {t("agenda.integrations.description")}
            </DialogDescription>
          </DialogHeader>

          <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
            {services.map((service, idx) => {
              const hook = service.hook;
              const isConnected = hook.isConnected;
              const isSyncing = hook.importing || hook.exporting || hook.clearing;

              return (
                <motion.div
                  key={service.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className={cn(
                    "group relative rounded-2xl border p-4 transition-all duration-300",
                    isConnected 
                      ? "border-primary/20 bg-primary/[0.02] shadow-sm" 
                      : "border-border bg-card hover:border-muted-foreground/20 hover:shadow-md"
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex gap-3">
                      <div className={cn("p-2.5 rounded-xl shrink-0 transition-transform group-hover:scale-105", service.bgColor)}>
                        {service.id === "apple" ? (
                           <div className="w-6 h-6 bg-white border border-black/5 rounded-md flex flex-col items-center justify-center overflow-hidden shadow-sm">
                             <div className="bg-red-500 w-full h-[8px] text-[4px] font-bold text-white text-center leading-tight pt-[0.5px]">CAL</div>
                             <div className="text-black text-[10px] font-bold leading-tight">05</div>
                           </div>
                        ) : (
                          <service.icon className={cn("h-5 w-5", service.iconColor)} />
                        )}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-sm tracking-tight">{service.title}</h4>
                          {isConnected ? (
                            <Badge variant="outline" className="h-5 px-1.5 text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-1 animate-in fade-in zoom-in duration-300">
                              <CheckCircle2 className="h-3 w-3" /> {t("agenda.integrations.status.connected")}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="h-5 px-1.5 text-[10px] text-muted-foreground border-border bg-muted/30">
                              {t("agenda.integrations.status.disconnected")}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed pr-4">
                          {service.description}
                        </p>
                      </div>
                    </div>
                  </div>

                  <AnimatePresence mode="wait">
                    {isConnected ? (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-4 pt-4 border-t border-border/50 space-y-3 overflow-hidden"
                      >
                        <div className="grid grid-cols-2 gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 text-xs gap-1.5"
                            onClick={() => hook.importEvents()}
                            disabled={isSyncing}
                          >
                            <RefreshCw className={cn("h-3.5 w-3.5", hook.importing && "animate-spin")} />
                            {hook.importing ? t("agenda.integrations.status.importing") : t("agenda.integrations.actions.import")}
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 text-xs gap-1.5"
                            onClick={() => hook.exportEvents()}
                            disabled={isSyncing}
                          >
                            <ArrowRightLeft className={cn("h-3.5 w-3.5", hook.exporting && "animate-pulse")} />
                            {hook.exporting ? t("agenda.integrations.status.exporting") : t("agenda.integrations.actions.export")}
                          </Button>
                        </div>
                        
                        <div className="flex items-center justify-between gap-2 pt-1">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 text-[10px] text-muted-foreground hover:text-destructive gap-1.5 px-2"
                            onClick={() => hook.clearEvents()}
                            disabled={isSyncing}
                          >
                            <Trash2 className="h-3 w-3" />
                            {t("agenda.integrations.actions.clear")}
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 text-xs text-destructive hover:bg-destructive/10 gap-1.5"
                            onClick={() => hook.disconnect()}
                            disabled={hook.disconnecting}
                          >
                            {t("agenda.integrations.actions.disconnect")}
                          </Button>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="mt-4"
                      >
                        <Button 
                          variant="outline" 
                          className={cn(
                            "w-full h-9 gap-2 text-sm font-medium transition-all",
                            service.id === "google" && "hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200",
                            service.id === "microsoft" && "hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200",
                            service.id === "apple" && "hover:bg-zinc-50 hover:text-zinc-600 hover:border-zinc-200"
                          )}
                          onClick={() => service.isApple ? setAppleDialogOpen(true) : hook.connect()}
                          disabled={hook.connecting}
                        >
                          {hook.connecting ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Plus className="h-4 w-4" />
                              {t("agenda.integrations.actions.connect")} {service.provider}
                            </>
                          )}
                        </Button>
                        
                        {service.isApple && (
                          <div className="mt-2 flex items-center gap-1.5 px-1">
                            <HelpCircle className="h-3 w-3 text-muted-foreground" />
                            <p className="text-[10px] text-muted-foreground italic">
                              {t("agenda.integrations.apple_instructions")}
                            </p>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>

          <Separator className="opacity-50" />
          
          <div className="p-4 bg-muted/20 flex items-center justify-center">
            <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <AlertCircle className="h-3 w-3" />
              Sincronização em segundo plano habilitada por padrão após a conexão.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <AppleCalendarAuthDialog 
        open={appleDialogOpen} 
        onOpenChange={setAppleDialogOpen} 
      />
    </>
  );
}
