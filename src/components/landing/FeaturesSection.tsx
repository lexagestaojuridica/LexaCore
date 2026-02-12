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
  show: { transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const FeaturesSection = () => (
  <section id="funcionalidades" className="relative py-32 bg-secondary/30">
    <div className="container mx-auto px-4">
      <div className="mb-20 text-center">
        <span className="mb-4 inline-block text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Funcionalidades
        </span>
        <h2 className="text-3xl font-normal md:text-5xl">
          Tudo que seu escritório precisa
        </h2>
        <p className="mx-auto mt-5 max-w-lg text-muted-foreground">
          Módulos integrados que simplificam a rotina jurídica do início ao fim.
        </p>
      </div>
      <motion.div
        className="grid gap-px bg-border md:grid-cols-2 lg:grid-cols-3"
        variants={container}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-100px" }}
      >
        {features.map((feat) => (
          <motion.div
            key={feat.title}
            variants={item}
            className="group relative bg-background p-10 transition-all duration-500 hover:bg-primary hover:text-primary-foreground cursor-pointer"
          >
            <div className="mb-6 inline-flex h-12 w-12 items-center justify-center text-primary transition-colors duration-500 group-hover:text-primary-foreground">
              <feat.icon className="h-6 w-6" strokeWidth={1.5} />
            </div>
            <h3 className="mb-3 text-xl font-normal font-display transition-colors duration-500">{feat.title}</h3>
            <p className="text-sm leading-relaxed text-muted-foreground transition-colors duration-500 group-hover:text-primary-foreground/70">{feat.description}</p>
            <div className="absolute bottom-0 left-0 h-[2px] w-0 bg-cream transition-all duration-500 group-hover:w-full" />
          </motion.div>
        ))}
      </motion.div>
    </div>
  </section>
);

export default FeaturesSection;
