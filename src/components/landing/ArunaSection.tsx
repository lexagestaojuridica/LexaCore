import { motion } from "framer-motion";
import { MessageSquare, FileText, Mic, Sparkles } from "lucide-react";
import arunaAvatar from "@/assets/aruna-avatar.png";
import patternNavy from "@/assets/pattern-navy.jpg";

const capabilities = [
  { icon: MessageSquare, text: "Resuma o processo 12345" },
  { icon: FileText, text: "Gere uma contestação trabalhista" },
  { icon: Mic, text: "Quais prazos vencem amanhã?" },
  { icon: Sparkles, text: "Qual cliente mais faturou?" },
];

const ArunaSection = () => (
  <section id="aruna" className="relative overflow-hidden py-32">
    {/* Background */}
    <div className="absolute inset-0">
      <img src={patternNavy} alt="" className="h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-navy/90" />
    </div>

    <div className="container relative z-10 mx-auto px-4">
      <div className="grid items-center gap-16 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <span className="mb-4 inline-block rounded-full border border-primary-foreground/20 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-primary-foreground/70">
            Inteligência Artificial
          </span>
          <h2 className="text-4xl font-semibold text-primary-foreground md:text-5xl">
            Conheça a <span className="text-gradient-gold">ARUNA</span>
          </h2>
          <p className="mt-5 max-w-lg text-lg leading-relaxed text-primary-foreground/70">
            Sua assistente jurídica com IA integrada ao escritório. Ela entende
            seus processos, finanças e prazos — e responde em segundos.
          </p>
          <div className="mt-10 space-y-2">
            {capabilities.map((cap) => (
              <div
                key={cap.text}
                className="flex items-center gap-4 rounded-xl border border-primary-foreground/10 p-4 transition-all duration-300 hover:border-primary-foreground/20 hover:bg-primary-foreground/5 hover:translate-x-1"
              >
                <cap.icon className="h-5 w-5 shrink-0 text-accent" strokeWidth={1.5} />
                <span className="text-sm text-primary-foreground/80">"{cap.text}"</span>
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
            <div className="absolute -inset-8 rounded-full bg-accent/10 blur-3xl animate-pulse-glow" />
            <div className="relative flex h-80 w-80 items-center justify-center rounded-full border border-primary-foreground/10 bg-primary-foreground/5 overflow-hidden">
              <img src={arunaAvatar} alt="ARUNA — Assistente Virtual" className="h-56 w-56 object-contain drop-shadow-2xl" />
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  </section>
);

export default ArunaSection;
