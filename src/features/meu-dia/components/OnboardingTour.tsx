import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Rocket, Building2, Users, FileText,
    CheckCircle2, ChevronRight, X, Sparkles,
    ArrowRight, Scale, CalendarDays, DollarSign, BarChart3, ChevronLeft
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { cn } from "@/shared/lib/utils";

interface TourStep {
    title: string;
    description: string;
    icon: any;
}

const TOUR_STEPS: TourStep[] = [
    {
        title: "Bem-vindo à LEXA! 🎉",
        description: "Seu sistema completo de gestão jurídica com IA. Vamos configurar seu escritório agora.",
        icon: Rocket,
    },
    {
        title: "Sua Organização",
        description: "Configure o nome do seu escritório e sua logo para a White-label nas Configurações.",
        icon: Building2,
    },
    {
        title: "Dashboard: Meu Dia",
        description: "Veja prazos urgentes, KPIs e processos recentes em um só lugar.",
        icon: BarChart3,
    },
    {
        title: "Agenda & Prazos",
        description: "Calendário com integração Google e alertas automáticos da ARUNA IA.",
        icon: CalendarDays,
    },
    {
        title: "Processos & Clientes",
        description: "Gestão completa em modo Tabela ou Kanban com análise de risco por IA.",
        icon: Scale,
    },
    {
        title: "Monte sua Equipe",
        description: "Convide advogados e gerencie o RH completo com ponto eletrônico.",
        icon: Users,
    },
    {
        title: "Tudo pronto!",
        description: "Você está pronto para começar. A ARUNA IA já está processando seus dados.",
        icon: CheckCircle2,
    },
];

const STORAGE_KEY = "lexa-tour-completed";

export function OnboardingTour() {
    const [visible, setVisible] = useState(false);
    const [step, setStep] = useState(0);

    useEffect(() => {
        const completed = localStorage.getItem(STORAGE_KEY);
        if (!completed) {
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <AnimatePresence mode="wait">
                <motion.div
                    key={step}
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -20 }}
                    className="w-full max-w-lg"
                >
                    <Card className="border-primary/20 shadow-2xl relative overflow-hidden bg-card/50 backdrop-blur-xl">
                        <div className="absolute top-0 left-0 w-full h-1 bg-muted">
                            <motion.div
                                className="h-full bg-primary"
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                            />
                        </div>

                        <button
                            onClick={complete}
                            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <X className="h-4 w-4" />
                        </button>

                        <CardHeader className="pt-8 text-center">
                            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                                <Icon className="h-8 w-8" />
                            </div>
                            <CardTitle className="text-2xl font-display flex items-center justify-center gap-2">
                                {current.title} {isFirst && <Sparkles className="h-5 w-5 text-amber-500 animate-pulse" />}
                            </CardTitle>
                            <CardDescription className="text-base mt-2">
                                {current.description}
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="pb-8 flex flex-col items-center gap-6">
                            <div className="flex gap-2">
                                {TOUR_STEPS.map((_, i) => (
                                    <div
                                        key={i}
                                        className={cn(
                                            "h-1.5 rounded-full transition-all duration-300",
                                            i === step ? "w-8 bg-primary" : "w-1.5 bg-muted"
                                        )}
                                    />
                                ))}
                            </div>

                            <div className="flex gap-3 w-full sm:w-auto">
                                {!isFirst && (
                                    <Button variant="ghost" onClick={() => setStep(step - 1)}>
                                        <ChevronLeft className="mr-2 h-4 w-4" /> Voltar
                                    </Button>
                                )}
                                <Button className="flex-1 sm:flex-none gap-2 px-8" onClick={() => (isLast ? complete() : setStep(step + 1))}>
                                    {isLast ? "Começar Agora" : "Próximo"}
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            </AnimatePresence>
        </div>
    );
}

export function resetOnboardingTour() {
    localStorage.removeItem(STORAGE_KEY);
}

