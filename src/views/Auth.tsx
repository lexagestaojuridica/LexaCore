import { SignIn, SignUp } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import logoLexaWhite from "@/assets/logo-lexa-white.png";
import logoLexa from "@/assets/logo-lexa.png";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Scale, Bot, Users, Globe, Zap } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth as useClerkAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

const Auth = () => {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const { isLoaded, userId } = useClerkAuth();
  const navigate = useRouter();

  useEffect(() => {
    if (isLoaded && userId) {
      navigate.push("/dashboard");
    }
  }, [userId, isLoaded, navigate]);

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const clerkAppearance = {
    elements: {
      rootBox: "w-full",
      card: "shadow-none border-0 bg-transparent p-0 w-full",
      headerTitle: "hidden",
      headerSubtitle: "hidden",
      socialButtonsBlockButton: "rounded-2xl border-border bg-card hover:bg-muted text-foreground transition-all h-12 text-sm font-medium",
      socialButtonsBlockButtonText: "font-medium",
      formButtonPrimary: "bg-primary text-primary-foreground hover:opacity-90 rounded-2xl h-12 text-base font-semibold transition-all shadow-lg shadow-primary/20",
      formFieldInput: "rounded-2xl border-border bg-muted/50 focus:bg-background focus:ring-2 focus:ring-primary/20 transition-all h-12 px-4 contents-['']",
      formFieldLabel: "text-sm font-medium text-foreground/70 mb-1.5 ml-1",
      footerAction: "hidden",
      dividerLine: "bg-border h-[1px]",
      dividerText: "text-muted-foreground text-xs uppercase tracking-widest font-bold",
      formFieldAction: "text-primary hover:text-primary/80 font-medium text-sm transition-colors",
      identityPreviewText: "text-foreground font-medium",
      identityPreviewEditButtonIcon: "text-primary",
    },
    variables: {
      colorPrimary: "#1a1f2c", // lux-navy approximation
      colorText: "#1a1f2c",
      colorBackground: "transparent",
      fontFamily: "Inter, sans-serif",
      borderRadius: "1rem",
    }
  };

  return (
    <div className="flex min-h-screen bg-background overflow-hidden">
      {/* Left Column - Visual/Identity */}
      <div className="hidden w-[50%] lg:flex relative flex-col overflow-hidden">
        {/* Background Video/Image */}
        <div className="absolute inset-0">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="h-full w-full object-cover"
          >
            <source src="/auth-bg-video.mp4" type="video/mp4" />
          </video>
          {/* Layered Overlays for Premium Look */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/95 via-primary/85 to-transparent blend-overlay" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_var(--tw-gradient-stops))] from-accent/20 via-transparent to-transparent opacity-50" />
          <div className="absolute inset-0 backdrop-blur-[2px]" />
        </div>

        {/* Content on Left Side */}
        <div className="relative z-20 flex flex-col h-full px-16 py-12">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <Image
              src={logoLexaWhite}
              alt="LEXA"
              width={180}
              height={80}
              className="h-20 w-auto"
            />
          </motion.div>

          <div className="mt-auto mb-12 max-w-lg">
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 1, ease: [0.22, 1, 0.36, 1] }}
              className="text-5xl xl:text-6xl font-display font-bold text-white leading-[1.1] tracking-tight"
            >
              A Nova Era da <span className="text-gradient-gold">Gestão Jurídica</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.8 }}
              className="mt-6 text-xl text-white/70 font-light leading-relaxed"
            >
              Arquitetura sênior, automação inteligente e segurança de nível bancário para o seu escritório.
            </motion.p>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 1 }}
              className="mt-10 flex flex-wrap gap-4"
            >
              {[
                { icon: Shield, text: "Segurança 256-bit" },
                { icon: Zap, text: "Edge Performance" },
                { icon: Bot, text: "Aruna AI Native" }
              ].map((pill, i) => (
                <div key={i} className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 backdrop-blur-md">
                  <pill.icon className="h-4 w-4 text-accent" />
                  <span className="text-sm font-medium text-white/90">{pill.text}</span>
                </div>
              ))}
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 1 }}
            className="flex items-center justify-between border-t border-white/10 pt-8 mt-8"
          >
            <div className="flex -space-x-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-10 w-10 rounded-full border-2 border-primary bg-muted/20 backdrop-blur-sm overflow-hidden">
                  <div className="h-full w-full bg-gradient-to-br from-accent/40 to-primary/40" />
                </div>
              ))}
              <div className="h-10 w-10 flex items-center justify-center rounded-full border-2 border-primary bg-accent/20 text-[10px] font-bold text-white backdrop-blur-sm">
                +2k
              </div>
            </div>
            <p className="text-sm text-white/50 font-medium">Confiado por advogados de elite</p>
          </motion.div>
        </div>
      </div>

      {/* Right Column - Interaction */}
      <div className="flex-1 flex flex-col items-center justify-center relative p-8">
        <div className="w-full max-w-[440px] z-10">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 block lg:hidden text-center"
          >
            <Image src={logoLexa} alt="LEXA" width={160} height={60} className="mx-auto h-16 w-auto" />
          </motion.div>

          <div className="text-center mb-10">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="inline-block p-1 rounded-2xl bg-muted mb-6"
            >
              <div className="flex gap-1">
                <button
                  onClick={() => setMode("login")}
                  className={`px-8 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${mode === "login"
                      ? "bg-background text-foreground shadow-sm scale-100"
                      : "text-muted-foreground hover:text-foreground scale-95"
                    }`}
                >
                  CONECTAR
                </button>
                <button
                  onClick={() => setMode("signup")}
                  className={`px-8 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${mode === "signup"
                      ? "bg-background text-foreground shadow-sm scale-100"
                      : "text-muted-foreground hover:text-foreground scale-95"
                    }`}
                >
                  COMENÇAR
                </button>
              </div>
            </motion.div>

            <motion.h2
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-2xl font-display font-bold text-foreground"
            >
              {mode === "login" ? "Bem-vindo de volta" : "Crie sua conta"}
            </motion.h2>
            <p className="text-muted-foreground mt-2">
              {mode === "login" ? "Acesse sua conta para continuar" : "Junte-se ao futuro da advocacia"}
            </p>
          </div>

          <div className="premium-card p-2 rounded-[2rem] bg-gradient-to-b from-border/50 to-transparent">
            <div className="bg-background rounded-[1.8rem] p-6 shadow-2xl shadow-primary/5">
              <AnimatePresence mode="wait">
                <motion.div
                  key={mode}
                  initial={{ opacity: 0, x: mode === "login" ? -10 : 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: mode === "login" ? 10 : -10 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                >
                  {mode === "login" ? (
                    <SignIn
                      routing="hash"
                      fallbackRedirectUrl="/dashboard"
                      signUpUrl="/auth#signup"
                      appearance={clerkAppearance}
                    />
                  ) : (
                    <SignUp
                      routing="hash"
                      fallbackRedirectUrl="/dashboard"
                      signInUrl="/auth"
                      appearance={clerkAppearance}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="text-center mt-10 text-sm text-muted-foreground"
          >
            Ao continuar, você concorda com nossos <br />
            <a href="#" className="font-semibold text-primary/80 hover:text-primary transition-colors hover:underline underline-offset-4">Termos de Serviço</a> e <a href="#" className="font-semibold text-primary/80 hover:text-primary transition-colors hover:underline underline-offset-4">Privacidade</a>.
          </motion.p>
        </div>

        {/* Decorative corner elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl -z-10 -mr-32 -mt-32" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -z-10 -ml-32 -mb-32" />
      </div>
    </div>
  );
};

export default Auth;
