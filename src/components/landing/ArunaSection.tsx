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
  <section id="aruna" className="relative py-32">
    <div className="container relative z-10 mx-auto px-4">
      <div className="grid items-center gap-20 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <span className="mb-4 inline-block text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Inteligência Artificial
          </span>
          <h2 className="text-3xl font-normal md:text-5xl">
            Conheça a <span className="text-gradient-navy">ARUNA</span>
          </h2>
          <p className="mt-5 max-w-lg text-lg leading-relaxed text-muted-foreground">
            Sua assistente jurídica com IA integrada ao escritório. Ela entende
            seus processos, finanças e prazos — e responde em segundos.
          </p>
          <div className="mt-10 space-y-3">
            {capabilities.map((cap) => (
              <div key={cap.text} className="flex items-center gap-4 p-4 transition-colors hover:bg-secondary/50">
                <cap.icon className="h-5 w-5 shrink-0 text-primary" strokeWidth={1.5} />
                <span className="text-sm">"{cap.text}"</span>
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
          <div className="relative flex h-72 w-72 items-center justify-center rounded-full bg-secondary">
            <img src={iconLexa} alt="ARUNA" className="h-28 w-28" />
          </div>
        </motion.div>
      </div>
    </div>
  </section>
);

export default ArunaSection;
