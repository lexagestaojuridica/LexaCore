import logoLexa from "@/assets/logo-lexa.png";
import Image from "next/image";
import { Scale, Mail, Phone, MapPin } from "lucide-react";

const Footer = () => (
  <footer className="border-t border-border/50 bg-card/50">
    <div className="container mx-auto px-4">
      <div className="grid gap-12 py-16 md:grid-cols-5">
        <div className="md:col-span-2">
          <Image src={logoLexa} alt="LEXA" width={120} height={56} className="mb-5 h-14 w-auto" />
          <p className="text-sm leading-relaxed text-muted-foreground max-w-xs">
            Tecnologia a serviço do Direito. Simplifique a gestão do seu escritório jurídico com inteligência artificial.
          </p>
          <div className="mt-6 space-y-2.5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Mail className="h-3.5 w-3.5" />
              <span>contato@lexanova.com.br</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Phone className="h-3.5 w-3.5" />
              <span>(11) 4000-0000</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              <span>São Paulo, SP — Brasil</span>
            </div>
          </div>
        </div>
        <div>
          <h4 className="mb-5 text-xs font-semibold uppercase tracking-widest text-foreground">Produto</h4>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li><a href="#funcionalidades" className="transition-colors hover:text-foreground">Funcionalidades</a></li>
            <li><a href="#planos" className="transition-colors hover:text-foreground">Planos</a></li>
            <li><a href="#aruna" className="transition-colors hover:text-foreground">ARUNA IA</a></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-5 text-xs font-semibold uppercase tracking-widest text-foreground">Suporte</h4>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li><a href="#" className="transition-colors hover:text-foreground">Central de Ajuda</a></li>
            <li><a href="#" className="transition-colors hover:text-foreground">Documentação</a></li>
            <li><a href="#" className="transition-colors hover:text-foreground">Contato</a></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-5 text-xs font-semibold uppercase tracking-widest text-foreground">Legal</h4>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li><a href="#" className="transition-colors hover:text-foreground">Termos de Uso</a></li>
            <li><a href="#" className="transition-colors hover:text-foreground">Privacidade</a></li>
            <li><a href="#" className="transition-colors hover:text-foreground">LGPD</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border/50 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-xs tracking-wide text-muted-foreground">
          © {new Date().getFullYear()} LEXA. Todos os direitos reservados.
        </p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Scale className="h-3 w-3" />
          <span>Feito com ❤️ para o Direito brasileiro</span>
        </div>
      </div>
    </div>
  </footer>
);

export default Footer;
