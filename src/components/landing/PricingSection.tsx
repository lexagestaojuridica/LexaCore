import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check, Star } from "lucide-react";

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
  <section id="planos" className="py-32 bg-muted/30">
    <div className="container mx-auto px-4">
      <motion.div
        className="mb-20 text-center"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <span className="mb-4 inline-block rounded-full bg-accent/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-accent-foreground">
          Planos
        </span>
        <h2 className="text-4xl font-semibold md:text-5xl">
          Escolha o plano ideal
        </h2>
        <p className="mx-auto mt-5 max-w-lg text-lg text-muted-foreground">
          Todos os planos incluem 7 dias grátis. Usuários adicionais: R$49,90/mês.
        </p>
      </motion.div>

      <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
        {plans.map((plan, i) => (
          <motion.div
            key={plan.name}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
            className={`relative rounded-2xl border p-8 ${
              plan.highlight
                ? "border-accent bg-primary text-primary-foreground shadow-2xl shadow-primary/20 scale-[1.02]"
                : "border-border bg-card"
            }`}
          >
            {plan.highlight && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-1 text-xs font-semibold text-accent-foreground">
                  <Star className="h-3 w-3" /> Mais Popular
                </span>
              </div>
            )}
            <h3 className="text-xl font-semibold font-display">{plan.name}</h3>
            <p className={`mt-1 text-sm ${plan.highlight ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
              {plan.description}
            </p>
            <div className="mt-6 flex items-baseline gap-1">
              <span className={`text-sm ${plan.highlight ? "text-primary-foreground/60" : "text-muted-foreground"}`}>R$</span>
              <span className="text-5xl font-bold font-display">{plan.price}</span>
              <span className={`text-sm ${plan.highlight ? "text-primary-foreground/60" : "text-muted-foreground"}`}>/mês</span>
            </div>
            <Button
              variant={plan.highlight ? "secondary" : "default"}
              className={`mt-8 w-full rounded-full ${plan.highlight ? "" : ""}`}
            >
              Começar Teste Grátis
            </Button>
            <ul className="mt-8 space-y-3">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-3 text-sm">
                  <Check className={`mt-0.5 h-4 w-4 shrink-0 ${plan.highlight ? "text-accent" : "text-accent"}`} strokeWidth={2} />
                  <span className={plan.highlight ? "text-primary-foreground/80" : "text-muted-foreground"}>{f}</span>
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
