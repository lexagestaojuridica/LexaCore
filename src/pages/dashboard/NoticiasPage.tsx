import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Newspaper, ExternalLink, Search, Clock, Tag } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const CATEGORIES = [
  { id: "all", label: "Todas" },
  { id: "trabalhista", label: "Trabalhista" },
  { id: "civil", label: "Cível" },
  { id: "penal", label: "Penal" },
  { id: "tributario", label: "Tributário" },
  { id: "constitucional", label: "Constitucional" },
  { id: "empresarial", label: "Empresarial" },
  { id: "digital", label: "Direito Digital" },
  { id: "ambiental", label: "Ambiental" },
];

// RSS feeds from major Brazilian legal news sources
const RSS_SOURCES = [
  { name: "ConJur", url: "https://www.conjur.com.br/rss.xml", category: "all" },
  { name: "Migalhas", url: "https://www.migalhas.com.br/rss/quentes.xml", category: "all" },
  { name: "JOTA", url: "https://www.jota.info/feed", category: "all" },
];

type NewsItem = {
  id: string;
  title: string;
  description: string;
  link: string;
  pubDate: string;
  source: string;
  category: string;
  imageUrl: string | null;
};

// Curated static news data for demo (since RSS requires CORS proxy)
const DEMO_NEWS: NewsItem[] = [
  {
    id: "1", title: "STF decide sobre marco temporal de terras indígenas",
    description: "O Supremo Tribunal Federal retomou o julgamento sobre o marco temporal para demarcação de terras indígenas, com repercussão geral reconhecida.",
    link: "#", pubDate: new Date().toISOString(), source: "ConJur", category: "constitucional",
    imageUrl: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400&h=250&fit=crop",
  },
  {
    id: "2", title: "Nova Lei de Licitações entra em vigor com mudanças significativas",
    description: "A Lei 14.133/2021 passa a ser a única norma de licitações aplicável, trazendo inovações como o diálogo competitivo e o sistema de registro de preços.",
    link: "#", pubDate: new Date(Date.now() - 3600000).toISOString(), source: "Migalhas", category: "empresarial",
    imageUrl: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=400&h=250&fit=crop",
  },
  {
    id: "3", title: "TST atualiza entendimento sobre trabalho intermitente",
    description: "O Tribunal Superior do Trabalho revisou sua jurisprudência sobre contratos de trabalho intermitente, esclarecendo questões sobre remuneração e direitos.",
    link: "#", pubDate: new Date(Date.now() - 7200000).toISOString(), source: "JOTA", category: "trabalhista",
    imageUrl: "https://images.unsplash.com/photo-1521791136064-7986c2920216?w=400&h=250&fit=crop",
  },
  {
    id: "4", title: "LGPD: Autoridade aplica primeira multa milionária",
    description: "A ANPD aplicou sanção administrativa a empresa por violação da Lei Geral de Proteção de Dados, marcando precedente importante para o setor.",
    link: "#", pubDate: new Date(Date.now() - 10800000).toISOString(), source: "ConJur", category: "digital",
    imageUrl: "https://images.unsplash.com/photo-1563986768609-322da13575f2?w=400&h=250&fit=crop",
  },
  {
    id: "5", title: "Reforma Tributária: principais mudanças para advogados",
    description: "Entenda como a reforma tributária impacta a advocacia, incluindo mudanças no ISS, IBS e CBS para prestadores de serviços jurídicos.",
    link: "#", pubDate: new Date(Date.now() - 14400000).toISOString(), source: "Migalhas", category: "tributario",
    imageUrl: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&h=250&fit=crop",
  },
  {
    id: "6", title: "STJ consolida tese sobre responsabilidade civil em redes sociais",
    description: "O Superior Tribunal de Justiça fixou entendimento sobre a responsabilidade de plataformas digitais por conteúdos ofensivos publicados por usuários.",
    link: "#", pubDate: new Date(Date.now() - 18000000).toISOString(), source: "JOTA", category: "civil",
    imageUrl: "https://images.unsplash.com/photo-1532619675605-1ede6c2ed2b0?w=400&h=250&fit=crop",
  },
  {
    id: "7", title: "Código Penal: projeto de lei prevê endurecimento de penas para crimes digitais",
    description: "Projeto em tramitação no Congresso Nacional propõe aumento de penas para crimes cibernéticos, incluindo fraudes bancárias e invasão de dispositivos.",
    link: "#", pubDate: new Date(Date.now() - 21600000).toISOString(), source: "ConJur", category: "penal",
    imageUrl: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=250&fit=crop",
  },
  {
    id: "8", title: "Licenciamento ambiental ganha nova regulamentação federal",
    description: "A nova lei do licenciamento ambiental estabelece prazos e procedimentos padronizados para todo o território nacional.",
    link: "#", pubDate: new Date(Date.now() - 25200000).toISOString(), source: "Migalhas", category: "ambiental",
    imageUrl: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&h=250&fit=crop",
  },
];

function formatTimeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}min atrás`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h atrás`;
  return `${Math.floor(hours / 24)}d atrás`;
}

export default function NoticiasPage() {
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");

  const filtered = DEMO_NEWS.filter((n) => {
    const matchCat = category === "all" || n.category === category;
    const q = search.toLowerCase();
    const matchSearch = !q || n.title.toLowerCase().includes(q) || n.description.toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl text-foreground">Notícias Jurídicas</h1>
        <p className="text-sm text-muted-foreground">Fique atualizado com as últimas notícias do mundo jurídico</p>
      </div>

      {/* Search + Categories */}
      <Card className="border-border bg-card">
        <CardContent className="space-y-3 p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar notícias..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((c) => (
              <Badge
                key={c.id}
                variant={category === c.id ? "default" : "outline"}
                className={`cursor-pointer transition-colors ${category === c.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                onClick={() => setCategory(c.id)}
              >
                {c.label}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Featured */}
      {filtered.length > 0 && (
        <Card className="group cursor-pointer overflow-hidden border-border bg-card transition-shadow hover:shadow-lg">
          <div className="grid md:grid-cols-2">
            <div className="relative h-48 md:h-auto">
              <img src={filtered[0].imageUrl!} alt="" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
              <Badge className="absolute left-3 top-3 bg-primary text-primary-foreground">{CATEGORIES.find(c => c.id === filtered[0].category)?.label || filtered[0].category}</Badge>
            </div>
            <CardContent className="flex flex-col justify-center p-6">
              <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-medium">{filtered[0].source}</span>
                <span>•</span>
                <Clock className="h-3 w-3" />
                <span>{formatTimeAgo(filtered[0].pubDate)}</span>
              </div>
              <h2 className="font-display text-xl text-foreground mb-2">{filtered[0].title}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{filtered[0].description}</p>
              <Button variant="link" className="mt-3 w-fit gap-1.5 p-0 text-primary">
                Ler mais <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </CardContent>
          </div>
        </Card>
      )}

      {/* Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.slice(1).map((n) => (
          <Card key={n.id} className="group cursor-pointer overflow-hidden border-border bg-card transition-shadow hover:shadow-md">
            <div className="relative h-40 overflow-hidden">
              <img src={n.imageUrl!} alt="" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
              <Badge className="absolute left-3 top-3 bg-primary/90 text-primary-foreground text-[10px]">{CATEGORIES.find(c => c.id === n.category)?.label || n.category}</Badge>
            </div>
            <CardContent className="p-4">
              <div className="mb-1.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                <span className="font-medium">{n.source}</span>
                <span>•</span>
                <Clock className="h-3 w-3" />
                <span>{formatTimeAgo(n.pubDate)}</span>
              </div>
              <h3 className="font-display text-sm text-foreground leading-tight mb-1.5">{n.title}</h3>
              <p className="text-xs text-muted-foreground line-clamp-2">{n.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center py-20 text-center">
          <Newspaper className="mb-4 h-12 w-12 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Nenhuma notícia encontrada para esta categoria.</p>
        </div>
      )}
    </div>
  );
}
