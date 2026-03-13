import { useState } from "react";
import { format, subMonths, addMonths, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Bell, CheckCircle2, AlertTriangle, Clock, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/utils";
import { motion } from "framer-motion";

// ─── Types & Constants ────────────────────────────────────────

type TaxStatus = "pago" | "pendente" | "atrasado" | "nao_aplicavel";

interface TaxEntry {
    id: string;
    name: string;
    description: string;
    dueDay: number; // day of month
    competencia: string; // YYYY-MM
    status: TaxStatus;
}

const TAX_TYPES = [
    {
        id: "das",
        name: "DAS - Simples Nacional",
        description: "Document de Arrecadação do Simples Nacional — mensal até o dia 20",
        dueDay: 20,
        applicable: true,
    },
    {
        id: "darf_irpj",
        name: "DARF - IRPJ",
        description: "Imposto de Renda Pessoa Jurídica — mensal (estimativa) até o dia 31",
        dueDay: 31,
        applicable: true,
    },
    {
        id: "darf_csll",
        name: "DARF - CSLL",
        description: "Contribuição Social sobre Lucro Líquido — mensal até o dia 31",
        dueDay: 31,
        applicable: true,
    },
    {
        id: "darf_pis",
        name: "DARF - PIS/COFINS",
        description: "PIS e COFINS no regime não-cumulativo — mensal até o dia 25",
        dueDay: 25,
        applicable: true,
    },
    {
        id: "iss",
        name: "ISS (Serviços)",
        description: "Imposto Sobre Serviços — mensal (data varia por município)",
        dueDay: 10,
        applicable: true,
    },
    {
        id: "fgts",
        name: "FGTS",
        description: "Fundo de Garantia do Tempo de Serviço — mensal até o dia 7",
        dueDay: 7,
        applicable: true,
    },
    {
        id: "gps",
        name: "GPS - INSS Empresa",
        description: "Guia da Previdência Social (patronal) — mensal até o dia 20",
        dueDay: 20,
        applicable: true,
    },
];

const STORAGE_KEY = "lexa-dasdarf-status";

const loadStatuses = (): Record<string, TaxStatus> => {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    } catch { return {}; }
};

const saveStatuses = (statuses: Record<string, TaxStatus>) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(statuses));
};

const statusConfig: Record<TaxStatus, { label: string; icon: any; cls: string }> = {
    pago: { label: "Pago", icon: CheckCircle2, cls: "text-emerald-600 border-emerald-500/30 bg-emerald-500/5" },
    pendente: { label: "Pendente", icon: Clock, cls: "text-amber-600 border-amber-500/30 bg-amber-500/5" },
    atrasado: { label: "Atrasado", icon: AlertTriangle, cls: "text-destructive border-destructive/30 bg-destructive/5" },
    nao_aplicavel: { label: "N/A", icon: Bell, cls: "text-muted-foreground border-border bg-muted/30" },
};

// ─── Component ────────────────────────────────────────────────

