import { motion } from "framer-motion";
import { MessageSquare, FileText, Mic, Sparkles } from "lucide-react";
import iconLexa from "@/assets/icon-lexa.png";

const capabilities = [
  { icon: MessageSquare, text: "Resuma o processo 12345" },
  { icon: FileText, text: "Gere uma contestação trabalhista" },
  { icon: Mic, text: "Quais prazos vencem amanhã?" },
  { icon: Sparkles, text: "Qual cliente mais faturou?" },
];

const ArunaSection = () => (
  <section id="aruna" className="relative overflow-hidden py-24">
    <div className="absolute inset-0 bg-gradient-hero opacity-50" />
    <div className="container relative z-10 mx-auto px-4">
      <div className="grid items-center gap-16 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <span className="mb-3 inline-block text-sm font-medium uppercase tracking-wider text-accent">
            Inteligência Artificial
          </span>
          <h2 className="text-3xl font-bold md:text-5xl">
            Conheça a <span className="text-gradient-gold">ARUNA</span>
          </h2>
          <p className="mt-4 max-w-lg text-lg text-muted-foreground">
            Sua assistente jurídica com IA integrada ao escritório. Ela entende
            seus processos, finanças e prazos — e responde em segundos.
          </p>
          <div className="mt-8 space-y-4">
            {capabilities.map((cap) => (
              <div key={cap.text} className="flex items-center gap-3 rounded-lg border border-border bg-card/50 p-4 transition-colors hover:border-accent/30">
                <cap.icon className="h-5 w-5 shrink-0 text-accent" />
                <span className="text-sm text-foreground">"{cap.text}"</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex items-center justify-center"
        >
          <div className="relative">
            <div className="absolute -inset-4 animate-pulse-glow rounded-full bg-accent/20 blur-3xl" />
            <div className="relative flex h-64 w-64 items-center justify-center rounded-full border-2 border-accent/30 bg-card glow-gold">
              <img src={iconLexa} alt="ARUNA" className="h-28 w-28 animate-float" />
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  </section>
);

export default ArunaSection;
