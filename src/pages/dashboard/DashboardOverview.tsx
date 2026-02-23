import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import {
  Scale, Users, CalendarDays, Clock, CheckCircle2,
  TrendingUp, Plus, Briefcase, FileText, ChevronRight,
  Target, BarChart3, ChevronUp, MapPin, Video, Zap
} from "lucide-react";
import { format, formatDistanceToNow, isToday, isTomorrow, parseISO, addDays, differenceInMinutes, isAfter, isBefore } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

// ─── Types ────────────────────────────────────────────────────
interface Evento { id: string; title: string; start_time: string; end_time: string; category: string | null; location?: string | null; description?: string | null; }
interface Processo { id: string; title: string; status: string; number: string | null; updated_at: string; }

// ─── Helpers ──────────────────────────────────────────────────
const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const categoryMeta: Record<string, { label: string; color: string; dot: string }> = {
  audiencia: { label: "Audiência", color: "text-rose-600 bg-rose-500/10", dot: "bg-rose-500" },
  prazo: { label: "Prazo", color: "text-amber-600 bg-amber-500/10", dot: "bg-amber-500" },
  reuniao: { label: "Reunião", color: "text-blue-600 bg-blue-500/10", dot: "bg-blue-500" },
  compromisso: { label: "Compromisso", color: "text-emerald-600 bg-emerald-500/10", dot: "bg-emerald-500" },
  lembrete: { label: "Lembrete", color: "text-gray-600 bg-gray-500/10", dot: "bg-gray-500" },
};
function getCatMeta(cat: string | null) { return categoryMeta[cat ?? "compromisso"] ?? categoryMeta.lembrete; }

function isHappeningNow(event: Evento) {
  const now = new Date();
  const start = parseISO(event.start_time);
  const end = parseISO(event.end_time);
  return isAfter(now, start) && isBefore(now, end);
}

function getDurationLabel(start: string, end: string): string {
  const mins = differenceInMinutes(parseISO(end), parseISO(start));
  if (mins < 60) return `${mins}min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h${m}min` : `${h}h`;
}

// ─── Enhanced Timeline Event ─────────────────────────────────

