"use client";

import { BarChart3, TrendingUp, Target, Info } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useCrm } from "@/features/crm/contexts/CrmContext";
import { cn } from "@/shared/lib/utils";
import { Card, CardContent } from "@/shared/ui/card";
import { motion } from "framer-motion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/shared/ui/tooltip";

export default function CrmOverviewBoard() {
    const { t } = useTranslation();
    const { leads, deals } = useCrm();

    const wonDeals = deals.filter((d) => d.stage === "Fechado/Ganho");
    const lostDeals = deals.filter((d) => d.stage === "Perdido");
    const totalFinished = wonDeals.length + lostDeals.length;
    const convRate = totalFinished > 0 ? Math.round((wonDeals.length / totalFinished) * 100) : 0;

    const funnelStages = [
        { key: "novo_lead", label: t("crm.pipeline.stages.novo_lead"), color: "bg-blue-500" },
        { key: "contato_feito", label: t("crm.pipeline.stages.contato_feito"), color: "bg-amber-500" },
        { key: "proposta_enviada", label: t("crm.pipeline.stages.proposta_enviada"), color: "bg-violet-500" },
        { key: "em_negociacao", label: t("crm.pipeline.stages.em_negociacao"), color: "bg-orange-500" },
        { key: "fechado_ganho", label: t("crm.pipeline.stages.fechado_ganho"), color: "bg-emerald-500" },
        { key: "perdido", label: t("crm.pipeline.stages.perdido"), color: "bg-red-400" },
    ];

    const funnelData = funnelStages.map(s => ({
        ...s,
        count: leads.filter(l => l.stageId === s.key).length
    }));

    const maxCount = Math.max(...funnelData.map(d => d.count), 1);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sales Funnel Card */}
            <Card className="lg:col-span-2 border-border/40 shadow-sm bg-card/60 backdrop-blur-sm rounded-2xl overflow-hidden">
                <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                <BarChart3 className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-foreground tracking-tight">{t("crm.overview.funnel")}</h3>
                                <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">{t("crm.overview.activeLeads")}</p>
                            </div>
                        </div>
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger>
                                    <Info className="h-4 w-4 text-muted-foreground/40" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs p-3 rounded-xl shadow-xl">
                                    <p className="text-xs leading-relaxed">Visualização da distribuição dos seus leads por etapa do pipeline.</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>

                    <div className="flex items-end gap-2 sm:gap-4 h-32 px-2">
                        {funnelData.map((stage, idx) => {
                            const height = Math.max(12, (stage.count / maxCount) * 120);
                            return (
                                <div key={stage.key} className="flex-1 flex flex-col items-center gap-2 group">
                                    <motion.span
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.1 }}
                                        className="text-xs font-black text-foreground group-hover:scale-110 transition-transform"
                                    >
                                        {stage.count}
                                    </motion.span>
                                    <motion.div
                                        initial={{ height: 0 }}
                                        animate={{ height: `${height}px` }}
                                        transition={{ duration: 0.8, ease: "easeOut", delay: idx * 0.1 }}
                                        className={cn(
                                            "w-full rounded-t-xl transition-all duration-300 shadow-lg group-hover:brightness-110 group-hover:shadow-xl",
                                            stage.color,
                                            stage.count === 0 && "opacity-10 grayscale"
                                        )}
                                    />
                                    <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-tighter text-center leading-tight h-8 flex items-center">
                                        {stage.label}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* Performance Stats Card */}
            <Card className="border-border/40 shadow-sm bg-card/60 backdrop-blur-sm rounded-2xl overflow-hidden">
                <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                            <Target className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-foreground tracking-tight">{t("crm.overview.conversionRate")}</h3>
                            <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">{t("crm.overview.wonValue")}</p>
                        </div>
                    </div>

                    <div className="flex flex-col items-center justify-center py-4 relative">
                        {/* Circular Progress (Simplified) */}
                        <div className="relative h-32 w-32 flex items-center justify-center">
                            <svg className="h-full w-full -rotate-90">
                                <circle
                                    cx="64" cy="64" r="58"
                                    className="stroke-muted/30 fill-none"
                                    strokeWidth="8"
                                />
                                <motion.circle
                                    cx="64" cy="64" r="58"
                                    className="stroke-emerald-500 fill-none"
                                    strokeWidth="8"
                                    strokeDasharray="364.4"
                                    initial={{ strokeDashoffset: 364.4 }}
                                    animate={{ strokeDashoffset: 364.4 - (364.4 * convRate) / 100 }}
                                    transition={{ duration: 1.5, ease: "easeOut" }}
                                    strokeLinecap="round"
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-3xl font-black text-emerald-600 tracking-tighter">{convRate}%</span>
                                <span className="text-[9px] font-bold text-muted-foreground uppercase opacity-60">Win Rate</span>
                            </div>
                        </div>

                        <div className="mt-8 w-full grid grid-cols-2 gap-4">
                            <div className="bg-emerald-500/5 rounded-2xl p-3 border border-emerald-500/10 text-center">
                                <p className="text-[9px] font-bold text-emerald-700 uppercase mb-1 tracking-widest">{t("crm.pipeline.stages.fechado_ganho")}</p>
                                <p className="text-lg font-black text-emerald-600 leading-none">{wonDeals.length}</p>
                            </div>
                            <div className="bg-red-500/5 rounded-2xl p-3 border border-red-500/10 text-center">
                                <p className="text-[9px] font-bold text-red-700 uppercase mb-1 tracking-widest">{t("crm.pipeline.stages.perdido")}</p>
                                <p className="text-lg font-black text-red-600 leading-none">{lostDeals.length}</p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
