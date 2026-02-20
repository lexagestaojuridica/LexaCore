import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, X, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { fmtCurrency, fmtPct, getMonthLabel, type CategoryRow } from "@/lib/budgetUtils";

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

function buildPrompt(
    rows: CategoryRow[],
    month: number,
    year: number,
    executionRate: number,
    type: "despesa" | "receita"
): string {
    const period = getMonthLabel(month, year);
    const exceeded = rows.filter((r) => r.status === "exceeded");
    const warning = rows.filter((r) => r.status === "warning");
    const ok = rows.filter((r) => r.status === "ok" && r.budgeted > 0);
    const unbudgeted = rows.filter((r) => r.status === "unbudgeted");

    const lines: string[] = [
        `Analise o desempenho orçamentário de ${type === "despesa" ? "despesas" : "receitas"} do escritório para o período de ${period}.`,
        ``,
        `Dados do período:`,
        `- Taxa de execução global: ${executionRate.toFixed(1)}%`,
        `- Total de categorias analisadas: ${rows.length}`,
        ``,
    ];

    if (exceeded.length > 0) {
        lines.push(`Categorias EXCEDIDAS (acima de 100% do orçado):`);
        exceeded.forEach((r) => {
            lines.push(
                `  • ${r.category}: orçado ${fmtCurrency(r.budgeted)}, realizado ${fmtCurrency(r.realized)} (${r.variationPct?.toFixed(1)}%)`
            );
        });
        lines.push("");
    }

    if (warning.length > 0) {
        lines.push(`Categorias em ATENÇÃO (80–100% do orçado):`);
        warning.forEach((r) => {
            lines.push(
                `  • ${r.category}: orçado ${fmtCurrency(r.budgeted)}, realizado ${fmtCurrency(r.realized)} (${r.variationPct?.toFixed(1)}%)`
            );
        });
        lines.push("");
    }

    if (ok.length > 0) {
        lines.push(`Categorias DENTRO do orçado:`);
        ok.forEach((r) => {
            lines.push(`  • ${r.category}: ${r.variationPct?.toFixed(1)}% executado`);
        });
        lines.push("");
    }

    if (unbudgeted.length > 0) {
        lines.push(`Categorias SEM ORÇAMENTO mas com lançamentos:`);
        unbudgeted.forEach((r) => {
            lines.push(`  • ${r.category}: ${fmtCurrency(r.realized)} sem orçamento definido`);
        });
        lines.push("");
    }

    lines.push(
        `Por favor, gere um resumo executivo em português, em 3–5 parágrafos, destacando os principais desvios, possíveis causas, e recomendações concretas para o próximo ciclo. Seja objetivo e profissional.`
    );

    return lines.join("\n");
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
    orgId,
}: ArunaAnalysisPanelProps) {
    const [analysis, setAnalysis] = useState<string>("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [copied, setCopied] = useState(false);

    const { data: profile } = useQuery({
        queryKey: ["profile-for-aruna", orgId],
        queryFn: async () => {
            const { data } = await supabase
                .from("profiles")
                .select("user_id")
                .eq("organization_id", orgId)
                .limit(1)
                .single();
            return data;
        },
        enabled: !!orgId,
    });

    const handleGenerate = async () => {
        setIsGenerating(true);
        setAnalysis("");

        try {
            const prompt = buildPrompt(rows, month, year, executionRate, type);

            // Save to conversas_ia and use existing AI infrastructure
            const { data, error } = await supabase.functions.invoke("aruna-chat", {
                body: {
                    message: prompt,
                    organization_id: orgId,
                    context: "budget_analysis",
                },
            });

            if (error) throw error;

            const content =
                data?.content ||
                data?.message ||
                "Não foi possível gerar a análise. Verifique a configuração da ARUNA.";

            setAnalysis(content);
        } catch (err: any) {
            toast.error("Erro ao gerar análise: " + (err.message ?? "Tente novamente."));
        } finally {
            setIsGenerating(false);
        }
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
                        disabled={isGenerating || rows.length === 0}
                    >
                        <Sparkles className="h-4 w-4" />
                        {isGenerating ? "Analisando..." : "Gerar Análise com ARUNA"}
                    </Button>
                )}

                {/* Streaming effect for analysis text */}
                <AnimatePresence>
                    {(isGenerating || analysis) && (
                        <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="space-y-4"
                        >
                            {isGenerating && (
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
                                            disabled={isGenerating}
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
