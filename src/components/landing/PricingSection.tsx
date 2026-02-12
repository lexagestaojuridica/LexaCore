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
  <section id="planos" className="py-32 bg-secondary/30">
    <div className="container mx-auto px-4">
      <div className="mb-20 text-center">
        <span className="mb-4 inline-block text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Planos
        </span>
        <h2 className="text-3xl font-normal md:text-5xl">
          Escolha o plano ideal
        </h2>
        <p className="mx-auto mt-5 max-w-lg text-muted-foreground">
          Todos os planos incluem 7 dias grátis. Usuários adicionais: R$49,90/mês.
        </p>
      </div>
      <div className="grid gap-px bg-border md:grid-cols-3">
        {plans.map((plan, i) => (
          <motion.div
            key={plan.name}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
            className={`relative bg-background p-10 ${
              plan.highlight ? "bg-primary text-primary-foreground" : ""
            }`}
          >
            {plan.highlight && (
              <span className="absolute top-0 left-0 right-0 h-[2px] bg-cream" />
            )}
            <h3 className="text-xl font-normal font-display">{plan.name}</h3>
            <p className={`mt-1 text-sm ${plan.highlight ? "text-primary-foreground/60" : "text-muted-foreground"}`}>{plan.description}</p>
            <div className="mt-8 flex items-baseline gap-1">
              <span className={`text-sm ${plan.highlight ? "text-primary-foreground/60" : "text-muted-foreground"}`}>R$</span>
              <span className="text-5xl font-display">{plan.price}</span>
              <span className={`text-sm ${plan.highlight ? "text-primary-foreground/60" : "text-muted-foreground"}`}>/mês</span>
            </div>
            <Button
              variant={plan.highlight ? "heroOutline" : "hero"}
              className={`mt-10 w-full ${plan.highlight ? "border-primary-foreground text-primary-foreground hover:bg-primary-foreground/10 after:bg-primary-foreground" : ""}`}
            >
              Começar Teste Grátis
            </Button>
            <ul className="mt-10 space-y-4">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-3 text-sm">
                  <Check className={`mt-0.5 h-4 w-4 shrink-0 ${plan.highlight ? "text-primary-foreground/60" : "text-primary"}`} strokeWidth={1.5} />
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
