import { motion } from "framer-motion";
import { Scale, Calendar, Calculator, BarChart3, Brain, Shield, ArrowRight } from "lucide-react";

const features = [
  {
    icon: Scale,
    title: "Gestão de Processos",
    description: "Cadastro completo, alertas de prazos e integração com tribunais.",
  },
  {
    icon: Calendar,
    title: "Agenda Inteligente",
    description: "Sincronização com calendários, conflitos automáticos e notificações.",
  },
  {
    icon: Calculator,
    title: "Calculadora Jurídica",
    description: "Trabalhista, previdenciário, cível, bancário e tributário.",
  },
  {
    icon: BarChart3,
    title: "Financeiro Completo",
    description: "Contas a pagar/receber, fluxo de caixa, DRE e relatórios.",
  },
  {
    icon: Brain,
    title: "ARUNA — IA Jurídica",
    description: "Minutas, pesquisa de jurisprudência e análise inteligente.",
  },
  {
    icon: Shield,
    title: "LGPD Compliant",
    description: "Criptografia, logs de auditoria e consentimento integrado.",
  },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const item = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const FeaturesSection = () => (
  <section id="funcionalidades" className="py-32">
    <div className="container mx-auto px-4">
      <motion.div
        className="mb-20 max-w-xl"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <span className="mb-4 inline-block rounded-full bg-accent/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-accent-foreground">
          Funcionalidades
        </span>
        <h2 className="text-4xl font-semibold md:text-5xl">
          Tudo que seu escritório precisa
        </h2>
        <p className="mt-5 text-lg text-muted-foreground">
          Módulos integrados que simplificam a rotina jurídica do início ao fim.
        </p>
      </motion.div>

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
            className="group relative rounded-2xl border border-border bg-card p-8 transition-all duration-500 hover:border-accent/40 hover:shadow-xl hover:shadow-accent/5"
          >
            <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/5 text-primary transition-colors group-hover:bg-accent/10 group-hover:text-accent-foreground">
              <feat.icon className="h-6 w-6" strokeWidth={1.5} />
            </div>
            <h3 className="mb-2 text-lg font-semibold font-display">{feat.title}</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">{feat.description}</p>
            <ArrowRight className="mt-4 h-4 w-4 text-muted-foreground/30 transition-all group-hover:translate-x-1 group-hover:text-accent" />
          </motion.div>
        ))}
      </motion.div>
    </div>
  </section>
);

export default FeaturesSection;
