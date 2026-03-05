import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import {
  Scale, Users, CalendarDays, Clock, TrendingUp, AlertTriangle, Activity
} from "lucide-react";
import { format, isToday, isTomorrow, parseISO, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Skeleton, KPISkeleton } from "@/components/shared/SkeletonLoaders";
import { StaggerContainer, StaggerItem, HoverElevate } from "@/components/shared/AnimatedTransitions";
import { useTranslation } from "react-i18next";
import { useGoogleCalendar } from "@/hooks/useGoogleCalendar";
import { useMicrosoftCalendar } from "@/hooks/useMicrosoftCalendar";
import { useAppleCalendar } from "@/hooks/useAppleCalendar";
import { CalendarEmptyState } from "@/components/dashboard/CalendarEmptyState";

// FSD Imports
import { useMeuDia } from "@/features/meu-dia/hooks/useMeuDia";
import { isHappeningNow } from "@/features/meu-dia/utils/helpers";
import { TimelineEvent } from "@/features/meu-dia/components/TimelineEvent";
import { ProductivityWidget } from "@/features/meu-dia/components/ProductivityWidget";

// ─── Main ─────────────────────────────────────────────────────
export default function DashboardOverview() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, eventos, processos, stats, timesheetToday, isLoading } = useMeuDia();

  const displayName = user?.user_metadata?.full_name?.split(" ")[0] || "Advogado";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? t("dashboard.greeting") : hour < 18 ? t("dashboard.greetingAfternoon") : t("dashboard.greetingEvening");

  const gcal = useGoogleCalendar();
  const mscal = useMicrosoftCalendar();
  const appleCal = useAppleCalendar();

  const todayEvents = useMemo(() => eventos.filter((e) => isToday(parseISO(e.start_time))), [eventos]);
  const tomorrowEvents = useMemo(() => eventos.filter((e) => isTomorrow(parseISO(e.start_time))), [eventos]);
  const urgentEvents = useMemo(() => todayEvents.filter((e) => e.category === "audiencia" || e.category === "prazo"), [todayEvents]);
  const happeningNowCount = useMemo(() => todayEvents.filter(isHappeningNow).length, [todayEvents]);

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
                  <CalendarEmptyState showTitle={true} />
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
                    <HoverElevate key={p.id} className="bg-card p-3 rounded-xl border border-border/40 cursor-pointer group hover:border-border/80 transition-colors">
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

        {/* ── Right Column: Performance Widget ── */}
        <div className="space-y-4 overflow-visible md:overflow-y-auto md:min-h-0 pb-6">
          <ProductivityWidget timesheetToday={timesheetToday} />
        </div>
      </div>
    </StaggerContainer>
  );
}
