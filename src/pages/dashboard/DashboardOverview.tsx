import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Scale, Users, CalendarDays, ArrowUpRight, ArrowDownRight, Clock, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Stats {
  totalProcessos: number;
  processosAtivos: number;
  totalClientes: number;
  eventosHoje: number;
  contasReceberPendente: number;
  contasPagarPendente: number;
}

interface RecentProcess {
  id: string;
  title: string;
  status: string;
  number: string | null;
  updated_at: string;
}

interface UpcomingEvent {
  id: string;
  title: string;
  start_time: string;
  category: string | null;
}

export default function DashboardOverview() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({
    totalProcessos: 0,
    processosAtivos: 0,
    totalClientes: 0,
    eventosHoje: 0,
    contasReceberPendente: 0,
    contasPagarPendente: 0,
  });
  const [recentProcesses, setRecentProcesses] = useState<RecentProcess[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const displayName = user?.user_metadata?.full_name || "Usuário";

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [
          { count: totalProcessos },
          { count: processosAtivos },
          { count: totalClientes },
          { data: events },
          { data: processes },
          { data: contasReceber },
          { data: contasPagar },
        ] = await Promise.all([
          supabase.from("processos_juridicos").select("*", { count: "exact", head: true }),
          supabase.from("processos_juridicos").select("*", { count: "exact", head: true }).eq("status", "ativo"),
          supabase.from("clients").select("*", { count: "exact", head: true }),
          supabase.from("eventos_agenda").select("id, title, start_time, category").gte("start_time", new Date().toISOString()).order("start_time", { ascending: true }).limit(5),
          supabase.from("processos_juridicos").select("id, title, status, number, updated_at").order("updated_at", { ascending: false }).limit(5),
          supabase.from("contas_receber").select("amount").eq("status", "pendente"),
          supabase.from("contas_pagar").select("amount").eq("status", "pendente"),
        ]);

        const receberTotal = contasReceber?.reduce((sum, c) => sum + Number(c.amount), 0) || 0;
        const pagarTotal = contasPagar?.reduce((sum, c) => sum + Number(c.amount), 0) || 0;

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);
        const eventosHoje = events?.filter((e) => {
          const d = new Date(e.start_time);
          return d >= todayStart && d <= todayEnd;
        }).length || 0;

        setStats({
          totalProcessos: totalProcessos || 0,
          processosAtivos: processosAtivos || 0,
          totalClientes: totalClientes || 0,
          eventosHoje,
          contasReceberPendente: receberTotal,
          contasPagarPendente: pagarTotal,
        });
        setRecentProcesses(processes || []);
        setUpcomingEvents(events || []);
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const statusLabel: Record<string, string> = {
    ativo: "Ativo",
    arquivado: "Arquivado",
    suspenso: "Suspenso",
    encerrado: "Encerrado",
  };

  const statusColor: Record<string, string> = {
    ativo: "bg-success/10 text-success",
    arquivado: "bg-muted text-muted-foreground",
    suspenso: "bg-warning/10 text-warning",
    encerrado: "bg-destructive/10 text-destructive",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome banner — clean, no image */}
      <div className="rounded-2xl bg-primary p-8">
        <h1 className="text-3xl font-semibold text-primary-foreground">
          Olá, {displayName.split(" ")[0]}
        </h1>
        <p className="mt-1 text-sm text-primary-foreground/60">
          {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Processos Ativos", value: stats.processosAtivos, sub: `de ${stats.totalProcessos} totais`, icon: Scale, color: "text-primary", bg: "bg-primary/5" },
          { label: "Clientes", value: stats.totalClientes, sub: "cadastrados", icon: Users, color: "text-primary", bg: "bg-primary/5" },
          { label: "A Receber", value: formatCurrency(stats.contasReceberPendente), sub: "pendente", icon: ArrowUpRight, color: "text-success", bg: "bg-success/8" },
          { label: "A Pagar", value: formatCurrency(stats.contasPagarPendente), sub: "pendente", icon: ArrowDownRight, color: "text-destructive", bg: "bg-destructive/8" },
        ].map((kpi) => (
          <Card key={kpi.label} className="border-border/60">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{kpi.label}</p>
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${kpi.bg}`}>
                  <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                </div>
              </div>
              <p className={`text-2xl font-bold ${typeof kpi.value === 'number' ? 'text-foreground' : kpi.color}`}>{kpi.value}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">{kpi.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Processos Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            {recentProcesses.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-center">
                <Scale className="mb-2 h-8 w-8 text-muted-foreground/20" />
                <p className="text-sm text-muted-foreground">Nenhum processo cadastrado</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentProcesses.map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-xl border border-border/50 p-3 transition-colors hover:bg-muted/20">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{p.title}</p>
                      {p.number && <p className="text-xs text-muted-foreground">Nº {p.number}</p>}
                    </div>
                    <span className={`ml-3 shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${statusColor[p.status] || "bg-muted text-muted-foreground"}`}>
                      {statusLabel[p.status] || p.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base font-semibold">
              Próximos Compromissos
              {stats.eventosHoje > 0 && (
                <span className="flex items-center gap-1 rounded-full bg-warning/10 px-2.5 py-0.5 text-xs font-semibold text-warning">
                  <AlertTriangle className="h-3 w-3" />
                  {stats.eventosHoje} hoje
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingEvents.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-center">
                <CalendarDays className="mb-2 h-8 w-8 text-muted-foreground/20" />
                <p className="text-sm text-muted-foreground">Nenhum compromisso agendado</p>
              </div>
            ) : (
              <div className="space-y-2">
                {upcomingEvents.map((e) => (
                  <div key={e.id} className="flex items-start gap-3 rounded-xl border border-border/50 p-3 transition-colors hover:bg-muted/20">
                    <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-primary/5 text-primary">
                      <span className="text-sm font-bold leading-none">
                        {format(new Date(e.start_time), "dd")}
                      </span>
                      <span className="text-[9px] uppercase leading-none">
                        {format(new Date(e.start_time), "MMM", { locale: ptBR })}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{e.title}</p>
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {format(new Date(e.start_time), "HH:mm")}
                        {e.category && (
                          <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium">
                            {e.category}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
