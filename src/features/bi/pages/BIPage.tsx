import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { db as supabase } from "@/integrations/supabase/db";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Separator } from "@/shared/ui/separator";
import {
  BarChart3, TrendingUp, TrendingDown, Scale, Users, DollarSign, CalendarDays,
  PieChart, Activity, Target, ArrowUpRight, ArrowDownRight, Clock,
  Briefcase, Gavel, FileText, CheckCircle2, Wallet, Receipt,
  Banknote, PercentIcon, Layers, CreditCard, Building2, LayoutDashboard,
  Download,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RPieChart, Pie, Cell, LineChart, Line, Area, AreaChart,
  Legend, ComposedChart, ReferenceLine,
} from "recharts";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/shared/lib/utils";
import { motion } from "framer-motion";
import { PageHeader } from "@/shared/components/PageHeader";

import { toast } from "sonner";

const CHART_COLORS = [
  "hsl(220, 70%, 18%)",
  "hsl(45, 60%, 55%)",
  "hsl(152, 60%, 40%)",
  "hsl(0, 72%, 51%)",
  "hsl(220, 50%, 35%)",
  "hsl(38, 92%, 50%)",
  "hsl(200, 65%, 45%)",
  "hsl(280, 50%, 45%)",
];

interface MonthlyData {
  month: string;
  monthFull: string;
  receita: number;
  despesa: number;
  lucro: number;
  honorarios: number;
  honorariosPagos: number;
  honorariosPendentes: number;
  custoFixo: number;
  custoVariavel: number;
}

interface DashboardData {
  totalProcessos: number;
  processosAtivos: number;
  processosEncerrados: number;
  processosSuspensos: number;
  totalClientes: number;
  totalReceitas: number;
  totalReceitasPagas: number;
  totalReceitasPendentes: number;
  totalReceitasAtrasadas: number;
  totalDespesas: number;
  totalDespesasPagas: number;
  totalDespesasPendentes: number;
  totalDespesasAtrasadas: number;
  totalEventos: number;
  totalDocumentos: number;
  processosPorStatus: { name: string; value: number }[];
  monthlyData: MonthlyData[];
  eventosPorCategoria: { name: string; value: number }[];
  processosRecentes: { month: string; novos: number; encerrados: number }[];
  receitasPorCategoria: { name: string; value: number }[];
  despesasPorCategoria: { name: string; value: number }[];
  ticketMedioProcesso: number;
  valorEstimadoCarteira: number;
}

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const formatCompact = (v: number) => {
  if (Math.abs(v) >= 1000000) return `R$${(v / 1000000).toFixed(1)}M`;
  if (Math.abs(v) >= 1000) return `R$${(v / 1000).toFixed(1)}k`;
  return formatCurrency(v);
};

