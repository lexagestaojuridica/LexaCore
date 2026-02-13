import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import LoginForm from "@/components/auth/LoginForm";
import SignupForm from "@/components/auth/SignupForm";
import logoLexa from "@/assets/logo-lexa.png";
import { motion, AnimatePresence } from "framer-motion";

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
      {/* Left - Branding */}
      <div className="hidden w-1/2 items-center justify-center bg-primary lg:flex">
        <div className="max-w-md px-12 text-center">
          <img src={logoLexa} alt="LEXA" className="mx-auto mb-10 h-20 brightness-0 invert" />
          <h2 className="font-display text-3xl text-primary-foreground">
            Tecnologia a serviço do Direito
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-primary-foreground/70">
            Gerencie processos, finanças, prazos e clientes em um único lugar com inteligência artificial.
          </p>
        </div>
      </div>

      {/* Right - Forms */}
      <div className="flex w-full flex-1 flex-col items-center justify-center px-6 lg:w-1/2">
        <div className="w-full max-w-md">
          <img src={logoLexa} alt="LEXA" className="mx-auto mb-8 h-14 lg:hidden" />

          {/* Tab switcher */}
          <div className="mb-8 flex border-b border-border">
            <button
              onClick={() => setMode("login")}
              className={`flex-1 pb-3 text-sm font-medium transition-colors ${
                mode === "login"
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Entrar
            </button>
            <button
              onClick={() => setMode("signup")}
              className={`flex-1 pb-3 text-sm font-medium transition-colors ${
                mode === "signup"
                  ? "border-b-2 border-primary text-primary"
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
