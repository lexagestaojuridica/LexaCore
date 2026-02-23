import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import {
  Scale, Users, CalendarDays, Clock, CheckCircle2,
  TrendingUp, Plus, Briefcase, FileText, ChevronRight,
  Target, BarChart3, ChevronUp, MapPin, Video, Zap,
  Timer, DollarSign, AlertTriangle, ArrowRight, Sparkles,
  Eye, Activity, Bell
} from "lucide-react";
import { format, formatDistanceToNow, isToday, isTomorrow, parseISO, addDays, differenceInMinutes, isAfter, isBefore, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";

// ─── Types ────────────────────────────────────────────────────
interface Evento { id: string; title: string; start_time: string; end_time: string; category: string | null; }
interface Processo { id: string; title: string; status: string; number: string | null; updated_at: string; }

// ─── Helpers ──────────────────────────────────────────────────
const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const categoryMeta: Record<string, { label: string; color: string; dot: string; icon: any }> = {
  audiencia: { label: "Audiência", color: "text-rose-600 bg-rose-500/10", dot: "bg-rose-500", icon: AlertTriangle },
  prazo: { label: "Prazo", color: "text-amber-600 bg-amber-500/10", dot: "bg-amber-500", icon: Clock },
  reuniao: { label: "Reunião", color: "text-blue-600 bg-blue-500/10", dot: "bg-blue-500", icon: Users },
  compromisso: { label: "Compromisso", color: "text-emerald-600 bg-emerald-500/10", dot: "bg-emerald-500", icon: CalendarDays },
  lembrete: { label: "Lembrete", color: "text-gray-600 bg-gray-500/10", dot: "bg-gray-500", icon: Bell },
};
function getCatMeta(cat: string | null) { return categoryMeta[cat ?? "compromisso"] ?? categoryMeta.lembrete; }

function isHappeningNow(event: Evento) {
  const now = new Date();
  return isAfter(now, parseISO(event.start_time)) && isBefore(now, parseISO(event.end_time));
}

function getDurationLabel(start: string, end: string): string {
  const mins = differenceInMinutes(parseISO(end), parseISO(start));
  if (mins < 60) return `${mins}min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h${m}min` : `${h}h`;
}

// ─── Timeline Event ──────────────────────────────────────────

function TimelineEvent({ event, isLast, onNavigate }: { event: Evento; isLast: boolean; onNavigate: () => void }) {
  const meta = getCatMeta(event.category);
  const start = parseISO(event.start_time);
  const end = parseISO(event.end_time);
  const happening = isHappeningNow(event);
  const duration = getDurationLabel(event.start_time, event.end_time);
  const CatIcon = meta.icon;

  return (
    <div className="flex gap-3 cursor-pointer group" onClick={onNavigate}>
      <div className="flex flex-col items-center shrink-0">
        <div className={cn(
          "h-3 w-3 rounded-full border-2 mt-1 transition-all",
          happening
            ? "border-primary bg-primary animate-pulse"
            : `border-current ${meta.dot.replace("bg-", "text-")} bg-background`
        )} />
        {!isLast && <div className="w-px flex-1 bg-border/60 mt-1" />}
      </div>

      <div className={cn("flex-1 pb-4 min-w-0", happening && "relative")}>
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
              <div className="flex items-center gap-2">
                <CatIcon className={cn("h-3.5 w-3.5 shrink-0", meta.color.split(" ")[0])} />
                <p className="text-sm font-medium text-foreground truncate leading-tight">{event.title}</p>
              </div>
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
        .gte("start_time", startOfDay(new Date()).toISOString())
        .lte("start_time", addDays(new Date(), 14).toISOString())
        .order("start_time", { ascending: true })
        .limit(30);
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
        .limit(5);
      return (data ?? []) as Processo[];
    },
    enabled: !!orgId,
  });

  // ── Financial KPIs ──
  const { data: stats } = useQuery({
    queryKey: ["fin_meudia", orgId],
    queryFn: async () => {
      const [{ data: receber }, { data: pagar }, { count: processos }, { count: clientes }] =
        await Promise.all([
          supabase.from("contas_receber").select("amount").eq("organization_id", orgId!).eq("status", "pendente"),
          supabase.from("contas_pagar").select("amount").eq("organization_id", orgId!).eq("status", "pendente"),
          supabase.from("processos_juridicos").select("*", { count: "exact", head: true }).eq("organization_id", orgId!).eq("status", "ativo"),
          supabase.from("clients").select("*", { count: "exact", head: true }).eq("organization_id", orgId!),
        ]);
      return {
        aReceber: receber?.reduce((s, c) => s + Number(c.amount), 0) ?? 0,
        aPagar: pagar?.reduce((s, c) => s + Number(c.amount), 0) ?? 0,
        totalProcessos: processos ?? 0,
        totalClientes: clientes ?? 0,
      };
    },
    enabled: !!orgId,
  });

  // ── Timesheet today ──
  const { data: timesheetToday } = useQuery({
    queryKey: ["timesheet_today", orgId, user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("timesheet_entries")
        .select("duration_minutes, billing_status")
        .eq("user_id", user!.id)
        .gte("date", format(new Date(), "yyyy-MM-dd"))
        .lte("date", format(new Date(), "yyyy-MM-dd"));
      const totalMins = data?.reduce((s, e) => s + (e.duration_minutes || 0), 0) ?? 0;
      const billable = data?.filter(e => e.billing_status === "a_faturar" || e.billing_status === "faturado")
        .reduce((s, e) => s + (e.duration_minutes || 0), 0) ?? 0;
      return { totalMins, billable, entries: data?.length ?? 0 };
    },
    enabled: !!user && !!orgId,
  });

  const todayEvents = eventos.filter((e) => isToday(parseISO(e.start_time)));
  const tomorrowEvents = eventos.filter((e) => isTomorrow(parseISO(e.start_time)));
  const futureEvents = eventos.filter((e) => !isToday(parseISO(e.start_time)) && !isTomorrow(parseISO(e.start_time))).slice(0, 4);
  const urgentEvents = todayEvents.filter((e) => e.category === "audiencia" || e.category === "prazo");
  const happeningNowCount = todayEvents.filter(isHappeningNow).length;

  // Timesheet helpers
  const totalHoursToday = timesheetToday ? Math.floor(timesheetToday.totalMins / 60) : 0;
  const totalMinsRemainder = timesheetToday ? timesheetToday.totalMins % 60 : 0;
  const targetDailyMinutes = 8 * 60; // 8h goal
  const progressPct = timesheetToday ? Math.min(100, Math.round((timesheetToday.totalMins / targetDailyMinutes) * 100)) : 0;

  // Animations
  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
  const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="max-w-7xl mx-auto space-y-6 pb-10">

      {/* ── Compact Header ── */}
      <motion.div variants={item} className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {greeting}, <span className="text-primary">{displayName}</span>
          </h1>
          <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
            <CalendarDays className="h-3.5 w-3.5" />
            {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
            {todayEvents.length > 0 && (
              <span className="ml-2 text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                {todayEvents.length} compromisso{todayEvents.length !== 1 ? "s" : ""}
              </span>
            )}
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => navigate("/dashboard/processos")}>
            <Plus className="h-3 w-3" /> Processo
          </Button>
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => navigate("/dashboard/minutas")}>
            <FileText className="h-3 w-3" /> Minuta
          </Button>
          <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={() => navigate("/dashboard/agenda")}>
            <CalendarDays className="h-3 w-3" /> Compromisso
          </Button>
        </div>
      </motion.div>

      {/* ── KPIs Row ── */}
      <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: "Processos Ativos", val: stats?.totalProcessos ?? 0, icon: Scale, color: "text-blue-600 bg-blue-500/8" },
          { label: "Clientes", val: stats?.totalClientes ?? 0, icon: Users, color: "text-indigo-600 bg-indigo-500/8" },
          { label: "Eventos Hoje", val: todayEvents.length, icon: CalendarDays, color: "text-emerald-600 bg-emerald-500/8", badge: happeningNowCount > 0 ? `${happeningNowCount} agora` : undefined },
          { label: "A Receber", val: stats ? fmt(stats.aReceber) : "—", icon: TrendingUp, color: "text-amber-600 bg-amber-500/8" },
          { label: "A Pagar", val: stats ? fmt(stats.aPagar) : "—", icon: DollarSign, color: "text-rose-600 bg-rose-500/8" },
        ].map((kpi, i) => (
          <div key={i} className="flex items-center gap-3 bg-card border border-border/50 rounded-xl p-3.5 shadow-sm hover:shadow-md transition-shadow">
            <div className={cn("p-2 rounded-lg", kpi.color)}>
              <kpi.icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{kpi.label}</p>
              <div className="flex items-center gap-1.5">
                <p className="text-lg font-bold leading-none mt-0.5">{kpi.val}</p>
                {kpi.badge && (
                  <span className="text-[8px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full animate-pulse">
                    {kpi.badge}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </motion.div>

      {/* ── Urgent Alert ── */}
      {urgentEvents.length > 0 && (
        <motion.div variants={item} className="p-3 bg-red-500/5 border border-red-500/20 rounded-xl flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-red-700 dark:text-red-400">Atenção Prioritária</p>
            <p className="text-xs text-red-600/70">{urgentEvents.length} prazo(s)/audiência(s) urgente(s) hoje</p>
          </div>
          <Button size="sm" variant="outline" className="border-red-500/30 text-red-600 hover:bg-red-500/10 shrink-0 h-8 text-xs" onClick={() => navigate("/dashboard/agenda")}>
            Ver detalhes
          </Button>
        </motion.div>
      )}

      {/* ── Main 3-Column Layout ── */}
      <div className="grid lg:grid-cols-[1fr_1fr_320px] gap-6">

        {/* ── Column 1: Agenda Today ── */}
        <motion.div variants={item} className="space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" />
              Agenda de Hoje
            </h2>
            <Button variant="ghost" size="sm" className="text-xs text-primary h-7" onClick={() => navigate("/dashboard/agenda")}>
              Ver tudo <ChevronRight className="h-3 w-3 ml-0.5" />
            </Button>
          </div>

          {todayEvents.length === 0 ? (
            <Card className="shadow-none border-border/50 bg-card">
              <CardContent className="p-8 text-center">
                <CheckCircle2 className="h-10 w-10 text-emerald-500/20 mx-auto mb-3" />
                <p className="font-medium text-foreground">Agenda livre</p>
                <p className="text-sm text-muted-foreground mt-1">Nenhum compromisso marcado para hoje.</p>
                <Button size="sm" variant="outline" className="mt-4 text-xs" onClick={() => navigate("/dashboard/agenda")}>
                  <Plus className="h-3 w-3 mr-1" /> Agendar compromisso
                </Button>
              </CardContent>
            </Card>
          ) : (
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
          )}

          {/* Tomorrow preview */}
          {tomorrowEvents.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                <ArrowRight className="h-3 w-3" /> Amanhã · {tomorrowEvents.length} compromisso{tomorrowEvents.length !== 1 ? "s" : ""}
              </h3>
              <div className="space-y-2">
                {tomorrowEvents.slice(0, 3).map((e) => {
                  const m = getCatMeta(e.category);
                  return (
                    <div key={e.id} className="bg-card border border-border/40 rounded-lg px-3 py-2 flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/20 transition-colors" onClick={() => navigate("/dashboard/agenda")}>
                      <div className={cn("h-2 w-2 rounded-full shrink-0", m.dot)} />
                      <span className="truncate flex-1">{e.title}</span>
                      <span className="text-xs text-muted-foreground shrink-0">{format(parseISO(e.start_time), "HH:mm")}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </motion.div>

        {/* ── Column 2: Productivity & Financeiro ── */}
        <motion.div variants={item} className="space-y-5">

          {/* Timesheet Today */}
          <Card className="shadow-none border-border/50">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Timer className="h-4 w-4 text-primary" /> Horas Hoje
                </h3>
                <Button variant="ghost" size="sm" className="text-xs text-primary h-7" onClick={() => navigate("/dashboard/timesheet")}>
                  Timesheet <ChevronRight className="h-3 w-3 ml-0.5" />
                </Button>
              </div>
              <div className="flex items-end gap-3">
                <p className="text-3xl font-bold leading-none">
                  {totalHoursToday}<span className="text-lg font-medium text-muted-foreground">h</span>
                  {totalMinsRemainder > 0 && <span className="text-lg text-muted-foreground">{totalMinsRemainder}m</span>}
                </p>
                <span className="text-xs text-muted-foreground">de 8h</span>
              </div>
              <Progress value={progressPct} className="h-1.5" />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{timesheetToday?.entries ?? 0} lançamentos</span>
                <span>{progressPct}% da meta diária</span>
              </div>
            </CardContent>
          </Card>

          {/* Performance */}
          <Card className="shadow-none border-border/50">
            <CardContent className="p-4 space-y-4">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" /> Desempenho
              </h3>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Prazos cumpridos</span>
                    <span className="font-medium text-emerald-600 flex items-center gap-0.5"><ChevronUp className="h-3 w-3" /> 82%</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: "82%" }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Ocupação da agenda</span>
                    <span className="font-medium">{Math.round((todayEvents.length / 10) * 100)}%</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary/70 rounded-full transition-all" style={{ width: `${Math.min(100, (todayEvents.length / 10) * 100)}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Meta de horas</span>
                    <span className="font-medium">{progressPct}%</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${progressPct}%` }} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Financial Overview */}
          <Card className="shadow-none border-border/50">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-primary" /> Financeiro
                </h3>
                <Button variant="ghost" size="sm" className="text-xs text-primary h-7" onClick={() => navigate("/dashboard/financeiro")}>
                  Detalhes <ChevronRight className="h-3 w-3 ml-0.5" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-lg p-3">
                  <p className="text-[10px] font-medium text-emerald-600 uppercase tracking-wider">A Receber</p>
                  <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400 mt-0.5">{stats ? fmt(stats.aReceber) : "—"}</p>
                </div>
                <div className="bg-rose-500/5 border border-rose-500/10 rounded-lg p-3">
                  <p className="text-[10px] font-medium text-rose-600 uppercase tracking-wider">A Pagar</p>
                  <p className="text-lg font-bold text-rose-700 dark:text-rose-400 mt-0.5">{stats ? fmt(stats.aPagar) : "—"}</p>
                </div>
              </div>
              {stats && (stats.aReceber - stats.aPagar) !== 0 && (
                <div className="text-xs text-muted-foreground text-center pt-1">
                  Saldo: <span className={cn("font-semibold", stats.aReceber >= stats.aPagar ? "text-emerald-600" : "text-rose-600")}>
                    {fmt(stats.aReceber - stats.aPagar)}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* ── Column 3: Sidebar — Processes & Quick Access ── */}
        <motion.div variants={item} className="space-y-5">

          {/* Upcoming events */}
          {futureEvents.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Eye className="h-4 w-4 text-primary" /> Próximos Dias
              </h3>
              <div className="space-y-2">
                {futureEvents.map((e) => {
                  const m = getCatMeta(e.category);
                  const d = parseISO(e.start_time);
                  return (
                    <div key={e.id} className="bg-card border border-border/40 rounded-lg p-2.5 flex items-start gap-2.5 hover:border-primary/20 transition-colors cursor-pointer" onClick={() => navigate("/dashboard/agenda")}>
                      <div className={cn("h-2 w-2 rounded-full shrink-0 mt-1.5", m.dot)} />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium truncate">{e.title}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {format(d, "EEE, dd/MM", { locale: ptBR })} · {format(d, "HH:mm")}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recent Processes */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" /> Movimentações
              </h3>
              <Button variant="ghost" size="sm" className="text-xs text-primary h-6 px-2" onClick={() => navigate("/dashboard/processos")}>
                Ver tudo
              </Button>
            </div>
            {processos.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhuma movimentação recente.</p>
            ) : (
              <div className="space-y-2">
                {processos.map((p) => (
                  <div key={p.id} className="bg-card border border-border/40 rounded-lg p-2.5 hover:bg-muted/20 transition-colors cursor-pointer" onClick={() => navigate("/dashboard/processos")}>
                    <p className="text-xs font-medium line-clamp-1">{p.title}</p>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-1">
                      <span>{p.number || "Sem numeração"}</span>
                      <span>{formatDistanceToNow(parseISO(p.updated_at), { locale: ptBR, addSuffix: true })}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <Card className="shadow-none border-border/50 bg-gradient-to-br from-primary/5 to-transparent">
            <CardContent className="p-4 space-y-2.5">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" /> Atalhos
              </h3>
              {[
                { label: "Novo Processo", icon: Scale, path: "/dashboard/processos" },
                { label: "Iniciar Timer", icon: Timer, path: "/dashboard/timesheet" },
                { label: "Nova Minuta", icon: FileText, path: "/dashboard/minutas" },
                { label: "CRM Pipeline", icon: Target, path: "/dashboard/crm" },
              ].map((action) => (
                <Button
                  key={action.label}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start gap-2 text-xs h-8 hover:bg-card"
                  onClick={() => navigate(action.path)}
                >
                  <action.icon className="h-3.5 w-3.5 text-primary" />
                  {action.label}
                </Button>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