function TimelineEvent({ event, isLast, onNavigate }: { event: Evento; isLast: boolean; onNavigate: () => void }) {
  const meta = getCatMeta(event.category);
  const start = parseISO(event.start_time);
  const end = parseISO(event.end_time);
  const happening = isHappeningNow(event);
  const duration = getDurationLabel(event.start_time, event.end_time);

  return (
    <div className="flex gap-3 cursor-pointer group" onClick={onNavigate}>
      {/* Timeline vertical line */}
      <div className="flex flex-col items-center shrink-0">
        <div className={cn(
          "h-3 w-3 rounded-full border-2 mt-1 transition-all",
          happening
            ? "border-primary bg-primary animate-pulse"
            : `border-current ${meta.dot.replace("bg-", "text-")} bg-background`
        )} />
        {!isLast && <div className="w-px flex-1 bg-border/60 mt-1" />}
      </div>

      {/* Content */}
      <div className={cn(
        "flex-1 pb-4 min-w-0",
        happening && "relative"
      )}>
        {happening && (
          <span className="absolute -top-1 right-0 text-[9px] font-bold uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded-full animate-pulse">
            Agora
          </span>
        )}

        <div className={cn(
          "rounded-lg p-3 border transition-all",
          happening
            ? "border-primary/30 bg-primary/5 shadow-sm"
            : "border-border/40 bg-card group-hover:border-primary/20 group-hover:bg-muted/20"
        )}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground truncate leading-tight">{event.title}</p>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className={cn("text-[10px] uppercase font-semibold tracking-wider px-1.5 py-0.5 rounded-md", meta.color)}>
                  {meta.label}
                </span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {format(start, "HH:mm")} — {format(end, "HH:mm")}
                </span>
                <span className="text-[10px] text-muted-foreground/70 bg-muted/50 px-1.5 py-0.5 rounded">
                  {duration}
                </span>
              </div>
              {event.location && (
                <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                  {event.location.startsWith("http") ? <Video className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}
                  <span className="truncate">{event.location}</span>
                </p>
              )}
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground/20 group-hover:text-primary/60 transition-all shrink-0 mt-0.5" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────
export default function DashboardOverview() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const displayName = user?.user_metadata?.full_name?.split(" ")[0] || "Advogado";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";

  // ── Fetch profile / org ──
  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("organization_id").eq("user_id", user!.id).single();
      return data;
    },
    enabled: !!user,
  });
  const orgId = profile?.organization_id;

  // ── All eventos ──
  const { data: eventos = [] } = useQuery({
    queryKey: ["eventos_meudia", orgId],
    queryFn: async () => {
      const { data } = await supabase.from("eventos_agenda")
        .select("id, title, start_time, end_time, category")
        .gte("start_time", new Date().toISOString())
        .lte("start_time", addDays(new Date(), 14).toISOString())
        .order("start_time", { ascending: true })
        .limit(20);
      return (data ?? []) as Evento[];
    },
    enabled: !!orgId,
  });

  // ── Processos recentes ──
  const { data: processos = [] } = useQuery({
    queryKey: ["processos_meudia", orgId],
    queryFn: async () => {
      const { data } = await supabase.from("processos_juridicos")
        .select("id, title, status, number, updated_at")
        .eq("organization_id", orgId!)
        .eq("status", "ativo")
        .order("updated_at", { ascending: false })
        .limit(4);
      return (data ?? []) as Processo[];
    },
    enabled: !!orgId,
  });

  // ── Financial KPIs ──
  const { data: stats } = useQuery({
    queryKey: ["fin_meudia", orgId],
    queryFn: async () => {
      const [{ data: receber }, { count: processos }, { count: clientes }] =
        await Promise.all([
          supabase.from("contas_receber").select("amount").eq("organization_id", orgId!).eq("status", "pendente"),
          supabase.from("processos_juridicos").select("*", { count: "exact", head: true }).eq("organization_id", orgId!).eq("status", "ativo"),
          supabase.from("clients").select("*", { count: "exact", head: true }).eq("organization_id", orgId!),
        ]);
      return {
        aReceber: receber?.reduce((s, c) => s + Number(c.amount), 0) ?? 0,
        totalProcessos: processos ?? 0,
        totalClientes: clientes ?? 0,
      };
    },
    enabled: !!orgId,
  });

  const todayEvents = eventos.filter((e) => isToday(parseISO(e.start_time)));
  const futureEvents = eventos.filter((e) => !isToday(parseISO(e.start_time))).slice(0, 5);
  const urgentEvents = todayEvents.filter((e) => e.category === "audiencia" || e.category === "prazo");
  const happeningNowCount = todayEvents.filter(isHappeningNow).length;

  // Animations
  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="max-w-6xl mx-auto space-y-8 pb-10">

      {/* ── Minimal Header ── */}
      <motion.div variants={item} className="flex flex-col md:flex-row md:items-end justify-between gap-4 pt-2">
        <div>
          <h1 className="text-3xl font-light tracking-tight text-foreground">
            {greeting}, <span className="font-semibold">{displayName}</span>
          </h1>
          <p className="mt-1 text-muted-foreground text-sm flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={() => navigate("/dashboard/processos")}>
            <Briefcase className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Processo</span>
          </Button>
          <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={() => navigate("/dashboard/minutas")}>
            <FileText className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Minuta</span>
          </Button>
          <Button size="sm" className="h-9 gap-1.5" onClick={() => navigate("/dashboard/agenda")}>
            <Plus className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Compromisso</span>
          </Button>
        </div>
      </motion.div>

      {/* ── Key Metrics Overview ── */}
      <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Processos Ativos", val: stats?.totalProcessos, icon: Scale, color: "text-blue-600" },
          { label: "Clientes", val: stats?.totalClientes, icon: Users, color: "text-indigo-600" },
          { label: "Eventos Hoje", val: todayEvents.length, icon: Clock, color: "text-emerald-600", badge: happeningNowCount > 0 ? `${happeningNowCount} agora` : undefined },
          { label: "Receita Pendente", val: stats ? fmt(stats.aReceber) : "—", icon: TrendingUp, color: "text-amber-600" },
        ].map((kpi, i) => (
          <div key={i} className="flex items-center gap-4 bg-card border border-border/50 rounded-xl p-4 shadow-sm">
            <div className={cn("p-2.5 rounded-lg bg-muted/50", kpi.color)}>
              <kpi.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">{kpi.label}</p>
              <div className="flex items-center gap-2">
                <p className="text-xl font-bold mt-0.5 leading-none">{kpi.val ?? "—"}</p>
                {kpi.badge && (
                  <span className="text-[9px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full animate-pulse">
                    {kpi.badge}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </motion.div>

      {/* ── Main Layout ── */}
      <div className="grid lg:grid-cols-[1fr_360px] gap-8">

        {/* Left Column: Agenda Focus with Timeline */}
        <motion.div variants={item} className="space-y-8">
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-primary" />
                Sua Agenda Hoje
              </h2>
              <div className="flex items-center gap-2">
                {todayEvents.length > 0 && (
                  <span className="text-xs bg-muted px-2 py-1 rounded-md font-medium">{todayEvents.length} compromissos</span>
                )}
                <Button variant="ghost" size="sm" className="text-xs text-primary h-7" onClick={() => navigate("/dashboard/agenda")}>
                  Ver agenda <ChevronRight className="h-3 w-3 ml-0.5" />
                </Button>
              </div>
            </div>

            {todayEvents.length === 0 ? (
              <Card className="shadow-none border-border/50 bg-card overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex flex-col items-center justify-center p-10 text-center text-muted-foreground">
                    <CheckCircle2 className="h-10 w-10 text-emerald-500/20 mb-3" />
                    <p className="font-medium text-foreground">Agenda livre por enquanto</p>
                    <p className="text-sm">Nenhum compromisso marcado para hoje.</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div>
                {urgentEvents.length > 0 && (
                  <div className="mb-4 p-3 bg-red-500/5 border border-red-500/20 rounded-lg flex items-start gap-3">
                    <div className="h-2 w-2 rounded-full bg-red-500 mt-1.5 animate-pulse" />
                    <div>
                      <p className="text-sm font-semibold text-red-700 dark:text-red-400">Atenção Prioritária</p>
                      <p className="text-xs text-red-600/80 dark:text-red-300">Você tem {urgentEvents.length} prazo(s)/audiência(s) hoje.</p>
                    </div>
                  </div>
                )}

                {/* Timeline View */}
                <div className="pl-1">
                  {todayEvents.map((e, i) => (
                    <TimelineEvent
                      key={e.id}
                      event={e}
                      isLast={i === todayEvents.length - 1}
                      onNavigate={() => navigate("/dashboard/agenda")}
                    />
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Upcoming */}
          {futureEvents.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-muted-foreground flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Próximos Dias
                </h2>
                <Button variant="link" className="text-xs text-primary" onClick={() => navigate("/dashboard/agenda")}>Ver calendário</Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {futureEvents.slice(0, 4).map((e) => {
                  const m = getCatMeta(e.category);
                  const d = parseISO(e.start_time);
                  const endD = parseISO(e.end_time);
                  return (
                    <div key={e.id} className="bg-card border border-border/50 rounded-lg p-3 flex items-start gap-3 hover:border-primary/30 transition-colors cursor-pointer" onClick={() => navigate("/dashboard/agenda")}>
                      <div className={cn("p-2 rounded-md", m.color.split(" ")[1], m.color.split(" ")[0])}><Target className="h-4 w-4" /></div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{e.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {isTomorrow(d) ? "Amanhã" : format(d, "EEE, dd/MM", { locale: ptBR })} • {format(d, "HH:mm")}–{format(endD, "HH:mm")}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </motion.div>

        {/* Right Column: Insights & Quick Info */}
        <motion.div variants={item} className="space-y-6">

          {/* Quick Stats Panel */}
          <Card className="shadow-none border-border/50 bg-gradient-to-br from-muted/30 to-background overflow-hidden relative">
            <div className="absolute right-0 top-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl" />
            <CardContent className="p-5 relative">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" /> Desempenho</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Progresso de Prazos</span>
                    <span className="font-medium text-emerald-600 flex items-center gap-0.5"><ChevronUp className="h-3 w-3" /> 82%</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 w-[82%]" />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Ocupação da Agenda</span>
                    <span className="font-medium">45%</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary/70 w-[45%]" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Processes */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground mb-1">Movimentações Recentes</h3>
            {processos.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhuma movimentação identificada.</p>
            ) : (
              processos.map((p) => (
                <div key={p.id} className="bg-card border border-border/50 rounded-lg p-3 hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => navigate("/dashboard/processos")}>
                  <p className="text-sm font-medium mb-1 line-clamp-1">{p.title}</p>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>{p.number || "Sem numeração"}</span>
                    <span>{formatDistanceToNow(parseISO(p.updated_at), { locale: ptBR, addSuffix: true })}</span>
                  </div>
                </div>
              ))
            )}
            <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground hover:text-primary" onClick={() => navigate("/dashboard/processos")}>
              Ver todos os processos <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
