import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import logoLexa from "@/assets/logo-lexa.png";
import heroBg from "@/assets/hero-bg.jpg";

const Navbar = () => (
  <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
    <div className="container mx-auto flex h-16 items-center justify-between px-4">
      <img src={logoLexa} alt="LEXA" className="h-10" />
      <div className="hidden items-center gap-8 md:flex">
        <a href="#funcionalidades" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Funcionalidades</a>
        <a href="#aruna" className="text-sm text-muted-foreground transition-colors hover:text-foreground">ARUNA IA</a>
        <a href="#planos" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Planos</a>
      </div>
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm">Entrar</Button>
        <Button variant="hero" size="sm">Teste Grátis</Button>
      </div>
    </div>
  </nav>
);

const HeroSection = () => (
  <section className="relative flex min-h-screen items-center justify-center overflow-hidden pt-16">
    <img src={heroBg} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />
    <div className="absolute inset-0 bg-gradient-hero" />
    <div className="container relative z-10 mx-auto px-4 text-center">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <span className="mb-6 inline-block rounded-full border border-accent/30 bg-accent/10 px-4 py-1.5 text-xs font-medium text-accent">
          ✨ 7 dias grátis — sem cartão de crédito
        </span>
        <h1 className="mx-auto max-w-4xl text-4xl font-bold leading-tight tracking-tight md:text-6xl lg:text-7xl">
          Tecnologia a serviço do{" "}
          <span className="text-gradient-gold">Direito</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl">
          Gerencie processos, finanças, prazos e clientes em um único lugar.
          Com a inteligência artificial da <strong className="text-accent">ARUNA</strong>, seu escritório nunca mais será o mesmo.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button variant="hero" size="lg" className="px-10 text-base">
            Começar Teste Grátis
          </Button>
          <Button variant="heroOutline" size="lg" className="px-10 text-base">
            Ver Demonstração
          </Button>
        </div>
      </motion.div>
    </div>
  </section>
);

export { Navbar, HeroSection };
