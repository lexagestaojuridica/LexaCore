'use client';

import { motion } from "framer-motion";
import { MessageSquare, FileText, Mic, Sparkles } from "lucide-react";
import Image from "next/image";
import arunaAvatar from "@/assets/aruna-avatar.png";

const capabilities = [
  { icon: MessageSquare, text: "Resuma o processo 12345" },
  { icon: FileText, text: "Gere uma contestação trabalhista" },
  { icon: Mic, text: "Quais prazos vencem amanhã?" },
  { icon: Sparkles, text: "Qual cliente mais faturou?" },
];

const ArunaSection = () => (
  <section id="aruna" className="relative overflow-hidden py-32 bg-gradient-navy">
    {/* Floating particles */}
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute h-1.5 w-1.5 rounded-full bg-accent/20"
          style={{ left: `${15 + i * 15}%`, top: `${20 + (i % 3) * 25}%` }}
          animate={{ y: [0, -20, 0], opacity: [0.2, 0.5, 0.2] }}
          transition={{ duration: 3 + i * 0.5, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
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
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="mb-4 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-accent"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Inteligência Artificial
          </motion.span>
          <h2 className="text-4xl font-semibold text-primary-foreground md:text-5xl lg:text-6xl">
            Conheça a <span className="text-gradient-gold">ARUNA</span>
          </h2>
          <p className="mt-5 max-w-lg text-lg leading-relaxed text-primary-foreground/60">
            Sua assistente jurídica com IA integrada ao escritório. Ela entende
            seus processos, finanças e prazos — e responde em segundos.
          </p>

          {/* Capability cards */}
          <div className="mt-10 space-y-3">
            {capabilities.map((cap, i) => (
              <motion.div
                key={cap.text}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.2 + i * 0.12 }}
                whileHover={{ x: 6, scale: 1.01 }}
                className="group flex items-center gap-4 rounded-xl border border-primary-foreground/10 bg-primary-foreground/5 backdrop-blur-md p-4 transition-all duration-300 hover:border-accent/30 hover:bg-primary-foreground/10 cursor-default"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 transition-colors group-hover:bg-accent/20">
                  <cap.icon className="h-4.5 w-4.5 text-accent" strokeWidth={1.5} />
                </div>
                <span className="text-sm font-medium text-primary-foreground/70 group-hover:text-primary-foreground transition-colors">
                  "{cap.text}"
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* ARUNA character — transparent background */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative flex items-end justify-center"
        >
          {/* Subtle radial glow behind ARUNA */}
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 h-80 w-80 rounded-full bg-accent/8 blur-[80px]" />

          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="relative"
          >
            <Image
              src={arunaAvatar}
              alt="ARUNA — Assistente Virtual"
              width={500}
              height={500}
              className="h-[32rem] w-auto object-contain drop-shadow-2xl"
              priority
            />
          </motion.div>
        </motion.div>
      </div>
    </div>
  </section>
);

export default ArunaSection;
