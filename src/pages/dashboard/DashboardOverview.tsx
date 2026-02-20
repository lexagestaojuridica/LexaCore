import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import {
  Scale, Users, CalendarDays, ArrowUpRight, ArrowDownRight,
  Clock, AlertTriangle, CheckCircle2, Gavel, Timer,
  TrendingUp, Zap, ChevronRight, Plus, Bell,
} from "lucide-react";
import { format, formatDistanceToNow, isToday, isTomorrow, isPast, parseISO, startOfDay, endOfDay, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

// ─── Types ────────────────────────────────────────────────────

interface Evento {
  id: string; title: string; start_time: string; end_time: string; category: string | null;
}

interface Processo {
  id: string; title: string; status: string; number: string | null; updated_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const cardVariant = {
  hidden: { opacity: 0, y: 12 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.07, duration: 0.35 } }),
};

const categoryMeta: Record<string, { label: string; color: string; icon: any }> = {
  audiencia: { label: "Audiência", color: "bg-destructive/10 text-destructive border-destructive/20", icon: Gavel },
  prazo: { label: "Prazo", color: "bg-amber-500/10 text-amber-600 border-amber-500/20", icon: Timer },
  reuniao: { label: "Reunião", color: "bg-primary/10 text-primary border-primary/20", icon: Users },
  compromisso: { label: "Compromisso", color: "bg-success/10 text-success border-success/20", icon: CheckCircle2 },
  lembrete: { label: "Lembrete", color: "bg-muted text-muted-foreground border-border", icon: Bell },
};

function getCatMeta(cat: string | null) {
  return categoryMeta[cat ?? ""] ?? categoryMeta.lembrete;
}

// ─── SectionHeader ────────────────────────────────────────────

function SectionHeader({
  icon: Icon, title, badge, color = "text-foreground",
}: {
  icon: any; title: string; badge?: number; color?: string;
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className={cn("h-4 w-4", color)} />
      <h3 className={cn("text-sm font-semibold tracking-tight", color)}>{title}</h3>
      {badge !== undefined && badge > 0 && (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-white">
          {badge}
        </span>
      )}
    </div>
  );
}

// ─── EventCard ────────────────────────────────────────────────

