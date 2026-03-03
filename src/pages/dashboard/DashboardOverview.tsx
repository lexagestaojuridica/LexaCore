import { useAuth } from "@/contexts/AuthContext";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton, KPISkeleton } from "@/components/shared/SkeletonLoaders";
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
import { transform } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useGoogleCalendar } from "@/hooks/useGoogleCalendar";
import { useMicrosoftCalendar } from "@/hooks/useMicrosoftCalendar";
import { useAppleCalendar } from "@/hooks/useAppleCalendar";
import { CalendarEmptyState } from "@/components/dashboard/CalendarEmptyState";

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
  const { t } = useTranslation();
  const displayName = user?.user_metadata?.full_name?.split(" ")[0] || "Advogado";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? t("dashboard.greeting") : hour < 18 ? t("dashboard.greetingAfternoon") : t("dashboard.greetingEvening");

  const gcal = useGoogleCalendar();
  const mscal = useMicrosoftCalendar();
  const appleCal = useAppleCalendar();

  // ── Fetch profile / org ──
  const { data: profile, isLoading: isProfileLoading } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("organization_id").eq("user_id", user!.id).single();
      return data;
    },
    enabled: !!user,
  });
  const orgId = profile?.organization_id;

  // ── All eventos ──
  const { data: eventos = [], isLoading: isEventosLoading } = useQuery({
    queryKey: ["eventos_meudia", orgId],
    queryFn: async () => {
      const { data } = await supabase.from("eventos_agenda")
        .select("id, title, start_time, end_time, category")
        .eq("organization_id", orgId!)
        .gte("start_time", startOfDay(new Date()).toISOString())
        .lte("start_time", addDays(new Date(), 14).toISOString())
        .order("start_time", { ascending: true })
        .limit(30);
      return (data ?? []) as Evento[];
    },
    enabled: !!orgId,
  });

  // ── Processos recentes ──
  const { data: processos = [], isLoading: isProcessosLoading } = useQuery({
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
  const { data: stats, isLoading: isStatsLoading } = useQuery({
    queryKey: ["fin_meudia", orgId],
    queryFn: async () => {
      const [{ data: receber }, { data: pagar }, { count: processos }, { count: clientes }, { data: prazos }] =
        await Promise.all([
          supabase.from("contas_receber").select("amount").eq("organization_id", orgId!).eq("status", "pendente"),
          supabase.from("contas_pagar").select("amount").eq("organization_id", orgId!).eq("status", "pendente"),
          supabase.from("processos_juridicos").select("*", { count: "exact", head: true }).eq("organization_id", orgId!).eq("status", "ativo"),
          supabase.from("clients").select("*", { count: "exact", head: true }).eq("organization_id", orgId!),
          supabase.from("eventos_agenda").select("status").eq("organization_id", orgId!).eq("category", "prazo"),
        ]);

      const totalPrazos = prazos?.length || 0;
      const prazosConcluidos = prazos?.filter(p => p.status === 'concluido').length || 0;
      const deadlinesMetPct = totalPrazos > 0 ? Math.round((prazosConcluidos / totalPrazos) * 100) : 100;

      return {
        aReceber: receber?.reduce((s, c) => s + Number(c.amount), 0) ?? 0,
        aPagar: pagar?.reduce((s, c) => s + Number(c.amount), 0) ?? 0,
        totalProcessos: processos ?? 0,
        totalClientes: clientes ?? 0,
        deadlinesMetPct,
      };
    },
    enabled: !!orgId,
  });

  // ── Timesheet today ──
  const { data: timesheetToday, isLoading: isTimesheetLoading } = useQuery({
    queryKey: ["timesheet_today", orgId, user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("timesheet_entries")
        .select("duration_minutes, billing_status")
        .eq("user_id", user!.id)
        .eq("organization_id", orgId!)
        .gte("started_at", startOfDay(new Date()).toISOString())
        .lte("started_at", endOfDay(new Date()).toISOString());
      const totalMins = data?.reduce((s, e) => s + (e.duration_minutes || 0), 0) ?? 0;
      const billable = data?.filter(e => e.billing_status === "faturado" || e.billing_status === "pendente")
        .reduce((s, e) => s + (e.duration_minutes || 0), 0) ?? 0;
      return { totalMins, billable, entries: data?.length ?? 0 };
    },
    enabled: !!user && !!orgId,
  });

  const isLoading = isProfileLoading || isEventosLoading || isProcessosLoading || isStatsLoading || isTimesheetLoading;

  const todayEvents = eventos.filter((e) => isToday(parseISO(e.start_time)));
  const tomorrowEvents = eventos.filter((e) => isTomorrow(parseISO(e.start_time)));
  const futureEvents = eventos.filter((e) => !isToday(parseISO(e.start_time)) && !isTomorrow(parseISO(e.start_time))).slice(0, 4);
  const urgentEvents = todayEvents.filter((e) => e.category === "audiencia" || e.category === "prazo");
  const happeningNowCount = todayEvents.filter(isHappeningNow).length;

  const fmtReceita = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  const arunaTip = useMemo(() => {
    const todayPrazos = todayEvents.filter(e => e.category === "prazo").length;
    const tomorrowPrazos = tomorrowEvents.filter(e => e.category === "prazo").length;
    const todayAudiencias = todayEvents.filter(e => e.category === "audiencia").length;
    const aReceber = stats?.aReceber ?? 0;
    const aPagar = stats?.aPagar ?? 0;

    if (todayAudiencias > 0)
      return `Você tem ${todayAudiencias} audiência${todayAudiencias > 1 ? "s" : ""} hoje. Verifique os processos antes de entrar na sala.`;
    if (todayPrazos > 0)
      return `Atenção: ${todayPrazos} prazo${todayPrazos > 1 ? "s" : ""} vence${todayPrazos === 1 ? "" : "m"} hoje. Não deixe para a última hora.`;
    if (tomorrowPrazos > 0)
      return `Você tem ${tomorrowPrazos} prazo${tomorrowPrazos > 1 ? "s" : ""} vencendo amanhã. Que tal revisá-${tomorrowPrazos === 1 ? "lo" : "los"} agora?`;
    if (aReceber > 0 && aPagar > 0)
      return `Você tem ${fmtReceita(aReceber)} a receber e ${fmtReceita(aPagar)} a pagar. Fique de olho no fluxo de caixa.`;
    if (aReceber > 0)
      return `Há ${fmtReceita(aReceber)} em honorários pendentes. Que tal gerar uma cobrança PIX para adiantar os recebimentos?`;
    return "Tudo certo por aqui! Use o Timesheet para registrar seu tempo e manter a produtividade em dia.";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todayEvents, tomorrowEvents, stats]);

  const { totalHoursToday, totalMinsRemainder, progressPct, targetDailyMinutes } = useMemo(() => {
    const totalHoursToday = timesheetToday ? Math.floor(timesheetToday.totalMins / 60) : 0;
    const totalMinsRemainder = timesheetToday ? timesheetToday.totalMins % 60 : 0;
    const targetDailyMinutes = 8 * 60; // 8h goal
    const progressPct = timesheetToday ? Math.min(100, Math.round((timesheetToday.totalMins / targetDailyMinutes) * 100)) : 0;
    return { totalHoursToday, totalMinsRemainder, progressPct, targetDailyMinutes };
  }, [timesheetToday]);

  // Animations
  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
  const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };

  if (isLoading) {
    return (
      <div className="h-full flex flex-col gap-3">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
          {Array.from({ length: 5 }).map((_, i) => <KPISkeleton key={i} />)}
        </div>
        <div className="flex-1 grid md:grid-cols-3 gap-4 min-h-0">
          <Skeleton className="md:col-span-2 rounded-xl" />
          <Skeleton className="rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="h-full flex flex-col gap-3 overflow-hidden">

      {/* ── Compact Header ── */}
      <motion.div variants={item} className="flex flex-col md:flex-row md:items-center justify-between gap-2 shrink-0">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground flex items-center gap-2">
            {greeting}, <span className="text-primary font-display">{displayName}</span>
            <Sparkles className="h-4 w-4 text-amber-500 animate-pulse" />
          </h1>
          <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
            <CalendarDays className="h-3 w-3 text-primary/60" />
            <span className="font-medium">{format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}</span>
            {todayEvents.length > 0 && (
              <span className="ml-2 text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/10">
                {todayEvents.length} compromisso{todayEvents.length !== 1 ? "s" : ""}
              </span>
            )}
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs glass-card hover:bg-muted/50" onClick={() => navigate("/dashboard/processos")}>
            <Plus className="h-3.5 w-3.5" /> {t("dashboard.process")}
          </Button>
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs glass-card hover:bg-muted/50" onClick={() => navigate("/dashboard/minutas")}>
            <FileText className="h-3.5 w-3.5" /> {t("dashboard.draft")}
          </Button>
          <Button size="sm" className="h-8 gap-1.5 text-xs bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20" onClick={() => navigate("/dashboard/agenda")}>
            <CalendarDays className="h-3.5 w-3.5" /> {t("dashboard.appointment")}
          </Button>
        </div>
      </motion.div>

      {/* ── KPIs Row ── */}
      <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-5 gap-2 shrink-0">
        {[
          { title: t("dashboard.activeProcesses"), value: stats?.totalProcessos ?? 0, icon: Scale, color: "text-blue-600", trend: 0 },
          { title: t("dashboard.clients"), value: stats?.totalClientes ?? 0, icon: Users, color: "text-indigo-600", trend: 0 },
          { title: t("dashboard.eventsToday"), value: todayEvents.length, icon: CalendarDays, color: "text-emerald-600", badge: happeningNowCount > 0 ? `${happeningNowCount} ${t("dashboard.now")}` : undefined, trend: 0 },
          { title: t("dashboard.toReceive"), value: stats ? fmt(stats.aReceber) : "—", icon: TrendingUp, color: "text-amber-600", trend: 0 },
          { title: t("dashboard.toPay"), value: stats ? fmt(stats.aPagar) : "—", icon: DollarSign, color: "text-rose-600", trend: 0 },
        ].map((kpi) => (
          <motion.div variants={item} key={kpi.title}>
            <div className="glass-card overflow-hidden h-full rounded-lg transition-all duration-300 hover:shadow-md hover:border-primary/20 cursor-default">
              <div className="p-3 flex items-center gap-3 h-full">
                <div className={cn("p-1.5 rounded-md shrink-0", "bg-primary/5 text-primary")}>
                  <kpi.icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block truncate">{kpi.title}</span>
                  <span className="font-display text-lg font-bold tracking-tight text-foreground">{kpi.value}</span>
                </div>
                {kpi.badge && (
                  <span className="text-[9px] uppercase font-bold tracking-widest text-primary bg-primary/10 px-1.5 py-0.5 rounded-full shrink-0">
                    {kpi.badge}
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* ── Urgent Alert ── */}
      {urgentEvents.length > 0 && (
        <motion.div variants={item} className="p-2.5 bg-destructive/5 border border-destructive/20 rounded-lg flex items-center gap-3 shrink-0">
          <div className="h-7 w-7 rounded-md bg-destructive/10 flex items-center justify-center shrink-0">
            <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-destructive">{t("dashboard.urgentAlert")}</p>
            <p className="text-[10px] text-destructive/70">{urgentEvents.length} {t("dashboard.deadlinesToday")}</p>
          </div>
          <Button size="sm" variant="outline" className="border-destructive/30 text-destructive hover:bg-destructive/10 shrink-0 h-7 text-[10px] px-3 rounded-md" onClick={() => navigate("/dashboard/agenda")}>
            {t("dashboard.seeDetails")}
          </Button>
        </motion.div>
      )}

      <div className="flex-1 min-h-0 grid md:grid-cols-3 lg:grid-cols-4 gap-4">

        {/* ── Left Column: Events & Processes ── */}
        <div className="md:col-span-2 lg:col-span-3 overflow-hidden flex flex-col min-h-0">

          <div className="flex-1 min-h-0 grid lg:grid-cols-5 gap-4 overflow-hidden">

            {/* Timeline */}
            <div className="lg:col-span-3 flex flex-col min-h-0 overflow-hidden">
              <div className="flex items-center justify-between mb-2 shrink-0">
                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5" /> {t("dashboard.timeline")}
                </h3>
                <Button variant="ghost" size="sm" className="h-6 text-[10px] font-bold uppercase tracking-widest text-primary/70 hover:text-primary transition-colors" onClick={() => navigate("/dashboard/agenda")}>
                  {t("common.seeAll", "Ver todos")}
                </Button>
              </div>

              <div className="space-y-1 overflow-y-auto flex-1 min-h-0 pr-1">
                {todayEvents.length === 0 && tomorrowEvents.length === 0 && (
                  (!gcal.isConnected && !mscal.isConnected && !appleCal.isConnected) ? (
                    <CalendarEmptyState showTitle={true} />
                  ) : (
                    <div className="glass-card border-dashed p-10 text-center flex flex-col items-center justify-center rounded-xl bg-muted/5">
                      <div className="h-12 w-12 rounded-full bg-muted/30 flex items-center justify-center mb-3">
                        <CalendarDays className="h-6 w-6 text-muted-foreground/40" />
                      </div>
                      <p className="text-sm font-medium text-muted-foreground">{t("dashboard.noEvents")}</p>
                      <Button variant="link" size="sm" className="mt-1" onClick={() => navigate("/dashboard/agenda")}>Agendar compromisso</Button>
                    </div>
                  )
                )}

                {todayEvents.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-[10px] font-bold text-primary/60 uppercase tracking-widest pl-6 mb-2">Hoje</p>
                    {todayEvents.map((ev, i) => (
                      <TimelineEvent key={ev.id} event={ev} isLast={i === todayEvents.length - 1 && tomorrowEvents.length === 0} onNavigate={() => navigate("/dashboard/agenda")} />
                    ))}
                  </div>
                )}

                {tomorrowEvents.length > 0 && (
                  <div className="space-y-3 mt-6">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-6 mb-2">Amanhã</p>
                    {tomorrowEvents.map((ev, i) => (
                      <TimelineEvent key={ev.id} event={ev} isLast={i === tomorrowEvents.length - 1} onNavigate={() => navigate("/dashboard/agenda")} />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Recent Processes */}
            <div className="lg:col-span-2 flex flex-col min-h-0 overflow-hidden">
              <div className="flex items-center justify-between mb-2 shrink-0">
                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <Activity className="h-3.5 w-3.5" /> {t("dashboard.recentActivity")}
                </h3>
              </div>

              <div className="space-y-2 overflow-y-auto flex-1 min-h-0 pr-1">
                {processos.length === 0 ? (
                  <div className="glass-card border-dashed p-6 text-center rounded-xl">
                    <p className="text-xs text-muted-foreground">Nenhum processo ativo recente.</p>
                  </div>
                ) : (
                  processos.map((p) => (
                    <motion.div
                      key={p.id}
                      onClick={() => navigate(`/dashboard/processos?id=${p.id}`)}
                      className="glass-card p-3 rounded-xl border-border/40 cursor-pointer group hover:bg-white/80 dark:hover:bg-card/80 hover:-translate-y-0.5 hover:shadow-sm transition-all duration-200"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">{p.title}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">{p.number || "Sem número"}</p>
                        </div>
                        <ChevronRight className="h-3 w-3 text-muted-foreground/30 group-hover:text-primary/50 shrink-0 self-center transition-transform group-hover:translate-x-0.5" />
                      </div>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/10">
                        <span className="text-[9px] text-muted-foreground/60">{formatDistanceToNow(new Date(p.updated_at), { addSuffix: true, locale: ptBR })}</span>
                        <Badge variant="outline" className="text-[8px] h-4 font-bold uppercase tracking-wider border-primary/20 text-primary/70">{p.status}</Badge>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>

          </div>
        </div>

        {/* ── Right Column: Performance & Widgets ── */}
        <div className="space-y-4 overflow-y-auto min-h-0">

          {/* Productivity Widget */}
          <Card className="glass-card border-border/40 overflow-hidden rounded-xl premium-shadow hover:-translate-y-1 transition-transform duration-300">
            <CardHeader className="p-5 pb-2 border-b border-border/10 bg-muted/5">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                  <Timer className="h-3.5 w-3.5 text-primary/70" /> {t("dashboard.productivity")}
                </CardTitle>
                {progressPct >= 100 && <Sparkles className="h-4 w-4 text-amber-500 animate-pulse" />}
              </div>
            </CardHeader>
            <CardContent className="p-5 pt-4 space-y-5">
              <div className="flex items-baseline justify-between bg-primary/5 p-3 rounded-lg border border-primary/10">
                <div className="text-3xl font-display font-bold text-primary">
                  {totalHoursToday}h{totalMinsRemainder}m
                </div>
                <div className="text-[10px] font-bold text-primary/60 uppercase tracking-widest">/ 8h {t("dashboard.goal")}</div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-[10px] uppercase font-bold tracking-wider text-muted-foreground/70">
                  <span>Progresso Diário</span>
                  <span>{progressPct}%</span>
                </div>
                <div className="h-2 w-full bg-muted/30 rounded-full overflow-hidden border border-border/10">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPct}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      progressPct >= 100 ? "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.3)]" : "bg-primary"
                    )}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border/10">
                <div className="bg-muted/30 p-2.5 rounded-lg text-center">
                  <p className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-tighter">Entradas</p>
                  <p className="text-sm font-bold text-foreground">{timesheetToday?.entries ?? 0}</p>
                </div>
                <div className="bg-muted/30 p-2.5 rounded-lg text-center">
                  <p className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-tighter">Faturável</p>
                  <p className="text-sm font-bold text-emerald-600">{timesheetToday ? Math.floor(timesheetToday.billable / 60) : 0}h</p>
                </div>
              </div>

              <Button variant="ghost" size="sm" className="w-full h-9 mt-2 text-xs font-semibold text-primary hover:bg-primary/5 hover:text-primary-foreground border border-primary/10 hover:border-primary/30 rounded-lg group transition-colors" onClick={() => navigate("/dashboard/timesheet")}>
                {t("dashboard.openTimesheet")} <ArrowRight className="ml-2 h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </CardContent>
          </Card>

          {/* Quick Actions / Tips */}
          <div className="glass-card p-5 rounded-xl border-primary/10 bg-gradient-to-br from-primary/5 to-transparent relative overflow-hidden group hover-lift premium-shadow">
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 group-hover:scale-110 transition-all duration-300">
              <Sparkles className="h-16 w-16 text-primary" />
            </div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-primary/80 flex items-center gap-2 mb-3 relative z-10">
              <Zap className="h-3.5 w-3.5 text-amber-500" /> Dica da Aruna
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed italic relative z-10 font-medium">
              &ldquo;{arunaTip}&rdquo;
            </p>
            <Button variant="link" size="sm" className="p-0 h-auto text-[10px] uppercase font-bold tracking-widest text-primary mt-4 hover:text-primary-light transition-colors relative z-10" onClick={() => navigate("/dashboard/chat")}>
              Falar com Aruna
            </Button>
          </div>

        </div>
      </div>
    </motion.div>
  );
}
