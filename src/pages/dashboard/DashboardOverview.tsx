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
import { useTranslation } from "react-i18next";

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
        .gte("date", format(new Date(), "yyyy-MM-dd"))
        .lte("date", format(new Date(), "yyyy-MM-dd"));
      const totalMins = data?.reduce((s, e) => s + (e.duration_minutes || 0), 0) ?? 0;
      const billable = data?.filter(e => e.billing_status === "a_faturar" || e.billing_status === "faturado")
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
      <div className="max-w-7xl mx-auto space-y-6 pt-4">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => <KPISkeleton key={i} />)}
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          <Skeleton className="h-[400px] md:col-span-2 rounded-xl" />
          <Skeleton className="h-[400px] rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="max-w-7xl mx-auto space-y-6 pb-10 pt-4">

      {/* ── Compact Header ── */}
      <motion.div variants={item} className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground flex items-center gap-2">
            {greeting}, <span className="text-primary font-display">{displayName}</span>
            <Sparkles className="h-4 w-4 text-amber-500 animate-pulse" />
          </h1>
          <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
            <CalendarDays className="h-3.5 w-3.5 text-primary/60" />
            <span className="font-medium">{format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}</span>
            {todayEvents.length > 0 && (
              <span className="ml-2 text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/10">
                {todayEvents.length} compromisso{todayEvents.length !== 1 ? "s" : ""}
              </span>
            )}
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs glass-card hover:bg-muted/50" onClick={() => navigate("/dashboard/processos")}>
            <Plus className="h-3.5 w-3.5" /> {t("dashboard.process")}
          </Button>
          <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs glass-card hover:bg-muted/50" onClick={() => navigate("/dashboard/minutas")}>
            <FileText className="h-3.5 w-3.5" /> {t("dashboard.draft")}
          </Button>
          <Button size="sm" className="h-9 gap-1.5 text-xs bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20" onClick={() => navigate("/dashboard/agenda")}>
            <CalendarDays className="h-3.5 w-3.5" /> {t("dashboard.appointment")}
          </Button>
        </div>
      </motion.div>

      {/* ── KPIs Row ── */}
      <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: t("dashboard.activeProcesses"), val: stats?.totalProcessos ?? 0, icon: Scale, color: "text-blue-600 bg-blue-500/8" },
          { label: t("dashboard.clients"), val: stats?.totalClientes ?? 0, icon: Users, color: "text-indigo-600 bg-indigo-500/8" },
          { label: t("dashboard.eventsToday"), val: todayEvents.length, icon: CalendarDays, color: "text-emerald-600 bg-emerald-500/8", badge: happeningNowCount > 0 ? `${happeningNowCount} ${t("dashboard.now")}` : undefined },
          { label: t("dashboard.toReceive"), val: stats ? fmt(stats.aReceber) : "—", icon: TrendingUp, color: "text-amber-600 bg-amber-500/8" },
          { label: t("dashboard.toPay"), val: stats ? fmt(stats.aPagar) : "—", icon: DollarSign, color: "text-rose-600 bg-rose-500/8" },
        ].map((kpi, i) => (
          <motion.div
            key={i}
            whileHover={{ y: -2 }}
            className="flex items-center gap-3 glass-card border-border/40 rounded-xl p-3.5 transition-all hover:bg-white/90 dark:hover:bg-card/90"
          >
            <div className={cn("p-2 rounded-lg", kpi.color)}>
              <kpi.icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1.5">{kpi.label}</p>
              <div className="flex items-center gap-1.5">
                <p className="text-lg font-bold leading-none tracking-tight">{kpi.val}</p>
                {kpi.badge && (
                  <span className="text-[8px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full animate-pulse border border-primary/10">
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
        <motion.div variants={item} className="p-3 bg-red-500/5 border border-red-500/20 rounded-xl flex items-center gap-3 glass-card">
          <div className="h-8 w-8 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-red-700 dark:text-red-400">{t("dashboard.urgentAlert")}</p>
            <p className="text-xs text-red-600/70">{urgentEvents.length} {t("dashboard.deadlinesToday")}</p>
          </div>
          <Button size="sm" variant="outline" className="border-red-500/30 text-red-600 hover:bg-red-500/10 shrink-0 h-8 text-xs px-4 rounded-lg" onClick={() => navigate("/dashboard/agenda")}>
            {t("dashboard.seeDetails")}
          </Button>
        </motion.div>
      )}

      <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6">

        {/* ── Left Column: Events & Processes ── */}
        <div className="md:col-span-2 lg:col-span-3 space-y-6">

          <div className="grid lg:grid-cols-5 gap-6">

            {/* Timeline */}
            <div className="lg:col-span-3 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5" /> {t("dashboard.timeline")}
                </h3>
                <Button variant="ghost" size="sm" className="h-7 text-[10px] font-bold uppercase tracking-widest text-primary/70 hover:text-primary transition-colors" onClick={() => navigate("/dashboard/agenda")}>
                  {t("common.seeAll")}
                </Button>
              </div>

              <div className="space-y-1">
                {todayEvents.length === 0 && tomorrowEvents.length === 0 && (
                  <div className="glass-card border-dashed p-10 text-center flex flex-col items-center justify-center rounded-xl bg-muted/5">
                    <div className="h-12 w-12 rounded-full bg-muted/30 flex items-center justify-center mb-3">
                      <CalendarDays className="h-6 w-6 text-muted-foreground/40" />
                    </div>
                    <p className="text-sm font-medium text-muted-foreground">{t("dashboard.noEvents")}</p>
                    <Button variant="link" size="sm" className="mt-1" onClick={() => navigate("/dashboard/agenda")}>Agendar compromisso</Button>
                  </div>
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
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <Activity className="h-3.5 w-3.5" /> {t("dashboard.recentActivity")}
                </h3>
              </div>

              <div className="space-y-3">
                {processos.length === 0 ? (
                  <div className="glass-card border-dashed p-6 text-center rounded-xl">
                    <p className="text-xs text-muted-foreground">Nenhum processo ativo recente.</p>
                  </div>
                ) : (
                  processos.map((p) => (
                    <motion.div
                      key={p.id}
                      whileHover={{ x: 3 }}
                      onClick={() => navigate(`/dashboard/processos?id=${p.id}`)}
                      className="glass-card p-3 rounded-xl border-border/40 cursor-pointer group hover:bg-white/80 dark:hover:bg-card/80 transition-all shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">{p.title}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">{p.number || "Sem número"}</p>
                        </div>
                        <ChevronRight className="h-3 w-3 text-muted-foreground/30 group-hover:text-primary/50 shrink-0 self-center" />
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
        <div className="space-y-6">

          {/* Productivity Widget */}
          <Card className="glass-card border-border/40 overflow-hidden rounded-xl shadow-lg shadow-black/5">
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                  <Timer className="h-3.5 w-3.5 text-primary/70" /> {t("dashboard.productivity")}
                </CardTitle>
                {progressPct >= 100 && <Sparkles className="h-4 w-4 text-amber-500" />}
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-2 space-y-4">
              <div className="flex items-baseline justify-between">
                <div className="text-3xl font-display font-bold text-primary">
                  {totalHoursToday}h{totalMinsRemainder}m
                </div>
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">/ 8h {t("dashboard.goal")}</div>
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

              <div className="grid grid-cols-2 gap-2 pt-2">
                <div className="bg-muted/30 p-2 rounded-lg text-center">
                  <p className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-tighter">Entradas</p>
                  <p className="text-sm font-bold text-foreground">{timesheetToday?.entries ?? 0}</p>
                </div>
                <div className="bg-muted/30 p-2 rounded-lg text-center">
                  <p className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-tighter">Faturável</p>
                  <p className="text-sm font-bold text-emerald-600">{timesheetToday ? Math.floor(timesheetToday.billable / 60) : 0}h</p>
                </div>
              </div>

              <Button variant="ghost" size="sm" className="w-full h-8 text-xs font-semibold text-primary hover:bg-primary/5 border border-primary/10 rounded-lg group" onClick={() => navigate("/dashboard/timesheet")}>
                {t("dashboard.openTimesheet")} <ArrowRight className="ml-2 h-3 w-3 group-hover:translate-x-1 transition-transform" />
              </Button>
            </CardContent>
          </Card>

          {/* Quick Actions / Tips */}
          <div className="glass-card p-4 rounded-xl border-primary/10 bg-gradient-to-br from-primary/5 to-transparent relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
              <Sparkles className="h-12 w-12 text-primary" />
            </div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-primary/80 flex items-center gap-2 mb-3">
              <Zap className="h-3.5 w-3.5" /> Dica da Aruna
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed italic relative z-10">
              "Você tem 3 prazos vencendo amanhã. Que tal revisá-los agora para evitar urgências no final do dia?"
            </p>
            <Button variant="link" size="sm" className="p-0 h-auto text-[10px] uppercase font-bold tracking-widest text-primary mt-3 hover:text-primary-light transition-colors" onClick={() => navigate("/dashboard/chat")}>
              Falar com Aruna
            </Button>
          </div>

        </div>
      </div>
    </motion.div>
  );
}
