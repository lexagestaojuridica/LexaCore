import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Newspaper, ExternalLink, Search, Clock, ArrowLeft, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import DOMPurify from "dompurify";

const CATEGORIES = [
  { id: "all", label: "Todas" },
  { id: "trabalhista", label: "Trabalhista" },
  { id: "civil", label: "Cível" },
  { id: "penal", label: "Penal" },
  { id: "tributário", label: "Tributário" },
  { id: "constitucional", label: "Constitucional" },
  { id: "empresarial", label: "Empresarial" },
  { id: "administrativo", label: "Administrativo" },
  { id: "consumidor", label: "Consumidor" },
];

type NewsItem = {
  title: string;
  description: string;
  fullContent: string;
  link: string;
  pubDate: string;
  source: string;
  category: string | null;
  imageUrl: string | null;
};

function classifyCategory(title: string, description: string): string {
  const text = `${title} ${description}`.toLowerCase();
  if (/trabalh|clt|emprego|demiss|rescis|sindicato|tst/i.test(text)) return "trabalhista";
  if (/penal|crim|pris|delegacia|polí|stf.*penal|homicíd/i.test(text)) return "penal";
  if (/tribut|impost|icms|ipi|irpf|irpj|fiscal|sefaz|receita federal/i.test(text)) return "tributário";
  if (/constitucio|stf|supremo|fundamental|constituiç/i.test(text)) return "constitucional";
  if (/empresar|societ|falência|recuperação judicial|licitaç/i.test(text)) return "empresarial";
  if (/administrat|servidor|concurso|licitaç|cgu|tcu/i.test(text)) return "administrativo";
  if (/consumidor|cdc|procon|produto|serviço.*defeit/i.test(text)) return "consumidor";
  if (/cível|civil|indeniza|dano|responsabilid|contrato|obrigaç/i.test(text)) return "civil";
  return "all";
}

