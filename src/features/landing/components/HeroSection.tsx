'use client';

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import logoLexa from "@/assets/logo-lexa.png";
import Image from "next/image";
import { ArrowRight, Menu, X, Shield, Sparkles, Scale, Sun, Moon } from "lucide-react";
import { useState, useEffect } from "react";
import { useTheme } from "@/components/shared/ThemeProvider";
import { UserButton, useAuth } from "@clerk/nextjs";
import Link from "next/link";

const navLinks = [
  { href: "#funcionalidades", label: "Funcionalidades" },
  { href: "#aruna", label: "ARUNA IA" },
  { href: "#planos", label: "Planos" },
];

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div className="h-8 w-8 mr-2" />;

  const isDark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 text-muted-foreground hover:text-foreground mr-2"
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isLoaded, isSignedIn } = useAuth();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/20">
      <div className="container mx-auto flex h-18 items-center justify-between px-4">
        <Image src={logoLexa} alt="LEXA" width={140} height={64} className="h-16 w-auto" priority />
        <div className="hidden items-center gap-10 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="nav-link-hover relative text-sm font-medium tracking-wide text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </div>
        <div className="hidden md:flex items-center gap-4">
          <ThemeToggle />
          {!isLoaded ? (
            <div className="h-9 w-24 animate-pulse rounded-full bg-muted/20" />
          ) : !isSignedIn ? (
            <>
              <Link href="/auth">
                <Button variant="ghost" size="sm" className="text-muted-foreground font-semibold hover:text-foreground">
                  Entrar
                </Button>
              </Link>
              <Link href="/auth?sign-up=true">
                <Button size="sm" className="btn-glow rounded-full px-6 gap-2 shadow-lg shadow-primary/15 font-bold">
                  Começar Agora
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <Link href="/dashboard">
                <Button variant="outline" size="sm" className="rounded-full px-5 font-semibold">
                  Acessar Painel
                </Button>
              </Link>
              <UserButton afterSignOutUrl="/" />
            </div>
          )}
        </div>
        <div className="md:hidden flex items-center gap-2">
          <ThemeToggle />
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>
      {mobileOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:hidden border-t border-border bg-background/95 backdrop-blur-lg p-4 space-y-3"
        >
          {navLinks.map((link) => (
            <a key={link.href} href={link.href} className="block py-2 text-sm font-medium text-foreground" onClick={() => setMobileOpen(false)}>
              {link.label}
            </a>
          ))}
          {!isLoaded ? (
            <div className="h-10 w-full animate-pulse rounded-full bg-muted/20" />
          ) : !isSignedIn ? (
            <div className="flex flex-col gap-2">
              <Link href="/auth" className="w-full">
                <Button variant="outline" className="w-full rounded-full">
                  Entrar
                </Button>
              </Link>
              <Link href="/auth?sign-up=true" className="w-full">
                <Button className="w-full rounded-full gap-2">
                  Começar Agora <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 py-2">
              <UserButton />
              <Link href="/dashboard" className="w-full">
                <Button variant="outline" className="w-full rounded-full">Acessar Painel</Button>
              </Link>
            </div>
          )}
        </motion.div>
      )}
    </nav>
  );
};

