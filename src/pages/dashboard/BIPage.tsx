import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3, TrendingUp, Scale, Users, DollarSign, CalendarDays,
  PieChart, Activity, Target, ArrowUpRight, ArrowDownRight, Clock,
  Briefcase, Gavel, FileText, CheckCircle2,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RPieChart, Pie, Cell, LineChart, Line, Area, AreaChart,
} from "recharts";
import { format, subMonths, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const CHART_COLORS = [
  "hsl(220, 70%, 18%)", // primary/navy
  "hsl(45, 60%, 55%)",  // gold
  "hsl(152, 60%, 40%)", // success
  "hsl(0, 72%, 51%)",   // destructive
  "hsl(220, 50%, 35%)", // navy-light
  "hsl(38, 92%, 50%)",  // warning
];

interface DashboardData {
  totalProcessos: number;
  processosAtivos: number;
  processosEncerrados: number;
  totalClientes: number;
  totalReceitas: number;
  totalDespesas: number;
  totalEventos: number;
  totalDocumentos: number;
  processosPorStatus: { name: string; value: number }[];
  receitasMensais: { month: string; receita: number; despesa: number }[];
  eventosPorCategoria: { name: string; value: number }[];
  processosRecentes: { month: string; novos: number; encerrados: number }[];
}

export default function BIPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("overview");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [
        { data: processos },
        { data: clientes },
        { data: receitas },
        { data: despesas },
        { data: eventos },
        { count: docCount },
      ] = await Promise.all([
        supabase.from("processos_juridicos").select("*"),
        supabase.from("clients").select("id"),
        supabase.from("contas_receber").select("*"),
        supabase.from("contas_pagar").select("*"),
        supabase.from("eventos_agenda").select("*"),
        supabase.from("documentos").select("*", { count: "exact", head: true }),
      ]);

      const procs = processos || [];
      const recs = receitas || [];
      const desps = despesas || [];
      const evts = eventos || [];

      // Processos por status
      const statusMap: Record<string, number> = {};
      procs.forEach((p) => {
        const s = p.status || "ativo";
        statusMap[s] = (statusMap[s] || 0) + 1;
      });
      const statusLabels: Record<string, string> = {
        ativo: "Ativo", arquivado: "Arquivado", suspenso: "Suspenso", encerrado: "Encerrado",
      };
      const processosPorStatus = Object.entries(statusMap).map(([k, v]) => ({
        name: statusLabels[k] || k, value: v,
      }));

      // Receitas mensais (últimos 6 meses)
      const receitasMensais: { month: string; receita: number; despesa: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = subMonths(new Date(), i);
        const monthStart = startOfMonth(d);
        const monthEnd = endOfMonth(d);
        const monthLabel = format(d, "MMM", { locale: ptBR });

        const receita = recs
          .filter((r) => {
            const dd = new Date(r.due_date);
            return dd >= monthStart && dd <= monthEnd;
          })
          .reduce((sum, r) => sum + Number(r.amount), 0);

        const despesa = desps
          .filter((r) => {
            const dd = new Date(r.due_date);
            return dd >= monthStart && dd <= monthEnd;
          })
          .reduce((sum, r) => sum + Number(r.amount), 0);

        receitasMensais.push({ month: monthLabel, receita, despesa });
      }

      // Eventos por categoria
      const catMap: Record<string, number> = {};
      const catLabels: Record<string, string> = {
        audiencia: "Audiência", reuniao: "Reunião", prazo: "Prazo",
        compromisso: "Compromisso", lembrete: "Lembrete",
      };
      evts.forEach((e) => {
        const c = e.category || "compromisso";
        catMap[c] = (catMap[c] || 0) + 1;
      });
      const eventosPorCategoria = Object.entries(catMap).map(([k, v]) => ({
        name: catLabels[k] || k, value: v,
      }));

      // Processos por mês (últimos 6 meses)
      const processosRecentes: { month: string; novos: number; encerrados: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = subMonths(new Date(), i);
        const monthStart = startOfMonth(d);
        const monthEnd = endOfMonth(d);
        const monthLabel = format(d, "MMM", { locale: ptBR });

        const novos = procs.filter((p) => {
          const dd = new Date(p.created_at);
          return dd >= monthStart && dd <= monthEnd;
        }).length;

        const encerrados = procs.filter((p) => {
          if (p.status !== "encerrado") return false;
          const dd = new Date(p.updated_at);
          return dd >= monthStart && dd <= monthEnd;
        }).length;

        processosRecentes.push({ month: monthLabel, novos, encerrados });
      }

      const totalReceitas = recs.reduce((s, r) => s + Number(r.amount), 0);
      const totalDespesas = desps.reduce((s, r) => s + Number(r.amount), 0);

      setData({
        totalProcessos: procs.length,
        processosAtivos: procs.filter((p) => p.status === "ativo").length,
        processosEncerrados: procs.filter((p) => p.status === "encerrado").length,
        totalClientes: (clientes || []).length,
        totalReceitas,
        totalDespesas,
        totalEventos: evts.length,
        totalDocumentos: docCount || 0,
        processosPorStatus,
        receitasMensais,
        eventosPorCategoria,
        processosRecentes,
      });
    } catch (err) {
      console.error("BI fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!data) return null;

  const lucro = data.totalReceitas - data.totalDespesas;
  const margemLucro = data.totalReceitas > 0 ? (lucro / data.totalReceitas) * 100 : 0;
  const taxaEncerramento = data.totalProcessos > 0 ? (data.processosEncerrados / data.totalProcessos) * 100 : 0;

  const kpis = [
    { label: "Processos Ativos", value: data.processosAtivos, icon: Scale, color: "text-primary", bg: "bg-primary/10" },
    { label: "Clientes", value: data.totalClientes, icon: Users, color: "text-primary", bg: "bg-primary/10" },
    { label: "Receita Total", value: formatCurrency(data.totalReceitas), icon: TrendingUp, color: "text-success", bg: "bg-success/10" },
    { label: "Despesa Total", value: formatCurrency(data.totalDespesas), icon: ArrowDownRight, color: "text-destructive", bg: "bg-destructive/10" },
    { label: "Lucro Líquido", value: formatCurrency(lucro), icon: DollarSign, color: lucro >= 0 ? "text-success" : "text-destructive", bg: lucro >= 0 ? "bg-success/10" : "bg-destructive/10" },
    { label: "Margem de Lucro", value: `${margemLucro.toFixed(1)}%`, icon: Target, color: "text-primary", bg: "bg-primary/10" },
    { label: "Taxa Encerramento", value: `${taxaEncerramento.toFixed(1)}%`, icon: CheckCircle2, color: "text-success", bg: "bg-success/10" },
    { label: "Documentos", value: data.totalDocumentos, icon: FileText, color: "text-muted-foreground", bg: "bg-muted" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl text-foreground">Business Intelligence</h1>
        <p className="text-sm text-muted-foreground">
          Análise completa de desempenho do escritório
        </p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Card className="border-border">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", kpi.bg)}>
                    <Icon className={cn("h-5 w-5", kpi.color)} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-lg font-bold text-foreground truncate">{kpi.value}</p>
                    <p className="text-[11px] text-muted-foreground">{kpi.label}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Charts */}
      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview" className="text-xs gap-1.5"><BarChart3 className="h-3.5 w-3.5" /> Visão Geral</TabsTrigger>
          <TabsTrigger value="financial" className="text-xs gap-1.5"><DollarSign className="h-3.5 w-3.5" /> Financeiro</TabsTrigger>
          <TabsTrigger value="processos" className="text-xs gap-1.5"><Scale className="h-3.5 w-3.5" /> Processos</TabsTrigger>
          <TabsTrigger value="agenda" className="text-xs gap-1.5"><CalendarDays className="h-3.5 w-3.5" /> Agenda</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-0 space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Activity className="h-4 w-4 text-primary" /> Receitas vs Despesas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={data.receitasMensais} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 10%, 92%)" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(220, 10%, 45%)" }} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(220, 10%, 45%)" }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      contentStyle={{ background: "hsl(0, 0%, 100%)", border: "1px solid hsl(220, 10%, 92%)", borderRadius: 8, fontSize: 12 }}
                      formatter={(v: number) => formatCurrency(v)}
                    />
                    <Bar dataKey="receita" name="Receita" fill={CHART_COLORS[2]} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="despesa" name="Despesa" fill={CHART_COLORS[3]} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <PieChart className="h-4 w-4 text-primary" /> Processos por Status
                </CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-center">
                <ResponsiveContainer width="100%" height={280}>
                  <RPieChart>
                    <Pie
                      data={data.processosPorStatus}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={100}
                      dataKey="value"
                      paddingAngle={3}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {data.processosPorStatus.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: "hsl(0, 0%, 100%)", border: "1px solid hsl(220, 10%, 92%)", borderRadius: 8, fontSize: 12 }} />
                  </RPieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="financial" className="mt-0">
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <TrendingUp className="h-4 w-4 text-success" /> Fluxo de Caixa (6 meses)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={data.receitasMensais}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 10%, 92%)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(220, 10%, 45%)" }} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(220, 10%, 45%)" }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ background: "hsl(0, 0%, 100%)", border: "1px solid hsl(220, 10%, 92%)", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => formatCurrency(v)} />
                  <Area type="monotone" dataKey="receita" name="Receita" stroke={CHART_COLORS[2]} fill={CHART_COLORS[2]} fillOpacity={0.15} strokeWidth={2} />
                  <Area type="monotone" dataKey="despesa" name="Despesa" stroke={CHART_COLORS[3]} fill={CHART_COLORS[3]} fillOpacity={0.1} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="processos" className="mt-0">
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Briefcase className="h-4 w-4 text-primary" /> Novos vs Encerrados (6 meses)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={data.processosRecentes}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 10%, 92%)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(220, 10%, 45%)" }} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(220, 10%, 45%)" }} />
                  <Tooltip contentStyle={{ background: "hsl(0, 0%, 100%)", border: "1px solid hsl(220, 10%, 92%)", borderRadius: 8, fontSize: 12 }} />
                  <Line type="monotone" dataKey="novos" name="Novos" stroke={CHART_COLORS[0]} strokeWidth={2.5} dot={{ r: 4, fill: CHART_COLORS[0] }} />
                  <Line type="monotone" dataKey="encerrados" name="Encerrados" stroke={CHART_COLORS[2]} strokeWidth={2.5} dot={{ r: 4, fill: CHART_COLORS[2] }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="agenda" className="mt-0">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <CalendarDays className="h-4 w-4 text-primary" /> Eventos por Categoria
                </CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-center">
                <ResponsiveContainer width="100%" height={280}>
                  <RPieChart>
                    <Pie
                      data={data.eventosPorCategoria}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={95}
                      dataKey="value"
                      paddingAngle={3}
                      label={({ name, value }) => `${name} (${value})`}
                      labelLine={false}
                    >
                      {data.eventosPorCategoria.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: "hsl(0, 0%, 100%)", border: "1px solid hsl(220, 10%, 92%)", borderRadius: 8, fontSize: 12 }} />
                  </RPieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <BarChart3 className="h-4 w-4 text-primary" /> Resumo da Agenda
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 py-4">
                  {data.eventosPorCategoria.map((cat, i) => (
                    <div key={cat.name} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{cat.name}</span>
                        <span className="font-semibold text-foreground">{cat.value}</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                          initial={{ width: 0 }}
                          animate={{ width: `${data.totalEventos > 0 ? (cat.value / data.totalEventos) * 100 : 0}%` }}
                          transition={{ duration: 0.8, delay: i * 0.1 }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
