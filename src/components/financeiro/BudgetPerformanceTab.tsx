import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    LineChart, Line, ResponsiveContainer,
} from "recharts";
import { format, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import {
    BarChart2, ChevronLeft, ChevronRight, Sparkles, Download,
    ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, XCircle,
    HelpCircle, TrendingUp, TrendingDown, Wallet, Activity,
    ToggleLeft, ToggleRight, RotateCcw, Edit2, Check, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ArunaAnalysisPanel from "@/components/financeiro/ArunaAnalysisPanel";
import {
    EXPENSE_CATEGORIES, REVENUE_CATEGORIES,
    buildCategoryRows, globalExecutionRate, freeBudget,
    biggestDeviation, healthScore, healthScoreLabel,
    getMonthLabel, prevPeriod, nextPeriod, monthElapsedFraction,
    fmtCurrency, fmtPct,
    type Orcamento, type CategoryRow,
} from "@/lib/budgetUtils";
import { formatCurrencyInput, parseCurrencyToNumber } from "@/lib/formatters";

// ─── Types ─────────────────────────────────────────────────────

interface Props { orgId: string }

// ─── Status badge config ────────────────────────────────────────

const STATUS_CONFIG = {
    ok: { label: "Dentro", icon: CheckCircle2, className: "bg-success/10 text-success border-success/20" },
    warning: { label: "Atenção", icon: AlertTriangle, className: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" },
    exceeded: { label: "Excedido", icon: XCircle, className: "bg-destructive/10 text-destructive border-destructive/20" },
    unbudgeted: { label: "Sem orçamento", icon: HelpCircle, className: "bg-muted text-muted-foreground border-border" },
};

// ─── Custom Recharts tooltip ───────────────────────────────────

interface RechartsTooltipPayload {
    name: string;
    value: number;
    color: string;
    dataKey: string;
    payload: any;
}

interface CustomTooltipProps {
    active?: boolean;
    payload?: RechartsTooltipPayload[];
    label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
    if (!active || !payload?.length) return null;
    return (
        <div className="rounded-lg border border-border/60 bg-background p-3 shadow-lg text-xs space-y-1">
            <p className="font-semibold text-foreground mb-2">{label}</p>
            {payload.map((p) => (
                <div key={p.dataKey} className="flex justify-between gap-4">
                    <span style={{ color: p.color }}>{p.name}</span>
                    <span className="font-medium">{fmtCurrency(p.value)}</span>
                </div>
            ))}
        </div>
    );
}

interface OrcamentoLog {
    id: string;
    orcamento_id: string;
    organization_id: string;
    old_amount: number | null;
    new_amount: number | null;
    notes: string | null;
    changed_at: string;
    changed_by: string | null;
}

// ─── Main Component ────────────────────────────────────────────

export default function BudgetPerformanceTab({ orgId }: Props) {
    const queryClient = useQueryClient();
    const today = new Date();
    const [month, setMonth] = useState(today.getMonth() + 1);
    const [year, setYear] = useState(today.getFullYear());
    const [typeTab, setTypeTab] = useState<"despesa" | "receita">("despesa");
    const [logOpen, setLogOpen] = useState(false);
    const [arunaOpen, setArunaOpen] = useState(false);

    // Inline edit state
    const [editingCategory, setEditingCategory] = useState<string | null>(null);
    const [editValue, setEditValue] = useState("");

    // Dialog for new budget
    const [dialogOpen, setDialogOpen] = useState(false);
    const [dialogCategory, setDialogCategory] = useState("");
    const [dialogAmount, setDialogAmount] = useState("");
    const [dialogCarry, setDialogCarry] = useState(false);
    const [dialogNotes, setDialogNotes] = useState("");

    const periodKey = `${year}-${month}`;
    const categories = typeTab === "despesa" ? EXPENSE_CATEGORIES : REVENUE_CATEGORIES;
    const contaTable = typeTab === "despesa" ? "contas_pagar" : "contas_receber";

    // ─── Data Fetching ────────────────────────────────────────

    const { data: orcamentos = [] } = useQuery({
        queryKey: ["orcamentos", orgId, month, year, typeTab],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("orcamentos")
                .select("*")
                .eq("organization_id", orgId)
                .eq("type", typeTab)
                .eq("period_month", month)
                .eq("period_year", year);
            if (error) throw error;
            return (data ?? []) as unknown as Orcamento[];
        },
        enabled: !!orgId,
    });

    const { data: contas = [] } = useQuery({
        queryKey: [contaTable, orgId, "all-for-budget"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from(contaTable)
                .select("amount, status, category, due_date")
                .eq("organization_id", orgId);
            if (error) throw error;
            return data ?? [];
        },
        enabled: !!orgId,
    });

    const { data: orcamentosLog = [] } = useQuery({
        queryKey: ["orcamentos_log", orgId, month, year],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("orcamentos_log")
                .select("*")
                .eq("organization_id", orgId)
                .order("changed_at", { ascending: false })
                .limit(50);
            if (error) throw error;
            return data ?? [];
        },
        enabled: !!orgId && logOpen,
    });

    // Historical data for trend chart (last 6 months)
    const { data: historicalData = [] } = useQuery({
        queryKey: ["budget-historical", orgId, typeTab, periodKey],
        queryFn: async () => {
            const results = [];
            for (let i = 5; i >= 0; i--) {
                const d = subMonths(new Date(year, month - 1, 1), i);
                const m = d.getMonth() + 1;
                const y = d.getFullYear();

                const [{ data: orc }, { data: ct }] = await Promise.all([
                    supabase.from("orcamentos").select("amount").eq("organization_id", orgId).eq("type", typeTab).eq("period_month", m).eq("period_year", y),
                    supabase.from(contaTable).select("amount, status, due_date, category").eq("organization_id", orgId),
                ]);

                const budgeted = (orc ?? []).reduce((s, o) => s + Number(o.amount), 0);
                const monthContas = (ct ?? []).filter((c) => {
                    const dd = new Date(c.due_date + "T00:00:00");
                    return dd.getMonth() + 1 === m && dd.getFullYear() === y && (c.status === "pago" || c.status === "pendente");
                });
                const realized = monthContas.reduce((s, c) => s + Number(c.amount), 0);

                results.push({
                    name: format(d, "MMM/yy", { locale: ptBR }),
                    Orçado: budgeted,
                    Realizado: realized,
                });
            }
            return results;
        },
        enabled: !!orgId,
    });

    // ─── Computed Data ────────────────────────────────────────

    const rows = useMemo(
        () => buildCategoryRows(orcamentos as Orcamento[], contas as Record<string, unknown>[], month, year, typeTab, categories),
        [orcamentos, contas, month, year, typeTab, categories]
    );

    const execRate = useMemo(() => globalExecutionRate(rows), [rows]);
    const free = useMemo(() => freeBudget(rows), [rows]);
    const bigDev = useMemo(() => biggestDeviation(rows), [rows]);
    const score = useMemo(() => healthScore(rows), [rows]);
    const scoreInfo = useMemo(() => healthScoreLabel(score), [score]);
    const elapsed = monthElapsedFraction(month, year);
    const projectedTotal = rows.reduce((s, r) => s + r.projected, 0);
    const budgetedTotal = rows.reduce((s, r) => s + r.budgeted, 0);

    const barData = rows
        .filter((r) => r.budgeted > 0 || r.realized > 0)
        .map((r) => ({
            name: r.category.length > 12 ? r.category.slice(0, 12) + "…" : r.category,
            fullName: r.category,
            Orçado: r.budgeted,
            Realizado: r.realized,
        }));

    // ─── Mutations ────────────────────────────────────────────

    const upsertMutation = useMutation({
        mutationFn: async (payload: {
            category: string; amount: number; carryForward: boolean; notes?: string;
        }) => {
            // Find existing orcamento for log
            const existing = (orcamentos as Orcamento[]).find((o) => o.category === payload.category);

            const { data, error } = await supabase
                .from("orcamentos")
                .upsert(
                    {
                        organization_id: orgId,
                        category: payload.category,
                        type: typeTab,
                        amount: payload.amount,
                        period_month: month,
                        period_year: year,
                        carry_forward: payload.carryForward,
                        notes: payload.notes || null,
                    },
                    { onConflict: "organization_id,category,type,period_month,period_year" }
                )
                .select("id")
                .single();
            if (error) throw error;

            // Insert log entry
            if (existing) {
                const userResponse = await supabase.auth.getUser();
                await supabase.from("orcamentos_log").insert({
                    orcamento_id: data.id,
                    organization_id: orgId,
                    old_amount: existing.amount,
                    new_amount: payload.amount,
                    notes: payload.notes || null,
                    changed_by: userResponse.data.user?.id ?? null,
                });
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["orcamentos", orgId, month, year, typeTab] });
            queryClient.invalidateQueries({ queryKey: ["orcamentos_log"] });
            toast.success("Orçamento salvo!");
            setDialogOpen(false);
            setDialogCategory("");
            setDialogAmount("");
            setDialogCarry(false);
            setDialogNotes("");
            setEditingCategory(null);
        },
        onError: (e: Error) => toast.error(e.message),
    });

    // ─── Handlers ─────────────────────────────────────────────

    const handleNavPrev = () => {
        const p = prevPeriod(month, year);
        setMonth(p.month);
        setYear(p.year);
    };
    const handleNavNext = () => {
        const p = nextPeriod(month, year);
        setMonth(p.month);
        setYear(p.year);
    };

    const openDialog = (category?: string) => {
        if (category) {
            const existing = (orcamentos as Orcamento[]).find((o) => o.category === category);
            setDialogCategory(category);
            setDialogAmount(existing ? formatCurrencyInput(String(Math.round(existing.amount * 100))) : "");
            setDialogCarry(existing?.carry_forward ?? false);
            setDialogNotes(existing?.notes ?? "");
        } else {
            setDialogCategory("");
            setDialogAmount("");
            setDialogCarry(false);
            setDialogNotes("");
        }
        setDialogOpen(true);
    };

    const handleDialogSave = () => {
        const amount = parseCurrencyToNumber(dialogAmount);
        if (!dialogCategory || !amount) {
            toast.error("Preencha categoria e valor");
            return;
        }
        upsertMutation.mutate({ category: dialogCategory, amount, carryForward: dialogCarry, notes: dialogNotes });
    };

    const startInlineEdit = (row: CategoryRow) => {
        setEditingCategory(row.category);
        setEditValue(
            row.budgeted > 0
                ? formatCurrencyInput(String(Math.round(row.budgeted * 100)))
                : ""
        );
    };

    const saveInlineEdit = (row: CategoryRow) => {
        const amount = parseCurrencyToNumber(editValue);
        if (!amount) { setEditingCategory(null); return; }
        upsertMutation.mutate({ category: row.category, amount, carryForward: row.carryForward });
    };

    const handleExportExcel = useCallback(async () => {
        const XLSX = await import("xlsx");
        const ws = XLSX.utils.json_to_sheet(
            rows.map((r) => ({
                Categoria: r.category,
                Orçado: r.budgeted,
                Realizado: r.realized,
                "Projeção Mês": r.projected,
                "Variação R$": r.variationAbs,
                "Variação %": r.variationPct !== null ? `${r.variationPct.toFixed(1)}%` : "-",
                Status: STATUS_CONFIG[r.status].label,
            }))
        );
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Orçamento");
        XLSX.writeFile(wb, `orcamento-${year}-${String(month).padStart(2, "0")}.xlsx`);
        toast.success("Excel exportado!");
    }, [rows, month, year]);

    const handleExportPDF = useCallback(async () => {
        const { jsPDF } = await import("jspdf");
        const autoTable = (await import("jspdf-autotable")).default;
        const doc = new jsPDF();
        doc.setFontSize(16);
        doc.text(`Desempenho Orçamentário — ${getMonthLabel(month, year)}`, 14, 20);
        doc.setFontSize(10);
        doc.text(`Taxa de Execução: ${execRate.toFixed(1)}% | Score de Saúde: ${score}/100`, 14, 30);
        autoTable(doc, {
            startY: 38,
            head: [["Categoria", "Orçado", "Realizado", "Variação %", "Status"]],
            body: rows.map((r) => [
                r.category,
                fmtCurrency(r.budgeted),
                fmtCurrency(r.realized),
                r.variationPct !== null ? `${r.variationPct.toFixed(1)}%` : "-",
                STATUS_CONFIG[r.status].label,
            ]),
            styles: { fontSize: 9 },
            headStyles: { fillColor: [79, 70, 229] },
        });
        doc.save(`orcamento-${year}-${String(month).padStart(2, "0")}.pdf`);
        toast.success("PDF exportado!");
    }, [rows, month, year, execRate, score]);

    // ─── Render ───────────────────────────────────────────────

    return (
        <div className="space-y-6">
            {/* ── Header ── */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                {/* Period Navigator */}
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleNavPrev}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="min-w-[160px] text-center text-sm font-medium capitalize">
                        {getMonthLabel(month, year)}
                    </span>
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleNavNext}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    {/* Type Toggle */}
                    <div className="flex rounded-lg border border-border/60 overflow-hidden">
                        <button
                            onClick={() => setTypeTab("despesa")}
                            className={`px-3 py-1.5 text-xs font-medium transition-colors ${typeTab === "despesa"
                                ? "bg-primary text-primary-foreground"
                                : "bg-background text-muted-foreground hover:bg-muted"
                                }`}
                        >
                            Despesas
                        </button>
                        <button
                            onClick={() => setTypeTab("receita")}
                            className={`px-3 py-1.5 text-xs font-medium transition-colors ${typeTab === "receita"
                                ? "bg-primary text-primary-foreground"
                                : "bg-background text-muted-foreground hover:bg-muted"
                                }`}
                        >
                            Receitas
                        </button>
                    </div>

                    <Button variant="outline" size="sm" className="gap-2" onClick={() => openDialog()}>
                        <Edit2 className="h-3.5 w-3.5" />
                        Definir Orçamento
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2" onClick={handleExportExcel}>
                        <Download className="h-3.5 w-3.5" />
                        Excel
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2" onClick={handleExportPDF}>
                        <Download className="h-3.5 w-3.5" />
                        PDF
                    </Button>
                    <Button size="sm" className="gap-2" onClick={() => setArunaOpen(true)}>
                        <Sparkles className="h-3.5 w-3.5" />
                        ARUNA
                    </Button>
                </div>
            </div>

            {/* ── KPI Cards ── */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* 1: Health Score */}
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
                    <Card className="border-border/60">
                        <CardContent className="p-5">
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Score de Saúde</p>
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/8">
                                    <Activity className={`h-4 w-4 ${scoreInfo.color}`} />
                                </div>
                            </div>
                            <p className={`text-2xl font-bold ${scoreInfo.color}`}>{score}<span className="text-sm font-normal text-muted-foreground">/100</span></p>
                            <p className="mt-1 text-[11px] text-muted-foreground">{scoreInfo.label}</p>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* 2: Execution Rate */}
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
                    <Card className="border-border/60">
                        <CardContent className="p-5">
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Execução Global</p>
                                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${execRate > 100 ? "bg-destructive/8" : "bg-success/8"}`}>
                                    <BarChart2 className={`h-4 w-4 ${execRate > 100 ? "text-destructive" : "text-success"}`} />
                                </div>
                            </div>
                            <p className={`text-2xl font-bold ${execRate > 100 ? "text-destructive" : execRate > 80 ? "text-yellow-500" : "text-success"}`}>
                                {execRate.toFixed(1)}%
                            </p>
                            {/* Mini progress bar */}
                            <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all ${execRate > 100 ? "bg-destructive" : execRate > 80 ? "bg-yellow-500" : "bg-success"}`}
                                    style={{ width: `${Math.min(execRate, 100)}%` }}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* 3: Projection */}
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                    <Card className="border-border/60">
                        <CardContent className="p-5">
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Projeção Fechamento</p>
                                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${projectedTotal > budgetedTotal ? "bg-destructive/8" : "bg-primary/8"}`}>
                                    {projectedTotal > budgetedTotal ? (
                                        <TrendingUp className="h-4 w-4 text-destructive" />
                                    ) : (
                                        <TrendingDown className="h-4 w-4 text-primary" />
                                    )}
                                </div>
                            </div>
                            <p className={`text-2xl font-bold ${projectedTotal > budgetedTotal ? "text-destructive" : "text-foreground"}`}>
                                {fmtCurrency(projectedTotal)}
                            </p>
                            <p className="mt-1 text-[11px] text-muted-foreground">
                                {elapsed < 1
                                    ? `${(elapsed * 100).toFixed(0)}% do mês decorrido`
                                    : "Mês encerrado"}
                            </p>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* 4: Free Budget */}
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                    <Card className="border-border/60">
                        <CardContent className="p-5">
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Saldo Disponível</p>
                                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${free >= 0 ? "bg-success/8" : "bg-destructive/8"}`}>
                                    <Wallet className={`h-4 w-4 ${free >= 0 ? "text-success" : "text-destructive"}`} />
                                </div>
                            </div>
                            <p className={`text-2xl font-bold ${free >= 0 ? "text-success" : "text-destructive"}`}>
                                {fmtCurrency(Math.abs(free))}
                            </p>
                            <p className="mt-1 text-[11px] text-muted-foreground">
                                {free >= 0 ? "dentro do orçado" : "acima do orçado"}
                                {bigDev && ` · maior desvio: ${bigDev.category}`}
                            </p>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>

            {/* ── Charts Row ── */}
            <div className="grid gap-4 lg:grid-cols-3">
                {/* Bar chart: orçado vs realizado */}
                <Card className="border-border/60 lg:col-span-2">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                            Orçado vs. Realizado por Categoria
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {barData.length === 0 ? (
                            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                                Nenhum dado para este período
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height={220}>
                                <BarChart data={barData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend wrapperStyle={{ fontSize: 11 }} />
                                    <Bar dataKey="Orçado" fill="hsl(var(--primary) / .4)" radius={[3, 3, 0, 0]} />
                                    <Bar dataKey="Realizado" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>

                {/* Line chart: historical trend */}
                <Card className="border-border/60">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                            Tendência 6 Meses
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={220}>
                            <LineChart data={historicalData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend wrapperStyle={{ fontSize: 11 }} />
                                <Line type="monotone" dataKey="Orçado" stroke="hsl(var(--primary) / .5)" strokeWidth={2} dot={false} />
                                <Line type="monotone" dataKey="Realizado" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* ── Detail Table ── */}
            <Card className="border-border/60">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                        Detalhamento por Categoria
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {rows.length === 0 ? (
                        <div className="py-16 text-center text-sm text-muted-foreground">
                            Nenhuma categoria com dados neste período.{" "}
                            <button
                                className="underline underline-offset-2 hover:text-foreground transition-colors"
                                onClick={() => openDialog()}
                            >
                                Definir orçamento
                            </button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border/60 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                        <th className="px-4 py-3 text-left">Categoria</th>
                                        <th className="px-4 py-3 text-right">Orçado</th>
                                        <th className="px-4 py-3 text-right">Realizado</th>
                                        <th className="px-4 py-3 text-right">Projeção</th>
                                        <th className="px-4 py-3 text-right">Variação</th>
                                        <th className="px-4 py-3 text-center">Status</th>
                                        <th className="px-4 py-3 text-right">Ação</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <AnimatePresence>
                                        {rows.map((row, i) => {
                                            const cfg = STATUS_CONFIG[row.status];
                                            const StatusIcon = cfg.icon;
                                            const isEditing = editingCategory === row.category;
                                            return (
                                                <motion.tr
                                                    key={row.category}
                                                    initial={{ opacity: 0, x: -8 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: i * 0.04 }}
                                                    className="border-b border-border/40 hover:bg-muted/30 transition-colors group"
                                                >
                                                    <td className="px-4 py-3 font-medium">
                                                        <div className="flex items-center gap-2">
                                                            {row.category}
                                                            {row.carryForward && (
                                                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
                                                                    <RotateCcw className="h-2.5 w-2.5 mr-0.5" />carry
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-right tabular-nums">
                                                        {isEditing ? (
                                                            <Input
                                                                autoFocus
                                                                className="h-7 w-32 text-right text-xs ml-auto"
                                                                value={editValue}
                                                                onChange={(e) =>
                                                                    setEditValue(formatCurrencyInput(e.target.value))
                                                                }
                                                                onKeyDown={(e) => {
                                                                    if (e.key === "Enter") saveInlineEdit(row);
                                                                    if (e.key === "Escape") setEditingCategory(null);
                                                                }}
                                                            />
                                                        ) : (
                                                            <span className={row.budgeted === 0 ? "text-muted-foreground" : ""}>
                                                                {row.budgeted > 0 ? fmtCurrency(row.budgeted) : "—"}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-right tabular-nums font-semibold">
                                                        {fmtCurrency(row.realized)}
                                                    </td>
                                                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground text-xs">
                                                        {elapsed < 1 ? fmtCurrency(row.projected) : "—"}
                                                    </td>
                                                    <td className="px-4 py-3 text-right tabular-nums">
                                                        <span
                                                            className={
                                                                row.variationAbs > 0
                                                                    ? "text-destructive"
                                                                    : row.variationAbs < 0
                                                                        ? "text-success"
                                                                        : "text-muted-foreground"
                                                            }
                                                        >
                                                            {row.variationPct !== null
                                                                ? `${row.variationPct.toFixed(1)}%`
                                                                : "—"}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex justify-center">
                                                            <Badge
                                                                variant="outline"
                                                                className={`text-[11px] gap-1 ${cfg.className}`}
                                                            >
                                                                <StatusIcon className="h-3 w-3" />
                                                                {cfg.label}
                                                            </Badge>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex justify-end gap-1">
                                                            {isEditing ? (
                                                                <>
                                                                    <Button
                                                                        size="icon"
                                                                        variant="ghost"
                                                                        className="h-7 w-7 text-success"
                                                                        onClick={() => saveInlineEdit(row)}
                                                                    >
                                                                        <Check className="h-3.5 w-3.5" />
                                                                    </Button>
                                                                    <Button
                                                                        size="icon"
                                                                        variant="ghost"
                                                                        className="h-7 w-7 text-muted-foreground"
                                                                        onClick={() => setEditingCategory(null)}
                                                                    >
                                                                        <X className="h-3.5 w-3.5" />
                                                                    </Button>
                                                                </>
                                                            ) : (
                                                                <Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    className="h-7 w-7 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                                                                    onClick={() => startInlineEdit(row)}
                                                                >
                                                                    <Edit2 className="h-3 w-3" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </motion.tr>
                                            );
                                        })}
                                    </AnimatePresence>
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* ── Revision Log ── */}
            <Collapsible open={logOpen} onOpenChange={setLogOpen}>
                <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="gap-2 text-sm text-muted-foreground hover:text-foreground w-full justify-start px-0">
                        {logOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        Histórico de Revisões de Orçamento
                    </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                    <Card className="border-border/60 mt-2">
                        <CardContent className="p-0">
                            {orcamentosLog.length === 0 ? (
                                <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma revisão registrada.</p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="border-b border-border/60 text-muted-foreground font-medium">
                                                <th className="px-4 py-3 text-left">Data</th>
                                                <th className="px-4 py-3 text-left">Valor Anterior</th>
                                                <th className="px-4 py-3 text-left">Novo Valor</th>
                                                <th className="px-4 py-3 text-left">Observação</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(orcamentosLog as OrcamentoLog[]).map((log) => (
                                                <tr key={log.id} className="border-b border-border/30">
                                                    <td className="px-4 py-2.5 text-muted-foreground tabular-nums">
                                                        {format(new Date(log.changed_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                                    </td>
                                                    <td className="px-4 py-2.5 tabular-nums line-through text-muted-foreground">
                                                        {log.old_amount != null ? fmtCurrency(Number(log.old_amount)) : "—"}
                                                    </td>
                                                    <td className="px-4 py-2.5 tabular-nums font-medium text-foreground">
                                                        {log.new_amount != null ? fmtCurrency(Number(log.new_amount)) : "—"}
                                                    </td>
                                                    <td className="px-4 py-2.5 text-muted-foreground">{log.notes || "—"}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </CollapsibleContent>
            </Collapsible>

            {/* ── Dialog: Create/Edit Budget Entry ── */}
            <Dialog open={dialogOpen} onOpenChange={(o) => !o && setDialogOpen(false)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="font-semibold">
                            Definir Orçamento — {getMonthLabel(month, year)}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                Categoria
                            </label>
                            <Select value={dialogCategory} onValueChange={setDialogCategory}>
                                <SelectTrigger className="h-10">
                                    <SelectValue placeholder="Selecione a categoria" />
                                </SelectTrigger>
                                <SelectContent>
                                    {categories.map((c) => (
                                        <SelectItem key={c} value={c}>{c}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                Valor Orçado (R$)
                            </label>
                            <Input
                                placeholder="0,00"
                                value={dialogAmount}
                                onChange={(e) => setDialogAmount(formatCurrencyInput(e.target.value))}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                Observação (opcional)
                            </label>
                            <Input
                                placeholder="Ex: ajuste por férias coletivas"
                                value={dialogNotes}
                                onChange={(e) => setDialogNotes(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setDialogCarry(!dialogCarry)}
                                className="text-muted-foreground hover:text-foreground transition-colors"
                            >
                                {dialogCarry ? (
                                    <ToggleRight className="h-6 w-6 text-primary" />
                                ) : (
                                    <ToggleLeft className="h-6 w-6" />
                                )}
                            </button>
                            <span className="text-sm">
                                Carry-forward{" "}
                                <span className="text-muted-foreground text-xs">
                                    (transitar saldo para próximo mês)
                                </span>
                            </span>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                        <Button onClick={handleDialogSave} disabled={upsertMutation.isPending}>
                            Salvar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── ARUNA Panel ── */}
            <ArunaAnalysisPanel
                open={arunaOpen}
                onClose={() => setArunaOpen(false)}
                rows={rows}
                month={month}
                year={year}
                executionRate={execRate}
                healthScore={score}
                type={typeTab}
                orgId={orgId}
            />
        </div>
    );
}
