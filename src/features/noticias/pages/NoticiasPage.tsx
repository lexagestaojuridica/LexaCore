import { useState, useMemo } from "react";
import { useDebounce } from "@/shared/hooks/useDebounce";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Newspaper, ExternalLink, Search, Clock, ArrowLeft, RefreshCw,
  Scale, Briefcase, FileText, Shield, Building2, Users, Landmark, ShoppingBag,
  Sparkles, TrendingUp, BookOpen, Star
} from "lucide-react";
import { Card, CardContent } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Skeleton } from "@/shared/ui/skeleton";
import { cn } from "@/shared/lib/utils";
import DOMPurify from "dompurify";

// ─── Categories with icons and colors ────────────────────────

const CATEGORIES = [
  { id: "all", label: "Todas", icon: Sparkles, color: "text-primary" },
  { id: "trabalhista", label: "Trabalhista", icon: Users, color: "text-blue-500" },
  { id: "civil", label: "Cível", icon: FileText, color: "text-emerald-500" },
  { id: "penal", label: "Penal", icon: Shield, color: "text-red-500" },
  { id: "tributário", label: "Tributário", icon: Landmark, color: "text-amber-500" },
  { id: "constitucional", label: "Constitucional", icon: Scale, color: "text-purple-500" },
  { id: "empresarial", label: "Empresarial", icon: Building2, color: "text-cyan-500" },
  { id: "administrativo", label: "Administrativo", icon: Briefcase, color: "text-orange-500" },
  { id: "consumidor", label: "Consumidor", icon: ShoppingBag, color: "text-pink-500" },
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
  if (mins < 60) return `${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(dateStr).toLocaleDateString("pt-BR");
}

const PLACEHOLDER_IMAGES = [
  "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1521791136064-7986c2920216?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1532619675605-1ede6c2ed2b0?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1563986768609-322da13575f2?w=600&h=400&fit=crop",
];

function getPlaceholderImage(index: number) {
  return PLACEHOLDER_IMAGES[index % PLACEHOLDER_IMAGES.length];
}

// ─── NoticiasPage (Lawletter) ─────────────────────────────────

export default function NoticiasPage() {
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const [selectedArticle, setSelectedArticle] = useState<NewsItem | null>(null);

  const { data: news = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["rss-news"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("rss-proxy");
      if (error) throw error;
      const items = (data?.items || []) as NewsItem[];
      return items.map((item, i) => ({
        ...item,
        category: item.category ? item.category.toLowerCase() : classifyCategory(item.title, item.description),
        imageUrl: item.imageUrl || getPlaceholderImage(i),
      }));
    },
    staleTime: 5 * 60 * 1000,
  });

  const filtered = useMemo(() => news.filter((n) => {
    const matchCat = category === "all" || n.category === category;
    const q = debouncedSearch.toLowerCase();
    const matchSearch = !q || n.title.toLowerCase().includes(q) || n.description.toLowerCase().includes(q);
    return matchCat && matchSearch;
  }), [news, category, debouncedSearch]);

  const heroArticle = filtered[0];
  const restArticles = filtered.slice(1);

  // ── Article Detail View ─────────────────────────────────
  if (selectedArticle) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
        <Button variant="ghost" className="gap-2 text-muted-foreground hover:text-foreground -ml-2" onClick={() => setSelectedArticle(null)}>
          <ArrowLeft className="h-4 w-4" /> Voltar para Lawletter
        </Button>

        <article className="mx-auto max-w-3xl">
          {selectedArticle.imageUrl && (
            <div className="relative mb-8 h-64 sm:h-80 overflow-hidden rounded-2xl">
              <img src={selectedArticle.imageUrl} alt="" className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm text-xs">{selectedArticle.source}</Badge>
                  {selectedArticle.category && selectedArticle.category !== "all" && (
                    <Badge className="bg-primary/80 text-white border-primary/40 text-xs">
                      {CATEGORIES.find(c => c.id === selectedArticle.category)?.label || selectedArticle.category}
                    </Badge>
                  )}
                  <span className="flex items-center gap-1 text-xs text-white/80">
                    <Clock className="h-3 w-3" /> {formatTimeAgo(selectedArticle.pubDate)}
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight">{selectedArticle.title}</h1>
              </div>
            </div>
          )}

          {!selectedArticle.imageUrl && (
            <>
              <div className="flex flex-wrap items-center gap-2 mb-4 text-xs text-muted-foreground">
                <Badge variant="outline">{selectedArticle.source}</Badge>
                {selectedArticle.category && selectedArticle.category !== "all" && (
                  <Badge className="bg-primary/10 text-primary border-primary/20">
                    {CATEGORIES.find(c => c.id === selectedArticle.category)?.label || selectedArticle.category}
                  </Badge>
                )}
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {formatTimeAgo(selectedArticle.pubDate)}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground leading-tight mb-6">{selectedArticle.title}</h1>
            </>
          )}

          {selectedArticle.fullContent ? (
            <div
              className="prose prose-sm max-w-none text-foreground/90 leading-relaxed
                                [&_img]:rounded-xl [&_img]:my-4 [&_a]:text-primary [&_a]:underline
                                [&_p]:mb-3 [&_h2]:font-bold [&_h2]:text-lg [&_h2]:mt-6 [&_h2]:mb-2
                                [&_h3]:font-bold [&_h3]:text-base [&_h3]:mt-4 [&_h3]:mb-2
                                [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5
                                [&_blockquote]:border-l-2 [&_blockquote]:border-primary/30 [&_blockquote]:pl-4 [&_blockquote]:italic"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(selectedArticle.fullContent) }}
            />
          ) : (
            <div className="space-y-4">
              <p className="text-foreground/90 leading-relaxed text-base">{selectedArticle.description}</p>
              <p className="text-sm text-muted-foreground italic">O conteúdo completo está disponível no site original.</p>
            </div>
          )}

          <div className="mt-10 flex gap-3 border-t border-border pt-6">
            <Button variant="outline" onClick={() => setSelectedArticle(null)} className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Voltar
            </Button>
            {selectedArticle.link && selectedArticle.link !== "#" && (
              <Button asChild className="gap-2">
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

  // ── Main Lawletter Page ─────────────────────────────────
  return (
    <div className="space-y-6 animate-in fade-in duration-300">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <BookOpen className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground tracking-tight">Lawletter</h1>
            <p className="text-xs text-muted-foreground">Curadoria jurídica · Atualizado em tempo real</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="gap-1.5 text-xs">
          <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} /> Atualizar
        </Button>
      </div>

      {/* ── Search + Category Filters ── */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
          <Input
            placeholder="Buscar por tema, palavra-chave..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-10 bg-muted/30 border-border/50 focus-visible:ring-primary/20"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((c) => {
            const Icon = c.icon;
            const isActive = category === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setCategory(c.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm scale-105"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent hover:border-border/50"
                )}
              >
                <Icon className="h-3 w-3" />
                {c.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Loading State ── */}
      {isLoading ? (
        <div className="space-y-6">
          <Skeleton className="h-72 w-full rounded-2xl" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="h-40 w-full" />
                <CardContent className="p-4 space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* ── Hero / Destaque da Semana ── */}
          {heroArticle && (
            <div
              className="group relative cursor-pointer overflow-hidden rounded-2xl border border-border/50 bg-card shadow-sm transition-all hover:shadow-xl"
              onClick={() => setSelectedArticle(heroArticle)}
            >
              <div className="grid md:grid-cols-5">
                <div className="relative md:col-span-3 h-56 md:h-72 overflow-hidden">
                  <img
                    src={heroArticle.imageUrl!}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    onError={(e) => { (e.target as HTMLImageElement).src = getPlaceholderImage(0); }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/20 to-transparent md:bg-gradient-to-r" />
                  <div className="absolute top-4 left-4 flex items-center gap-2">
                    <Badge className="bg-amber-500/90 text-white border-amber-600/30 shadow-sm gap-1 text-[10px]">
                      <Star className="h-3 w-3" /> Destaque
                    </Badge>
                    {heroArticle.category && heroArticle.category !== "all" && (
                      <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm text-[10px]">
                        {CATEGORIES.find(c => c.id === heroArticle.category)?.label}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="md:col-span-2 flex flex-col justify-center p-6 md:p-8">
                  <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground/70">{heroArticle.source}</span>
                    <span className="text-border">•</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {formatTimeAgo(heroArticle.pubDate)}</span>
                  </div>
                  <h2 className="text-lg md:text-xl font-bold text-foreground leading-snug mb-3 line-clamp-3">
                    {heroArticle.title}
                  </h2>
                  <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3 mb-4">
                    {heroArticle.description}
                  </p>
                  <span className="inline-flex items-center gap-1.5 text-sm text-primary font-semibold group-hover:gap-2.5 transition-all">
                    Ler matéria completa <TrendingUp className="h-3.5 w-3.5" />
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ── Articles Grid ── */}
          {restArticles.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {restArticles.map((n, i) => {
                const catInfo = CATEGORIES.find(c => c.id === n.category);
                return (
                  <Card
                    key={`${n.source}-${i}`}
                    className="group cursor-pointer overflow-hidden border-border/50 bg-card transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
                    onClick={() => setSelectedArticle(n)}
                  >
                    <div className="relative h-40 overflow-hidden">
                      <img
                        src={n.imageUrl!}
                        alt=""
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                        onError={(e) => { (e.target as HTMLImageElement).src = getPlaceholderImage(i + 1); }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      {n.category && n.category !== "all" && (
                        <Badge className="absolute left-3 top-3 bg-black/40 text-white border-white/20 backdrop-blur-sm text-[10px]">
                          {catInfo?.label || n.category}
                        </Badge>
                      )}
                    </div>
                    <CardContent className="p-4">
                      <div className="mb-2 flex items-center gap-2 text-[11px] text-muted-foreground">
                        <span className="font-semibold">{n.source}</span>
                        <span className="text-border">•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-2.5 w-2.5" /> {formatTimeAgo(n.pubDate)}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-foreground leading-snug mb-1.5 line-clamp-2 group-hover:text-primary transition-colors">
                        {n.title}
                      </h3>
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{n.description}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── Empty State ── */}
      {!isLoading && filtered.length === 0 && (
        <div className="flex flex-col items-center py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted/50 mb-4">
            <Newspaper className="h-8 w-8 text-muted-foreground/30" />
          </div>
          <p className="text-sm font-medium text-foreground mb-1">
            {news.length === 0 ? "Não foi possível carregar" : "Nenhuma notícia encontrada"}
          </p>
          <p className="text-xs text-muted-foreground">
            {news.length === 0 ? "Verifique sua conexão e tente novamente." : "Tente outra categoria ou termo de busca."}
          </p>
          {news.length === 0 && (
            <Button variant="outline" className="mt-4 gap-2" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" /> Tentar novamente
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
