'use client';

import { useState } from "react";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check, Star, Zap, Crown, Building2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

const plans = [
  {
    name: "Básico",
    price: "120",
    icon: Zap,
    description: "Para advogados autônomos que querem organização e produtividade",
    features: [
      "Gestão de até 50 processos",
      "Agenda integrada com alertas",
      "Calculadora jurídica completa",
      "ARUNA IA — 50 consultas/mês",
      "Gestão de clientes (CRM básico)",
      "1 usuário incluso",
      "Suporte por e-mail",
    ],
    highlight: false,
    cta: "Começar Agora",
  },
  {
    name: "PRO",
    price: "390",
    icon: Crown,
    description: "Para escritórios em crescimento que precisam de escala e inteligência",
    features: [
      "Processos ilimitados",
      "Integração com tribunais",
      "Financeiro completo (contas a pagar/receber)",
      "ARUNA IA — consultas ilimitadas",
      "CRM jurídico avançado",
      "Transcrição de audiências",
      "Pesquisa de jurisprudência IA",
      "3 usuários inclusos",
      "Relatórios e dashboards",
      "Suporte prioritário",
    ],
    highlight: true,
    cta: "Escolher PRO",
  },
  {
    name: "Business",
    price: "600",
    icon: Building2,
    description: "Para escritórios de grande porte com operação complexa",
    features: [
      "Tudo do PRO incluído",
      "BI completo com métricas avançadas",
      "API aberta para integrações",
      "Análise de documentos com IA",
      "Geração automática de peças",
      "5 usuários inclusos",
      "Treinamento dedicado da equipe",
      "SLA garantido de 99.9%",
      "Gerente de conta exclusivo",
    ],
    highlight: false,
    cta: "Falar com Consultor",
  },
];

const PricingSection = () => {
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const discount = billing === "annual" ? 0.8 : 1;

  return (
    <section id="planos" className="py-32 bg-muted/30 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          className="mb-16 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <span className="mb-4 inline-block rounded-full bg-accent/10 px-5 py-2 text-xs font-semibold uppercase tracking-widest text-accent-foreground">
            Planos & Preços
          </span>
          <h2 className="mt-4 text-4xl font-semibold md:text-5xl font-display">
            Escolha o plano ideal para seu escritório
          </h2>
          <p className="mx-auto mt-5 max-w-lg text-lg text-muted-foreground">
            Usuários adicionais: R$49,90/mês por usuário.
          </p>

          {/* Billing toggle */}
          <div className="mt-8 inline-flex items-center gap-3 rounded-full bg-background border border-border p-1.5 shadow-sm">
            <button
              onClick={() => setBilling("monthly")}
              className={cn(
                "rounded-full px-5 py-2 text-sm font-medium transition-all",
                billing === "monthly"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Mensal
            </button>
            <button
              onClick={() => setBilling("annual")}
              className={cn(
                "rounded-full px-5 py-2 text-sm font-medium transition-all relative",
                billing === "annual"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Anual
              <span className="absolute -top-2 -right-2 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-accent-foreground">
                -20%
              </span>
            </button>
          </div>
        </motion.div>

        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-3">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.12 }}
              className={cn(
                "relative flex flex-col rounded-2xl border p-8 transition-all duration-300",
                plan.highlight
                  ? "border-accent bg-primary text-primary-foreground shadow-2xl shadow-primary/20 lg:scale-105 lg:-my-4"
                  : "border-border bg-card hover:border-accent/30 hover:shadow-lg"
              )}
            >
              {plan.highlight && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-5 py-1.5 text-xs font-bold text-accent-foreground shadow-lg shadow-accent/30">
                    <Star className="h-3 w-3" /> Mais Popular
                  </span>
                </div>
              )}

              <div className="mb-6">
                <div className={cn(
                  "mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl",
                  plan.highlight ? "bg-primary-foreground/10" : "bg-accent/10"
                )}>
                  <plan.icon className={cn(
                    "h-6 w-6",
                    plan.highlight ? "text-accent" : "text-accent"
                  )} />
                </div>
                <h3 className="text-xl font-semibold font-display">{plan.name}</h3>
                <p className={cn(
                  "mt-1.5 text-sm leading-relaxed",
                  plan.highlight ? "text-primary-foreground/60" : "text-muted-foreground"
                )}>
                  {plan.description}
                </p>
              </div>

              <div className="mb-6 flex items-baseline gap-1">
                <span className={cn("text-sm", plan.highlight ? "text-primary-foreground/60" : "text-muted-foreground")}>R$</span>
                <span className="text-5xl font-bold font-display">
                  {Math.round(Number(plan.price) * discount)}
                </span>
                <span className={cn("text-sm", plan.highlight ? "text-primary-foreground/60" : "text-muted-foreground")}>/mês</span>
              </div>

              {billing === "annual" && (
                <p className={cn(
                  "mb-4 -mt-3 text-xs",
                  plan.highlight ? "text-accent" : "text-accent"
                )}>
                  R${Math.round(Number(plan.price) * discount * 12)}/ano · Economia de R${Math.round(Number(plan.price) * 12 * 0.2)}/ano
                </p>
              )}

              <Button
                variant={plan.highlight ? "secondary" : "default"}
                className={cn(
                  "w-full rounded-full gap-2 font-medium",
                  plan.highlight ? "bg-accent text-accent-foreground hover:bg-accent/90" : ""
                )}
                size="lg"
                asChild
              >
                <Link href="/auth">
                  {plan.cta}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>

              <div className="mt-8 flex-1">
                <p className={cn(
                  "mb-4 text-xs font-semibold uppercase tracking-wider",
                  plan.highlight ? "text-primary-foreground/40" : "text-muted-foreground"
                )}>
                  O que está incluído
                </p>
                <ul className="space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-3 text-sm">
                      <Check
                        className={cn(
                          "mt-0.5 h-4 w-4 shrink-0",
                          plan.highlight ? "text-accent" : "text-accent"
                        )}
                        strokeWidth={2.5}
                      />
                      <span className={plan.highlight ? "text-primary-foreground/80" : "text-muted-foreground"}>
                        {f}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
