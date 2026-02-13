import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import logoLexa from "@/assets/logo-lexa.png";
import heroOffice from "@/assets/hero-office.jpg";

const navLinks = [
  { href: "#funcionalidades", label: "Funcionalidades" },
  { href: "#aruna", label: "ARUNA IA" },
  { href: "#planos", label: "Planos" },
];

const Navbar = () => (
  <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/30">
    <div className="container mx-auto flex h-20 items-center justify-between px-4">
      <img src={logoLexa} alt="LEXA" className="h-20" />
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
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" className="nav-link-hover relative text-muted-foreground font-medium" asChild>
          <a href="/auth">Entrar</a>
        </Button>
        <Button size="sm" className="rounded-full px-6" asChild>
          <a href="/auth">Teste Grátis</a>
        </Button>
      </div>
    </div>
  </nav>
);

const HeroSection = () => (
  <section className="relative min-h-screen overflow-hidden pt-20">
    {/* Background image */}
    <div className="absolute inset-0">
      <img src={heroOffice} alt="" className="h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-r from-background via-background/95 to-background/60" />
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
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-1.5"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          <span className="text-xs font-semibold uppercase tracking-widest text-accent-foreground">
            7 dias grátis — sem cartão
          </span>
        </motion.div>

        <h1 className="text-5xl font-semibold leading-[1.1] md:text-6xl lg:text-7xl">
          Tecnologia a<br />serviço do{" "}
          <span className="text-gradient-navy">Direito</span>
        </h1>

        <p className="mt-8 max-w-lg text-lg leading-relaxed text-muted-foreground">
          Gerencie processos, finanças, prazos e clientes em um único lugar.
          Com a inteligência artificial da{" "}
          <strong className="font-semibold text-foreground">ARUNA</strong>, seu escritório nunca mais será o mesmo.
        </p>

        <div className="mt-12 flex flex-col gap-4 sm:flex-row">
          <Button size="lg" className="rounded-full px-10 text-base shadow-lg shadow-primary/20" asChild>
            <a href="/auth">Começar Teste Grátis</a>
          </Button>
          <Button variant="outline" size="lg" className="rounded-full px-10 text-base">
            Ver Demonstração
          </Button>
        </div>

        {/* Social proof */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="mt-16 flex items-center gap-6 border-t border-border/50 pt-8"
        >
          <div>
            <p className="text-2xl font-bold text-foreground">500+</p>
            <p className="text-xs text-muted-foreground">Escritórios ativos</p>
          </div>
          <div className="h-8 w-px bg-border" />
          <div>
            <p className="text-2xl font-bold text-foreground">50k+</p>
            <p className="text-xs text-muted-foreground">Processos gerenciados</p>
          </div>
          <div className="h-8 w-px bg-border" />
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