const GrowthBadge = ({ current, previous }: { current: number; previous: number }) => {
  if (previous === 0 && current === 0) return <Badge variant="secondary" className="text-[10px]">—</Badge>;
  if (previous === 0) return <Badge className="bg-success/15 text-success border-0 text-[10px]">Novo</Badge>;
  const pct = ((current - previous) / previous) * 100;
  const isPositive = pct >= 0;
  return (
    <Badge className={cn(
      "border-0 text-[10px] gap-0.5",
      isPositive ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
    )}>
      {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {Math.abs(pct).toFixed(1)}%
    </Badge>
  );
};

// ... Timesheet BI Tab ...

interface TimesheetEntryBI {
  duration_minutes: number;
  hourly_rate: number;
  billing_status: string;
  processos_juridicos: { title: string } | null;
}

function TimesheetBITab({ orgId }: { orgId: string | null }) {
  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["bi", "timesheet", orgId],
    queryFn: async (): Promise<TimesheetEntryBI[]> => {
      if (!orgId) return [];
      const { data } = await supabase
        .from("timesheet_entries")
        .select("duration_minutes, hourly_rate, billing_status, processos_juridicos(title)")
        .eq("organization_id", orgId);
      return (data as unknown as TimesheetEntryBI[]) || [];
    },
    enabled: !!orgId,
  });


  const totalMin = entries.reduce((s: number, e) => s + (e.duration_minutes || 0), 0);
  const totalHoras = totalMin / 60;
  const aFaturar = entries
    .filter((e) => e.billing_status === "pendente")
    .reduce((s: number, e) => s + ((e.duration_minutes || 0) / 60) * (e.hourly_rate || 0), 0);
  const recebido = entries
    .filter((e) => e.billing_status === "pago")
    .reduce((s: number, e) => s + ((e.duration_minutes || 0) / 60) * (e.hourly_rate || 0), 0);
  const faturado = entries
    .filter((e) => e.billing_status === "faturado")
    .reduce((s: number, e) => s + ((e.duration_minutes || 0) / 60) * (e.hourly_rate || 0), 0);

  // Group by process
  const byProcess: Record<string, number> = {};
  entries.forEach((e) => {
    const title = e.processos_juridicos?.title || "Sem processo";
    byProcess[title] = (byProcess[title] || 0) + (e.duration_minutes || 0);
  });
  const ranked = Object.entries(byProcess)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([title, mins]) => ({ title, horas: mins / 60 }));
  const maxHoras = ranked[0]?.horas || 1;

  if (isLoading) return <div className="flex items-center justify-center py-20"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;

  if (entries.length === 0) return (
    <div className="flex flex-col items-center py-20 text-center">
      <Clock className="mb-3 h-12 w-12 text-muted-foreground/20" />
      <p className="text-sm text-muted-foreground">Nenhum registro de timesheet encontrado.</p>
      <p className="text-xs text-muted-foreground/60 mt-1">Execute a migration SQL e comece a registrar horas no Timesheet.</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Total de Horas", value: `${totalHoras.toFixed(1)}h`, icon: Clock, color: "text-primary", bg: "bg-primary/10" },
          { label: "A Faturar", value: formatCurrency(aFaturar), icon: Receipt, color: "text-amber-600", bg: "bg-amber-500/10" },
          { label: "Faturado", value: formatCurrency(faturado), icon: Briefcase, color: "text-blue-600", bg: "bg-blue-500/10" },
          { label: "Recebido", value: formatCurrency(recebido), icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-500/10" },
        ].map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label} className="border-border">
              <CardContent className="flex items-start gap-3 p-4">
                <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", kpi.bg)}>
                  <Icon className={cn("h-5 w-5", kpi.color)} />
                </div>
                <div>
                  <p className="text-lg font-bold text-foreground">{kpi.value}</p>
                  <p className="text-[11px] text-muted-foreground">{kpi.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm"><Clock className="h-4 w-4 text-primary" /> Horas por Processo</CardTitle>
          <CardDescription className="text-xs">Top 10 processos com mais horas registradas</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {ranked.map((item, i) => (
            <div key={item.title} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground truncate max-w-[60%]">{item.title}</span>
                <span className="font-semibold text-foreground tabular-nums">{item.horas.toFixed(1)}h</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <motion.div
                  className="h-full rounded-full bg-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${(item.horas / maxHoras) * 100}%` }}
                  transition={{ duration: 0.8, delay: i * 0.05 }}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export default function BIPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState("overview");

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("organization_id").eq("user_id", user!.id).single();
      return data;
    },
    enabled: !!user,
  });
  const orgId = profile?.organization_id ?? null;

  const { data, isLoading: loading } = useQuery({
    queryKey: ["bi", "dashboard", orgId],
    enabled: !!orgId,
    queryFn: async (): Promise<DashboardData> => {
      if (!orgId) throw new Error("No orgId");

      const [
        { data: processos },
        { data: clientes },
        { data: receitas },
        { data: despesas },
        { data: eventos },
        { count: docCount },
      ] = await Promise.all([
        supabase.from("processos_juridicos").select("*").eq("organization_id", orgId),
        supabase.from("clientes").select("id").eq("organization_id", orgId),
        supabase.from("contas_receber").select("*").eq("organization_id", orgId),
        supabase.from("contas_pagar").select("*").eq("organization_id", orgId),
        supabase.from("eventos_agenda").select("*").eq("organization_id", orgId),
        supabase.from("documentos").select("*", { count: "exact", head: true }).eq("organization_id", orgId),
      ]);

      const procs = processos || [];
      const recs = receitas || [];
      const desps = despesas || [];
      const evts = eventos || [];
      const today = new Date();

      // Processos por status
      const statusMap: Record<string, number> = {};
      procs.forEach((p: any) => { const s = p.status || "ativo"; statusMap[s] = (statusMap[s] || 0) + 1; });
      const statusLabels: Record<string, string> = { ativo: "Ativo", arquivado: "Arquivado", suspenso: "Suspenso", encerrado: "Encerrado" };
      const processosPorStatus = Object.entries(statusMap).map(([k, v]) => ({ name: statusLabels[k] || k, value: v }));

      // Receitas por categoria
      const recCatMap: Record<string, number> = {};
      recs.forEach((r: any) => { const c = r.category || "Honorários"; recCatMap[c] = (recCatMap[c] || 0) + Number(r.amount); });
      const receitasPorCategoria = Object.entries(recCatMap).map(([k, v]) => ({ name: k, value: v }));

      // Despesas por categoria
      const despCatMap: Record<string, number> = {};
      desps.forEach((d: any) => { const c = d.category || "Operacional"; despCatMap[c] = (despCatMap[c] || 0) + Number(d.amount); });
      const despesasPorCategoria = Object.entries(despCatMap).map(([k, v]) => ({ name: k, value: v }));

      // Monthly data (12 months)
      const monthlyData: MonthlyData[] = [];
      for (let i = 11; i >= 0; i--) {
        const d = subMonths(today, i);
        const mStart = startOfMonth(d);
        const mEnd = endOfMonth(d);
        const monthLabel = format(d, "MMM", { locale: ptBR });
        const monthFull = format(d, "MMMM/yy", { locale: ptBR });

        const monthRecs = recs.filter((r: any) => { const dd = new Date(r.due_date); return dd >= mStart && dd <= mEnd; });
        const monthDesps = desps.filter((r: any) => { const dd = new Date(r.due_date); return dd >= mStart && dd <= mEnd; });

        const receita = monthRecs.reduce((s: number, r: any) => s + Number(r.amount), 0);
        const despesa = monthDesps.reduce((s: number, r: any) => s + Number(r.amount), 0);
        const honorarios = monthRecs.filter((r: any) => (r.category || "").toLowerCase().includes("honor")).reduce((s: number, r: any) => s + Number(r.amount), 0);
        const honorariosPagos = monthRecs.filter((r: any) => (r.category || "").toLowerCase().includes("honor") && r.status === "pago").reduce((s: number, r: any) => s + Number(r.amount), 0);
        const honorariosPendentes = honorarios - honorariosPagos;

        monthlyData.push({
          month: monthLabel,
          monthFull,
          receita,
          despesa,
          lucro: receita - despesa,
          honorarios,
          honorariosPagos,
          honorariosPendentes,
          custoFixo: monthDesps.filter((d: any) => (d.category || "").toLowerCase().includes("fix")).reduce((s: number, r: any) => s + Number(r.amount), 0),
          custoVariavel: monthDesps.filter((d: any) => !(d.category || "").toLowerCase().includes("fix")).reduce((s: number, r: any) => s + Number(r.amount), 0),
        });
      }

      // Eventos por categoria
      const catMap: Record<string, number> = {};
      const catLabels: Record<string, string> = { audiencia: "Audiência", reuniao: "Reunião", prazo: "Prazo", compromisso: "Compromisso", lembrete: "Lembrete" };
      evts.forEach((e: any) => { const c = e.category || "compromisso"; catMap[c] = (catMap[c] || 0) + 1; });
      const eventosPorCategoria = Object.entries(catMap).map(([k, v]) => ({ name: catLabels[k] || k, value: v }));

      // Processos novos/encerrados por mês
      const processosRecentes: { month: string; novos: number; encerrados: number }[] = [];
      for (let i = 11; i >= 0; i--) {
        const d = subMonths(today, i);
        const mStart = startOfMonth(d);
        const mEnd = endOfMonth(d);
        const monthLabel = format(d, "MMM", { locale: ptBR });
        const novos = procs.filter((p: any) => { const dd = new Date(p.created_at); return dd >= mStart && dd <= mEnd; }).length;
        const encerrados = procs.filter((p: any) => { if (p.status !== "encerrado") return false; const dd = new Date(p.updated_at); return dd >= mStart && dd <= mEnd; }).length;
        processosRecentes.push({ month: monthLabel, novos, encerrados });
      }

      const totalReceitas = recs.reduce((s: number, r: any) => s + Number(r.amount), 0);
      const totalReceitasPagas = recs.filter((r: any) => r.status === "pago").reduce((s: number, r: any) => s + Number(r.amount), 0);
      const totalReceitasPendentes = recs.filter((r: any) => r.status === "pendente").reduce((s: number, r: any) => s + Number(r.amount), 0);
      const totalReceitasAtrasadas = recs.filter((r: any) => r.status === "pendente" && new Date(r.due_date) < today).reduce((s: number, r: any) => s + Number(r.amount), 0);
      const totalDespesas = desps.reduce((s: number, r: any) => s + Number(r.amount), 0);
      const totalDespesasPagas = desps.filter((r: any) => r.status === "pago").reduce((s: number, r: any) => s + Number(r.amount), 0);
      const totalDespesasPendentes = desps.filter((r: any) => r.status === "pendente").reduce((s: number, r: any) => s + Number(r.amount), 0);
      const totalDespesasAtrasadas = desps.filter((r: any) => r.status === "pendente" && new Date(r.due_date) < today).reduce((s: number, r: any) => s + Number(r.amount), 0);

      const processosComValor = procs.filter((p: any) => p.estimated_value && Number(p.estimated_value) > 0);
      const ticketMedioProcesso = processosComValor.length > 0 ? processosComValor.reduce((s: number, p: any) => s + Number(p.estimated_value || 0), 0) / processosComValor.length : 0;
      const valorEstimadoCarteira = procs.filter((p: any) => p.status === "ativo").reduce((s: number, p: any) => s + Number(p.estimated_value || 0), 0);

      return {
        totalProcessos: procs.length,
        processosAtivos: procs.filter((p: any) => p.status === "ativo").length,
        processosEncerrados: procs.filter((p: any) => p.status === "encerrado").length,
        processosSuspensos: procs.filter((p: any) => p.status === "suspenso").length,
        totalClientes: (clientes || []).length,
        totalReceitas, totalReceitasPagas, totalReceitasPendentes, totalReceitasAtrasadas,
        totalDespesas, totalDespesasPagas, totalDespesasPendentes, totalDespesasAtrasadas,
        totalEventos: evts.length,
        totalDocumentos: docCount || 0,
        processosPorStatus, monthlyData, eventosPorCategoria, processosRecentes,
        receitasPorCategoria, despesasPorCategoria,
        ticketMedioProcesso, valorEstimadoCarteira,
      };
    },
  });

  const computed = useMemo(() => {
    if (!data) return null;
    const md = data.monthlyData;
    const lucro = data.totalReceitas - data.totalDespesas;
    const margemLucro = data.totalReceitas > 0 ? (lucro / data.totalReceitas) * 100 : 0;
    const taxaEncerramento = data.totalProcessos > 0 ? (data.processosEncerrados / data.totalProcessos) * 100 : 0;

    // Current vs previous month
    const currMonth = md.length > 0 ? md[md.length - 1] : null;
    const prevMonth = md.length > 1 ? md[md.length - 2] : null;

    // Averages (last 6 months)
    const last6 = md.slice(-6);
    const avgReceita = last6.length > 0 ? last6.reduce((s, m) => s + m.receita, 0) / last6.length : 0;
    const avgDespesa = last6.length > 0 ? last6.reduce((s, m) => s + m.despesa, 0) / last6.length : 0;
    const avgLucro = last6.length > 0 ? last6.reduce((s, m) => s + m.lucro, 0) / last6.length : 0;

    // DRE data
    const dreData = md.map(m => ({
      month: m.month,
      receitaBruta: m.receita,
      custos: m.despesa,
      lucroBruto: m.receita - m.despesa,
      margemBruta: m.receita > 0 ? ((m.receita - m.despesa) / m.receita) * 100 : 0,
    }));

    // Growth data with percentage
    const growthData = md.map((m, i) => {
      const prev = i > 0 ? md[i - 1] : null;
      return {
        month: m.month,
        receitaGrowth: prev && prev.receita > 0 ? ((m.receita - prev.receita) / prev.receita) * 100 : 0,
        despesaGrowth: prev && prev.despesa > 0 ? ((m.despesa - prev.despesa) / prev.despesa) * 100 : 0,
        lucroGrowth: prev && prev.lucro !== 0 ? ((m.lucro - prev.lucro) / Math.abs(prev.lucro)) * 100 : 0,
      };
    }).slice(1);

    return { lucro, margemLucro, taxaEncerramento, currMonth, prevMonth, avgReceita, avgDespesa, avgLucro, dreData, growthData };
  }, [data]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!data || !computed) return null;

  const kpis = [
    { label: "Faturamento", value: formatCurrency(data.totalReceitas), icon: TrendingUp, color: "text-success", bg: "bg-success/10", sub: <GrowthBadge current={computed.currMonth?.receita || 0} previous={computed.prevMonth?.receita || 0} /> },
    { label: "Custos Totais", value: formatCurrency(data.totalDespesas), icon: CreditCard, color: "text-destructive", bg: "bg-destructive/10", sub: <GrowthBadge current={computed.currMonth?.despesa || 0} previous={computed.prevMonth?.despesa || 0} /> },
    { label: "Lucro Líquido", value: formatCurrency(computed.lucro), icon: DollarSign, color: computed.lucro >= 0 ? "text-success" : "text-destructive", bg: computed.lucro >= 0 ? "bg-success/10" : "bg-destructive/10", sub: <Badge variant="secondary" className="text-[10px]">{computed.margemLucro.toFixed(1)}% margem</Badge> },
    { label: "Honorários Pendentes", value: formatCurrency(data.totalReceitasPendentes), icon: Receipt, color: "text-warning", bg: "bg-warning/10", sub: data.totalReceitasAtrasadas > 0 ? <Badge className="bg-destructive/15 text-destructive border-0 text-[10px]">{formatCurrency(data.totalReceitasAtrasadas)} atrasado</Badge> : null },
    { label: "Processos Ativos", value: data.processosAtivos, icon: Scale, color: "text-primary", bg: "bg-primary/10", sub: <Badge variant="secondary" className="text-[10px]">{data.totalProcessos} total</Badge> },
    { label: "Carteira Estimada", value: formatCompact(data.valorEstimadoCarteira), icon: Wallet, color: "text-primary", bg: "bg-primary/10", sub: <Badge variant="secondary" className="text-[10px]">Ticket médio {formatCompact(data.ticketMedioProcesso)}</Badge> },
    { label: "Clientes", value: data.totalClientes, icon: Users, color: "text-primary", bg: "bg-primary/10", sub: null },
    { label: "Taxa Encerramento", value: `${computed.taxaEncerramento.toFixed(1)}%`, icon: CheckCircle2, color: "text-success", bg: "bg-success/10", sub: <Badge variant="secondary" className="text-[10px]">{data.processosEncerrados} encerrados</Badge> },
  ];

  const tooltipStyle = { background: "hsl(0, 0%, 100%)", border: "1px solid hsl(220, 10%, 92%)", borderRadius: 8, fontSize: 12 };
  const axisStyle = { fontSize: 11, fill: "hsl(220, 10%, 45%)" };

  return (
    <div id="bi-dashboard-container" className="space-y-6 bg-background rounded-lg p-1">
      <PageHeader
        title="Business Intelligence"
        subtitle="Análise avançada de desempenho do escritório"
        icon={BarChart3}
        gradient="from-slate-700 to-slate-900"
        actions={
          <div className="flex gap-2">
            <Badge variant="outline" className="gap-1.5 text-xs h-8 items-center flex bg-white/10 text-primary-foreground border-white/20">
              <Activity className="h-3 w-3" /> Últimos 12 meses
            </Badge>
            <Button
              variant="secondary"
              size="sm"
              className="gap-1.5 text-xs h-8 bg-white/10 text-primary-foreground border-white/20 hover:bg-white/20"
              onClick={async () => {
                const { default: html2canvas } = await import("html2canvas");
                const { jsPDF } = await import("jspdf");

                const element = document.getElementById("bi-dashboard-container");
                if (!element) return;

                try {
                  toast.loading("Gerando PDF, aguarde...", { id: "pdf-export" });
                  const canvas = await html2canvas(element, {
                    scale: 2,
                    useCORS: true,
                    logging: false,
                    backgroundColor: "#ffffff"
                  });

                  const imgData = canvas.toDataURL("image/png");
                  const pdf = new jsPDF("p", "mm", "a4");
                  const pdfWidth = pdf.internal.pageSize.getWidth();
                  const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

                  pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
                  pdf.save(`LEXA_BI_${format(new Date(), "yyyyMMdd")}.pdf`);
                  toast.success("PDF gerado com sucesso!", { id: "pdf-export" });
                } catch (error) {
                  console.error(error);
                  toast.error("Erro ao gerar PDF", { id: "pdf-export" });
                }
              }}
            >
              <Download className="h-3.5 w-3.5" /> PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs h-8"
              onClick={() => {
                const rows = [
                  ["Mês", "Receita", "Despesa", "Lucro", "Margem %", "Honorários"],
                  ...data.monthlyData.map((m) => [
                    m.monthFull,
                    m.receita.toFixed(2),
                    m.despesa.toFixed(2),
                    m.lucro.toFixed(2),
                    m.receita > 0 ? ((m.lucro / m.receita) * 100).toFixed(1) : "0",
                    m.honorarios.toFixed(2),
                  ]),
                ];
                const csv = rows.map((r) => r.join(";")).join("\n");
                const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `LEXA_BI_${format(new Date(), "yyyyMMdd")}.csv`;
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              <Download className="h-3.5 w-3.5" /> CSV
            </Button>
          </div>
        }
      />

      {/* KPI Grid */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <motion.div key={kpi.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}>
              <Card className="border-border">
                <CardContent className="flex items-start gap-3 p-4">
                  <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", kpi.bg)}>
                    <Icon className={cn("h-5 w-5", kpi.color)} />
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <p className="text-lg font-bold text-foreground truncate">{kpi.value}</p>
                    <p className="text-[11px] text-muted-foreground">{kpi.label}</p>
                    {kpi.sub}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview" className="text-xs gap-1.5"><LayoutDashboard className="h-3.5 w-3.5" /> Visão Geral</TabsTrigger>
          <TabsTrigger value="dre" className="text-xs gap-1.5"><Layers className="h-3.5 w-3.5" /> DRE</TabsTrigger>
          <TabsTrigger value="financial" className="text-xs gap-1.5"><DollarSign className="h-3.5 w-3.5" /> Financeiro</TabsTrigger>
          <TabsTrigger value="honorarios" className="text-xs gap-1.5"><Banknote className="h-3.5 w-3.5" /> Honorários</TabsTrigger>
          <TabsTrigger value="growth" className="text-xs gap-1.5"><TrendingUp className="h-3.5 w-3.5" /> Crescimento</TabsTrigger>
          <TabsTrigger value="processos" className="text-xs gap-1.5"><Scale className="h-3.5 w-3.5" /> Processos</TabsTrigger>
          <TabsTrigger value="timesheet" className="text-xs gap-1.5"><Clock className="h-3.5 w-3.5" /> Timesheet</TabsTrigger>
        </TabsList>

        {/* VISÃO GERAL */}
        <TabsContent value="overview" className="mt-0 space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm"><Activity className="h-4 w-4 text-primary" /> Receita vs Despesa vs Lucro</CardTitle>
                <CardDescription className="text-xs">Comparativo mensal (12 meses)</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={data.monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 10%, 92%)" />
                    <XAxis dataKey="month" tick={axisStyle} />
                    <YAxis tick={axisStyle} tickFormatter={(v) => formatCompact(v)} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatCurrency(v)} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="receita" name="Receita" fill={CHART_COLORS[2]} radius={[3, 3, 0, 0]} />
                    <Bar dataKey="despesa" name="Despesa" fill={CHART_COLORS[3]} radius={[3, 3, 0, 0]} />
                    <Line type="monotone" dataKey="lucro" name="Lucro" stroke={CHART_COLORS[0]} strokeWidth={2.5} dot={{ r: 3, fill: CHART_COLORS[0] }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm"><PieChart className="h-4 w-4 text-primary" /> Processos por Status</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-center">
                <ResponsiveContainer width="100%" height={300}>
                  <RPieChart>
                    <Pie data={data.processosPorStatus} cx="50%" cy="50%" innerRadius={65} outerRadius={100} dataKey="value" paddingAngle={3} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                      {data.processosPorStatus.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </RPieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Médias */}
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { label: "Receita Média Mensal", value: computed.avgReceita, icon: TrendingUp, color: "text-success" },
              { label: "Despesa Média Mensal", value: computed.avgDespesa, icon: TrendingDown, color: "text-destructive" },
              { label: "Lucro Médio Mensal", value: computed.avgLucro, icon: DollarSign, color: computed.avgLucro >= 0 ? "text-success" : "text-destructive" },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <Card key={item.label} className="border-border">
                  <CardContent className="flex items-center gap-3 p-4">
                    <Icon className={cn("h-5 w-5 shrink-0", item.color)} />
                    <div>
                      <p className="font-bold text-foreground">{formatCurrency(item.value)}</p>
                      <p className="text-[11px] text-muted-foreground">{item.label} <span className="text-muted-foreground/60">(últ. 6m)</span></p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* DRE AVANÇADO */}
        <TabsContent value="dre" className="mt-0 space-y-4">
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm"><Layers className="h-4 w-4 text-primary" /> Demonstrativo de Resultados (DRE)</CardTitle>
              <CardDescription className="text-xs">Visão mensal de receitas, custos e margem bruta</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <ComposedChart data={computed.dreData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 10%, 92%)" />
                  <XAxis dataKey="month" tick={axisStyle} />
                  <YAxis yAxisId="left" tick={axisStyle} tickFormatter={(v) => formatCompact(v)} />
                  <YAxis yAxisId="right" orientation="right" tick={axisStyle} tickFormatter={(v) => `${v.toFixed(0)}%`} domain={[-100, 100]} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number, name: string) => name === "Margem Bruta %" ? `${v.toFixed(1)}%` : formatCurrency(v)} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <ReferenceLine yAxisId="left" y={0} stroke="hsl(220, 10%, 75%)" />
                  <Bar yAxisId="left" dataKey="receitaBruta" name="Receita Bruta" fill={CHART_COLORS[2]} radius={[3, 3, 0, 0]} />
                  <Bar yAxisId="left" dataKey="custos" name="Custos" fill={CHART_COLORS[3]} radius={[3, 3, 0, 0]} />
                  <Bar yAxisId="left" dataKey="lucroBruto" name="Lucro Bruto" fill={CHART_COLORS[0]} radius={[3, 3, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="margemBruta" name="Margem Bruta %" stroke={CHART_COLORS[1]} strokeWidth={2.5} dot={{ r: 3, fill: CHART_COLORS[1] }} />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* DRE Table */}
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm"><FileText className="h-4 w-4 text-primary" /> DRE Detalhado</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="py-2 text-left font-semibold text-muted-foreground">Período</th>
                      {data.monthlyData.slice(-6).map(m => (
                        <th key={m.month} className="py-2 text-right font-semibold text-muted-foreground uppercase">{m.month}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-border/50">
                      <td className="py-2 font-semibold text-foreground">Receita Bruta</td>
                      {data.monthlyData.slice(-6).map(m => <td key={m.month} className="py-2 text-right text-success font-medium">{formatCompact(m.receita)}</td>)}
                    </tr>
                    <tr className="border-b border-border/50">
                      <td className="py-2 pl-3 text-muted-foreground">↳ Honorários</td>
                      {data.monthlyData.slice(-6).map(m => <td key={m.month} className="py-2 text-right text-muted-foreground">{formatCompact(m.honorarios)}</td>)}
                    </tr>
                    <tr className="border-b border-border/50">
                      <td className="py-2 font-semibold text-foreground">(-) Custos</td>
                      {data.monthlyData.slice(-6).map(m => <td key={m.month} className="py-2 text-right text-destructive font-medium">{formatCompact(m.despesa)}</td>)}
                    </tr>
                    <tr className="border-b border-border/50">
                      <td className="py-2 pl-3 text-muted-foreground">↳ Custos Fixos</td>
                      {data.monthlyData.slice(-6).map(m => <td key={m.month} className="py-2 text-right text-muted-foreground">{formatCompact(m.custoFixo)}</td>)}
                    </tr>
                    <tr className="border-b border-border/50">
                      <td className="py-2 pl-3 text-muted-foreground">↳ Custos Variáveis</td>
                      {data.monthlyData.slice(-6).map(m => <td key={m.month} className="py-2 text-right text-muted-foreground">{formatCompact(m.custoVariavel)}</td>)}
                    </tr>
                    <Separator className="my-0" />
                    <tr className="border-b border-border bg-muted/30">
                      <td className="py-2 font-bold text-foreground">= Lucro Bruto</td>
                      {data.monthlyData.slice(-6).map(m => <td key={m.month} className={cn("py-2 text-right font-bold", m.lucro >= 0 ? "text-success" : "text-destructive")}>{formatCompact(m.lucro)}</td>)}
                    </tr>
                    <tr>
                      <td className="py-2 font-semibold text-foreground">Margem Bruta</td>
                      {data.monthlyData.slice(-6).map(m => {
                        const margin = m.receita > 0 ? ((m.lucro / m.receita) * 100) : 0;
                        return <td key={m.month} className={cn("py-2 text-right font-semibold", margin >= 0 ? "text-success" : "text-destructive")}>{margin.toFixed(1)}%</td>;
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* FINANCEIRO */}
        <TabsContent value="financial" className="mt-0 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Status Receitas */}
            <Card className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm"><TrendingUp className="h-4 w-4 text-success" /> Receitas por Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: "Recebido", value: data.totalReceitasPagas, color: "bg-success" },
                  { label: "Pendente", value: data.totalReceitasPendentes, color: "bg-warning" },
                  { label: "Atrasado", value: data.totalReceitasAtrasadas, color: "bg-destructive" },
                ].map(item => (
                  <div key={item.label} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className="font-semibold text-foreground">{formatCurrency(item.value)}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <motion.div className={cn("h-full rounded-full", item.color)} initial={{ width: 0 }} animate={{ width: `${data.totalReceitas > 0 ? (item.value / data.totalReceitas) * 100 : 0}%` }} transition={{ duration: 0.8 }} />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Status Despesas */}
            <Card className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm"><ArrowDownRight className="h-4 w-4 text-destructive" /> Despesas por Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: "Pago", value: data.totalDespesasPagas, color: "bg-success" },
                  { label: "Pendente", value: data.totalDespesasPendentes, color: "bg-warning" },
                  { label: "Atrasado", value: data.totalDespesasAtrasadas, color: "bg-destructive" },
                ].map(item => (
                  <div key={item.label} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className="font-semibold text-foreground">{formatCurrency(item.value)}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <motion.div className={cn("h-full rounded-full", item.color)} initial={{ width: 0 }} animate={{ width: `${data.totalDespesas > 0 ? (item.value / data.totalDespesas) * 100 : 0}%` }} transition={{ duration: 0.8 }} />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Categorias */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm"><PieChart className="h-4 w-4 text-success" /> Receitas por Categoria</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <RPieChart>
                    <Pie data={data.receitasPorCategoria} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={3} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                      {data.receitasPorCategoria.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatCurrency(v)} />
                  </RPieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm"><PieChart className="h-4 w-4 text-destructive" /> Despesas por Categoria</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <RPieChart>
                    <Pie data={data.despesasPorCategoria} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={3} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                      {data.despesasPorCategoria.map((_, i) => <Cell key={i} fill={CHART_COLORS[(i + 3) % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatCurrency(v)} />
                  </RPieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Fluxo de Caixa */}
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm"><Activity className="h-4 w-4 text-primary" /> Fluxo de Caixa (12 meses)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={data.monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 10%, 92%)" />
                  <XAxis dataKey="month" tick={axisStyle} />
                  <YAxis tick={axisStyle} tickFormatter={(v) => formatCompact(v)} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatCurrency(v)} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area type="monotone" dataKey="receita" name="Receita" stroke={CHART_COLORS[2]} fill={CHART_COLORS[2]} fillOpacity={0.15} strokeWidth={2} />
                  <Area type="monotone" dataKey="despesa" name="Despesa" stroke={CHART_COLORS[3]} fill={CHART_COLORS[3]} fillOpacity={0.1} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* HONORÁRIOS */}
        <TabsContent value="honorarios" className="mt-0 space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-border">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-success/10"><Banknote className="h-5 w-5 text-success" /></div>
                <div>
                  <p className="font-bold text-foreground">{formatCurrency(data.totalReceitasPagas)}</p>
                  <p className="text-[11px] text-muted-foreground">Honorários Recebidos</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-warning/10"><Clock className="h-5 w-5 text-warning" /></div>
                <div>
                  <p className="font-bold text-foreground">{formatCurrency(data.totalReceitasPendentes)}</p>
                  <p className="text-[11px] text-muted-foreground">Honorários a Receber</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-destructive/10"><ArrowDownRight className="h-5 w-5 text-destructive" /></div>
                <div>
                  <p className="font-bold text-foreground">{formatCurrency(data.totalReceitasAtrasadas)}</p>
                  <p className="text-[11px] text-muted-foreground">Honorários Atrasados</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm"><Banknote className="h-4 w-4 text-primary" /> Honorários Mês a Mês</CardTitle>
              <CardDescription className="text-xs">Pagos vs Pendentes por mês</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={data.monthlyData} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 10%, 92%)" />
                  <XAxis dataKey="month" tick={axisStyle} />
                  <YAxis tick={axisStyle} tickFormatter={(v) => formatCompact(v)} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatCurrency(v)} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="honorariosPagos" name="Recebidos" stackId="a" fill={CHART_COLORS[2]} radius={[0, 0, 0, 0]} />
                  <Bar dataKey="honorariosPendentes" name="Pendentes" stackId="a" fill={CHART_COLORS[5]} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CRESCIMENTO */}
        <TabsContent value="growth" className="mt-0 space-y-4">
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm"><PercentIcon className="h-4 w-4 text-primary" /> Crescimento Mensal (%)</CardTitle>
              <CardDescription className="text-xs">Variação percentual mês a mês</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <ComposedChart data={computed.growthData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 10%, 92%)" />
                  <XAxis dataKey="month" tick={axisStyle} />
                  <YAxis tick={axisStyle} tickFormatter={(v) => `${v.toFixed(0)}%`} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `${v.toFixed(1)}%`} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <ReferenceLine y={0} stroke="hsl(220, 10%, 75%)" />
                  <Bar dataKey="receitaGrowth" name="Receita %" fill={CHART_COLORS[2]} radius={[3, 3, 0, 0]} />
                  <Bar dataKey="despesaGrowth" name="Despesa %" fill={CHART_COLORS[3]} radius={[3, 3, 0, 0]} />
                  <Line type="monotone" dataKey="lucroGrowth" name="Lucro %" stroke={CHART_COLORS[0]} strokeWidth={2.5} dot={{ r: 3, fill: CHART_COLORS[0] }} />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Month comparison table */}
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm"><BarChart3 className="h-4 w-4 text-primary" /> Comparativo Mês a Mês</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="py-2 text-left font-semibold text-muted-foreground">Mês</th>
                      <th className="py-2 text-right font-semibold text-muted-foreground">Receita</th>
                      <th className="py-2 text-right font-semibold text-muted-foreground">Despesa</th>
                      <th className="py-2 text-right font-semibold text-muted-foreground">Lucro</th>
                      <th className="py-2 text-right font-semibold text-muted-foreground">Margem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.monthlyData.slice(-6).map((m) => {
                      const margin = m.receita > 0 ? ((m.lucro / m.receita) * 100) : 0;
                      return (
                        <tr key={m.monthFull} className="border-b border-border/50">
                          <td className="py-2 font-medium text-foreground capitalize">{m.monthFull}</td>
                          <td className="py-2 text-right text-success">{formatCurrency(m.receita)}</td>
                          <td className="py-2 text-right text-destructive">{formatCurrency(m.despesa)}</td>
                          <td className={cn("py-2 text-right font-semibold", m.lucro >= 0 ? "text-success" : "text-destructive")}>{formatCurrency(m.lucro)}</td>
                          <td className={cn("py-2 text-right", margin >= 0 ? "text-success" : "text-destructive")}>{margin.toFixed(1)}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PROCESSOS */}
        <TabsContent value="processos" className="mt-0 space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm"><Briefcase className="h-4 w-4 text-primary" /> Novos vs Encerrados</CardTitle>
                <CardDescription className="text-xs">Fluxo de processos (12 meses)</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={data.processosRecentes}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 10%, 92%)" />
                    <XAxis dataKey="month" tick={axisStyle} />
                    <YAxis tick={axisStyle} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Area type="monotone" dataKey="novos" name="Novos" stroke={CHART_COLORS[0]} fill={CHART_COLORS[0]} fillOpacity={0.15} strokeWidth={2} />
                    <Area type="monotone" dataKey="encerrados" name="Encerrados" stroke={CHART_COLORS[2]} fill={CHART_COLORS[2]} fillOpacity={0.15} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm"><Target className="h-4 w-4 text-primary" /> Indicadores de Processos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 py-2">
                {[
                  { label: "Ativos", value: data.processosAtivos, total: data.totalProcessos, color: CHART_COLORS[0] },
                  { label: "Encerrados", value: data.processosEncerrados, total: data.totalProcessos, color: CHART_COLORS[2] },
                  { label: "Suspensos", value: data.processosSuspensos, total: data.totalProcessos, color: CHART_COLORS[5] },
                ].map((item) => (
                  <div key={item.label} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className="font-semibold text-foreground">{item.value} <span className="text-muted-foreground font-normal text-xs">({item.total > 0 ? ((item.value / item.total) * 100).toFixed(0) : 0}%)</span></span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <motion.div className="h-full rounded-full" style={{ backgroundColor: item.color }} initial={{ width: 0 }} animate={{ width: `${item.total > 0 ? (item.value / item.total) * 100 : 0}%` }} transition={{ duration: 0.8 }} />
                    </div>
                  </div>
                ))}
                <Separator />
                <div className="flex justify-between text-sm pt-1">
                  <span className="text-muted-foreground">Ticket Médio</span>
                  <span className="font-bold text-foreground">{formatCurrency(data.ticketMedioProcesso)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Carteira (ativos)</span>
                  <span className="font-bold text-foreground">{formatCurrency(data.valorEstimadoCarteira)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TIMESHEET */}
        <TabsContent value="timesheet" className="mt-0 space-y-4">
          <TimesheetBITab orgId={orgId} />
        </TabsContent>
      </Tabs>
    </div >
  );
}
