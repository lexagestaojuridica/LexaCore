import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Rocket, Building2, Users, FileText,
    CheckCircle2, ChevronRight, X, Sparkles,
    ArrowRight
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { Progress } from "@/shared/ui/progress";
import { cn } from "@/shared/lib/utils";

interface Step {
    title: string;
    description: string;
    icon: any;
    action: string;
}

const STEPS: Step[] = [
    {
        title: "Bem-vindo à LEXA",
        description: "Vamos configurar seu escritório em menos de 2 minutos para você começar a operar com IA.",
        icon: Rocket,
        action: "Começar agora"
    },
    {
        title: "Sua Organização",
        description: "Configure o nome do seu escritório e sua logo para a White-label.",
        icon: Building2,
        action: "Configurar Perfil"
    },
    {
        title: "Monte sua Equipe",
        description: "Convide seus advogados e estagiários para colaborar em tempo real.",
        icon: Users,
        action: "Gerenciar Equipe"
    },
    {
        title: "Primeiro Processo",
        description: "Importe um processo para ver a ARUNA IA analisar os riscos automaticamente.",
        icon: FileText,
        action: "Importar Processo"
    }
];

export function GuidedOnboarding() {
    const [isOpen, setIsOpen] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);

    useEffect(() => {
        const hasOnboarded = localStorage.getItem("lexa_onboarded");
        if (!hasOnboarded) {
            setIsOpen(true);
        }
    }, []);

    const handleNext = () => {
        if (currentStep < STEPS.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            handleClose();
        }
    };

    const handleClose = () => {
        localStorage.setItem("lexa_onboarded", "true");
        setIsOpen(false);
    };

    const step = STEPS[currentStep];
    const Icon = step.icon;
    const progress = ((currentStep + 1) / STEPS.length) * 100;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentStep}
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -20 }}
                    className="w-full max-w-lg"
                >
                    <Card className="border-primary/20 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-muted">
                            <motion.div
                                className="h-full bg-primary"
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                            />
                        </div>

                        <button
                            onClick={handleClose}
                            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <X className="h-4 w-4" />
                        </button>

                        <CardHeader className="pt-8 text-center">
                            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                                <Icon className="h-8 w-8" />
                            </div>
                            <CardTitle className="text-2xl font-display flex items-center justify-center gap-2">
                                {step.title} {currentStep === 0 && <Sparkles className="h-5 w-5 text-amber-500 animate-pulse" />}
                            </CardTitle>
                            <CardDescription className="text-base mt-2">
                                {step.description}
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="pb-8 flex flex-col items-center gap-6">
                            <div className="flex gap-2">
                                {STEPS.map((_, i) => (
                                    <div
                                        key={i}
                                        className={cn(
                                            "h-1.5 rounded-full transition-all duration-300",
                                            i === currentStep ? "w-8 bg-primary" : "w-2 bg-muted"
                                        )}
                                    />
                                ))}
                            </div>

                            <div className="flex gap-3 w-full sm:w-auto">
                                {currentStep > 0 && (
                                    <Button variant="ghost" onClick={() => setCurrentStep(currentStep - 1)}>
                                        Voltar
                                    </Button>
                                )}
                                <Button className="flex-1 sm:flex-none gap-2 px-8" onClick={handleNext}>
                                    {currentStep === STEPS.length - 1 ? "Concluir" : step.action}
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>

                            {currentStep === 0 && (
                                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold flex items-center gap-1.5 mt-2">
                                    <CheckCircle2 className="h-3 w-3 text-emerald-500" /> Ativado para sua organização
                                </p>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>
            </AnimatePresence>
        </div>
    );
}
