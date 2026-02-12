import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import logoLexa from "@/assets/logo-lexa.png";

const Navbar = () => (
  <nav className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-md">
    <div className="container mx-auto flex h-20 items-center justify-between px-4">
      <img src={logoLexa} alt="LEXA" className="h-8" />
      <div className="hidden items-center gap-10 md:flex">
        <a href="#funcionalidades" className="text-sm tracking-wide text-muted-foreground transition-colors hover:text-primary">Funcionalidades</a>
        <a href="#aruna" className="text-sm tracking-wide text-muted-foreground transition-colors hover:text-primary">ARUNA IA</a>
        <a href="#planos" className="text-sm tracking-wide text-muted-foreground transition-colors hover:text-primary">Planos</a>
      </div>
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" className="text-muted-foreground">Entrar</Button>
        <Button variant="hero" size="sm">Teste Grátis</Button>
      </div>
    </div>
  </nav>
);

const HeroSection = () => (
  <section className="relative flex min-h-screen items-center justify-center pt-20">
    <div className="container relative z-10 mx-auto px-4">
      <motion.div
        className="mx-auto max-w-3xl text-center"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <span className="mb-6 inline-block text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          7 dias grátis — sem cartão de crédito
        </span>
        <h1 className="text-4xl font-normal leading-tight md:text-6xl lg:text-7xl">
          Tecnologia a serviço do{" "}
          <span className="text-gradient-navy">Direito</span>
        </h1>
        <p className="mx-auto mt-8 max-w-xl text-lg leading-relaxed text-muted-foreground">
          Gerencie processos, finanças, prazos e clientes em um único lugar.
          Com a inteligência artificial da <strong className="text-primary">ARUNA</strong>, seu escritório nunca mais será o mesmo.
        </p>
        <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button variant="hero" size="lg" className="px-12 text-base">
            Começar Teste Grátis
          </Button>
          <Button variant="heroOutline" size="lg" className="px-12 text-base">
            Ver Demonstração
          </Button>
        </div>
      </motion.div>
    </div>
  </section>
);

export { Navbar, HeroSection };