export function DasDarfPanel() {
    const [referenceMonth, setReferenceMonth] = useState(() => startOfMonth(subMonths(new Date(), 0)));
    const [statuses, setStatuses] = useState<Record<string, TaxStatus>>(loadStatuses);
    const competencia = format(referenceMonth, "yyyy-MM");
    const today = new Date();
    const monthLabel = format(referenceMonth, "MMMM 'de' yyyy", { locale: ptBR });

    const getKey = (id: string) => `${competencia}::${id}`;

    const getStatus = (taxId: string, dueDay: number): TaxStatus => {
        const key = getKey(taxId);
        const saved = statuses[key];
        if (saved) return saved;

        // Auto-compute based on date
        const dueDate = new Date(referenceMonth.getFullYear(), referenceMonth.getMonth(), dueDay);
        if (dueDate < today) return "atrasado";
        return "pendente";
    };

    const setStatus = (taxId: string, s: TaxStatus) => {
        const key = getKey(taxId);
        const updated = { ...statuses, [key]: s };
        setStatuses(updated);
        saveStatuses(updated);
    };

    const entries: TaxEntry[] = TAX_TYPES.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        dueDay: t.dueDay,
        competencia,
        status: getStatus(t.id, t.dueDay),
    }));

    const pago = entries.filter((e) => e.status === "pago").length;
    const pendente = entries.filter((e) => e.status === "pendente").length;
    const atrasado = entries.filter((e) => e.status === "atrasado").length;

    return (
        <div className="space-y-4">
            {/* Month navigator */}
            <Card className="border-border/60">
                <CardContent className="flex items-center justify-between p-4">
                    <div>
                        <p className="text-sm font-semibold text-foreground capitalize">{monthLabel}</p>
                        <p className="text-xs text-muted-foreground">Competência fiscal selecionada</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setReferenceMonth((m) => startOfMonth(subMonths(m, 1)))}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setReferenceMonth((m) => startOfMonth(addMonths(m, 1)))}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* KPIs */}
            <div className="grid grid-cols-3 gap-3">
                {[
                    { label: "Pagos", count: pago, cls: "text-emerald-600 bg-emerald-500/5 border-emerald-500/20" },
                    { label: "Pendentes", count: pendente, cls: "text-amber-600 bg-amber-500/5 border-amber-500/20" },
                    { label: "Atrasados", count: atrasado, cls: atrasado > 0 ? "text-destructive bg-destructive/5 border-destructive/20" : "text-muted-foreground bg-muted/30 border-border" },
                ].map((k) => (
                    <Card key={k.label} className={cn("border", k.cls)}>
                        <CardContent className="p-4 text-center">
                            <p className="text-2xl font-bold">{k.count}</p>
                            <p className="text-xs font-medium mt-0.5">{k.label}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Entries */}
            <Card className="border-border/60">
                <CardHeader className="pb-0 pt-4 px-4">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-semibold">Obrigações Fiscais</CardTitle>
                        {atrasado > 0 && (
                            <Badge variant="destructive" className="text-[10px] animate-pulse">
                                {atrasado} em atraso
                            </Badge>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="p-0 pt-2">
                    <div className="divide-y divide-border/50">
                        {entries.map((entry, i) => {
                            const sc = statusConfig[entry.status];
                            const Icon = sc.icon;
                            const dueDate = new Date(referenceMonth.getFullYear(), referenceMonth.getMonth(), entry.dueDay);

                            return (
                                <motion.div
                                    key={entry.id}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: i * 0.04 }}
                                    className="flex items-center gap-3 px-4 py-3 hover:bg-muted/10 transition-colors"
                                >
                                    <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border", sc.cls)}>
                                        <Icon className="h-4 w-4" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium text-foreground">{entry.name}</p>
                                        <p className="text-xs text-muted-foreground">Vence dia {entry.dueDay} · {entry.description.slice(0, 50)}...</p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <span className="text-xs text-muted-foreground">
                                            {format(dueDate, "dd/MM")}
                                        </span>
                                        {/* Quick status toggle */}
                                        <div className="flex gap-1">
                                            {(["pago", "pendente", "atrasado", "nao_aplicavel"] as TaxStatus[]).map((s) => (
                                                <button
                                                    key={s}
                                                    onClick={() => setStatus(entry.id, s)}
                                                    title={statusConfig[s].label}
                                                    className={cn(
                                                        "h-6 rounded px-2 text-[10px] font-medium border transition-all",
                                                        entry.status === s
                                                            ? statusConfig[s].cls
                                                            : "border-border/60 text-muted-foreground/50 hover:border-muted-foreground/30"
                                                    )}
                                                >
                                                    {statusConfig[s].label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

            <p className="text-xs text-muted-foreground text-center">
                * Datas de vencimento indicativas. Confirme sempre no portal do fisco. Status salvo localmente.
            </p>
        </div>
    );
}
