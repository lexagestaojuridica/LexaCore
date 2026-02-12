import logoLexa from "@/assets/logo-lexa.png";

const Footer = () => (
  <footer className="border-t border-border bg-card/50 py-12">
    <div className="container mx-auto px-4">
      <div className="grid gap-8 md:grid-cols-4">
        <div>
          <img src={logoLexa} alt="LEXA" className="mb-4 h-10" />
          <p className="text-sm text-muted-foreground">
            Tecnologia a serviço do Direito. Simplifique a gestão do seu escritório jurídico.
          </p>
        </div>
        <div>
          <h4 className="mb-4 text-sm font-semibold">Produto</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><a href="#funcionalidades" className="hover:text-foreground">Funcionalidades</a></li>
            <li><a href="#planos" className="hover:text-foreground">Planos</a></li>
            <li><a href="#aruna" className="hover:text-foreground">ARUNA IA</a></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-4 text-sm font-semibold">Suporte</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><a href="#" className="hover:text-foreground">Central de Ajuda</a></li>
            <li><a href="#" className="hover:text-foreground">Documentação</a></li>
            <li><a href="#" className="hover:text-foreground">Contato</a></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-4 text-sm font-semibold">Legal</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><a href="#" className="hover:text-foreground">Termos de Uso</a></li>
            <li><a href="#" className="hover:text-foreground">Privacidade</a></li>
            <li><a href="#" className="hover:text-foreground">LGPD</a></li>
          </ul>
        </div>
      </div>
      <div className="mt-12 border-t border-border pt-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} LEXA. Todos os direitos reservados.
      </div>
    </div>
  </footer>
);

export default Footer;
