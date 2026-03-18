"use client";

import { useMemo } from "react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { useRouter } from "next/navigation";
import {
  Scale, Users, CalendarDays, Clock, TrendingUp, AlertTriangle, Activity,
  Plus, Bot, Sparkles, Zap, DollarSign
} from "lucide-react";
import { format, isToday, isTomorrow, parseISO, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/shared/lib/utils";
import { Skeleton, KPISkeleton } from "@/shared/components/SkeletonLoaders";
import { StaggerContainer, StaggerItem, HoverElevate } from "@/shared/components/AnimatedTransitions";
import { useTranslation } from "react-i18next";
import { CalendarEmptyState } from "@/features/agenda/components/CalendarEmptyState";
import { Card, CardHeader, CardTitle, CardContent } from "@/shared/ui/card";

// FSD Imports
import { useMeuDia } from "@/features/meu-dia/hooks/useMeuDia";
import { isHappeningNow } from "@/features/meu-dia/utils/helpers";
import { TimelineEvent } from "@/features/meu-dia/components/TimelineEvent";
import { ProductivityWidget } from "@/features/meu-dia/components/ProductivityWidget";
import { DeadlinesChart } from "@/features/meu-dia/components/DeadlinesChart";

// ─── Main ─────────────────────────────────────────────────────
export default function DashboardOverview() {
  const navigate = useRouter();
  const { t } = useTranslation();
  const { user, eventos, processos, stats, timesheetToday, isLoading } = useMeuDia();

  const displayName = user?.firstName || "Advogado";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? t("dashboard.greeting") : hour < 18 ? t("dashboard.greetingAfternoon") : t("dashboard.greetingEvening");

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
    <StaggerContainer className="h-full flex flex-col gap-6 md:gap-4 overflow-y-auto pb-20 md:pb-12 hide-scrollbar">

      {/* ── Epic Header & Morning Briefing ── */}
      <StaggerItem className="shrink-0 space-y-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tighter text-foreground font-display">
              {greeting}, <span className="bg-gradient-to-r from-primary to-indigo-400 bg-clip-text text-transparent">{displayName}</span>
            </h1>
            <p className="text-sm text-muted-foreground font-medium mt-1.5 flex items-center gap-2">
              <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-widest">{format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}</span>
              {happeningNowCount > 0 && <span className="flex items-center gap-1.5 text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded text-[10px] font-bold animate-pulse"><Activity className="h-3 w-3" /> {happeningNowCount} SESSÃO ATIVA</span>}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="h-9 text-[11px] font-bold uppercase tracking-widest border-border/40 hover:bg-muted" onClick={() => navigate.push("/dashboard/agenda")}>
              Ver Agenda Completa
            </Button>
            <Button size="sm" className="h-9 text-[11px] font-bold uppercase tracking-widest gap-2 bg-primary hover:bg-primary/90">
              <Plus className="h-3.5 w-3.5" /> Nova Atividade
            </Button>
          </div>
        </div>

        {/* 🧠 Aruna Daily Morning Briefing */}
        <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-indigo-950 via-slate-950 to-indigo-950 p-6 shadow-2xl ring-1 ring-white/10 group">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
            <Bot className="h-24 w-24 text-primary" />
          </div>
          <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-2">
              <div className="bg-primary/20 p-1.5 rounded-lg border border-primary/30">
                <Sparkles className="h-4 w-4 text-primary animate-pulse" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/80">Aruna Daily Briefing</span>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" /> Prioridades de Hoje
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Você tem <span className="text-white font-bold underline decoration-amber-500/50">2 audiências críticas</span> e 1 prazo fatal. A Aruna recomenda priorizar a petição para o TJSP antes das 14h.
                </p>
              </div>

              <div className="space-y-2 border-l border-white/10 pl-6">
                <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-500" /> Insights Preditivos
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Baseado no ritmo da semana, você deve atingir sua meta de horas até às <span className="text-emerald-400 font-bold">16:30</span>. Sua taxa de captação subiu 12%.
                </p>
              </div>

              <div className="hidden lg:block space-y-2 border-l border-white/10 pl-6">
                <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" /> Sugestões Aruna
                </h3>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Badge variant="secondary" className="bg-white/5 border-white/10 text-slate-300 text-[10px] px-2 py-1">Analisar Processo #421</Badge>
                  <Badge variant="secondary" className="bg-white/5 border-white/10 text-slate-300 text-[10px] px-2 py-1">Gerar Dashboard Q2</Badge>
                </div>
              </div>
            </div>
          </div>
        </div>
      </StaggerItem>

      {/* ── KPIs Row ── */}
      <StaggerItem className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
        {[
          { title: t("dashboard.activeProcesses"), value: stats?.totalProcessos ?? 0, icon: Scale, color: "text-blue-500 bg-blue-500/10", trend: "+2", desc: "No TJSP e TRF3" },
          { title: t("dashboard.clients"), value: stats?.totalClientes ?? 0, icon: Users, color: "text-indigo-500 bg-indigo-500/10", trend: "+5", desc: "Novos leads ativos" },
          { title: "Faturamento Previsto", value: "R$ 45k", icon: DollarSign, color: "text-emerald-500 bg-emerald-500/10", trend: "+8%", desc: "Mês corrente" },
          { title: "Média de Êxito", value: "78%", icon: Activity, color: "text-amber-500 bg-amber-500/10", trend: "+3.4%", desc: "Score Aruna IA" },
        ].map((kpi) => (
          <HoverElevate key={kpi.title}>
            <div className="bg-card border border-border/40 overflow-hidden h-full rounded-2xl transition-all duration-300 hover:border-primary/50 hover:shadow-[0_0_20px_rgba(var(--primary),0.05)] cursor-default p-5 group flex flex-col justify-between">
              <div className="flex items-start justify-between mb-4">
                <div className={cn("p-2 rounded-xl shrink-0 transition-transform group-hover:scale-110", kpi.color)}>
                  <kpi.icon className="h-5 w-5" />
                </div>
                {kpi.trend && (
                  <Badge variant="secondary" className="text-[10px] font-black tracking-tight text-emerald-500 bg-emerald-500/10 border-0">
                    <TrendingUp className="h-3 w-3 mr-1" /> {kpi.trend}
                  </Badge>
                )}
              </div>
              <div>
                <span className="text-3xl font-black tracking-tighter text-foreground block mb-0.5 font-display">{kpi.value}</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-2">{kpi.title}</span>
                <p className="text-[10px] text-muted-foreground/60 font-medium">{kpi.desc}</p>
              </div>
            </div>
          </HoverElevate>
        ))}
      </StaggerItem>

      <div className="flex-none md:flex-1 md:min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* ── Center Column: Timeline & Chart ── */}
        <div className="lg:col-span-8 space-y-6 overflow-visible md:overflow-hidden flex flex-col md:min-h-0">

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 flex-1 min-h-0">
            {/* Timeline */}
            <div className="flex flex-col bg-card/30 rounded-2xl border border-border/30 p-5 overflow-visible md:overflow-hidden">
              <div className="flex items-center justify-between mb-6 shrink-0">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-3">
                  <Clock className="h-4 w-4 text-primary" /> {t("dashboard.timeline")}
                </h3>
              </div>

              <div className="space-y-1 overflow-y-auto flex-1 min-h-0 pr-2 hide-scrollbar">
                {todayEvents.length === 0 && tomorrowEvents.length === 0 ? (
                  <CalendarEmptyState showTitle={true} />
                ) : (
                  <>
                    {todayEvents.length > 0 && (
                      <div className="space-y-6">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="h-px flex-1 bg-border/20" />
                          <span className="text-[9px] font-bold text-primary uppercase tracking-widest">Hoje</span>
                          <div className="h-px flex-1 bg-border/20" />
                        </div>
                        {todayEvents.map((ev, i) => (
                          <TimelineEvent key={ev.id} event={ev} isLast={i === todayEvents.length - 1 && tomorrowEvents.length === 0} onNavigate={() => navigate.push("/dashboard/agenda")} />
                        ))}
                      </div>
                    )}
                    {tomorrowEvents.length > 0 && (
                      <div className="space-y-6 mt-10">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="h-px flex-1 bg-border/20" />
                          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Amanhã</span>
                          <div className="h-px flex-1 bg-border/20" />
                        </div>
                        {tomorrowEvents.map((ev, i) => (
                          <TimelineEvent key={ev.id} event={ev} isLast={i === tomorrowEvents.length - 1} onNavigate={() => navigate.push("/dashboard/agenda")} />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Analysis Area */}
            <div className="flex flex-col gap-6 overflow-visible md:overflow-hidden">
              <DeadlinesChart eventos={eventos} />

              <div className="bg-gradient-to-br from-indigo-500/10 to-primary/5 border border-primary/20 rounded-2xl p-5 flex-1 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:rotate-12 transition-transform duration-700">
                  <Sparkles className="h-20 w-24 text-primary" />
                </div>
                <h3 className="text-[10px] font-black uppercase tracking-widest text-primary mb-3">Módulo de IA Sugerido</h3>
                <p className="text-[13px] font-semibold text-foreground/90 leading-tight mb-4">
                  "Guilherme, identifiquei um padrão em 4 processos novos. Deseja gerar uma contestação baseada nas vitórias do mês passado?"
                </p>
                <Button size="sm" variant="outline" className="h-8 text-[10px] font-bold uppercase tracking-widest bg-white/5 border-primary/20 text-primary hover:bg-primary hover:text-white transition-all">
                  Executar Plano de Ação
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right Column: Performance & Radar ── */}
        <div className="lg:col-span-4 space-y-6 overflow-visible md:overflow-y-auto md:min-h-0 pb-6">
          <ProductivityWidget timesheetToday={timesheetToday} />

          <Card className="bg-card border-border/40 rounded-2xl overflow-hidden shadow-sm border-t-4 border-t-primary">
            <CardHeader className="p-5 pb-2">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" /> Radical de Saúde Lexa
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              {[
                { label: "Cumprimento de Prazos", val: 95 },
                { label: "Captação de Clientes", val: 62 },
                { label: "Eficiência Financeira", val: 88 },
              ].map((radar) => (
                <div key={radar.label} className="space-y-1.5">
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                    <span>{radar.label}</span>
                    <span className={radar.val > 90 ? "text-emerald-500" : "text-primary"}>{radar.val}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-muted/50 rounded-full overflow-hidden">
                    <div className={cn("h-full transition-all duration-1000", radar.val > 90 ? "bg-emerald-500" : "bg-primary")} style={{ width: `${radar.val}%` }} />
                  </div>
                </div>
              ))}
              <p className="text-[10px] text-muted-foreground pt-2 italic text-center">Dados baseados na inteligência do último semestre.</p>
            </CardContent>
          </Card>
        </div>

      </div>
    </StaggerContainer>
  );
}

