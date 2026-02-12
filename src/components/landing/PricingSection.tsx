import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

const plans = [
  {
    name: "Básico",
    price: "120",
    description: "Para advogados autônomos",
    features: [
      "Gestão de até 50 processos",
      "Agenda integrada",
      "Calculadora jurídica",
      "ARUNA — 50 consultas/mês",
      "1 usuário incluso",
    ],
    highlight: false,
  },
  {
    name: "PRO",
    price: "390",
    description: "Para escritórios em crescimento",
    features: [
      "Processos ilimitados",
      "Integração com tribunais",
      "Financeiro completo",
      "ARUNA — ilimitado",
      "CRM jurídico",
      "3 usuários inclusos",
      "Relatórios avançados",
    ],
    highlight: true,
  },
  {
    name: "Business",
    price: "600",
    description: "Para escritórios de grande porte",
    features: [
      "Tudo do PRO",
      "BI completo e dashboards",
      "Suporte prioritário",
      "API aberta",
      "5 usuários inclusos",
      "Treinamento dedicado",
      "SLA garantido",
    ],
    highlight: false,
  },
];

const PricingSection = () => (
  <section id="planos" className="py-24">
    <div className="container mx-auto px-4">
      <div className="mb-16 text-center">
        <span className="mb-3 inline-block text-sm font-medium uppercase tracking-wider text-accent">
          Planos
        </span>
        <h2 className="text-3xl font-bold md:text-5xl">
          Escolha o plano ideal
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
          Todos os planos incluem 7 dias grátis. Usuários adicionais: R$49,90/mês.
        </p>
      </div>
      <div className="grid gap-8 md:grid-cols-3">
        {plans.map((plan, i) => (
          <motion.div
            key={plan.name}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.15 }}
            className={`relative rounded-2xl border p-8 ${
              plan.highlight
                ? "border-accent glow-gold bg-gradient-card"
                : "border-border bg-card"
            }`}
          >
            {plan.highlight && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent px-4 py-1 text-xs font-semibold text-accent-foreground">
                Mais Popular
              </span>
            )}
            <h3 className="text-xl font-bold font-display">{plan.name}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
            <div className="mt-6 flex items-baseline gap-1">
              <span className="text-sm text-muted-foreground">R$</span>
              <span className="text-4xl font-bold text-gradient-gold">{plan.price}</span>
              <span className="text-sm text-muted-foreground">/mês</span>
            </div>
            <Button
              variant={plan.highlight ? "hero" : "heroOutline"}
              className="mt-8 w-full"
            >
              Começar Teste Grátis
            </Button>
            <ul className="mt-8 space-y-3">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-3 text-sm">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                  <span className="text-muted-foreground">{f}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default PricingSection;