function formatTimeAgo(dateStr: string) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  if (isNaN(diff)) return "";
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins}min atrás`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h atrás`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d atrás`;
  return new Date(dateStr).toLocaleDateString("pt-BR");
}

const PLACEHOLDER_IMAGES = [
  "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400&h=250&fit=crop",
  "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=400&h=250&fit=crop",
  "https://images.unsplash.com/photo-1521791136064-7986c2920216?w=400&h=250&fit=crop",
  "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&h=250&fit=crop",
  "https://images.unsplash.com/photo-1532619675605-1ede6c2ed2b0?w=400&h=250&fit=crop",
  "https://images.unsplash.com/photo-1563986768609-322da13575f2?w=400&h=250&fit=crop",
];

function getPlaceholderImage(index: number) {
  return PLACEHOLDER_IMAGES[index % PLACEHOLDER_IMAGES.length];
}

export default function NoticiasPage() {
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedArticle, setSelectedArticle] = useState<NewsItem | null>(null);

  const { data: news = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["rss-news"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("rss-proxy");
      if (error) throw error;
      const items = (data?.items || []) as NewsItem[];
      // Classify categories based on content
      return items.map((item, i) => ({
        ...item,
        category: item.category ? item.category.toLowerCase() : classifyCategory(item.title, item.description),
        imageUrl: item.imageUrl || getPlaceholderImage(i),
      }));
    },
    staleTime: 5 * 60 * 1000,
  });

  const filtered = news.filter((n) => {
    const matchCat = category === "all" || n.category === category;
    const q = search.toLowerCase();
    const matchSearch = !q || n.title.toLowerCase().includes(q) || n.description.toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  // Article detail view
  if (selectedArticle) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" className="gap-2 text-muted-foreground hover:text-foreground" onClick={() => setSelectedArticle(null)}>
          <ArrowLeft className="h-4 w-4" /> Voltar para notícias
        </Button>

        <article className="mx-auto max-w-3xl">
          {selectedArticle.imageUrl && (
            <div className="relative mb-6 h-64 overflow-hidden rounded-lg sm:h-80">
              <img src={selectedArticle.imageUrl} alt="" className="h-full w-full object-cover" />
            </div>
          )}

          <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline" className="text-xs">{selectedArticle.source}</Badge>
            {selectedArticle.category && selectedArticle.category !== "all" && (
              <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">
                {CATEGORIES.find(c => c.id === selectedArticle.category)?.label || selectedArticle.category}
              </Badge>
            )}
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {formatTimeAgo(selectedArticle.pubDate)}</span>
          </div>

          <h1 className="font-display text-2xl leading-tight text-foreground sm:text-3xl mb-4">{selectedArticle.title}</h1>

          {selectedArticle.fullContent ? (
            <div
              className="prose prose-sm max-w-none text-foreground/90 leading-relaxed 
                [&_img]:rounded-lg [&_img]:my-4 [&_a]:text-primary [&_a]:underline
                [&_p]:mb-3 [&_h2]:font-display [&_h2]:text-lg [&_h2]:mt-6 [&_h2]:mb-2
                [&_h3]:font-display [&_h3]:text-base [&_h3]:mt-4 [&_h3]:mb-2
                [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5
                [&_blockquote]:border-l-2 [&_blockquote]:border-primary/30 [&_blockquote]:pl-4 [&_blockquote]:italic"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(selectedArticle.fullContent) }}
            />
          ) : (
            <div className="space-y-4">
              <p className="text-foreground/90 leading-relaxed">{selectedArticle.description}</p>
              <p className="text-sm text-muted-foreground italic">O conteúdo completo está disponível no site original.</p>
            </div>
          )}

          <div className="mt-8 flex gap-3 border-t border-border pt-4">
            <Button variant="outline" onClick={() => setSelectedArticle(null)} className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Voltar
            </Button>
            {selectedArticle.link && selectedArticle.link !== "#" && (
              <Button asChild className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
                <a href={selectedArticle.link} target="_blank" rel="noopener noreferrer">
                  Ler no site original <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            )}
          </div>
        </article>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl text-foreground">Notícias Jurídicas</h1>
          <p className="text-sm text-muted-foreground">Fique atualizado com as últimas notícias do mundo jurídico</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="gap-1.5">
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} /> Atualizar
        </Button>
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

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="overflow-hidden border-border">
              <Skeleton className="h-40 w-full" />
              <CardContent className="p-4 space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <>
          {/* Featured */}
          {filtered.length > 0 && (
            <Card
              className="group cursor-pointer overflow-hidden border-border bg-card transition-shadow hover:shadow-lg"
              onClick={() => setSelectedArticle(filtered[0])}
            >
              <div className="grid md:grid-cols-2">
                <div className="relative h-48 md:h-auto overflow-hidden">
                  <img
                    src={filtered[0].imageUrl!}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    onError={(e) => { (e.target as HTMLImageElement).src = getPlaceholderImage(0); }}
                  />
                  {filtered[0].category && filtered[0].category !== "all" && (
                    <Badge className="absolute left-3 top-3 bg-primary text-primary-foreground">
                      {CATEGORIES.find(c => c.id === filtered[0].category)?.label || filtered[0].category}
                    </Badge>
                  )}
                </div>
                <CardContent className="flex flex-col justify-center p-6">
                  <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-medium">{filtered[0].source}</span>
                    <span>•</span>
                    <Clock className="h-3 w-3" />
                    <span>{formatTimeAgo(filtered[0].pubDate)}</span>
                  </div>
                  <h2 className="font-display text-xl text-foreground mb-2">{filtered[0].title}</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">{filtered[0].description}</p>
                  <span className="mt-3 inline-flex items-center gap-1.5 text-sm text-primary font-medium">
                    Ler notícia <ExternalLink className="h-3.5 w-3.5" />
                  </span>
                </CardContent>
              </div>
            </Card>
          )}

          {/* Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.slice(1).map((n, i) => (
              <Card
                key={`${n.source}-${i}`}
                className="group cursor-pointer overflow-hidden border-border bg-card transition-shadow hover:shadow-md"
                onClick={() => setSelectedArticle(n)}
              >
                <div className="relative h-40 overflow-hidden">
                  <img
                    src={n.imageUrl!}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    onError={(e) => { (e.target as HTMLImageElement).src = getPlaceholderImage(i + 1); }}
                  />
                  {n.category && n.category !== "all" && (
                    <Badge className="absolute left-3 top-3 bg-primary/90 text-primary-foreground text-[10px]">
                      {CATEGORIES.find(c => c.id === n.category)?.label || n.category}
                    </Badge>
                  )}
                </div>
                <CardContent className="p-4">
                  <div className="mb-1.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="font-medium">{n.source}</span>
                    <span>•</span>
                    <Clock className="h-3 w-3" />
                    <span>{formatTimeAgo(n.pubDate)}</span>
                  </div>
                  <h3 className="font-display text-sm text-foreground leading-tight mb-1.5 line-clamp-2">{n.title}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2">{n.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {!isLoading && filtered.length === 0 && (
        <div className="flex flex-col items-center py-20 text-center">
          <Newspaper className="mb-4 h-12 w-12 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">
            {news.length === 0 ? "Não foi possível carregar as notícias. Tente novamente." : "Nenhuma notícia encontrada para esta categoria."}
          </p>
          {news.length === 0 && (
            <Button variant="outline" className="mt-3 gap-2" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" /> Tentar novamente
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
