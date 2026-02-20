import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format, differenceInMinutes, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
    Clock, Plus, Play, Square, Trash2, Timer, ChevronDown, ChevronUp,
    TrendingUp, Calendar, Filter, BarChart3, Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
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
    return `${h}h ${m.toString().padStart(2, "0")}min`;
};

const fmtCurrency = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const BILLING_OPTIONS = [
    { value: "pendente", label: "Pendente", color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
    { value: "faturado", label: "Faturado", color: "bg-primary/10 text-primary border-primary/20" },
    { value: "pago", label: "Pago", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
    { value: "nao_faturavel", label: "Não Faturável", color: "bg-muted text-muted-foreground border-border" },
];

function getBillingMeta(status: string) {
    return BILLING_OPTIONS.find((b) => b.value === status) ?? BILLING_OPTIONS[0];
}

// ─── KPI Card ─────────────────────────────────────────────────

function KPICard({ label, value, sub, icon: Icon, color }: {
    label: string; value: string; sub?: string; icon: any; color: string;
}) {
    return (
        <Card className="border-border/60">
            <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
                    <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl", color)}>
                        <Icon className="h-4 w-4" />
                    </div>
                </div>
                <p className="text-2xl font-bold text-foreground">{value}</p>
                {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
            </CardContent>
        </Card>
    );
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
            if (error) {
                // Table may not exist yet — return empty
                return [] as TimesheetEntry[];
            }
            return (data ?? []) as TimesheetEntry[];
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
        onError: () => toast.error("Erro ao registrar. Verifique se a migration foi executada."),
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

    // Filtered entries
    const filtered = entries.filter((e) => {
        const matchProcess = filterProcess === "all" || e.process_id === filterProcess;
        const matchStatus = filterStatus === "all" || e.billing_status === filterStatus;
        return matchProcess && matchStatus;
    });

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

    return (
        <div className="space-y-6">

            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-foreground">Timesheet</h1>
                    <p className="text-sm text-muted-foreground">Controle de horas por processo e atividade</p>
                </div>
                <Button variant="outline" onClick={() => setDialogOpen(true)} className="gap-2">
                    <Plus className="h-4 w-4" /> Lançamento Manual
                </Button>
            </div>

            {/* ── Active Timer ── */}
            <Card className={cn("border-border/60 transition-all", activeTimer && "border-primary/50 bg-primary/[0.02]")}>
                <CardContent className="p-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                        <div className="flex-1 space-y-3">
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                {activeTimer ? "⏱ Timer em andamento" : "Iniciar Timer"}
                            </p>
                            {!activeTimer ? (
                                <div className="flex flex-col gap-3 sm:flex-row">
                                    <Input
                                        value={timerDescription}
                                        onChange={(e) => setTimerDescription(e.target.value)}
                                        placeholder="Descrição da atividade (ex: Elaboração de petição)"
                                        className="flex-1"
                                        onKeyDown={(e) => e.key === "Enter" && startTimer()}
                                    />
                                    <Select value={timerProcess} onValueChange={setTimerProcess}>
                                        <SelectTrigger className="w-full sm:w-52">
                                            <SelectValue placeholder="Processo (opcional)" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">Sem processo</SelectItem>
                                            {processos.map((p) => (
                                                <SelectItem key={p.id} value={p.id}>
                                                    {p.title.slice(0, 35)}{p.title.length > 35 ? "…" : ""}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Input
                                        value={timerRate}
                                        onChange={(e) => setTimerRate(e.target.value)}
                                        placeholder="R$/hora"
                                        className="w-full sm:w-28"
                                        type="number"
                                    />
                                </div>
                            ) : (
                                <div>
                                    <p className="text-sm font-medium text-foreground">{activeTimer.description}</p>
                                    {activeTimer.processId && (
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            {processos.find((p) => p.id === activeTimer.processId)?.title}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-3">
                            {activeTimer && (
                                <div className="text-3xl font-mono font-bold text-primary tabular-nums">
                                    {elapsedFmt}
                                </div>
                            )}
                            {!activeTimer ? (
                                <Button onClick={startTimer} className="gap-2 shrink-0">
                                    <Play className="h-4 w-4" /> Iniciar
                                </Button>
                            ) : (
                                <Button variant="destructive" onClick={stopTimer} className="gap-2 shrink-0">
                                    <Square className="h-4 w-4" /> Parar e Salvar
                                </Button>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* KPIs */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <KPICard label="Total de Horas" value={fmtDuration(totalMinutes)} sub="nos lançamentos filtrados" icon={Clock} color="bg-primary/10" />
                <KPICard label="Lançamentos" value={String(filtered.length)} sub="registros" icon={Calendar} color="bg-primary/10" />
                <KPICard label="A Faturar" value={fmtCurrency(totalFaturavel)} sub="honorários pendentes + faturados" icon={TrendingUp} color="bg-amber-500/10" />
                <KPICard label="Já Recebido" value={fmtCurrency(totalPago)} sub="marcados como pago" icon={BarChart3} color="bg-emerald-500/10" />
            </div>

            {/* Filters + List */}
            <Card className="border-border/60">
                <CardHeader className="pb-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <CardTitle className="text-base">Lançamentos</CardTitle>
                        <div className="flex gap-2">
                            <Select value={filterProcess} onValueChange={setFilterProcess}>
                                <SelectTrigger className="h-9 w-44 text-xs">
                                    <SelectValue placeholder="Processo" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos os processos</SelectItem>
                                    {processos.map((p) => (
                                        <SelectItem key={p.id} value={p.id}>{p.title.slice(0, 30)}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select value={filterStatus} onValueChange={setFilterStatus}>
                                <SelectTrigger className="h-9 w-36 text-xs">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos</SelectItem>
                                    {BILLING_OPTIONS.map((b) => (
                                        <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="space-y-3 p-4">
                            {[1, 2, 3].map((n) => <div key={n} className="h-16 rounded-xl bg-muted/40 animate-pulse" />)}
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="flex flex-col items-center py-12 text-center">
                            <Timer className="mb-3 h-10 w-10 text-muted-foreground/20" />
                            <p className="text-sm text-muted-foreground">Nenhum lançamento encontrado</p>
                            <p className="text-xs text-muted-foreground/60 mt-1">Inicie um timer ou faça um lançamento manual</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-border/50">
                            <AnimatePresence>
                                {filtered.map((entry, i) => {
                                    const billing = getBillingMeta(entry.billing_status);
                                    const processo = processos.find((p) => p.id === entry.process_id);
                                    const value = entry.duration_minutes && entry.hourly_rate
                                        ? (entry.duration_minutes / 60) * entry.hourly_rate
                                        : null;

                                    return (
                                        <motion.div
                                            key={entry.id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="flex items-center gap-4 px-4 py-3 hover:bg-muted/20 transition-colors"
                                        >
                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/5">
                                                <Clock className="h-4 w-4 text-primary" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-medium text-foreground truncate">
                                                    {entry.description || "Sem descrição"}
                                                </p>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-xs text-muted-foreground">
                                                        {format(parseISO(entry.started_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                                    </span>
                                                    {processo && (
                                                        <>
                                                            <span className="text-muted-foreground/40 text-xs">·</span>
                                                            <span className="text-xs text-muted-foreground truncate max-w-[160px]">{processo.title}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 shrink-0">
                                                <div className="text-right">
                                                    <p className="text-sm font-semibold text-foreground">
                                                        {fmtDuration(entry.duration_minutes ?? 0)}
                                                    </p>
                                                    {value != null && (
                                                        <p className="text-xs text-muted-foreground">{fmtCurrency(value)}</p>
                                                    )}
                                                </div>
                                                <Badge variant="outline" className={cn("text-[10px] shrink-0", billing.color)}>
                                                    {billing.label}
                                                </Badge>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 text-muted-foreground/40 hover:text-destructive"
                                                    onClick={() => deleteMutation.mutate(entry.id)}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </AnimatePresence>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Manual Entry Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="font-semibold">Lançamento Manual</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <label className="text-xs text-muted-foreground">Processo (opcional)</label>
                            <Select value={manualForm.processId} onValueChange={(v) => setManualForm((f) => ({ ...f, processId: v }))}>
                                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Sem processo</SelectItem>
                                    {processos.map((p) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs text-muted-foreground">Descrição</label>
                            <Textarea value={manualForm.description} onChange={(e) => setManualForm((f) => ({ ...f, description: e.target.value }))} rows={2} placeholder="O que foi feito?" />
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-xs text-muted-foreground">Data</label>
                                <Input type="date" value={manualForm.date} onChange={(e) => setManualForm((f) => ({ ...f, date: e.target.value }))} />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs text-muted-foreground">Início</label>
                                <Input type="time" value={manualForm.startTime} onChange={(e) => setManualForm((f) => ({ ...f, startTime: e.target.value }))} />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs text-muted-foreground">Fim</label>
                                <Input type="time" value={manualForm.endTime} onChange={(e) => setManualForm((f) => ({ ...f, endTime: e.target.value }))} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-xs text-muted-foreground">R$/hora</label>
                                <Input type="number" value={manualForm.hourlyRate} onChange={(e) => setManualForm((f) => ({ ...f, hourlyRate: e.target.value }))} placeholder="250" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs text-muted-foreground">Status</label>
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
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                        <Button onClick={handleManualSubmit} disabled={createMutation.isPending}>Registrar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
