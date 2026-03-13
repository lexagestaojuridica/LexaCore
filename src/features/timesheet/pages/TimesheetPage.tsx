import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTimer } from "@/features/timesheet/hooks/useTimer";
import { useTimesheet } from "@/features/timesheet/hooks/useTimesheet";
import type { TimesheetEntry, TimerLog, ProcessoTimesheet as Processo } from "@/features/timesheet/types";
import { toast } from "sonner";
import { format, differenceInMinutes, parseISO, isToday, isYesterday, isValid, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
    Clock, Plus, Play, Square, Trash2, Timer,
    TrendingUp, Calendar, BarChart3, ChevronRight, PlayCircle, Target, Briefcase,
    Pause, RotateCcw, ChevronDown, History, Receipt, AlertTriangle, Zap, CalendarCheck
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/shared/ui/button";
import { asaasService } from "@/services/asaasService";
import { Input } from "@/shared/ui/input";
import { Card, CardContent } from "@/shared/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Textarea } from "@/shared/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/shared/ui/dialog";
import { cn } from "@/shared/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

// ─── Helpers ──────────────────────────────────────────────────
const fmtDuration = (minutes: number): string => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h ${m.toString().padStart(2, "0")}m` : `${m}m`;
};

const fmtCurrency = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const BILLING_OPTIONS = [
    { value: "pendente", label: "Pendente", color: "text-amber-600 bg-amber-500/10", dot: "bg-amber-500" },
    { value: "faturado", label: "Faturado", color: "text-blue-600 bg-blue-500/10", dot: "bg-blue-500" },
    { value: "pago", label: "Pago", color: "text-emerald-600 bg-emerald-500/10", dot: "bg-emerald-500" },
    { value: "nao_faturavel", label: "Não Faturável", color: "text-slate-600 bg-slate-500/10", dot: "bg-slate-500" },
];

function getBillingMeta(status: string) {
    return BILLING_OPTIONS.find((b) => b.value === status) ?? BILLING_OPTIONS[0];
}

function getDayGroupLabel(dateStr: string) {
    const d = parseISO(dateStr);
    if (isToday(d)) return "Hoje";
    if (isYesterday(d)) return "Ontem";
    return format(d, "EEEE, d 'de' MMMM", { locale: ptBR });
}

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
    start: { label: "Iniciado", color: "text-emerald-600" },
    pause: { label: "Pausado", color: "text-amber-600" },
    resume: { label: "Retomado", color: "text-blue-600" },
    stop: { label: "Finalizado", color: "text-red-600" },
};

// ─── Main Page ────────────────────────────────────────────────
export default function TimesheetPage() {
    const { user } = useAuth();
    const { t } = useTranslation();

    const [dialogOpen, setDialogOpen] = useState(false);
    const [manualForm, setManualForm] = useState({
        processId: "none", description: "", date: format(new Date(), "yyyy-MM-dd"),
        startTime: "09:00", endTime: "10:00", hourlyRate: "", billingStatus: "pendente",
    });
    const [filterProcess, setFilterProcess] = useState("all");
    const [filterStatus, setFilterStatus] = useState("all");
    const [expandedEntry, setExpandedEntry] = useState<string | null>(null);

    const { data: profile } = useQuery({
        queryKey: ["profile", user?.id],
        queryFn: async () => {
            const { data } = await supabase.from("profiles").select("organization_id").eq("user_id", user!.id).single();
            return data;
        },
        enabled: !!user,
    });
    const orgId = profile?.organization_id;

    const {
        activeTimer, timerDescription, setTimerDescription, timerProcess, setTimerProcess,
        timerRate, setTimerRate, elapsed, startTimer, pauseTimer, resumeTimer, stopTimer
    } = useTimer(orgId, user?.id);

    const {
        entries, isLoading, processos, createMutation, deleteMutation, handleBilling
    } = useTimesheet(orgId, user?.id);

    // ── Timer logs query ──
    const { data: rawTimerLogs = [] } = useQuery({
        queryKey: ["timer-logs", expandedEntry],
        queryFn: async () => {
            const { data } = await supabase
                .from("timesheet_timer_logs")
                .select("*")
                .eq("timesheet_entry_id", expandedEntry!)
                .order("logged_at", { ascending: true });
            return (data ?? []) as unknown as TimerLog[];
        },
        enabled: !!expandedEntry,
    });

    const timerLogs = useMemo(() => {
        return rawTimerLogs.filter(log => log.logged_at && isValid(parseISO(log.logged_at)));
    }, [rawTimerLogs]);

    const handleManualSubmit = () => {
        const startedAt = new Date(`${manualForm.date}T${manualForm.startTime}:00`);
        const endedAt = new Date(`${manualForm.date}T${manualForm.endTime}:00`);
        if (endedAt <= startedAt) { toast.error("Horário de fim deve ser após o início"); return; }
        const durationMinutes = differenceInMinutes(endedAt, startedAt);
        createMutation.mutate({
            organization_id: orgId!,
            user_id: user!.id,
            process_id: manualForm.processId === "none" ? null : manualForm.processId,
            description: manualForm.description || null,
            started_at: startedAt.toISOString(),
            ended_at: endedAt.toISOString(),
            duration_minutes: durationMinutes,
            hourly_rate: manualForm.hourlyRate ? Number(manualForm.hourlyRate) : null,
            billing_status: manualForm.billingStatus,
        });
        setDialogOpen(false);
        setManualForm({ processId: "none", description: "", date: format(new Date(), "yyyy-MM-dd"), startTime: "09:00", endTime: "10:00", hourlyRate: "", billingStatus: "pendente" });
    };

    // Filter
    const filtered = entries.filter((e) => {
        const matchProcess = filterProcess === "all" || e.process_id === filterProcess;
        const matchStatus = filterStatus === "all" || e.billing_status === filterStatus;
        return matchProcess && matchStatus;
    });

    // Grouping by day
    const groupedDays = filtered.reduce((acc, entry) => {
        const dayLabel = getDayGroupLabel(entry.started_at);
        if (!acc[dayLabel]) acc[dayLabel] = [];
        acc[dayLabel].push(entry);
        return acc;
    }, {} as Record<string, TimesheetEntry[]>);

    // KPIs
    const totalMinutes = filtered.reduce((s, e) => s + (e.duration_minutes ?? 0), 0);
    const faturavel = filtered.filter((e) => e.billing_status === "pendente" || e.billing_status === "faturado");
    const totalFaturavel = faturavel.reduce((s, e) => s + ((e.duration_minutes ?? 0) / 60) * (e.hourly_rate ?? 0), 0);
    const totalPago = filtered.filter((e) => e.billing_status === "pago").reduce((s, e) => s + ((e.duration_minutes ?? 0) / 60) * (e.hourly_rate ?? 0), 0);

    // ── Smart Features ──────────────────────────────────────

    // Agenda-based suggestions: fetch today's events
    const todayStr = format(new Date(), "yyyy-MM-dd");
    const { data: agendaEvents = [] } = useQuery({
        queryKey: ["agenda-suggestions", orgId, todayStr],
        queryFn: async () => {
            const dayStart = startOfDay(new Date()).toISOString();
            const dayEnd = endOfDay(new Date()).toISOString();
            const { data } = await supabase
                .from("agenda_eventos")
                .select("id, title, start_time, end_time")
                .eq("organization_id", orgId!)
                .gte("start_time", dayStart)
                .lte("start_time", dayEnd)
                .order("start_time");
            return data || [];
        },
        enabled: !!orgId,
    });

    // Today's logged minutes
    const todayMinutes = useMemo(() => {
        return entries
            .filter(e => {
                try { return isToday(parseISO(e.started_at)); } catch { return false; }
            })
            .reduce((s, e) => s + (e.duration_minutes ?? 0), 0);
    }, [entries]);

    const MIN_DAILY_HOURS = 6;
    const unloggedMinutes = Math.max(0, MIN_DAILY_HOURS * 60 - todayMinutes);
    const hasUnloggedAlert = todayMinutes < MIN_DAILY_HOURS * 60;

    // Suggestions: agenda events not yet in timesheet today
    const suggestions = useMemo(() => {
        const todayDescriptions = entries
            .filter(e => { try { return isToday(parseISO(e.started_at)); } catch { return false; } })
            .map(e => (e.description || "").toLowerCase());
        return agendaEvents.filter((ev: any) => {
            const title = (ev.title || "").toLowerCase();
            return !todayDescriptions.some(d => d.includes(title) || title.includes(d));
        });
    }, [agendaEvents, entries]);

    // Overlap/inconsistency detection
    const overlaps = useMemo(() => {
        const todayEntries = entries
            .filter(e => { try { return isToday(parseISO(e.started_at)); } catch { return false; } })
            .filter(e => e.ended_at)
            .sort((a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime());

        const issues: string[] = [];
        for (let i = 0; i < todayEntries.length - 1; i++) {
            const currEnd = new Date(todayEntries[i].ended_at!).getTime();
            const nextStart = new Date(todayEntries[i + 1].started_at).getTime();
            if (currEnd > nextStart) {
                issues.push(
                    `"${todayEntries[i].description || 'Sem desc.'}" sobrepõe "${todayEntries[i + 1].description || 'Sem desc.'}"`
                );
            }
        }
        return issues;
    }, [entries]);

    // Format elapsed timer
    const elapsedH = Math.floor(elapsed / 3600);
    const elapsedM = Math.floor((elapsed % 3600) / 60);
    const elapsedS = elapsed % 60;
    const elapsedFmt = `${elapsedH.toString().padStart(2, "0")}:${elapsedM.toString().padStart(2, "0")}:${elapsedS.toString().padStart(2, "0")}`;

    const containerAnim = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
    const itemAnim = { hidden: { opacity: 0, scale: 0.95 }, show: { opacity: 1, scale: 1 } };

    return (
        <motion.div variants={containerAnim} initial="hidden" animate="show" className="max-w-6xl mx-auto space-y-6 pb-10">

            {/* Header */}
            <motion.div variants={itemAnim} className="flex flex-col md:flex-row md:items-end justify-between gap-4 pt-2">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t("nav.timesheet")}</h1>
                    <p className="mt-1 text-muted-foreground text-sm flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Registro e faturamento de horas
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setDialogOpen(true)} className="h-9 gap-2 text-sm font-medium">
                        <Plus className="h-4 w-4" /> Manual
                    </Button>
                </div>
            </motion.div>

            {/* ── Active Timer (Compact) ── */}
            <motion.div variants={itemAnim}>
                <Card className={cn(
                    "border-border/50 relative overflow-hidden transition-all duration-500",
                    activeTimer ? "shadow-md ring-1 ring-primary/20 shadow-primary/10" : ""
                )}>
                    {activeTimer && (
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-primary/5 to-transparent animate-gradient-slow opacity-50" />
                    )}

                    <CardContent className="p-4 relative">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center justify-between">
                            <div className="flex-1 max-w-2xl space-y-3">
                                <div className="flex items-center gap-2">
                                    <div className={cn(
                                        "h-2 w-2 rounded-full",
                                        activeTimer
                                            ? activeTimer.isPaused
                                                ? "bg-amber-500"
                                                : "bg-primary animate-pulse"
                                            : "bg-muted-foreground/30"
                                    )} />
                                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                        {activeTimer
                                            ? activeTimer.isPaused ? "Timer pausado" : "Timer em andamento"
                                            : "Iniciar nova atividade"}
                                    </p>
                                </div>

                                {!activeTimer ? (
                                    <div className="flex flex-col gap-2 sm:flex-row items-center">
                                        <Input value={timerDescription} onChange={(e) => setTimerDescription(e.target.value)} placeholder="O que você está fazendo?" className="h-10 flex-1 bg-background/50 border-border/50 focus-visible:ring-primary/20" onKeyDown={(e) => e.key === "Enter" && startTimer()} />
                                        <Select value={timerProcess} onValueChange={setTimerProcess}>
                                            <SelectTrigger className="h-10 w-full sm:w-56 bg-background/50 border-border/50 focus:ring-primary/20">
                                                <SelectValue placeholder="Vincular Processo" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">Sem vínculo</SelectItem>
                                                {processos.map((p) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                        <div className="relative w-full sm:w-28">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">R$</span>
                                            <Input value={timerRate} onChange={(e) => setTimerRate(e.target.value)} placeholder="0,00" className="h-10 pl-8 bg-background/50 border-border/50 focus-visible:ring-primary/20" type="number" />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-0.5">
                                        <p className="text-base font-medium text-foreground">{activeTimer.description}</p>
                                        {activeTimer.processId && (
                                            <p className="text-xs text-primary/80 font-medium flex items-center gap-1.5">
                                                <Briefcase className="h-3 w-3" />
                                                {processos.find((p) => p.id === activeTimer.processId)?.title}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center gap-4 shrink-0 bg-background/40 backdrop-blur border border-border/40 p-2 pr-3 rounded-xl w-full sm:w-auto mt-1 lg:mt-0 justify-between sm:justify-end">
                                <div className={cn(
                                    "text-3xl sm:text-4xl font-mono font-light tracking-tight tabular-nums select-none ml-2",
                                    activeTimer?.isPaused ? "text-amber-600" : "text-foreground"
                                )}>
                                    {elapsedFmt}
                                </div>
                                <div className="h-10 w-px bg-border/50 hidden sm:block mx-1" />
                                <div className="flex items-center gap-1.5">
                                    {!activeTimer ? (
                                        <Button onClick={startTimer} className="h-10 px-4 rounded-lg shadow-lg gap-2 bg-primary hover:bg-primary/90 text-primary-foreground group">
                                            <PlayCircle className="h-5 w-5 group-hover:scale-110 transition-transform" />
                                            <span className="hidden sm:block text-sm font-medium">INICIAR</span>
                                        </Button>
                                    ) : (
                                        <>
                                            {activeTimer.isPaused ? (
                                                <Button onClick={resumeTimer} className="h-10 px-4 rounded-lg gap-2 bg-blue-600 hover:bg-blue-700 text-white">
                                                    <Play className="h-4 w-4" />
                                                    <span className="hidden sm:block text-sm font-medium">RETOMAR</span>
                                                </Button>
                                            ) : (
                                                <Button onClick={pauseTimer} variant="outline" className="h-10 px-4 rounded-lg gap-2 border-amber-500/40 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10">
                                                    <Pause className="h-4 w-4" />
                                                    <span className="hidden sm:block text-sm font-medium">PAUSAR</span>
                                                </Button>
                                            )}
                                            <Button variant="destructive" onClick={stopTimer} className="h-10 px-4 rounded-lg shadow-lg shadow-destructive/20 gap-2 bg-destructive hover:bg-destructive/90 text-white">
                                                <Square className="h-4 w-4 fill-current" />
                                                <span className="hidden sm:block text-sm font-medium">PARAR</span>
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

            {/* KPIs (Compact) */}
            <motion.div variants={itemAnim} className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                    { label: "Total de Horas", val: fmtDuration(totalMinutes), icon: Clock, color: "text-blue-600" },
                    { label: "Lançamentos", val: String(filtered.length), icon: Calendar, color: "text-indigo-600" },
                    { label: "A Faturar", val: fmtCurrency(totalFaturavel), icon: TrendingUp, color: "text-amber-600" },
                    { label: "Já Recebido", val: fmtCurrency(totalPago), icon: BarChart3, color: "text-emerald-600" },
                ].map((kpi, i) => (
                    <div key={i} className="flex items-center gap-3 bg-card border border-border/50 rounded-xl p-3 shadow-sm hover:border-primary/20 transition-colors">
                        <div className={cn("p-2 rounded-lg bg-muted/50", kpi.color)}>
                            <kpi.icon className="h-4 w-4" />
                        </div>
                        <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{kpi.label}</p>
                            <p className="text-lg font-bold tracking-tight text-foreground leading-tight">{kpi.val}</p>
                        </div>
                    </div>
                ))}
            </motion.div>

            {/* ── Smart Alerts & Suggestions ── */}
            <motion.div variants={itemAnim} className="space-y-3">
                {/* Unlogged hours alert */}
                {hasUnloggedAlert && !activeTimer && (
                    <div className="flex items-center gap-3 p-3 rounded-xl border border-amber-500/30 bg-amber-500/5">
                        <div className="p-2 rounded-lg bg-amber-500/10">
                            <AlertTriangle className="h-4 w-4 text-amber-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground">Horas não lançadas hoje</p>
                            <p className="text-xs text-muted-foreground">
                                Você registrou {fmtDuration(todayMinutes)} de {MIN_DAILY_HOURS}h esperadas.
                                Faltam <span className="font-bold text-amber-600">{fmtDuration(unloggedMinutes)}</span>.
                            </p>
                        </div>
                    </div>
                )}

                {/* Time overlaps */}
                {overlaps.length > 0 && (
                    <div className="flex items-start gap-3 p-3 rounded-xl border border-red-500/30 bg-red-500/5">
                        <div className="p-2 rounded-lg bg-red-500/10 shrink-0">
                            <AlertTriangle className="h-4 w-4 text-red-600" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-foreground">Sobreposição de horários detectada</p>
                            {overlaps.map((msg, i) => (
                                <p key={i} className="text-xs text-muted-foreground mt-0.5">• {msg}</p>
                            ))}
                        </div>
                    </div>
                )}

                {/* Agenda suggestions */}
                {suggestions.length > 0 && (
                    <div className="p-3 rounded-xl border border-primary/20 bg-primary/5">
                        <div className="flex items-center gap-2 mb-2">
                            <Zap className="h-3.5 w-3.5 text-primary" />
                            <p className="text-xs font-semibold text-foreground">Sugestões da Agenda</p>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {suggestions.slice(0, 5).map((ev: any) => (
                                <button
                                    key={ev.id}
                                    className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-background border border-border/50 hover:border-primary/40 hover:bg-primary/5 transition-all text-foreground font-medium"
                                    onClick={() => {
                                        setTimerDescription(ev.title);
                                        toast.success(`"${ev.title}" preenchido. Clique INICIAR para registrar.`);
                                    }}
                                >
                                    <CalendarCheck className="h-3 w-3 text-primary" />
                                    {ev.title}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </motion.div>

            {/* Filters + List */}
            <motion.div variants={itemAnim} className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/40 p-2 pl-4 border border-border/50 rounded-xl">
                    <h2 className="text-sm font-semibold text-foreground">Relatório de Horas</h2>
                    <div className="flex flex-wrap items-center gap-2">
                        <Select value={filterProcess} onValueChange={setFilterProcess}>
                            <SelectTrigger className="h-8 w-44 bg-card border-none text-xs"><SelectValue placeholder="Processo" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos os processos</SelectItem>
                                {processos.map((p) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Select value={filterStatus} onValueChange={setFilterStatus}>
                            <SelectTrigger className="h-8 w-36 bg-card border-none text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos os status</SelectItem>
                                {BILLING_OPTIONS.map((b) => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {isLoading ? (
                    <div className="space-y-3">
                        {[1, 2].map((n) => <div key={n} className="h-28 rounded-xl bg-muted/30 animate-pulse border border-border/40" />)}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center py-14 text-center border border-dashed border-border/60 rounded-2xl bg-muted/10">
                        <Timer className="mb-3 h-10 w-10 text-muted-foreground/30" />
                        <p className="text-sm font-medium text-foreground">Nenhum lançamento encontrado</p>
                        <p className="text-xs text-muted-foreground mt-1 max-w-sm">Inicie o cronômetro ou faça um lançamento manual.</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {Object.entries(groupedDays).map(([dayLabel, dayEntries]) => (
                            <div key={dayLabel} className="space-y-2">
                                <h3 className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase flex items-center gap-2">
                                    {dayLabel}
                                    <span className="h-px bg-border/60 flex-1 ml-2" />
                                </h3>
                                <div className="bg-card border border-border/50 rounded-xl overflow-hidden shadow-sm">
                                    <div className="divide-y divide-border/40">
                                        <AnimatePresence>
                                            {dayEntries.map((entry) => {
                                                const billing = getBillingMeta(entry.billing_status);
                                                const processo = processos.find((p) => p.id === entry.process_id);
                                                const value = entry.duration_minutes && entry.hourly_rate ? (entry.duration_minutes / 60) * entry.hourly_rate : null;
                                                const isExpanded = expandedEntry === entry.id;

                                                return (
                                                    <motion.div
                                                        key={entry.id}
                                                        layout
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 1 }}
                                                        exit={{ opacity: 0 }}
                                                    >
                                                        <div
                                                            className="group flex flex-col sm:flex-row sm:items-center justify-between p-3 hover:bg-muted/30 transition-colors gap-3 cursor-pointer"
                                                            onClick={() => setExpandedEntry(isExpanded ? null : entry.id)}
                                                        >
                                                            <div className="flex items-start sm:items-center gap-3 min-w-0">
                                                                <div className="flex flex-col items-center justify-center shrink-0 w-14 px-1.5 py-1 rounded-lg bg-muted text-center leading-tight">
                                                                    <span className="text-[9px] uppercase font-bold text-muted-foreground">Início</span>
                                                                    <span className="text-xs font-semibold text-foreground">{format(parseISO(entry.started_at), "HH:mm")}</span>
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <p className="text-sm font-medium text-foreground truncate">{entry.description || "Sem descrição"}</p>
                                                                    {processo && (
                                                                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                                                                            <Briefcase className="h-3 w-3 opacity-70" /> {processo.title}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 ml-14 sm:ml-0">
                                                                <div className="flex items-center gap-1.5">
                                                                    <div className={cn("h-1.5 w-1.5 rounded-full", billing.dot)} />
                                                                    <span className={cn("text-[10px] font-semibold tracking-wide uppercase", billing.color.split(" ")[0])}>
                                                                        {billing.label}
                                                                    </span>
                                                                </div>
                                                                <div className="text-right min-w-[70px]">
                                                                    <p className="text-sm font-bold text-foreground">
                                                                        {fmtDuration(entry.duration_minutes ?? 0)}
                                                                    </p>
                                                                    {value != null && (
                                                                        <p className="text-[10px] font-medium text-emerald-600/80">{fmtCurrency(value)}</p>
                                                                    )}
                                                                </div>
                                                                <div className="flex items-center gap-1">
                                                                    {entry.billing_status === "pendente" && value && value > 0 && (
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            title="Faturar Honorários"
                                                                            className="h-7 w-7 text-amber-600/60 hover:text-amber-600 hover:bg-amber-600/10 opacity-0 group-hover:opacity-100 transition-all"
                                                                            onClick={(e) => { e.stopPropagation(); handleBilling(entry, value); }}
                                                                            disabled={bilMutation.isPending}
                                                                        >
                                                                            <Receipt className="h-3.5 w-3.5" />
                                                                        </Button>
                                                                    )}
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-7 w-7 text-muted-foreground/30 hover:text-primary opacity-0 group-hover:opacity-100 transition-all"
                                                                        onClick={(e) => { e.stopPropagation(); setExpandedEntry(isExpanded ? null : entry.id); }}
                                                                    >
                                                                        <History className="h-3.5 w-3.5" />
                                                                    </Button>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-7 w-7 text-muted-foreground/30 hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"
                                                                        onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(entry.id); }}
                                                                    >
                                                                        <Trash2 className="h-3.5 w-3.5" />
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Timer Logs (expandable) */}
                                                        <AnimatePresence>
                                                            {isExpanded && (
                                                                <motion.div
                                                                    initial={{ height: 0, opacity: 0 }}
                                                                    animate={{ height: "auto", opacity: 1 }}
                                                                    exit={{ height: 0, opacity: 0 }}
                                                                    className="overflow-hidden"
                                                                >
                                                                    <div className="px-4 pb-3 pt-1 bg-muted/20 border-t border-border/30">
                                                                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                                                            <History className="h-3 w-3" /> Log de atividade
                                                                        </p>
                                                                        {timerLogs.length === 0 ? (
                                                                            <p className="text-xs text-muted-foreground italic">Nenhum log registrado para esta sessão.</p>
                                                                        ) : (
                                                                            <div className="space-y-1.5">
                                                                                {timerLogs.map((log) => {
                                                                                    const meta = ACTION_LABELS[log.action] ?? { label: log.action, color: "text-muted-foreground" };
                                                                                    return (
                                                                                        <div key={log.id} className="flex items-center gap-2 text-xs">
                                                                                            <div className={cn("h-1.5 w-1.5 rounded-full",
                                                                                                log.action === "start" ? "bg-emerald-500" :
                                                                                                    log.action === "pause" ? "bg-amber-500" :
                                                                                                        log.action === "resume" ? "bg-blue-500" : "bg-red-500"
                                                                                            )} />
                                                                                            <span className={cn("font-semibold", meta.color)}>{meta.label}</span>
                                                                                            <span className="text-muted-foreground">
                                                                                                {format(parseISO(log.logged_at), "HH:mm:ss")}
                                                                                            </span>
                                                                                            {log.notes && <span className="text-muted-foreground italic">— {log.notes}</span>}
                                                                                        </div>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </motion.div>
                                                            )}
                                                        </AnimatePresence>
                                                    </motion.div>
                                                );
                                            })}
                                        </AnimatePresence>
                                    </div>
                                    {/* Day Summary Footer */}
                                    <div className="bg-muted/10 p-2.5 px-4 border-t border-border/40 flex justify-between items-center text-xs">
                                        <span className="text-muted-foreground font-medium">Resumo do dia</span>
                                        <span className="font-bold text-foreground">
                                            {fmtDuration(dayEntries.reduce((s, e) => s + (e.duration_minutes ?? 0), 0))}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </motion.div>

            {/* ── Manual Entry Dialog ── */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Lançamento Manual</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">Descrição</label>
                            <Textarea value={manualForm.description} onChange={(e) => setManualForm((f) => ({ ...f, description: e.target.value }))} rows={2} placeholder="Ex: Audiência de conciliação..." className="resize-none" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">Processo (Opcional)</label>
                            <Select value={manualForm.processId} onValueChange={(v) => setManualForm((f) => ({ ...f, processId: v }))}>
                                <SelectTrigger><SelectValue placeholder="Selecione o processo" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Sem vínculo</SelectItem>
                                    {processos.map((p) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <div className="space-y-1.5 col-span-1">
                                <label className="text-xs font-medium text-muted-foreground">Data</label>
                                <Input type="date" value={manualForm.date} onChange={(e) => setManualForm((f) => ({ ...f, date: e.target.value }))} />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-muted-foreground">Início</label>
                                <Input type="time" value={manualForm.startTime} onChange={(e) => setManualForm((f) => ({ ...f, startTime: e.target.value }))} />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-muted-foreground">Fim</label>
                                <Input type="time" value={manualForm.endTime} onChange={(e) => setManualForm((f) => ({ ...f, endTime: e.target.value }))} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-muted-foreground">Valor (R$/h)</label>
                                <Input type="number" value={manualForm.hourlyRate} onChange={(e) => setManualForm((f) => ({ ...f, hourlyRate: e.target.value }))} placeholder="Ex: 350" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-muted-foreground">Status</label>
                                <Select value={manualForm.billingStatus} onValueChange={(v) => setManualForm((f) => ({ ...f, billingStatus: v }))}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {BILLING_OPTIONS.map((b) => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)} className="w-full sm:w-auto">Cancelar</Button>
                        <Button onClick={handleManualSubmit} disabled={createMutation.isPending} className="w-full sm:w-auto">Confirmar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </motion.div>
    );
}
