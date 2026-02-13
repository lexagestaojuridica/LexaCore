import { motion } from "framer-motion";
import { MessageSquare, FileText, Mic, Sparkles } from "lucide-react";
import arunaAvatar from "@/assets/aruna-avatar.png";
import arunaBg from "@/assets/aruna-section-bg.jpg";

const capabilities = [
  { icon: MessageSquare, text: "Resuma o processo 12345" },
  { icon: FileText, text: "Gere uma contestação trabalhista" },
  { icon: Mic, text: "Quais prazos vencem amanhã?" },
  { icon: Sparkles, text: "Qual cliente mais faturou?" },
];

const ArunaSection = () => (
  <section id="aruna" className="relative overflow-hidden py-32">
    {/* Background image */}
    <div className="absolute inset-0">
      <img src={arunaBg} alt="" className="h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/80 to-background/40" />
    </div>

    <div className="container relative z-10 mx-auto px-4">
      <div className="grid items-center gap-16 lg:grid-cols-2">
        {/* Text content */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <span className="mb-4 inline-block rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-primary">
            Inteligência Artificial
          </span>
          <h2 className="text-4xl font-semibold text-foreground md:text-5xl">
            Conheça a <span className="text-gradient-gold">ARUNA</span>
          </h2>
          <p className="mt-5 max-w-lg text-lg leading-relaxed text-muted-foreground">
            Sua assistente jurídica com IA integrada ao escritório. Ela entende
            seus processos, finanças e prazos — e responde em segundos.
          </p>
          <div className="mt-10 space-y-2">
            {capabilities.map((cap, i) => (
              <motion.div
                key={cap.text}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="flex items-center gap-4 rounded-xl border border-border/60 bg-card/80 backdrop-blur-sm p-4 transition-all duration-300 hover:border-accent/40 hover:bg-card hover:translate-x-1 hover:shadow-md"
              >
                <cap.icon className="h-5 w-5 shrink-0 text-accent" strokeWidth={1.5} />
                <span className="text-sm text-foreground/80">"{cap.text}"</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* ARUNA character — no circle, no background */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="flex items-end justify-center"
        >
          <img
            src={arunaAvatar}
            alt="ARUNA — Assistente Virtual"
            className="h-[28rem] w-auto object-contain drop-shadow-2xl"
          />
        </motion.div>
      </div>
    </div>
  </section>
);

export default ArunaSection;