const HeroSection = () => {
  const { isSignedIn } = useAuth();
  
  return (
  <section className="relative min-h-screen overflow-hidden pt-20">
    {/* Premium gradient background */}
    <div className="absolute inset-0">
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-secondary/40" />
      {/* Decorative gradient orbs */}
      <div className="absolute top-20 right-1/4 h-[500px] w-[500px] rounded-full bg-primary/[0.04] blur-[100px] animate-float-slow" />
      <div className="absolute bottom-20 left-1/4 h-[400px] w-[400px] rounded-full bg-accent/[0.06] blur-[80px] animate-float" />
      <div className="absolute top-1/2 right-10 h-[300px] w-[300px] rounded-full bg-primary/[0.03] blur-[60px]" />
    </div>

    {/* Floating geometric shapes */}
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <motion.div
        className="absolute top-[15%] right-[15%] h-16 w-16 rounded-2xl border border-accent/20 bg-accent/5 backdrop-blur-sm"
        animate={{ y: [0, -15, 0], rotate: [0, 8, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute top-[30%] right-[8%] h-10 w-10 rounded-full border border-primary/15 bg-primary/5"
        animate={{ y: [0, -20, 0], rotate: [0, -12, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      />
      <motion.div
        className="absolute bottom-[25%] right-[22%] h-12 w-12 rounded-xl border border-accent/15 bg-accent/[0.03]"
        animate={{ y: [0, -10, 0], rotate: [0, 5, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      />
      <motion.div
        className="absolute top-[55%] right-[35%] h-8 w-8 rounded-lg border border-primary/10 bg-primary/[0.04]"
        animate={{ y: [0, -18, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
      />
      {/* Decorative lines */}
      <svg className="absolute top-[20%] right-[10%] opacity-[0.06]" width="200" height="200" viewBox="0 0 200 200">
        <circle cx="100" cy="100" r="80" stroke="currentColor" strokeWidth="0.5" fill="none" className="text-primary" />
        <circle cx="100" cy="100" r="60" stroke="currentColor" strokeWidth="0.3" fill="none" className="text-accent" />
      </svg>
    </div>

    <div className="container relative z-10 mx-auto flex min-h-[calc(100vh-5rem)] items-center px-4">
      <div className="grid items-center gap-16 lg:grid-cols-2 w-full">
        {/* Left: Text content */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
        >
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-4 py-1.5"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
            <span className="text-xs font-semibold uppercase tracking-widest text-accent-foreground">
              Plataforma Jurídica com IA
            </span>
          </motion.div>

          <h1 className="text-5xl font-semibold leading-[1.08] md:text-6xl lg:text-7xl">
            Tecnologia a<br />serviço do{" "}
            <span className="text-gradient-premium">Direito</span>
          </h1>

          <p className="mt-8 max-w-lg text-lg leading-relaxed text-muted-foreground">
            Gerencie processos, finanças, prazos e clientes em um único lugar.
            Com a inteligência artificial da{" "}
            <strong className="font-semibold text-foreground">ARUNA</strong>, seu escritório nunca mais será o mesmo.
          </p>

          <div className="mt-12 flex items-center gap-4">
            <Button size="lg" className="btn-glow rounded-full px-10 text-base shadow-xl shadow-primary/15 gap-2" asChild>
              <Link href={isSignedIn ? "/dashboard" : "/auth"}>
                {isSignedIn ? "Acessar Painel" : "Começar Agora"}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="rounded-full px-8 text-base border-border/60 hover:bg-muted/50" asChild>
              <a href="#funcionalidades">Saiba Mais</a>
            </Button>
          </div>

          {/* Social proof */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.6 }}
            className="mt-16 flex items-center gap-6 border-t border-border/40 pt-8"
          >
            <div>
              <p className="text-2xl font-bold text-foreground">500+</p>
              <p className="text-xs text-muted-foreground">Escritórios ativos</p>
            </div>
            <div className="h-8 w-px bg-border/50" />
            <div>
              <p className="text-2xl font-bold text-foreground">50k+</p>
              <p className="text-xs text-muted-foreground">Processos gerenciados</p>
            </div>
            <div className="h-8 w-px bg-border/50" />
            <div>
              <p className="text-2xl font-bold text-foreground">99.9%</p>
              <p className="text-xs text-muted-foreground">Uptime garantido</p>
            </div>
          </motion.div>
        </motion.div>

        {/* Right: Premium visual card */}
        <motion.div
          className="hidden lg:block"
          initial={{ opacity: 0, x: 60, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ duration: 1.2, delay: 0.3, ease: "easeOut" }}
        >
          <div className="relative">
            {/* Main card */}
            <div className="relative rounded-3xl border border-border/40 bg-card/80 backdrop-blur-xl p-8 shadow-2xl shadow-primary/[0.06]">
              {/* Dashboard preview mockup */}
              <div className="space-y-5">
                {/* Header */}
                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 rounded-full bg-destructive/60" />
                  <div className="h-3 w-3 rounded-full bg-warning/60" />
                  <div className="h-3 w-3 rounded-full bg-success/60" />
                  <div className="ml-4 h-6 flex-1 rounded-full bg-muted/60" />
                </div>

                {/* KPI row */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Processos Ativos", value: "127", color: "from-primary/10 to-primary/5" },
                    { label: "Prazos Hoje", value: "8", color: "from-accent/15 to-accent/5" },
                    { label: "Faturamento", value: "R$ 84k", color: "from-success/10 to-success/5" },
                  ].map((kpi) => (
                    <div key={kpi.label} className={`rounded-xl bg-gradient-to-br ${kpi.color} p-4 border border-border/30`}>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{kpi.label}</p>
                      <p className="text-xl font-bold text-foreground mt-1">{kpi.value}</p>
                    </div>
                  ))}
                </div>

                {/* Process list mockup */}
                <div className="rounded-xl border border-border/30 bg-muted/20 p-4 space-y-3">
                  {[
                    { title: "Ação Trabalhista — João Silva", status: "Ativo", color: "bg-emerald-500" },
                    { title: "Processo Tributário — Empresa X", status: "Recursal", color: "bg-amber-500" },
                    { title: "Contrato de Locação", status: "Encerrado", color: "bg-muted-foreground" },
                  ].map((proc) => (
                    <div key={proc.title} className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <Scale className="h-3.5 w-3.5 text-primary/40" />
                        <span className="text-xs font-medium text-foreground/80">{proc.title}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className={`h-1.5 w-1.5 rounded-full ${proc.color}`} />
                        <span className="text-[10px] text-muted-foreground">{proc.status}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* ARUNA chat preview */}
                <div className="rounded-xl bg-gradient-to-r from-primary/[0.06] to-accent/[0.04] border border-accent/15 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-3.5 w-3.5 text-accent" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-accent-foreground">ARUNA IA</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    "Você tem 3 prazos vencendo amanhã e 2 audiências na próxima semana. Recomendo priorizar o processo #12345..."
                  </p>
                </div>
              </div>
            </div>

            {/* Floating badge */}
            <motion.div
              className="absolute -top-4 -right-4 rounded-2xl border border-accent/20 bg-card shadow-lg shadow-accent/10 px-4 py-3"
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-accent" />
                <div>
                  <p className="text-xs font-semibold text-foreground">LGPD Compliant</p>
                  <p className="text-[10px] text-muted-foreground">Dados 100% seguros</p>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  </section>
  );
};

export { Navbar, HeroSection };
