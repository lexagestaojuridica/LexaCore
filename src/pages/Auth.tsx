import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import LoginForm from "@/components/auth/LoginForm";
import SignupForm from "@/components/auth/SignupForm";
import logoLexaWhite from "@/assets/logo-lexa-white.png";
import logoLexa from "@/assets/logo-lexa.png";
import authBgVideo from "@/assets/auth-bg-video.mp4";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Scale, Bot } from "lucide-react";

const Auth = () => {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && session) {
      navigate("/dashboard");
    }
  }, [session, loading, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      {/* Left - Video Background */}
      <div className="hidden w-[55%] items-center justify-center lg:flex relative overflow-hidden">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 h-full w-full object-cover"
        >
          <source src={authBgVideo} type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-br from-primary/90 via-primary/70 to-primary/50" />
        <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-transparent to-transparent" />

        <div className="relative z-10 max-w-lg px-16 text-center">
          <motion.img
            src={logoLexaWhite}
            alt="LEXA"
            className="mx-auto mb-12 h-28"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          />
          <motion.h2
            className="font-display text-4xl font-semibold leading-tight text-primary-foreground"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
          >
            Tecnologia a serviço do Direito
          </motion.h2>
          <motion.p
            className="mt-4 text-base leading-relaxed text-primary-foreground/70"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.8 }}
          >
            Gerencie processos, finanças, prazos e clientes em um único lugar com inteligência artificial.
          </motion.p>

          {/* Feature pills */}
          <motion.div
            className="mt-10 flex flex-wrap justify-center gap-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.8 }}
          >
            {[
              { icon: Scale, label: "Gestão de Processos" },
              { icon: Bot, label: "IA Jurídica" },
              { icon: Shield, label: "Segurança Total" },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-2 rounded-full border border-primary-foreground/20 bg-primary-foreground/10 px-4 py-2 backdrop-blur-sm"
              >
                <item.icon className="h-3.5 w-3.5 text-accent" />
                <span className="text-xs font-medium text-primary-foreground/80">
                  {item.label}
                </span>
              </div>
            ))}
          </motion.div>

          {/* Stats */}
          <motion.div
            className="mt-14 flex justify-center gap-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.8 }}
          >
            {[
              { value: "500+", label: "Escritórios" },
              { value: "50k+", label: "Processos" },
              { value: "99.9%", label: "Uptime" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-2xl font-bold text-primary-foreground">{stat.value}</p>
                <p className="text-[11px] text-primary-foreground/50 uppercase tracking-wider">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Right - Forms */}
      <div className="flex w-full flex-1 flex-col items-center justify-center px-6 lg:w-[45%] bg-background">
        <div className="w-full max-w-md">
          <img src={logoLexa} alt="LEXA" className="mx-auto mb-10 h-24 lg:hidden" />

          {/* Tab switcher */}
          <div className="mb-8 flex rounded-xl bg-muted p-1">
            <button
              onClick={() => setMode("login")}
              className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-all duration-300 ${
                mode === "login"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Entrar
            </button>
            <button
              onClick={() => setMode("signup")}
              className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-all duration-300 ${
                mode === "signup"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Criar Conta
            </button>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, x: mode === "login" ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: mode === "login" ? 20 : -20 }}
              transition={{ duration: 0.25 }}
            >
              {mode === "login" ? (
                <LoginForm onSwitchToSignup={() => setMode("signup")} />
              ) : (
                <SignupForm onSwitchToLogin={() => setMode("login")} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default Auth;
