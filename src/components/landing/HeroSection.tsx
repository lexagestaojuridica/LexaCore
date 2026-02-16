import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import logoLexa from "@/assets/logo-lexa.png";
import heroOffice from "@/assets/hero-office.jpg";
import { ArrowRight, Menu, X } from "lucide-react";
import { useState } from "react";

const navLinks = [
  { href: "#funcionalidades", label: "Funcionalidades" },
  { href: "#aruna", label: "ARUNA IA" },
  { href: "#planos", label: "Planos" },
];

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/20">
      <div className="container mx-auto flex h-18 items-center justify-between px-4">
        <img src={logoLexa} alt="LEXA" className="h-16" />
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
        <div className="hidden md:flex items-center gap-3">
          <Button variant="ghost" size="sm" className="nav-link-hover relative text-muted-foreground font-medium" asChild>
            <a href="/auth">Entrar</a>
          </Button>
          <Button size="sm" className="rounded-full px-6 gap-2 shadow-lg shadow-primary/15" asChild>
            <a href="/auth">
              Começar Agora
              <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </Button>
        </div>
        <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
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
          <Button className="w-full rounded-full gap-2" asChild>
            <a href="/auth">Começar Agora <ArrowRight className="h-3.5 w-3.5" /></a>
          </Button>
        </motion.div>
      )}
    </nav>
  );
};

const HeroSection = () => (
  <section className="relative min-h-screen overflow-hidden pt-20">
    <div className="absolute inset-0">
      <img src={heroOffice} alt="" className="h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-r from-background via-background/95 to-background/50" />
    </div>

    <div className="container relative z-10 mx-auto flex min-h-[calc(100vh-5rem)] items-center px-4">
      <motion.div
        className="max-w-2xl"
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
          <span className="text-gradient-navy">Direito</span>
        </h1>

        <p className="mt-8 max-w-lg text-lg leading-relaxed text-muted-foreground">
          Gerencie processos, finanças, prazos e clientes em um único lugar.
          Com a inteligência artificial da{" "}
          <strong className="font-semibold text-foreground">ARUNA</strong>, seu escritório nunca mais será o mesmo.
        </p>

        <div className="mt-12 flex items-center gap-4">
          <Button size="lg" className="rounded-full px-10 text-base shadow-lg shadow-primary/15 gap-2" asChild>
            <a href="/auth">
              Começar Agora
              <ArrowRight className="h-4 w-4" />
            </a>
          </Button>
          <Button variant="outline" size="lg" className="rounded-full px-8 text-base" asChild>
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
    </div>
  </section>
);

export { Navbar, HeroSection };
