import { useState } from "react";
import { trpc } from "@/shared/lib/trpc";
import { motion, AnimatePresence } from "framer-motion";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/shared/ui/sheet";
import { Button } from "@/shared/ui/button";
import { Sparkles, Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { getMonthLabel, type CategoryRow } from "@/shared/lib/budgetUtils";

interface ArunaAnalysisPanelProps {
    open: boolean;
    onClose: () => void;
    rows: CategoryRow[];
    month: number;
    year: number;
    executionRate: number;
    healthScore: number;
    type: "despesa" | "receita";
    orgId: string;
}

export default function ArunaAnalysisPanel({
    open,
    onClose,
    rows,
    month,
    year,
    executionRate,
    healthScore,
    type,
}: ArunaAnalysisPanelProps) {
    const [analysis, setAnalysis] = useState<string>("");
    const [copied, setCopied] = useState(false);

    const utils = trpc.useUtils();

    const analyzeMut = trpc.ia.analyzeBudget.useMutation({
        onSuccess: (data) => {
            setAnalysis(data.content);
            utils.ia.listHistory.invalidate();
        },
        onError: (err) => {
            toast.error("Erro ao gerar análise: " + err.message);
        }
    });

    const handleGenerate = async () => {
        setAnalysis("");
        analyzeMut.mutate({
            rows,
            month,
            year,
            executionRate,
            type
        });
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(analysis);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast.success("Análise copiada!");
    };

    const period = getMonthLabel(month, year);

    return (
        <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
            <SheetContent className="w-full max-w-lg overflow-y-auto">
                <SheetHeader className="mb-6">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                            <Sparkles className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <SheetTitle className="text-lg font-semibold">Análise ARUNA</SheetTitle>
                            <p className="text-xs text-muted-foreground">
                                Desempenho orçamentário — {period}
                            </p>
                        </div>
                    </div>
                </SheetHeader>

                {/* Resumo rápido */}
                <div className="mb-6 grid grid-cols-3 gap-3">
                    {[
                        {
                            label: "Execução",
                            value: `${executionRate.toFixed(1)}%`,
                            color:
                                executionRate > 100
                                    ? "text-destructive"
                                    : executionRate > 80
                                        ? "text-yellow-500"
                                        : "text-success",
                        },
                        {
                            label: "Saúde",
                            value: `${healthScore}/100`,
                            color:
                                healthScore >= 85
                                    ? "text-success"
                                    : healthScore >= 65
                                        ? "text-yellow-500"
                                        : "text-destructive",
                        },
                        {
                            label: "Categorias",
                            value: `${rows.length}`,
                            color: "text-foreground",
                        },
                    ].map((kpi) => (
                        <div
                            key={kpi.label}
                            className="rounded-lg border border-border/60 bg-muted/30 p-3 text-center"
                        >
                            <p className={`text-lg font-bold ${kpi.color}`}>{kpi.value}</p>
                            <p className="text-[11px] text-muted-foreground">{kpi.label}</p>
                        </div>
                    ))}
                </div>

                {/* Generate button */}
                {!analysis && (
                    <Button
                        className="w-full gap-2 mb-6"
                        onClick={handleGenerate}
                        disabled={analyzeMut.isPending || rows.length === 0}
                    >
                        <Sparkles className="h-4 w-4" />
                        {analyzeMut.isPending ? "Analisando..." : "Gerar Análise com ARUNA"}
                    </Button>
                )}

                {/* Streaming effect for analysis text */}
                <AnimatePresence>
                    {(analyzeMut.isPending || analysis) && (
                        <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="space-y-4"
                        >
                            {analyzeMut.isPending && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                                    Gerando análise...
                                </div>
                            )}
                            {analysis && (
                                <>
                                    <div className="rounded-xl border border-border/60 bg-muted/30 p-4 text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                                        {analysis}
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="gap-2"
                                            onClick={handleCopy}
                                        >
                                            {copied ? (
                                                <Check className="h-3.5 w-3.5 text-success" />
                                            ) : (
                                                <Copy className="h-3.5 w-3.5" />
                                            )}
                                            {copied ? "Copiado!" : "Copiar"}
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="gap-2"
                                            onClick={handleGenerate}
                                            disabled={analyzeMut.isPending}
                                        >
                                            <Sparkles className="h-3.5 w-3.5" />
                                            Regenerar
                                        </Button>
                                    </div>
                                </>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                {rows.length === 0 && !analysis && (
                    <p className="text-center text-sm text-muted-foreground py-8">
                        Nenhum dado orçamentário disponível para análise neste período.
                    </p>
                )}
            </SheetContent>
        </Sheet>
    );
}