function EventCard({ event, i }: { event: Evento; i: number }) {
  const meta = getCatMeta(event.category);
  const Icon = meta.icon;
  const start = parseISO(event.start_time);
  const overdue = isPast(start) && !isToday(start);

  return (
    <motion.div
      custom={i}
      variants={cardVariant}
      initial="hidden"
      animate="show"
      className={cn(
        "flex items-start gap-3 rounded-xl border p-3 transition-all hover:shadow-sm",
        overdue ? "border-destructive/30 bg-destructive/5 opacity-60" : "border-border/60 bg-card hover:bg-muted/20"
      )}
    >
      <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border", meta.color)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground leading-tight">{event.title}</p>
        <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          {format(start, "HH:mm")} – {format(parseISO(event.end_time), "HH:mm")}
        </p>
      </div>
      <Badge variant="outline" className={cn("text-[10px] shrink-0", meta.color)}>
        {meta.label}
      </Badge>
    </motion.div>
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
  const { data: eventos = [], isLoading: loadingEvents } = useQuery({
    queryKey: ["eventos_meudia", orgId],
    queryFn: async () => {
      const { data } = await supabase
        .from("eventos_agenda")
        .select("id, title, start_time, end_time, category")
        .gte("start_time", new Date().toISOString())
        .lte("start_time", addDays(new Date(), 7).toISOString())
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
      const { data } = await supabase
        .from("processos_juridicos")
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
  const { data: financeiro } = useQuery({
    queryKey: ["fin_meudia", orgId],
    queryFn: async () => {
      const [{ data: receber }, { data: pagar }, { count: totalProcessos }, { count: totalClientes }] =
        await Promise.all([
          supabase.from("contas_receber").select("amount").eq("organization_id", orgId!).eq("status", "pendente"),
          supabase.from("contas_pagar").select("amount").eq("organization_id", orgId!).eq("status", "pendente"),
          supabase.from("processos_juridicos").select("*", { count: "exact", head: true }).eq("organization_id", orgId!).eq("status", "ativo"),
          supabase.from("clients").select("*", { count: "exact", head: true }).eq("organization_id", orgId!),
        ]);
      return {
        aReceber: receber?.reduce((s, c) => s + Number(c.amount), 0) ?? 0,
        aPagar: pagar?.reduce((s, c) => s + Number(c.amount), 0) ?? 0,
        totalProcessos: totalProcessos ?? 0,
        totalClientes: totalClientes ?? 0,
      };
    },
    enabled: !!orgId,
  });

  // ── Partition events ──
  const todayEvents = eventos.filter((e) => isToday(parseISO(e.start_time)));
  const tomorrowEvents = eventos.filter((e) => isTomorrow(parseISO(e.start_time)));
  const weekEvents = eventos.filter((e) => {
    const d = parseISO(e.start_time);
    return !isToday(d) && !isTomorrow(d);
  });

  const urgentEvents = todayEvents.filter((e) =>
    e.category === "audiencia" || e.category === "prazo"
  );

  const kpis = [
    {
      label: "Processos Ativos",
      value: financeiro?.totalProcessos ?? "—",
      sub: "em andamento",
      icon: Scale,
      color: "text-primary",
      bg: "bg-primary/8",
      action: () => navigate("/dashboard/processos"),
    },
    {
      label: "Clientes",
      value: financeiro?.totalClientes ?? "—",
      sub: "cadastrados",
      icon: Users,
      color: "text-primary",
      bg: "bg-primary/8",
      action: () => navigate("/dashboard/clientes"),
    },
    {
      label: "A Receber",
      value: financeiro ? fmt(financeiro.aReceber) : "—",
      sub: "pendente",
      icon: ArrowUpRight,
      color: "text-emerald-600",
      bg: "bg-emerald-500/8",
      action: () => navigate("/dashboard/financeiro"),
    },
    {
      label: "A Pagar",
      value: financeiro ? fmt(financeiro.aPagar) : "—",
      sub: "pendente",
      icon: ArrowDownRight,
      color: "text-destructive",
      bg: "bg-destructive/8",
      action: () => navigate("/dashboard/financeiro"),
    },
  ];

  const statusColor: Record<string, string> = {
    ativo: "bg-success/10 text-success",
    arquivado: "bg-muted text-muted-foreground",
    suspenso: "bg-amber-500/10 text-amber-600",
    encerrado: "bg-destructive/10 text-destructive",
  };
  const statusLabel: Record<string, string> = {
    ativo: "Ativo", arquivado: "Arquivado", suspenso: "Suspenso", encerrado: "Encerrado",
  };

  return (
    <div className="space-y-6">

      {/* ── Welcome Banner ── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary to-primary/80 p-7"
      >
        {/* декоративні кулі */}
        <div className="pointer-events-none absolute -right-8 -top-8 h-48 w-48 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute right-24 -bottom-6 h-32 w-32 rounded-full bg-white/[0.04]" />

        <div className="relative flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-primary-foreground/60">{greeting},</p>
            <h1 className="text-3xl font-bold text-primary-foreground tracking-tight">
              {displayName}
            </h1>
            <p className="mt-1 text-sm text-primary-foreground/50 capitalize">
              {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </div>

          {/* Mini-summary */}
          <div className="flex items-center gap-6 mt-4 sm:mt-0">
            {[
              { label: "Hoje", value: todayEvents.length, icon: CalendarDays },
              { label: "Urgentes", value: urgentEvents.length, icon: AlertTriangle },
              { label: "Esta semana", value: eventos.length, icon: TrendingUp },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-2xl font-bold text-primary-foreground">{s.value}</p>
                <p className="text-[10px] uppercase tracking-wider text-primary-foreground/40">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ── KPI Cards ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi, i) => (
          <motion.div
            key={kpi.label}
            custom={i}
            variants={cardVariant}
            initial="hidden"
            animate="show"
          >
            <Card
              className="group border-border/60 cursor-pointer transition-all hover:border-primary/30 hover:shadow-md"
              onClick={kpi.action}
            >
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{kpi.label}</p>
                  <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl", kpi.bg)}>
                    <kpi.icon className={cn("h-4 w-4", kpi.color)} />
                  </div>
                </div>
                <p className={cn("text-2xl font-bold", typeof kpi.value === "number" ? "text-foreground" : kpi.color)}>
                  {kpi.value}
                </p>
                <div className="mt-1 flex items-center justify-between">
                  <p className="text-[11px] text-muted-foreground">{kpi.sub}</p>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-primary transition-colors" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* ── Three zones ── */}
      <div className="grid gap-6 lg:grid-cols-3">

        {/* 🔴 URGENTE */}
        <Card className={cn("border-border/60", urgentEvents.length > 0 && "border-destructive/30")}>
          <CardHeader className="pb-2 pt-4 px-4">
            <SectionHeader
              icon={AlertTriangle}
              title="Urgente — Hoje"
              badge={urgentEvents.length}
              color={urgentEvents.length > 0 ? "text-destructive" : "text-muted-foreground"}
            />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {urgentEvents.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-center">
                <CheckCircle2 className="mb-2 h-8 w-8 text-emerald-500/40" />
                <p className="text-sm text-muted-foreground">Nenhum prazo ou audiência urgente</p>
              </div>
            ) : (
              <div className="space-y-2">
                {urgentEvents.map((e, i) => (
                  <EventCard key={e.id} event={e} i={i} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 🟡 HOJE */}
        <Card className="border-border/60">
          <CardHeader className="pb-2 pt-4 px-4">
            <div className="flex items-center justify-between">
              <SectionHeader icon={CalendarDays} title="Compromissos de Hoje" badge={todayEvents.length} />
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={() => navigate("/dashboard/agenda")}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {loadingEvents ? (
              <div className="space-y-2">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="h-14 rounded-xl bg-muted/40 animate-pulse" />
                ))}
              </div>
            ) : todayEvents.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-center">
                <CalendarDays className="mb-2 h-8 w-8 text-muted-foreground/20" />
                <p className="text-sm text-muted-foreground">Dia livre!</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 gap-1.5 text-xs"
                  onClick={() => navigate("/dashboard/agenda")}
                >
                  <Plus className="h-3 w-3" /> Agendar
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {todayEvents.map((e, i) => (
                  <EventCard key={e.id} event={e} i={i} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 🔵 ESTA SEMANA */}
        <Card className="border-border/60">
          <CardHeader className="pb-2 pt-4 px-4">
            <div className="flex items-center justify-between">
              <SectionHeader icon={TrendingUp} title="Esta Semana" />
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 text-[10px] text-muted-foreground hover:text-foreground"
                onClick={() => navigate("/dashboard/agenda")}
              >
                Ver agenda <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {tomorrowEvents.length === 0 && weekEvents.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-center">
                <Zap className="mb-2 h-8 w-8 text-muted-foreground/20" />
                <p className="text-sm text-muted-foreground">Sem compromissos esta semana</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tomorrowEvents.length > 0 && (
                  <div>
                    <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                      Amanhã
                    </p>
                    <div className="space-y-2">
                      {tomorrowEvents.slice(0, 2).map((e, i) => (
                        <EventCard key={e.id} event={e} i={i} />
                      ))}
                    </div>
                  </div>
                )}
                {weekEvents.length > 0 && (
                  <div>
                    <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                      Próximos dias
                    </p>
                    <div className="space-y-2">
                      {weekEvents.slice(0, 3).map((e, i) => (
                        <div
                          key={e.id}
                          className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-muted/20 transition-colors"
                        >
                          <div className={cn("h-2 w-2 rounded-full shrink-0", getCatMeta(e.category).color.split(" ")[0])} />
                          <span className="flex-1 truncate text-sm text-foreground">{e.title}</span>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {format(parseISO(e.start_time), "EEE d/MM", { locale: ptBR })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Processos Recentes ── */}
      <Card className="border-border/60">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">Processos Ativos Recentes</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => navigate("/dashboard/processos")}
            >
              Ver todos <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {processos.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center">
              <Scale className="mb-2 h-8 w-8 text-muted-foreground/20" />
              <p className="text-sm text-muted-foreground">Nenhum processo ativo</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 gap-1.5 text-xs"
                onClick={() => navigate("/dashboard/processos")}
              >
                <Plus className="h-3 w-3" /> Novo Processo
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {processos.map((p, i) => (
                <motion.div
                  key={p.id}
                  custom={i}
                  variants={cardVariant}
                  initial="hidden"
                  animate="show"
                  className="flex items-center justify-between rounded-xl border border-border/50 px-4 py-3 transition-all hover:bg-muted/20 cursor-pointer"
                  onClick={() => navigate("/dashboard/processos")}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{p.title}</p>
                    {p.number && (
                      <p className="text-xs text-muted-foreground">Nº {p.number}</p>
                    )}
                  </div>
                  <div className="ml-4 flex items-center gap-3">
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(p.updated_at), { locale: ptBR, addSuffix: true })}
                    </span>
                    <span className={cn("rounded-full px-2.5 py-0.5 text-[10px] font-semibold", statusColor[p.status])}>
                      {statusLabel[p.status] ?? p.status}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
