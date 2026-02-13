import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import LoginForm from "@/components/auth/LoginForm";
import SignupForm from "@/components/auth/SignupForm";
import logoLexa from "@/assets/logo-lexa.png";
import logoLexaWhite from "@/assets/logo-lexa-white.png";
import heroOffice from "@/assets/hero-office.jpg";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect } from "react";

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
      {/* Left - Branding with real image */}
      <div className="hidden w-1/2 items-center justify-center lg:flex relative overflow-hidden">
        <img src={heroOffice} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/95 via-primary/85 to-primary/75" />
        <div className="relative max-w-md px-12 text-center">
          <img src={logoLexaWhite} alt="LEXA" className="mx-auto mb-10 h-28" />
          <h2 className="font-display text-3xl font-semibold text-primary-foreground">
            Tecnologia a serviço do Direito
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-primary-foreground/60">
            Gerencie processos, finanças, prazos e clientes em um único lugar com inteligência artificial.
          </p>
          <div className="mt-12 flex justify-center gap-8 text-center">
            <div>
              <p className="text-2xl font-bold text-primary-foreground">500+</p>
              <p className="text-xs text-primary-foreground/50">Escritórios</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary-foreground">50k+</p>
              <p className="text-xs text-primary-foreground/50">Processos</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary-foreground">99.9%</p>
              <p className="text-xs text-primary-foreground/50">Uptime</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right - Forms */}
      <div className="flex w-full flex-1 flex-col items-center justify-center px-6 lg:w-1/2">
        <div className="w-full max-w-md">
          <img src={logoLexa} alt="LEXA" className="mx-auto mb-10 h-24 lg:hidden" />

          <div className="mb-2">
            <h1 className="font-display text-2xl font-semibold text-foreground">
              {mode === "login" ? "Bem-vindo de volta" : "Crie sua conta"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {mode === "login"
                ? "Entre na sua conta para continuar"
                : "Comece seu teste grátis de 7 dias"}
            </p>
          </div>

          {/* Tab switcher */}
          <div className="mb-8 mt-6 flex rounded-lg bg-muted p-1">
            <button
              onClick={() => setMode("login")}
              className={`flex-1 rounded-md py-2 text-sm font-medium transition-all duration-200 ${
                mode === "login"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Entrar
            </button>
            <button
              onClick={() => setMode("signup")}
              className={`flex-1 rounded-md py-2 text-sm font-medium transition-all duration-200 ${
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
              transition={{ duration: 0.2 }}
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
