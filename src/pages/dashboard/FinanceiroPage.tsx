import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format, parseISO, isPast, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  DollarSign, Plus, Search, Filter, Edit2, Trash2, TrendingUp, TrendingDown,
  ArrowUpRight, ArrowDownRight, Wallet, Receipt, BarChart2, Bell, CheckCircle2, QrCode, Copy,
  RefreshCw, ExternalLink
} from "lucide-react";
import { asaasService } from "@/services/asaasService";
import BudgetPerformanceTab from "@/components/financeiro/BudgetPerformanceTab";
import { DasDarfPanel } from "@/components/financeiro/DasDarfPanel";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import FormField from "@/components/shared/FormField";
import LexaLoadingOverlay from "@/components/shared/LexaLoadingOverlay";
import { formatCurrencyInput, parseCurrencyToNumber } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const STATUS_OPTIONS = [
  { value: "pendente", label: "Pendente", color: "text-amber-600 bg-amber-500/10 border-amber-500/20" },
  { value: "pago", label: "Pago", color: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20" },
  { value: "atrasado", label: "Atrasado", color: "text-rose-600 bg-rose-500/10 border-rose-500/20" },
  { value: "cancelado", label: "Cancelado", color: "text-slate-600 bg-slate-500/10 border-border" },
];

const CATEGORIES = ["Honorários", "Custas Processuais", "Aluguel", "Salários", "Energia / Internet", "Marketing", "Impostos", "Outros"];

const fmtCurrency = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const emptyForm = { description: "", amount_display: "", due_date: "", status: "pendente", category: "" };

function getMonthYearLabel(dateStr: string) {
  return format(parseISO(dateStr), "MMMM yyyy", { locale: ptBR });
}

export default function FinanceiroPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [tab, setTab] = useState("receber");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const [pixModalOpen, setPixModalOpen] = useState(false);
  const [selectedPix, setSelectedPix] = useState<any>(null);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("organization_id").eq("user_id", user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  const orgId = profile?.organization_id;
  const tableName = tab === "receber" ? "contas_receber" : "contas_pagar";

  const { data: contas = [], isLoading } = useQuery({
    queryKey: [tableName, orgId],
    queryFn: async () => {
      const { data, error } = await supabase.from(tableName).select("*").eq("organization_id", orgId!).order("due_date", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const { data: receberData = [] } = useQuery({
    queryKey: ["contas_receber", orgId],
    queryFn: async () => {
      const { data } = await supabase.from("contas_receber").select("amount, status").eq("organization_id", orgId!);
      return data ?? [];
    },
    enabled: !!orgId,
  });

  const { data: pagarData = [] } = useQuery({
    queryKey: ["contas_pagar", orgId],
    queryFn: async () => {
      const { data } = await supabase.from("contas_pagar").select("amount, status").eq("organization_id", orgId!);
      return data ?? [];
    },
    enabled: !!orgId,
  });

  const totalReceber = receberData.filter((c) => c.status === "pendente").reduce((s, c) => s + Number(c.amount), 0);
  const totalPagar = pagarData.filter((c) => c.status === "pendente").reduce((s, c) => s + Number(c.amount), 0);
  const totalRecebido = receberData.filter((c) => c.status === "pago").reduce((s, c) => s + Number(c.amount), 0);
  const totalPagoVal = pagarData.filter((c) => c.status === "pago").reduce((s, c) => s + Number(c.amount), 0);
  const saldo = totalRecebido - totalPagoVal;

  // Progress Bar Calcs
  const totalFluxo = totalReceber + totalPagar;
  const healthPercent = totalFluxo === 0 ? 50 : (totalReceber / totalFluxo) * 100;

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { error } = await supabase.from(tableName).insert(payload);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: [tableName] }); queryClient.invalidateQueries({ queryKey: ["contas_receber"] }); queryClient.invalidateQueries({ queryKey: ["contas_pagar"] }); toast.success("Conta criada"); closeDialog(); },
    onError: (e: any) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...payload }: any) => {
      const { error } = await supabase.from(tableName).update(payload).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: [tableName] }); queryClient.invalidateQueries({ queryKey: ["contas_receber"] }); queryClient.invalidateQueries({ queryKey: ["contas_pagar"] }); toast.success("Conta atualizada"); closeDialog(); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(tableName).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: [tableName] }); queryClient.invalidateQueries({ queryKey: ["contas_receber"] }); queryClient.invalidateQueries({ queryKey: ["contas_pagar"] }); toast.success("Conta excluída"); setDeleteDialogOpen(false); setEditingId(null); },
    onError: (e: any) => toast.error(e.message),
  });

  const generatePixMutation = useMutation({
    mutationFn: async (c: any) => {
      // Mock PIX API call / Asaas Gateway
      const mockPixCode = `00020126440014BR.GOV.BCB.PIX0122rodrigo@lexanova.com.br5204000053039865405${Number(c.amount).toFixed(2)}5802BR5915Lexa Nova Ltda6009Sao Paulo62070503***6304${Math.floor(Math.random() * 10000)}`;
      const { error } = await (supabase.from("contas_receber") as any).update({
        pix_code: mockPixCode,
        gateway_id: `pay_${Math.floor(Math.random() * 99999999)}`
      }).eq("id", c.id);
      if (error) throw error;
      return { ...c, pix_code: mockPixCode };
    },
    onSuccess: (updatedData) => {
      queryClient.invalidateQueries({ queryKey: [tableName] });
      setSelectedPix(updatedData);
      setPixModalOpen(true);
      toast.success("Cobrança PIX gerada com sucesso!");
    },
    onError: (e: any) => toast.error(`Erro ao gerar PIX: ${e.message}`)
  });

  const reconcileAsaasMutation = useMutation({
    mutationFn: async (c: any) => {
      if (!orgId || !c.asaas_id) return;

      const payment = await asaasService.getPayment(orgId, c.asaas_id);

      if (payment.status === "RECEIVED" || payment.status === "CONFIRMED" || payment.status === "RECEIVED_IN_CASH") {
        const { error } = await supabase.from(tableName).update({
          status: "pago",
          updated_at: new Date().toISOString()
        }).eq("id", c.id);
        if (error) throw error;
        toast.success(`Pagamento de ${c.description} confirmado!`);
      } else {
        toast.info(`Status no Asaas: ${payment.status}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [tableName] });
    },
    onError: (err: any) => toast.error(`Erro ao reconciliar: ${err.message}`)
  });

  const reconcileAllAsaas = async () => {
    const pendingAsaas = filtered.filter((c: any) => c.status === "pendente" && c.asaas_id);
    if (pendingAsaas.length === 0) {
      toast.info("Nenhuma conta do Asaas pendente para sincronizar.");
      return;
    }

    toast.loading(`Sincronizando ${pendingAsaas.length} faturas...`);
    for (const c of pendingAsaas) {
      await reconcileAsaasMutation.mutateAsync(c);
    }
    toast.dismiss();
    toast.success("Sincronização concluída.");
  };

  const markAsPaid = (id: string) => {
    updateMutation.mutate({ id, status: "pago" });
  };

  const closeDialog = () => { setDialogOpen(false); setForm(emptyForm); setEditingId(null); };
  const openCreate = () => { setForm(emptyForm); setEditingId(null); setDialogOpen(true); };

  const openEdit = (c: any) => {
    setForm({
      description: c.description,
      amount_display: formatCurrencyInput(String(Math.round(Number(c.amount) * 100))),
      due_date: c.due_date,
      status: c.status,
      category: c.category || "",
    });
    setEditingId(c.id);
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    const amount = parseCurrencyToNumber(form.amount_display);
    if (!form.description || !amount || !form.due_date) {
      toast.error("Preencha descrição, valor e data");
      return;
    }
    if (!orgId) return;

    const payload = {
      description: form.description,
      amount,
      due_date: form.due_date,
      status: form.status,
      category: form.category || null,
      organization_id: orgId,
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const filtered = contas.filter((c: any) => {
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    const q = search.toLowerCase();
    const matchSearch = !q || c.description.toLowerCase().includes(q) || (c.category ?? "").toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  // Group by month
  const groupedMonths = filtered.reduce((acc, c: any) => {
    const label = getMonthYearLabel(c.due_date);
    if (!acc[label]) acc[label] = [];
    acc[label].push(c);
    return acc;
  }, {} as Record<string, any[]>);

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const containerAnim = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
  const itemAnim = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };

  return (
    <motion.div variants={containerAnim} initial="hidden" animate="show" className="max-w-6xl mx-auto space-y-8 pb-10">
      <LexaLoadingOverlay visible={isSaving} message="Salvando..." />

      {/* ── Minimal Header ── */}
      <motion.div variants={itemAnim} className="flex flex-col md:flex-row md:items-end justify-between gap-4 pt-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {t("financial.title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            {t("financial.subtitle")}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={openCreate} className="h-10 gap-2 font-medium shadow-sm">
            <Plus className="h-4 w-4" /> Nova Transação
          </Button>
          {tab === "receber" && (
            <Button variant="outline" onClick={reconcileAllAsaas} className="h-10 gap-2 font-medium">
              <RefreshCw className="h-4 w-4" /> Sincronizar Asaas
            </Button>
          )}
        </div>
      </motion.div>

      {/* ── Key Metrics Overview ── */}
      <motion.div variants={itemAnim} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "A Receber (Pendente)", val: fmtCurrency(totalReceber), icon: ArrowUpRight, color: "text-blue-600", bg: "bg-blue-600/10" },
          { label: "A Pagar (Pendente)", val: fmtCurrency(totalPagar), icon: ArrowDownRight, color: "text-rose-600", bg: "bg-rose-600/10" },
          { label: "Receita Acumulada", val: fmtCurrency(totalRecebido), icon: Receipt, color: "text-emerald-600", bg: "bg-emerald-600/10" },
          { label: "Saldo Acumulado", val: fmtCurrency(saldo), icon: Wallet, color: saldo >= 0 ? "text-emerald-600" : "text-rose-600", bg: saldo >= 0 ? "bg-emerald-600/10" : "bg-rose-600/10" },
        ].map((kpi, i) => (
          <div key={i} className="flex items-center gap-4 bg-card border border-border/50 rounded-xl p-4 shadow-sm hover:border-primary/20 transition-colors">
            <div className={cn("p-2.5 rounded-lg", kpi.bg, kpi.color)}>
              <kpi.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-0.5 max-w-[100px] leading-tight">{kpi.label}</p>
              <p className="text-lg font-bold tracking-tight text-foreground">{kpi.val}</p>
            </div>
          </div>
        ))}
      </motion.div>

      {/* ── Health / Flow Thermometer ── */}
      <motion.div variants={itemAnim}>
        <Card className="border-border/50 bg-gradient-to-br from-muted/30 to-background overflow-hidden relative shadow-sm">
          <div className="absolute right-0 top-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
          <CardContent className="p-5">
            <div className="flex justify-between items-end mb-2">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" /> Fluxo Pendente
              </h3>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
                Termômetro Financeiro
              </span>
            </div>
            <div className="h-3 w-full bg-muted rounded-full overflow-hidden flex">
              <div
                className="h-full bg-blue-500 transition-all duration-1000"
                style={{ width: `${healthPercent}%` }}
              />
              <div
                className="h-full bg-rose-500 transition-all duration-1000"
                style={{ width: `${100 - healthPercent}%` }}
              />
            </div>
            <div className="flex justify-between mt-2 text-xs font-medium">
              <span className="text-blue-600/80">{healthPercent.toFixed(1)}% Receitas Pendentes</span>
              <span className="text-rose-600/80">{(100 - healthPercent).toFixed(1)}% Despesas Pendentes</span>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Main Layout ── */}
      <motion.div variants={itemAnim}>
        <Tabs value={tab} onValueChange={setTab} className="bg-transparent">
          <TabsList className="grid w-full sm:w-auto sm:inline-grid grid-cols-2 md:grid-cols-4 h-auto p-1 bg-muted/50 rounded-xl mb-4">
            <TabsTrigger value="receber" className="py-2.5 gap-2 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm"><ArrowUpRight className="h-4 w-4" /> <span className="hidden sm:inline">A Receber</span></TabsTrigger>
            <TabsTrigger value="pagar" className="py-2.5 gap-2 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm"><ArrowDownRight className="h-4 w-4" /> <span className="hidden sm:inline">A Pagar</span></TabsTrigger>
            <TabsTrigger value="dasdarf" className="py-2.5 gap-2 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm"><Bell className="h-4 w-4" /> <span className="hidden sm:inline">DAS / DARF</span></TabsTrigger>
            <TabsTrigger value="orcamento" className="py-2.5 gap-2 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm"><BarChart2 className="h-4 w-4" /> <span className="hidden sm:inline">Orçamento</span></TabsTrigger>
          </TabsList>

          <TabsContent value={tab} className="mt-0 space-y-4 focus-visible:outline-none focus:outline-none focus-visible:ring-0 focus:ring-0">
            {tab !== "orcamento" && tab !== "dasdarf" && (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-muted/40 p-2 pl-4 border border-border/50 rounded-xl">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input placeholder="Buscar transação..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 bg-card border-none text-sm" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground mr-1" />
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="h-9 w-36 bg-card border-none text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os status</SelectItem>
                        {STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {isLoading ? (
                  <div className="space-y-4">
                    {[1, 2].map((n) => <div key={n} className="h-32 rounded-xl bg-muted/30 animate-pulse border border-border/40" />)}
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="flex flex-col items-center py-16 text-center border border-dashed border-border/60 rounded-2xl bg-muted/10">
                    <DollarSign className="mb-4 h-12 w-12 text-muted-foreground/30" />
                    <p className="text-base font-medium text-foreground">
                      {contas.length === 0 ? `Nenhuma conta a ${tab === "receber" ? "receber" : "pagar"} cadastrada.` : "Nenhuma conta encontrada."}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1 max-w-sm">Use o botão "Nova Transação" para adicionar.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {Object.entries(groupedMonths).map(([month, items]) => (
                      <div key={month} className="space-y-3">
                        <h3 className="text-xs font-bold tracking-widest text-muted-foreground uppercase flex items-center gap-2 capitalize">
                          {month}
                          <span className="h-px bg-border/60 flex-1 ml-2" />
                        </h3>
                        <div className="bg-card border border-border/50 rounded-xl overflow-hidden shadow-sm">
                          <div className="divide-y divide-border/40">
                            <AnimatePresence>
                              {items.map((c: any) => {
                                let statusObj = STATUS_OPTIONS.find((s) => s.value === c.status) || STATUS_OPTIONS[0];
                                const dueDate = parseISO(c.due_date);
                                const isLate = isPast(dueDate) && !isToday(dueDate) && c.status === "pendente";
                                if (isLate) statusObj = STATUS_OPTIONS.find((s) => s.value === "atrasado") || statusObj;

                                const amountNum = Number(c.amount);

                                return (
                                  <motion.div
                                    key={c.id}
                                    layout
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-muted/30 transition-colors gap-4 relative"
                                  >
                                    <div className="flex items-start sm:items-center gap-4 min-w-0">
                                      <div className={cn(
                                        "flex flex-col items-center justify-center shrink-0 w-14 px-1 py-1.5 rounded-lg text-center leading-tight border transition-colors",
                                        isLate ? "bg-rose-500/10 border-rose-500/20 text-rose-600" : "bg-muted border-transparent text-muted-foreground"
                                      )}>
                                        <span className="text-[10px] uppercase font-bold">{format(dueDate, "MMM", { locale: ptBR })}</span>
                                        <span className="text-lg font-bold">{format(dueDate, "dd")}</span>
                                      </div>
                                      <div className="min-w-0">
                                        <p className="text-sm font-semibold text-foreground truncate">{c.description}</p>
                                        <p className="text-xs font-medium text-muted-foreground mt-1 uppercase tracking-wider">{c.category || "Sem Categoria"}</p>
                                      </div>
                                    </div>

                                    <div className="flex items-center justify-between sm:justify-end gap-5 shrink-0 ml-16 sm:ml-0">
                                      <div className="text-right min-w-[100px]">
                                        <p className={cn("text-base font-bold tabular-nums", tab === "receber" ? "text-blue-600/90" : "text-rose-600/90")}>
                                          {tab === "receber" ? "+" : "-"}{fmtCurrency(amountNum)}
                                        </p>
                                        <Badge variant="outline" className={cn("text-[9px] mt-1 h-4 px-1.5 font-bold uppercase tracking-wider border", statusObj.color)}>
                                          {statusObj.label}
                                        </Badge>
                                      </div>

                                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity absolute right-4 sm:relative sm:right-0 bg-card sm:bg-transparent shadow-sm sm:shadow-none p-1 rounded-md border sm:border-transparent">
                                        {c.status === "pendente" && tab === "receber" && (
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            title="Cobrança PIX"
                                            className="h-8 w-8 text-primary hover:bg-primary/10 hover:text-primary/90"
                                            onClick={() => {
                                              if (c.pix_code) {
                                                setSelectedPix(c);
                                                setPixModalOpen(true);
                                              } else {
                                                generatePixMutation.mutate(c);
                                              }
                                            }}
                                            disabled={generatePixMutation.isPending}
                                          >
                                            <QrCode className="h-4 w-4" />
                                          </Button>
                                        )}
                                        {c.asaas_billing_url && (
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            title="Ver Fatura no Asaas"
                                            className="h-8 w-8 text-blue-600 hover:bg-blue-500/10"
                                            onClick={() => window.open(c.asaas_billing_url, "_blank")}
                                          >
                                            <ExternalLink className="h-4 w-4" />
                                          </Button>
                                        )}
                                        {c.asaas_id && c.status === "pendente" && (
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            title="Verificar Pagamento"
                                            className="h-8 w-8 text-amber-600 hover:bg-amber-500/10"
                                            onClick={() => reconcileAsaasMutation.mutate(c)}
                                            disabled={reconcileAsaasMutation.isPending}
                                          >
                                            <RefreshCw className={cn("h-4 w-4", reconcileAsaasMutation.isPending && "animate-spin")} />
                                          </Button>
                                        )}
                                        {c.status === "pendente" && (
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            title="Marcar como Pago"
                                            className="h-8 w-8 text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700"
                                            onClick={() => markAsPaid(c.id)}
                                          >
                                            <CheckCircle2 className="h-4 w-4" />
                                          </Button>
                                        )}
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => openEdit(c)}>
                                          <Edit2 className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => { setEditingId(c.id); setDeleteDialogOpen(true); }}>
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                      </div>
                                    </div>
                                  </motion.div>
                                );
                              })}
                            </AnimatePresence>
                          </div>
                          {/* Month Summary Footer */}
                          <div className="bg-muted/30 p-3 px-4 flex justify-between items-center text-xs">
                            <span className="text-muted-foreground font-medium uppercase tracking-wider text-[10px]">Total do mês</span>
                            <span className={cn("font-bold text-sm", tab === "receber" ? "text-blue-600" : "text-rose-600")}>
                              {fmtCurrency(items.reduce((s, c) => s + Number(c.amount), 0))}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* DAS/DARF Tab */}
            {tab === "dasdarf" && <DasDarfPanel />}

            {/* Budget Performance Tab */}
            {tab === "orcamento" && (
              orgId ? <BudgetPerformanceTab orgId={orgId} /> : <div className="py-20 flex justify-center"><div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
            )}

          </TabsContent>
        </Tabs>
      </motion.div>

      {/* ── Create/Edit Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Editar Transação" : `Nova Conta a ${tab === "receber" ? "Receber" : "Pagar"}`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <FormField label="Descrição" value={form.description} onChange={(v) => setForm({ ...form, description: v })} placeholder="Ex: Honorários advocatícios" required />
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Valor (R$)" value={form.amount_display} onChange={(v) => setForm({ ...form, amount_display: formatCurrencyInput(v) })} placeholder="0,00" required />
              <FormField label="Vencimento" value={form.due_date} onChange={(v) => setForm({ ...form, due_date: v })} type="date" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Categoria</label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger className="h-10 border-border/50 bg-background/50"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger className="h-10 border-border/50 bg-background/50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} className="w-full sm:w-auto">Cancelar</Button>
            <Button onClick={handleSubmit} disabled={isSaving} className="w-full sm:w-auto">{editingId ? "Salvar" : "Registrar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Dialog ── */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Excluir Transação</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Tem certeza que deseja excluir esta movimentação? Esta ação não pode ser desfeita.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancelar</Button>
            <Button variant="destructive" disabled={deleteMutation.isPending} onClick={() => editingId && deleteMutation.mutate(editingId)}>Excluir Definitivamente</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Pix Modal ── */}
      <Dialog open={pixModalOpen} onOpenChange={setPixModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-center gap-2 text-xl">
              <QrCode className="w-5 h-5 text-primary" /> Pagamento com PIX
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center py-6 space-y-4">
            {/* Mock PIX Image */}
            <div className="bg-white p-4 rounded-xl border-4 border-muted/50 w-48 h-48 flex items-center justify-center">
              <QrCode className="w-32 h-32 text-slate-800" />
            </div>
            <p className="font-bold text-lg text-primary">{fmtCurrency(Number(selectedPix?.amount || 0))}</p>
            <p className="text-sm text-muted-foreground text-center">Fatura: {selectedPix?.description}</p>

            <div className="w-full mt-4">
              <p className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 flex justify-between">
                Copia e Cola
              </p>
              <div className="flex gap-2 relative">
                <Input readOnly value={selectedPix?.pix_code || ""} className="pr-12 bg-muted/30 font-mono text-[10px]" />
                <Button
                  size="icon"
                  className="absolute right-0 top-0 bottom-0 rounded-l-none"
                  onClick={() => {
                    navigator.clipboard.writeText(selectedPix?.pix_code);
                    toast.success("Código PIX copiado!");
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPixModalOpen(false)} className="w-full">Concluído</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div >
  );
}
