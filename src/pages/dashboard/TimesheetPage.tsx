import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format, differenceInMinutes, parseISO, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
    Clock, Plus, Play, Square, Trash2, Timer,
    TrendingUp, Calendar, BarChart3, ChevronRight, PlayCircle, Target, Briefcase
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types ────────────────────────────────────────────────────
interface TimesheetEntry {
    id: string;
    organization_id: string;
    user_id: string;
    process_id: string | null;
    description: string | null;
    started_at: string;
    ended_at: string | null;
    duration_minutes: number | null;
    hourly_rate: number | null;
    billing_status: string;
    created_at: string;
}

interface Processo { id: string; title: string; number: string | null; }

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

// ─── Main Page ────────────────────────────────────────────────
export default function TimesheetPage() {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const [activeTimer, setActiveTimer] = useState<{
        processId: string | null; description: string; startedAt: Date; hourlyRate: string;
    } | null>(null);
    const [timerDescription, setTimerDescription] = useState("");
    const [timerProcess, setTimerProcess] = useState("none");
    const [timerRate, setTimerRate] = useState("");
    const [dialogOpen, setDialogOpen] = useState(false);
    const [manualForm, setManualForm] = useState({
        processId: "none", description: "", date: format(new Date(), "yyyy-MM-dd"),
        startTime: "09:00", endTime: "10:00", hourlyRate: "", billingStatus: "pendente",
    });
    const [filterProcess, setFilterProcess] = useState("all");
    const [filterStatus, setFilterStatus] = useState("all");
    const [elapsed, setElapsed] = useState(0);

    // Timer tick
    useState(() => {
        const interval = setInterval(() => {
            if (activeTimer) {
                setElapsed(Math.floor((Date.now() - activeTimer.startedAt.getTime()) / 1000));
            }
        }, 1000);
        return () => clearInterval(interval);
    });

    const { data: profile } = useQuery({
        queryKey: ["profile", user?.id],
        queryFn: async () => {
            const { data } = await supabase.from("profiles").select("organization_id").eq("user_id", user!.id).single();
            return data;
        },
        enabled: !!user,
    });
    const orgId = profile?.organization_id;

    const { data: entries = [], isLoading } = useQuery({
        queryKey: ["timesheet", orgId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("timesheet_entries" as any)
                .select("*")
                .eq("organization_id", orgId!)
                .order("started_at", { ascending: false });
            if (error) return [];
            return (data ?? []) as unknown as TimesheetEntry[];
        },
        enabled: !!orgId,
    });

    const { data: processos = [] } = useQuery({
        queryKey: ["processos-ts", orgId],
        queryFn: async () => {
            const { data } = await supabase.from("processos_juridicos").select("id, title, number").eq("organization_id", orgId!).eq("status", "ativo");
            return (data ?? []) as Processo[];
        },
        enabled: !!orgId,
    });

    const createMutation = useMutation({
        mutationFn: async (payload: any) => {
            const { error } = await supabase.from("timesheet_entries" as any).insert(payload);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["timesheet"] });
            toast.success("Lançamento registrado!");
        },
        onError: () => toast.error("Erro ao registrar no banco."),
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from("timesheet_entries" as any).delete().eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["timesheet"] });
            toast.success("Lançamento excluído");
        },
    });

    const startTimer = () => {
        if (!timerDescription.trim()) { toast.error("Descreva a atividade"); return; }
        setActiveTimer({
            processId: timerProcess === "none" ? null : timerProcess,
            description: timerDescription,
            startedAt: new Date(),
            hourlyRate: timerRate,
        });
        setElapsed(0);
        toast.success("Timer iniciado!");
    };

    const stopTimer = async () => {
        if (!activeTimer) return;
        const endedAt = new Date();
        const durationMinutes = Math.max(1, Math.floor((endedAt.getTime() - activeTimer.startedAt.getTime()) / 60000));
        await createMutation.mutateAsync({
            organization_id: orgId!,
            user_id: user!.id,
            process_id: activeTimer.processId,
            description: activeTimer.description,
            started_at: activeTimer.startedAt.toISOString(),
            ended_at: endedAt.toISOString(),
            duration_minutes: durationMinutes,
            hourly_rate: activeTimer.hourlyRate ? Number(activeTimer.hourlyRate) : null,
            billing_status: "pendente",
        });
        setActiveTimer(null);
        setTimerDescription("");
        setTimerProcess("none");
        setTimerRate("");
        setElapsed(0);
    };

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

    // Format elapsed timer
    const elapsedH = Math.floor(elapsed / 3600);
    const elapsedM = Math.floor((elapsed % 3600) / 60);
    const elapsedS = elapsed % 60;
    const elapsedFmt = `${elapsedH.toString().padStart(2, "0")}:${elapsedM.toString().padStart(2, "0")}:${elapsedS.toString().padStart(2, "0")}`;

    const containerAnim = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
    const itemAnim = { hidden: { opacity: 0, scale: 0.95 }, show: { opacity: 1, scale: 1 } };

    return (
        <motion.div variants={containerAnim} initial="hidden" animate="show" className="max-w-6xl mx-auto space-y-8 pb-10">

            {/* Header */}
            <motion.div variants={itemAnim} className="flex flex-col md:flex-row md:items-end justify-between gap-4 pt-2">
                <div>
                    <h1 className="text-3xl font-light tracking-tight text-foreground">
                        Time<span className="font-semibold">sheet</span>
                    </h1>
                    <p className="mt-1 text-muted-foreground text-sm flex items-center gap-2">
                        <Timer className="h-4 w-4" />
                        Registro e faturamento de horas
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setDialogOpen(true)} className="h-10 gap-2 font-medium">
                        <Plus className="h-4 w-4" /> Lançamento Manual
                    </Button>
                </div>
            </motion.div>

            {/* ── Active Timer (Premium Card) ── */}
            <motion.div variants={itemAnim}>
                <Card className={cn(
                    "border-border/50 relative overflow-hidden transition-all duration-500",
                    activeTimer ? "shadow-md ring-1 ring-primary/20 shadow-primary/10" : ""
                )}>
                    {/* Animated background if active */}
                    {activeTimer && (
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-primary/5 to-transparent animate-gradient-slow opacity-50" />
                    )}

                    <CardContent className="p-5 sm:p-6 relative">
                        <div className="flex flex-col gap-6 lg:flex-row lg:items-center justify-between">
                            <div className="flex-1 max-w-2xl space-y-4">
                                <div className="flex items-center gap-2">
                                    <div className={cn("h-2.5 w-2.5 rounded-full", activeTimer ? "bg-primary animate-pulse" : "bg-muted-foreground/30")} />
                                    <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                                        {activeTimer ? "Timer em andamento" : "Iniciar nova atividade"}
                                    </p>
                                </div>

                                {!activeTimer ? (
                                    <div className="flex flex-col gap-3 sm:flex-row items-center">
                                        <Input value={timerDescription} onChange={(e) => setTimerDescription(e.target.value)} placeholder="O que você está fazendo?" className="h-11 flex-1 bg-background/50 border-border/50 focus-visible:ring-primary/20" onKeyDown={(e) => e.key === "Enter" && startTimer()} />
                                        <Select value={timerProcess} onValueChange={setTimerProcess}>
                                            <SelectTrigger className="h-11 w-full sm:w-64 bg-background/50 border-border/50 focus:ring-primary/20">
                                                <SelectValue placeholder="Vincular Processo" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">Sem vínculo</SelectItem>
                                                {processos.map((p) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                        <div className="relative w-full sm:w-32">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                                            <Input value={timerRate} onChange={(e) => setTimerRate(e.target.value)} placeholder="0,00" className="h-11 pl-8 bg-background/50 border-border/50 focus-visible:ring-primary/20" type="number" />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-1">
                                        <p className="text-lg font-medium text-foreground">{activeTimer.description}</p>
                                        {activeTimer.processId && (
                                            <p className="text-sm text-primary/80 font-medium flex items-center gap-1.5">
                                                <Briefcase className="h-3.5 w-3.5" />
                                                {processos.find((p) => p.id === activeTimer.processId)?.title}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center gap-6 shrink-0 bg-background/40 backdrop-blur border border-border/40 p-2 sm:p-3 pr-4 sm:pr-6 md:pr-4 rounded-2xl w-full sm:w-auto mt-2 lg:mt-0 justify-between sm:justify-end">
                                <div className="text-4xl sm:text-5xl font-mono font-light tracking-tight text-foreground tabular-nums select-none ml-2">
                                    {elapsedFmt}
                                </div>
                                <div className="h-12 w-px bg-border/50 hidden sm:block mx-2" />
                                {!activeTimer ? (
                                    <Button onClick={startTimer} className="h-12 w-12 sm:w-auto sm:px-6 rounded-xl shadow-lg gap-2 bg-primary hover:bg-primary/90 text-primary-foreground group">
                                        <PlayCircle className="h-6 w-6 sm:h-5 sm:w-5 group-hover:scale-110 transition-transform" />
                                        <span className="hidden sm:block font-medium">INICIAR</span>
                                    </Button>
                                ) : (
                                    <Button variant="destructive" onClick={stopTimer} className="h-12 w-12 sm:w-auto sm:px-6 rounded-xl shadow-lg shadow-destructive/20 gap-2 bg-destructive hover:bg-destructive/90 text-white animate-in zoom-in duration-300">
                                        <Square className="h-5 w-5 fill-current" />
                                        <span className="hidden sm:block font-medium">PARAR</span>
                                    </Button>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

            {/* KPIs */}
            <motion.div variants={itemAnim} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: "Total de Horas", val: fmtDuration(totalMinutes), icon: Clock, color: "text-blue-600" },
                    { label: "Lançamentos", val: String(filtered.length), icon: Calendar, color: "text-indigo-600" },
                    { label: "A Faturar", val: fmtCurrency(totalFaturavel), icon: TrendingUp, color: "text-amber-600" },
                    { label: "Já Recebido", val: fmtCurrency(totalPago), icon: BarChart3, color: "text-emerald-600" },
                ].map((kpi, i) => (
                    <div key={i} className="flex flex-col gap-3 bg-card border border-border/50 rounded-2xl p-4 shadow-sm hover:border-primary/20 transition-colors">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{kpi.label}</p>
                            <div className={cn("p-2 rounded-lg bg-muted/50", kpi.color)}>
                                <kpi.icon className="h-4 w-4" />
                            </div>
                        </div>
                        <p className="text-2xl font-bold tracking-tight text-foreground">{kpi.val}</p>
                    </div>
                ))}
            </motion.div>

            {/* Filters + List */}
            <motion.div variants={itemAnim} className="space-y-4 pt-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-muted/40 p-2 pl-4 border border-border/50 rounded-xl">
                    <h2 className="text-sm font-semibold text-foreground">Relatório de Horas</h2>
                    <div className="flex flex-wrap items-center gap-2">
                        <Select value={filterProcess} onValueChange={setFilterProcess}>
                            <SelectTrigger className="h-9 w-44 bg-card border-none text-xs"><SelectValue placeholder="Processo" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos os processos</SelectItem>
                                {processos.map((p) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Select value={filterStatus} onValueChange={setFilterStatus}>
                            <SelectTrigger className="h-9 w-36 bg-card border-none text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos os status</SelectItem>
                                {BILLING_OPTIONS.map((b) => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {isLoading ? (
                    <div className="space-y-4">
                        {[1, 2].map((n) => <div key={n} className="h-32 rounded-xl bg-muted/30 animate-pulse border border-border/40" />)}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center py-16 text-center border border-dashed border-border/60 rounded-2xl bg-muted/10">
                        <Timer className="mb-4 h-12 w-12 text-muted-foreground/30" />
                        <p className="text-base font-medium text-foreground">Nenhum lançamento encontrado</p>
                        <p className="text-sm text-muted-foreground mt-1 max-w-sm">Inicie o cronômetro acima ou faça um lançamento manual para registrar suas horas.</p>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {Object.entries(groupedDays).map(([dayLabel, dayEntries]) => (
                            <div key={dayLabel} className="space-y-3">
                                <h3 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase flex items-center gap-2">
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

                                                return (
                                                    <motion.div
                                                        key={entry.id}
                                                        layout
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 1 }}
                                                        exit={{ opacity: 0 }}
                                                        className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-muted/30 transition-colors gap-4"
                                                    >
                                                        <div className="flex items-start sm:items-center gap-4 min-w-0">
                                                            <div className="flex flex-col items-center justify-center shrink-0 w-16 px-2 py-1.5 rounded-lg bg-muted text-center leading-tight">
                                                                <span className="text-[10px] uppercase font-bold text-muted-foreground">Início</span>
                                                                <span className="text-sm font-semibold text-foreground">{format(parseISO(entry.started_at), "HH:mm")}</span>
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="text-sm font-medium text-foreground truncate">{entry.description || "Sem descrição"}</p>
                                                                {processo && (
                                                                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                                                                        <Briefcase className="h-3.5 w-3.5 opacity-70" /> {processo.title}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center justify-between sm:justify-end gap-6 shrink-0 ml-16 sm:ml-0">
                                                            <div className="flex items-center gap-2">
                                                                <div className={cn("h-2 w-2 rounded-full", billing.dot)} />
                                                                <span className={cn("text-[11px] font-semibold tracking-wide uppercase", billing.color.split(" ")[0])}>
                                                                    {billing.label}
                                                                </span>
                                                            </div>
                                                            <div className="text-right min-w-[80px]">
                                                                <p className="text-sm font-bold text-foreground">
                                                                    {fmtDuration(entry.duration_minutes ?? 0)}
                                                                </p>
                                                                {value != null && (
                                                                    <p className="text-[11px] font-medium text-emerald-600/80">{fmtCurrency(value)}</p>
                                                                )}
                                                            </div>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-muted-foreground/30 hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all -ml-2"
                                                                onClick={() => deleteMutation.mutate(entry.id)}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </motion.div>
                                                );
                                            })}
                                        </AnimatePresence>
                                    </div>
                                    {/* Day Summary Footer */}
                                    <div className="bg-muted/10 p-3 px-4 border-t border-border/40 flex justify-between items-center text-xs">
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
