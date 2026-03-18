import { SignIn, SignUp } from "@clerk/nextjs";
import logoLexaWhite from "@/assets/logo-lexa-white.png";
import logoLexa from "@/assets/logo-lexa.png";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Bot, Zap, Scale, ArrowRight } from "lucide-react";
import { useState } from "react";

const Auth = () => {
  const [mode, setMode] = useState<"login" | "signup">("login");

  const clerkAppearance = {
    elements: {
      rootBox: "w-full",
      card: "shadow-none border-0 bg-transparent w-full !p-0 !m-0",
      cardBox: "shadow-none border-0 bg-transparent w-full !rounded-none",
      main: "bg-transparent shadow-none !gap-5",
      header: "hidden",
      headerTitle: "hidden",
      headerSubtitle: "hidden",
      footer: "hidden",
      footerAction: "hidden",
      footerActionLink: "hidden",
      socialButtonsBlockButton:
        "!rounded-2xl !border-0 !bg-foreground/[0.04] hover:!bg-foreground/[0.08] !text-foreground !transition-all !duration-300 !font-medium !h-[52px] !text-[14px] !shadow-none hover:!shadow-md hover:!shadow-primary/5 hover:!-translate-y-px",
      socialButtonsBlockButtonText: "!font-medium !tracking-wide",
      socialButtonsBlockButtonIcon: "!opacity-90 !w-5 !h-5",
      formButtonPrimary:
        "!bg-gradient-to-r !from-[hsl(222,47%,11%)] !to-[hsl(222,47%,18%)] !text-white hover:!from-[hsl(222,47%,14%)] hover:!to-[hsl(222,47%,22%)] !rounded-2xl !font-semibold !transition-all !duration-300 !shadow-xl !shadow-primary/15 !h-[52px] !text-[14px] !tracking-wide hover:!shadow-2xl hover:!shadow-primary/25 hover:!-translate-y-px",
      formFieldInput:
        "!rounded-2xl !border-0 !bg-foreground/[0.04] focus:!bg-white focus:!ring-2 focus:!ring-primary/15 focus:!shadow-lg focus:!shadow-primary/5 !transition-all !duration-300 !px-5 !h-[52px] !text-[14px] !placeholder:text-muted-foreground/40",
      formFieldLabel:
        "!text-[11px] !font-semibold !text-foreground/50 !mb-2 !uppercase !tracking-[0.18em] !ml-1",
      dividerLine: "!bg-foreground/[0.06] !h-px",
      dividerText:
        "!text-foreground/30 !text-[10px] !uppercase !tracking-[0.3em] !font-semibold !bg-transparent",
      dividerRow: "!my-5",
      formFieldAction:
        "!text-foreground/50 hover:!text-foreground !font-medium !text-xs !transition-all !duration-200",
      identityPreviewText: "!text-foreground !font-medium",
      formHeaderTitle: "hidden",
      formHeaderSubtitle: "hidden",
      otpCodeFieldInput:
        "!bg-foreground/[0.04] !border-0 focus:!ring-2 focus:!ring-primary/20 !rounded-xl",
      internal: "hidden",
      badge: "hidden",
      logoBox: "hidden",
      logoImage: "hidden",
    },
    variables: {
      colorPrimary: "hsl(222, 47%, 11%)",
      colorText: "hsl(222, 47%, 11%)",
      colorBackground: "transparent",
      colorInputBackground: "transparent",
      fontFamily: "'Inter', sans-serif",
      borderRadius: "1rem",
      spacingUnit: "1rem",
    },
  };

  const features = [
    { icon: Shield, title: "Segurança Absoluta", desc: "Criptografia de ponta a ponta" },
    { icon: Bot, title: "IA Jurídica Aruna", desc: "Automatize sua rotina" },
    { icon: Zap, title: "Alta Performance", desc: "Interface ultra-rápida" },
  ];

  return (
    <div className="flex min-h-screen bg-background overflow-hidden relative">
      {/* Subtle ambient background */}
      <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-accent/[0.03] blur-[150px] rounded-full z-0" />
      <div className="absolute bottom-[-10%] left-[20%] w-[400px] h-[400px] bg-primary/[0.02] blur-[120px] rounded-full z-0" />

      {/* Left Column - Premium Visual */}
      <div className="hidden w-[48%] lg:flex relative flex-col overflow-hidden">
        {/* Dark gradient base */}
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(222,47%,8%)] via-[hsl(222,47%,11%)] to-[hsl(222,40%,15%)]" />
        
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
          backgroundSize: '40px 40px',
        }} />

        {/* Accent glow */}
        <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-[hsl(34,30%,72%)]/[0.06] to-transparent" />
        <div className="absolute top-1/4 right-0 w-1/2 h-1/2 bg-[hsl(34,30%,72%)]/[0.04] blur-[100px] rounded-full" />

        <div className="relative z-20 flex flex-col h-full px-14 xl:px-20 py-12">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Image src={logoLexaWhite} alt="LEXA" width={140} height={50} className="h-11 w-auto" />
          </motion.div>

          {/* Main content */}
          <div className="mt-auto mb-20 max-w-md">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.8 }}
              className="flex items-center gap-2 mb-6"
            >
              <div className="h-px w-8 bg-[hsl(34,30%,72%)]/60" />
              <span className="text-[hsl(34,30%,72%)]/80 text-[11px] font-semibold uppercase tracking-[0.3em]">
                Software Jurídico
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="text-[2.8rem] xl:text-[3.4rem] font-bold text-white leading-[1.08] tracking-[-0.02em]"
            >
              A tecnologia que
              <br />
              <span className="bg-gradient-to-r from-[hsl(34,30%,72%)] to-[hsl(34,40%,80%)] bg-clip-text text-transparent">
                sua advocacia
              </span>
              <br />
              merece.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.6 }}
              className="text-white/40 text-base leading-relaxed mt-6 max-w-sm"
            >
              Gerencie processos, automatize tarefas e tome decisões com inteligência artificial.
            </motion.p>

            {/* Feature pills */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="flex flex-wrap gap-3 mt-10"
            >
              {features.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.6 + i * 0.08 }}
                  className="flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-white/[0.06] border border-white/[0.08] backdrop-blur-sm hover:bg-white/[0.1] hover:border-white/[0.15] transition-all duration-300 cursor-default group"
                >
                  <item.icon className="h-3.5 w-3.5 text-[hsl(34,30%,72%)]/80 group-hover:text-[hsl(34,30%,72%)] transition-colors" />
                  <span className="text-white/70 text-xs font-medium group-hover:text-white/90 transition-colors">{item.title}</span>
                </motion.div>
              ))}
            </motion.div>
          </div>

          {/* Bottom trust bar */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="flex items-center gap-3 text-white/25 text-[10px] font-medium tracking-wider uppercase"
          >
            <Scale className="h-3.5 w-3.5" />
            <span>Compliance LGPD</span>
            <span className="text-white/10">•</span>
            <span>Criptografia AES-256</span>
            <span className="text-white/10">•</span>
            <span>99.9% Uptime</span>
          </motion.div>
        </div>
      </div>

      {/* Right Column - Auth Form */}
      <div className="flex-1 flex flex-col items-center justify-center relative p-6 md:p-12 z-10">
        <div className="w-full max-w-[440px]">
          {/* Mobile logo */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-10 block lg:hidden text-center"
          >
            <Image src={logoLexa} alt="LEXA" width={120} height={44} className="mx-auto h-10 w-auto" />
          </motion.div>

          {/* Tab switcher */}
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex justify-center mb-10"
          >
            <div className="inline-flex p-1 rounded-2xl bg-foreground/[0.04] border border-foreground/[0.06]">
              {(["login", "signup"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setMode(tab)}
                  className={`relative px-8 py-2.5 rounded-xl text-[11px] font-semibold tracking-[0.2em] uppercase transition-all duration-300 ${
                    mode === tab
                      ? "text-foreground"
                      : "text-foreground/35 hover:text-foreground/60"
                  }`}
                >
                  {mode === tab && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 bg-white rounded-xl shadow-lg shadow-primary/[0.08] border border-foreground/[0.06]"
                      transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                    />
                  )}
                  <span className="relative z-10">
                    {tab === "login" ? "Entrar" : "Criar conta"}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>

          {/* Heading */}
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="text-center mb-8"
          >
            <h2 className="text-[1.75rem] font-bold tracking-[-0.02em] text-foreground">
              {mode === "login" ? "Bem-vindo de volta" : "Crie sua conta"}
            </h2>
            <p className="text-foreground/40 mt-2 text-sm font-normal">
              {mode === "login"
                ? "Acesse sua conta para continuar."
                : "Comece a usar o Lexa gratuitamente."}
            </p>
          </motion.div>

          {/* Clerk form */}
          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
            >
              {mode === "login" ? (
                <SignIn
                  routing="path"
                  path="/auth"
                  appearance={clerkAppearance}
                  fallbackRedirectUrl="/dashboard"
                />
              ) : (
                <SignUp
                  routing="path"
                  path="/auth"
                  appearance={clerkAppearance}
                  fallbackRedirectUrl="/dashboard"
                />
              )}
            </motion.div>
          </AnimatePresence>

          {/* Footer */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-center mt-12 text-[11px] text-foreground/25 leading-relaxed max-w-[320px] mx-auto"
          >
            Ao continuar, você aceita nossos{" "}
            <a href="#" className="text-foreground/40 hover:text-foreground/60 underline underline-offset-2 transition-colors">
              Termos de Uso
            </a>{" "}
            e{" "}
            <a href="#" className="text-foreground/40 hover:text-foreground/60 underline underline-offset-2 transition-colors">
              Política de Privacidade
            </a>
            .
          </motion.p>
        </div>
      </div>
    </div>
  );
};

export default Auth;