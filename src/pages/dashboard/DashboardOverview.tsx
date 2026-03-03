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
import { Progress } from "@/components/ui/progress";
import { StaggerContainer, StaggerItem, HoverElevate } from "@/components/shared/AnimatedTransitions";
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
          "rounded-xl p-3 border transition-all",
          happening
            ? "border-primary/30 bg-primary/5 shadow-sm ring-1 ring-primary/10"
            : "border-border/40 bg-card group-hover:border-primary/20 group-hover:bg-muted/10"
        )}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <div className={cn("p-1 rounded bg-transparent text-muted-foreground shrink-0")}>
                  <CatIcon className="h-4 w-4" />
                </div>
                <p className="text-sm font-semibold text-foreground truncate leading-tight">{event.title}</p>
              </div>
              <div className="flex items-center gap-2 mt-2 flex-wrap ml-[32px]">
                <span className={cn("text-[10px] uppercase font-bold tracking-wider", meta.color)}>
                  {meta.label}
                </span>
                <span className="text-muted-foreground/40">•</span>
                <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {format(start, "HH:mm")} — {format(end, "HH:mm")}
                </span>
              </div>
            </div>
            <span className="text-xs font-medium text-muted-foreground shrink-0 mt-0.5">
              {duration}
            </span>
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
      const [{ count: processos }, { count: clientes }] =
        await Promise.all([
          supabase.from("processos_juridicos").select("*", { count: "exact", head: true }).eq("organization_id", orgId!).eq("status", "ativo"),
          supabase.from("clients").select("*", { count: "exact", head: true }).eq("organization_id", orgId!),
        ]);

      return {
        totalProcessos: processos ?? 0,
        totalClientes: clientes ?? 0,
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



  const { totalHoursToday, totalMinsRemainder, progressPct, targetDailyMinutes } = useMemo(() => {
    const totalHoursToday = timesheetToday ? Math.floor(timesheetToday.totalMins / 60) : 0;
    const totalMinsRemainder = timesheetToday ? timesheetToday.totalMins % 60 : 0;
    const targetDailyMinutes = 8 * 60; // 8h goal
    const progressPct = timesheetToday ? Math.min(100, Math.round((timesheetToday.totalMins / targetDailyMinutes) * 100)) : 0;
    return { totalHoursToday, totalMinsRemainder, progressPct, targetDailyMinutes };
  }, [timesheetToday]);

  // Framer Motion variants abstracted out to AnimatedTransitions

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
    <StaggerContainer className="h-full flex flex-col gap-4 md:gap-3 overflow-y-auto md:overflow-hidden pb-20 md:pb-0 hide-scrollbar">

      {/* ── Sleek Header ── */}
      <StaggerItem className="mb-2 shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground flex items-center gap-2">
            {greeting}, <span className="text-primary">{displayName}</span>
          </h1>
          <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
            <span className="font-medium text-foreground">{format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}</span>
            {todayEvents.length > 0 && (
              <>
                <span className="text-muted-foreground/40">•</span>
                <span className="text-primary font-medium">{todayEvents.length} compromissos hoje</span>
              </>
            )}
          </p>
        </div>
      </StaggerItem>

      {/* ── KPIs Row ── */}
      <StaggerItem className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-4 shrink-0">
        {[
          { title: t("dashboard.activeProcesses"), value: stats?.totalProcessos ?? 0, icon: Scale, color: "text-blue-600 bg-blue-500/10", trend: "+2" },
          { title: t("dashboard.clients"), value: stats?.totalClientes ?? 0, icon: Users, color: "text-indigo-600 bg-indigo-500/10", trend: "+5" },
          { title: t("dashboard.eventsToday"), value: todayEvents.length, icon: CalendarDays, color: "text-emerald-600 bg-emerald-500/10", badge: happeningNowCount > 0 ? `${happeningNowCount} ${t("dashboard.now")}` : undefined, trend: "" },
        ].map((kpi) => (
          <HoverElevate key={kpi.title}>
            <div className="bg-card border border-border/40 overflow-hidden h-full rounded-xl transition-all duration-200 hover:border-border/80 hover:shadow-sm cursor-default p-5 group flex flex-col justify-between">
              <div className="flex items-start justify-between mb-4">
                <div className={cn("p-2 rounded-lg shrink-0", kpi.color)}>
                  <kpi.icon className="h-5 w-5" />
                </div>
                {kpi.badge && (
                  <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-wider text-primary bg-primary/10 border-0">
                    {kpi.badge}
                  </Badge>
                )}
              </div>
              <div>
                <span className="text-3xl font-bold tracking-tight text-foreground block mb-1">{kpi.value}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground line-clamp-1">
                    {kpi.title}
                  </span>
                  {kpi.trend && (
                    <span className="text-[10px] font-medium text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded flex items-center">
                      <TrendingUp className="h-3 w-3 mr-0.5" /> {kpi.trend}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </HoverElevate>
        ))}
      </StaggerItem>

      {/* ── Urgent Alert ── */}
      {urgentEvents.length > 0 && (
        <StaggerItem className="p-2.5 bg-destructive/5 border border-destructive/20 rounded-lg flex items-center gap-3 shrink-0">
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
        </StaggerItem>
      )}

      <div className="flex-none md:flex-1 md:min-h-0 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">

        {/* ── Left Column: Events & Processes ── */}
        <div className="md:col-span-2 lg:col-span-3 overflow-visible md:overflow-hidden flex flex-col md:min-h-0">

          <div className="flex-none md:flex-1 md:min-h-0 grid grid-cols-1 lg:grid-cols-5 gap-6 overflow-visible md:overflow-hidden">

            {/* Timeline */}
            <div className="lg:col-span-3 flex flex-col md:min-h-0 overflow-visible md:overflow-hidden">
              <div className="flex items-center justify-between pl-1 mb-2 shrink-0">
                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5" /> {t("dashboard.timeline")}
                </h3>
                <Button variant="ghost" size="sm" className="h-6 text-[10px] font-bold uppercase tracking-widest text-primary/70 hover:text-primary transition-colors pr-0" onClick={() => navigate("/dashboard/agenda")}>
                  {t("common.seeAll", "Ver todos")}
                </Button>
              </div>

              <div className="space-y-1 overflow-y-auto flex-1 min-h-0 pr-1 pl-1">
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
            <div className="lg:col-span-2 flex flex-col md:min-h-0 overflow-visible md:overflow-hidden">
              <div className="flex items-center justify-between pl-1 mb-2 shrink-0">
                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <Activity className="h-3.5 w-3.5" /> {t("dashboard.recentActivity")}
                </h3>
              </div>

              <div className="space-y-2 overflow-y-auto flex-1 min-h-0 pr-1 pl-1">
                {processos.length === 0 ? (
                  <div className="glass-card border-dashed p-6 text-center rounded-xl">
                    <p className="text-xs text-muted-foreground">Nenhum processo ativo recente.</p>
                  </div>
                ) : (
                  processos.map((p) => (
                    <HoverElevate
                      key={p.id}
                      className="bg-card p-3 rounded-xl border border-border/40 cursor-pointer group hover:border-border/80 transition-colors"
                    >
                      <div onClick={() => navigate(`/dashboard/processos?id=${p.id}`)} className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">{p.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-muted-foreground font-mono">{p.number || "Sem número"}</span>
                            <span className="text-muted-foreground/30">•</span>
                            <span className="text-xs text-muted-foreground/70">{formatDistanceToNow(new Date(p.updated_at), { addSuffix: true, locale: ptBR })}</span>
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-[9px] font-bold uppercase tracking-wider bg-muted text-muted-foreground border-0">{p.status}</Badge>
                      </div>
                    </HoverElevate>
                  ))
                )}
              </div>
            </div>

          </div>
        </div>

        {/* ── Right Column: Performance & Widgets ── */}
        <div className="space-y-4 overflow-visible md:overflow-y-auto md:min-h-0 pb-6">

          {/* Productivity Widget */}
          <Card className="bg-card border-border/40 overflow-hidden rounded-xl h-full flex flex-col">
            <CardHeader className="p-5 pb-0 border-b-0 bg-transparent flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                {t("dashboard.productivity")}
              </CardTitle>
              {progressPct >= 100 && <Badge variant="default" className="bg-amber-500 text-amber-950 hover:bg-amber-500">Meta Atingida</Badge>}
            </CardHeader>
            <CardContent className="p-5 flex-1 flex flex-col space-y-6">

              <div className="space-y-2 mt-2">
                <div className="flex items-end justify-between">
                  <div className="text-3xl font-bold tracking-tight text-foreground">
                    {totalHoursToday}<span className="text-xl text-muted-foreground font-medium mx-0.5">h</span>{totalMinsRemainder}<span className="text-xl text-muted-foreground font-medium ml-0.5">m</span>
                  </div>
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-widest">{progressPct}% de 8h</div>
                </div>
                <Progress value={progressPct} className="h-2 w-full bg-muted" indicatorClassName={progressPct >= 100 ? "bg-amber-500" : "bg-primary"} />
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/30">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Entradas</p>
                  <p className="text-lg font-bold text-foreground">{timesheetToday?.entries ?? 0}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Faturável</p>
                  <p className="text-lg font-bold text-emerald-600">{timesheetToday ? Math.floor(timesheetToday.billable / 60) : 0}h</p>
                </div>
              </div>

              <Button variant="outline" className="w-full mt-auto text-sm font-medium hover:bg-muted" onClick={() => navigate("/dashboard/timesheet")}>
                {t("dashboard.openTimesheet")}
              </Button>
            </CardContent>
          </Card>



        </div>
      </div>
    </StaggerContainer>
  );
}
