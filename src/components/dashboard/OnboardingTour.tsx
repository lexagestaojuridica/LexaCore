import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, ChevronLeft, CheckCircle2, Scale, CalendarDays, Users, DollarSign, BarChart3, Timer, Award, BookOpen, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────

interface TourStep {
    title: string;
    description: string;
    icon: any;
    color: string;
    highlight?: string;
}

const TOUR_STEPS: TourStep[] = [
    {
        title: "Bem-vindo ao LEXA Nova! 🎉",
        description: "Seu sistema completo de gestão jurídica. Vamos fazer um tour rápido pelos principais recursos para você começar com tudo!",
        icon: Zap,
        color: "from-indigo-500 to-violet-600",
    },
    {
        title: "Dashboard Meu Dia",
        description: "Sua central de comando diária. Veja prazos urgentes, compromissos de hoje, KPIs do escritório e processos recentes — tudo em um só lugar.",
        icon: BarChart3,
        color: "from-blue-500 to-cyan-500",
        highlight: "/dashboard",
    },
    {
        title: "Processos Jurídicos",
        description: "Gerencie todos os seus processos em modo Tabela (com ordenação e paginação) ou Kanban (por status). Vincule documentos, calcule honorários e registre horas.",
        icon: Scale,
        color: "from-emerald-500 to-teal-500",
        highlight: "/dashboard/processos",
    },
    {
        title: "Agenda & Prazos",
        description: "Calendário completo com prazos fatais destacados, integração com Google Calendar, e alertas automáticos para não perder nenhum prazo.",
        icon: CalendarDays,
        color: "from-amber-500 to-orange-500",
        highlight: "/dashboard/agenda",
    },
    {
        title: "Clientes",
        description: "Fichas completas por cliente com dados pessoais, endereço, documentos vinculados e histórico de processos.",
        icon: Users,
        color: "from-violet-500 to-purple-500",
        highlight: "/dashboard/clientes",
    },
    {
        title: "Financeiro",
        description: "Controle completo de contas a receber e a pagar, honorários, rentabilidade e performance do orçamento.",
        icon: DollarSign,
        color: "from-green-500 to-emerald-500",
        highlight: "/dashboard/financeiro",
    },
    {
        title: "Timesheet",
        description: "Registre horas trabalhadas por processo com o timer ao vivo ou por lançamento manual. Controle de faturamento e receita por hora.",
        icon: Timer,
        color: "from-rose-500 to-pink-500",
        highlight: "/dashboard/timesheet",
    },
    {
        title: "Certificados & Wiki",
        description: "Gere certificados e declarações em PDF, e use a Wiki Jurídica como base de conhecimento para teses, modelos e procedimentos internos.",
        icon: BookOpen,
        color: "from-slate-500 to-gray-600",
        highlight: "/dashboard/wiki",
    },
    {
        title: "Tudo pronto!",
        description: "Você está pronto para começar. O sistema está 100% configurado. Se precisar de ajuda, explore qualquer módulo pelo menu lateral. Bom trabalho! ⚖️",
        icon: CheckCircle2,
        color: "from-primary to-indigo-600",
    },
];

const STORAGE_KEY = "lexa-tour-completed";

// ─── Main Component ────────────────────────────────────────────

export function OnboardingTour() {
    const [visible, setVisible] = useState(false);
    const [step, setStep] = useState(0);

    useEffect(() => {
        const completed = localStorage.getItem(STORAGE_KEY);
        if (!completed) {
            // Small delay before showing
            const t = setTimeout(() => setVisible(true), 1500);
            return () => clearTimeout(t);
        }
    }, []);

    const complete = () => {
        localStorage.setItem(STORAGE_KEY, "true");
        setVisible(false);
    };

    const current = TOUR_STEPS[step];
    const isFirst = step === 0;
    const isLast = step === TOUR_STEPS.length - 1;
    const progress = ((step + 1) / TOUR_STEPS.length) * 100;
    const Icon = current.icon;

    if (!visible) return null;

    return (
        <AnimatePresence>
            <motion.div
                key="backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                onClick={(e) => e.target === e.currentTarget && complete()}
            >
                <motion.div
                    key={step}
                    initial={{ opacity: 0, scale: 0.95, y: 12 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    className="relative w-full max-w-md rounded-2xl bg-card border border-border shadow-2xl overflow-hidden"
                >
                    {/* Gradient header */}
                    <div className={cn("relative h-36 bg-gradient-to-br flex items-center justify-center", current.color)}>
                        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
                            <Icon className="h-10 w-10 text-white" />
                        </div>
                        {/* Step indicator dots */}
                        <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
                            {TOUR_STEPS.map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => setStep(i)}
                                    className={cn("h-1.5 rounded-full transition-all", i === step ? "w-4 bg-white" : "w-1.5 bg-white/40")}
                                />
                            ))}
                        </div>
                        <button
                            onClick={complete}
                            className="absolute top-3 right-3 flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-4">
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-medium text-muted-foreground">Passo {step + 1} de {TOUR_STEPS.length}</span>
                                <span className="text-xs text-muted-foreground">{Math.round(progress)}%</span>
                            </div>
                            <div className="h-1 w-full rounded-full bg-muted">
                                <motion.div
                                    className="h-full rounded-full bg-primary"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progress}%` }}
                                    transition={{ duration: 0.4 }}
                                />
                            </div>
                        </div>

                        <div>
                            <h2 className="text-lg font-bold text-foreground">{current.title}</h2>
                            <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{current.description}</p>
                        </div>

                        <div className="flex items-center justify-between gap-3 pt-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs"
                                onClick={complete}
                            >
                                Pular tour
                            </Button>
                            <div className="flex items-center gap-2">
                                {!isFirst && (
                                    <Button variant="outline" size="sm" className="gap-1" onClick={() => setStep((s) => s - 1)}>
                                        <ChevronLeft className="h-3.5 w-3.5" /> Voltar
                                    </Button>
                                )}
                                {!isLast ? (
                                    <Button size="sm" className="gap-1" onClick={() => setStep((s) => s + 1)}>
                                        Próximo <ChevronRight className="h-3.5 w-3.5" />
                                    </Button>
                                ) : (
                                    <Button size="sm" className="gap-1.5 bg-gradient-to-r from-primary to-indigo-600 border-0" onClick={complete}>
                                        <CheckCircle2 className="h-3.5 w-3.5" /> Começar!
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

// ─── Reset helper ─────────────────────────────────────────────
export function resetOnboardingTour() {
    localStorage.removeItem(STORAGE_KEY);
}
