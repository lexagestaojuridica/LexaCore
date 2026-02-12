import { motion } from "framer-motion";
import { Scale, Calendar, Calculator, BarChart3, Brain, Shield } from "lucide-react";

const features = [
  {
    icon: Scale,
    title: "Gestão de Processos",
    description: "Cadastro completo, linha do tempo visual, alertas de prazos e integração com tribunais.",
  },
  {
    icon: Calendar,
    title: "Agenda Inteligente",
    description: "Sincronização com Google Calendar e Outlook, conflitos automáticos e notificações.",
  },
  {
    icon: Calculator,
    title: "Calculadora Jurídica",
    description: "Trabalhista, previdenciário, cível, bancário e tributário com geração de PDF.",
  },
  {
    icon: BarChart3,
    title: "Financeiro Completo",
    description: "Contas a pagar/receber, fluxo de caixa, DRE, balancetes e relatórios.",
  },
  {
    icon: Brain,
    title: "ARUNA — IA Jurídica",
    description: "Assistente inteligente para minutas, pesquisa de jurisprudência e análise de dados.",
  },
  {
    icon: Shield,
    title: "LGPD Compliant",
    description: "Criptografia, logs de auditoria, consentimento e direito ao esquecimento.",
  },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const FeaturesSection = () => (
  <section id="funcionalidades" className="relative py-24">
    <div className="container mx-auto px-4">
      <div className="mb-16 text-center">
        <span className="mb-3 inline-block text-sm font-medium uppercase tracking-wider text-accent">
          Funcionalidades
        </span>
        <h2 className="text-3xl font-bold md:text-5xl">
          Tudo que seu escritório precisa
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
          Módulos integrados que simplificam a rotina jurídica do início ao fim.
        </p>
      </div>
      <motion.div
        className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
        variants={container}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-100px" }}
      >
        {features.map((feat) => (
          <motion.div
            key={feat.title}
            variants={item}
            className="group rounded-xl border border-border bg-gradient-card p-8 transition-all duration-300 hover:border-accent/30 hover:glow-gold"
          >
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10 text-accent transition-colors group-hover:bg-accent/20">
              <feat.icon className="h-6 w-6" />
            </div>
            <h3 className="mb-2 text-xl font-semibold font-display">{feat.title}</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">{feat.description}</p>
          </motion.div>
        ))}
      </motion.div>
    </div>
  </section>
);

export default FeaturesSection;
