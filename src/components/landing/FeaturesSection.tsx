import { motion } from "framer-motion";
import { Scale, Calendar, Calculator, BarChart3, Brain, Shield, ArrowRight, Timer, FileEdit, Users } from "lucide-react";

const features = [
  {
    icon: Scale,
    title: "Gestão de Processos",
    description: "Cadastro completo com campos jurídicos, alertas de prazos, Kanban e integração com tribunais.",
    gradient: "from-blue-500/10 to-indigo-500/10",
    iconColor: "text-blue-600",
  },
  {
    icon: Calendar,
    title: "Agenda Inteligente",
    description: "Sincronização com   Google Calendar, conflitos automáticos, lembretes e filtros por categoria.",
    gradient: "from-violet-500/10 to-purple-500/10",
    iconColor: "text-violet-600",
  },
  {
    icon: Timer,
    title: "Timesheet & Controle",
    description: "Timer integrado, controle de horas por processo, status de faturamento e relatórios de produtividade.",
    gradient: "from-amber-500/10 to-orange-500/10",
    iconColor: "text-amber-600",
  },
  {
    icon: BarChart3,
    title: "Financeiro Completo",
    description: "Contas a pagar/receber, fluxo de caixa, orçamentos, DRE e relatórios com gráficos interativos.",
    gradient: "from-emerald-500/10 to-green-500/10",
    iconColor: "text-emerald-600",
  },
  {
    icon: Brain,
    title: "ARUNA — IA Jurídica",
    description: "Geração de minutas, pesquisa de jurisprudência, análise de documentos e resumos inteligentes.",
    gradient: "from-rose-500/10 to-pink-500/10",
    iconColor: "text-rose-600",
  },
  {
    icon: Shield,
    title: "LGPD & Segurança",
    description: "Criptografia ponta a ponta, RLS por organização, logs de auditoria e controle de acesso por roles.",
    gradient: "from-cyan-500/10 to-teal-500/10",
    iconColor: "text-cyan-600",
  },
  {
    icon: Users,
    title: "CRM Jurídico",
    description: "Pipeline de vendas, gestão de contatos, acompanhamento de deals e atividades com sua equipe.",
    gradient: "from-sky-500/10 to-blue-500/10",
    iconColor: "text-sky-600",
  },
  {
    icon: FileEdit,
    title: "Minutas & Contratos",
    description: "Biblioteca de modelos, editor integrado, favoritos e organização por categoria e tipo de peça.",
    gradient: "from-fuchsia-500/10 to-purple-500/10",
    iconColor: "text-fuchsia-600",
  },
  {
    icon: Calculator,
    title: "Calculadora Jurídica",
    description: "Trabalhista, previdenciário, cível, bancário e tributário com correção monetária atualizada.",
    gradient: "from-lime-500/10 to-emerald-500/10",
    iconColor: "text-lime-600",
  },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

const FeaturesSection = () => (
  <section id="funcionalidades" className="py-32 relative overflow-hidden">
    {/* Decorative bg */}
    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-accent/[0.03] rounded-full blur-[120px]" />
    <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-primary/[0.03] rounded-full blur-[100px]" />

    <div className="container mx-auto px-4 relative z-10">
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
          Tudo que seu escritório <br className="hidden md:block" />
          <span className="text-gradient-premium">precisa</span>
        </h2>
        <p className="mt-5 text-lg text-muted-foreground">
          Módulos integrados que simplificam a rotina jurídica do início ao fim.
        </p>
      </motion.div>

      <motion.div
        className="grid gap-5 md:grid-cols-2 lg:grid-cols-3"
        variants={container}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-100px" }}
      >
        {features.map((feat) => (
          <motion.div
            key={feat.title}
            variants={item}
            className="group relative rounded-2xl border border-border/50 bg-card p-7 transition-all duration-500 hover:border-accent/30 hover:shadow-xl hover:shadow-accent/5 hover:-translate-y-1"
          >
            <div className={`mb-5 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${feat.gradient} transition-all duration-300 group-hover:scale-110`}>
              <feat.icon className={`h-5 w-5 ${feat.iconColor}`} strokeWidth={1.5} />
            </div>
            <h3 className="mb-2 text-base font-semibold">{feat.title}</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">{feat.description}</p>
            <ArrowRight className="mt-4 h-4 w-4 text-muted-foreground/20 transition-all duration-300 group-hover:translate-x-2 group-hover:text-accent" />
          </motion.div>
        ))}
      </motion.div>
    </div>
  </section>
);

export default FeaturesSection;
