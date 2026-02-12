import logoLexa from "@/assets/logo-lexa.png";

const Footer = () => (
  <footer className="py-16">
    <div className="container mx-auto px-4">
      <div className="grid gap-12 md:grid-cols-4">
        <div>
          <img src={logoLexa} alt="LEXA" className="mb-5 h-7" />
          <p className="text-sm leading-relaxed text-muted-foreground">
            Tecnologia a serviço do Direito. Simplifique a gestão do seu escritório jurídico.
          </p>
        </div>
        <div>
          <h4 className="mb-5 text-xs font-medium uppercase tracking-[0.15em]">Produto</h4>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li><a href="#funcionalidades" className="transition-colors hover:text-primary">Funcionalidades</a></li>
            <li><a href="#planos" className="transition-colors hover:text-primary">Planos</a></li>
            <li><a href="#aruna" className="transition-colors hover:text-primary">ARUNA IA</a></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-5 text-xs font-medium uppercase tracking-[0.15em]">Suporte</h4>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li><a href="#" className="transition-colors hover:text-primary">Central de Ajuda</a></li>
            <li><a href="#" className="transition-colors hover:text-primary">Documentação</a></li>
            <li><a href="#" className="transition-colors hover:text-primary">Contato</a></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-5 text-xs font-medium uppercase tracking-[0.15em]">Legal</h4>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li><a href="#" className="transition-colors hover:text-primary">Termos de Uso</a></li>
            <li><a href="#" className="transition-colors hover:text-primary">Privacidade</a></li>
            <li><a href="#" className="transition-colors hover:text-primary">LGPD</a></li>
          </ul>
        </div>
      </div>
      <div className="mt-16 border-t border-border pt-8 text-center text-xs tracking-wide text-muted-foreground">
        © {new Date().getFullYear()} LEXA. Todos os direitos reservados.
      </div>
    </div>
  </footer>
);

export default Footer;
