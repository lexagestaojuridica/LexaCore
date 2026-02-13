import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Scale, Users, CalendarDays, TrendingUp, TrendingDown, Clock, AlertTriangle, ArrowUpRight, ArrowDownRight } from "lucide-react";
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
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl font-semibold text-foreground">
          Olá, {displayName.split(" ")[0]}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Processos Ativos
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/5">
              <Scale className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{stats.processosAtivos}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              de {stats.totalProcessos} totais
            </p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Clientes
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/5">
              <Users className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{stats.totalClientes}</div>
            <p className="mt-1 text-xs text-muted-foreground">cadastrados</p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              A Receber
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success/10">
              <ArrowUpRight className="h-4 w-4 text-success" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {formatCurrency(stats.contasReceberPendente)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">pendente</p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              A Pagar
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/10">
              <ArrowDownRight className="h-4 w-4 text-destructive" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {formatCurrency(stats.contasPagarPendente)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">pendente</p>
          </CardContent>
        </Card>
      </div>

      {/* Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Processes */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Scale className="h-4 w-4 text-primary" />
              Processos Recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentProcesses.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-center">
                <Scale className="mb-2 h-8 w-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">Nenhum processo cadastrado</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentProcesses.map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-xl border border-border p-3 transition-colors hover:bg-muted/30">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{p.title}</p>
                      {p.number && (
                        <p className="text-xs text-muted-foreground">Nº {p.number}</p>
                      )}
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

        {/* Upcoming Events */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <CalendarDays className="h-4 w-4 text-primary" />
              Próximos Compromissos
              {stats.eventosHoje > 0 && (
                <span className="ml-auto flex items-center gap-1 rounded-full bg-warning/10 px-2.5 py-0.5 text-xs font-semibold text-warning">
                  <AlertTriangle className="h-3 w-3" />
                  {stats.eventosHoje} hoje
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingEvents.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-center">
                <CalendarDays className="mb-2 h-8 w-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">Nenhum compromisso agendado</p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingEvents.map((e) => (
                  <div key={e.id} className="flex items-start gap-3 rounded-xl border border-border p-3 transition-colors hover:bg-muted/30">
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
