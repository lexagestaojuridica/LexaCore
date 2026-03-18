import { SignIn, SignUp } from "@clerk/nextjs";
import logoLexaWhite from "@/assets/logo-lexa-white.png";
import logoLexa from "@/assets/logo-lexa.png";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Bot, Zap } from "lucide-react";
import { useState } from "react";

const Auth = () => {
  const [mode, setMode] = useState<"login" | "signup">("login");

  const clerkAppearance = {
    elements: {
      rootBox: "w-full",
      card: "shadow-none border-0 bg-transparent w-full !p-0 !m-0",
      cardBox: "shadow-none border-0 bg-transparent w-full !rounded-none",
      main: "bg-transparent shadow-none !gap-4",
      header: "hidden",
      headerTitle: "hidden",
      headerSubtitle: "hidden",
      footer: "hidden",
      footerAction: "hidden",
      footerActionLink: "hidden",
      socialButtonsBlockButton:
        "!rounded-xl !border !border-border/60 !bg-muted/40 hover:!bg-muted/70 !text-foreground !transition-all !font-semibold !h-12 !text-sm",
      socialButtonsBlockButtonText: "!font-semibold",
      socialButtonsBlockButtonIcon: "!opacity-90",
      formButtonPrimary:
        "!bg-foreground !text-background hover:!opacity-90 !rounded-xl !font-bold !transition-all !shadow-lg !h-12 !text-sm !tracking-wide",
      formFieldInput:
        "!rounded-xl !border !border-border/60 !bg-muted/30 focus:!bg-background focus:!ring-2 focus:!ring-primary/20 focus:!border-primary/40 !transition-all !px-4 !h-12 !text-sm",
      formFieldLabel:
        "!text-[11px] !font-bold !text-foreground/60 !mb-1.5 !uppercase !tracking-[0.15em] !ml-0.5",
      dividerLine: "!bg-border/40 !h-px",
      dividerText:
        "!text-muted-foreground/60 !text-[10px] !uppercase !tracking-[0.25em] !font-bold",
      dividerRow: "!my-4",
      formFieldAction:
        "!text-primary/70 hover:!text-primary !font-semibold !text-xs !transition-colors",
      identityPreviewText: "!text-foreground !font-semibold",
      formHeaderTitle: "hidden",
      formHeaderSubtitle: "hidden",
      otpCodeFieldInput:
        "!bg-muted/20 !border !border-border/50 focus:!border-primary !rounded-lg",
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
      borderRadius: "0.75rem",
      spacingUnit: "1rem",
    },
  };

  return (
    <div className="flex min-h-screen bg-background overflow-hidden relative">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-primary/5 blur-[120px] rounded-full -mr-24 -mt-24 z-0" />
      <div className="absolute bottom-0 left-0 w-1/3 h-1/3 bg-accent/5 blur-[100px] rounded-full -ml-12 -mb-12 z-0" />

      {/* Left Column - Visual/Identity */}
      <div className="hidden w-[45%] lg:flex relative flex-col overflow-hidden bg-[#0A0C10]">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a1f2c]/90 via-transparent to-transparent z-10" />
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1589829545856-d10d557cf95f?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-40 grayscale" />
          <div className="absolute inset-0 backdrop-blur-[2px]" />
        </div>

        <div className="relative z-20 flex flex-col h-full px-16 py-12">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <Image src={logoLexaWhite} alt="LEXA" width={160} height={60} className="h-14 w-auto drop-shadow-lg" />
          </motion.div>

          <div className="mt-auto mb-16 max-w-lg">
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 1, ease: [0.22, 1, 0.36, 1] }}
              className="text-5xl xl:text-6xl font-bold text-white leading-[1.1] tracking-tight"
            >
              Tecnologia de elite para sua <span className="text-primary-foreground/60 italic font-serif">advocacia.</span>
            </motion.h1>

            <div className="mt-12 space-y-6">
              {[
                { icon: Shield, title: "Segurança Absoluta", desc: "Criptografia de ponta a ponta em todos os processos." },
                { icon: Bot, title: "Inteligência Aruna", desc: "A IA que entende o juridiquês e automatiza sua rotina." },
                { icon: Zap, title: "Alta Performance", desc: "Interface ultra-rápida focada em produtividade." }
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + (i * 0.1) }}
                  className="flex gap-4 items-start group"
                >
                  <div className="p-3 rounded-2xl bg-white/5 border border-white/10 group-hover:bg-primary/20 group-hover:border-primary/30 transition-all">
                    <item.icon className="h-5 w-5 text-primary-foreground/80" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-lg">{item.title}</h3>
                    <p className="text-white/50 text-sm leading-relaxed">{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right Column - Interaction */}
      <div className="flex-1 flex flex-col items-center justify-center relative p-6 md:p-12 z-10">
        <div className="w-full max-w-[480px]">
          <div className="text-center mb-8">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8 block lg:hidden"
            >
              <Image src={logoLexa} alt="LEXA" width={140} height={50} className="mx-auto h-12 w-auto" />
            </motion.div>

            <div className="inline-flex p-1.5 rounded-2xl bg-muted/50 backdrop-blur-sm mb-8 border border-border/50">
              <button
                onClick={() => setMode("login")}
                className={`px-10 py-2.5 rounded-xl text-xs font-black tracking-widest transition-all duration-300 ${mode === "login"
                  ? "bg-background text-primary shadow-xl scale-100 border border-border/20"
                  : "text-muted-foreground hover:text-foreground scale-95"
                  }`}
              >
                LOGIN
              </button>
              <button
                onClick={() => setMode("signup")}
                className={`px-10 py-2.5 rounded-xl text-xs font-black tracking-widest transition-all duration-300 ${mode === "signup"
                  ? "bg-background text-primary shadow-xl scale-100 border border-border/20"
                  : "text-muted-foreground hover:text-foreground scale-95"
                  }`}
              >
                CADASTRO
              </button>
            </div>

            <h2 className="text-3xl font-bold tracking-tight text-foreground">
              {mode === "login" ? "Bem-vindo de volta" : "Comece sua jornada"}
            </h2>
            <p className="text-muted-foreground mt-3 text-sm">
              {mode === "login"
                ? "Entre com suas credenciais para acessar o Lexa."
                : "Preencha os dados abaixo para criar sua conta profissional."}
            </p>
          </div>

          <div className="rounded-2xl bg-card/80 backdrop-blur-xl p-6 sm:p-8 border border-border/30 shadow-2xl shadow-primary/5">
              <AnimatePresence mode="wait">
                <motion.div
                  key={mode}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
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
          </div>

          <p className="text-center mt-10 text-[11px] text-muted-foreground/60 leading-relaxed max-w-xs mx-auto">
            Ao continuar, você aceita o processamento de dados para fins de auditoria e segurança conforme nossa <a href="#" className="underline font-bold">Política de Privacidade</a>.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
