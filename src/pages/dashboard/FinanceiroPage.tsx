import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  DollarSign, Plus, Search, Filter, Edit2, Trash2, TrendingUp, TrendingDown,
  ArrowUpRight, ArrowDownRight, Wallet, Receipt, BarChart2,
} from "lucide-react";
import BudgetPerformanceTab from "@/components/financeiro/BudgetPerformanceTab";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import FormField from "@/components/shared/FormField";
import LexaLoadingOverlay from "@/components/shared/LexaLoadingOverlay";
import { formatCurrencyInput, parseCurrencyToNumber } from "@/lib/formatters";

const STATUS_OPTIONS = [
  { value: "pendente", label: "Pendente" },
  { value: "pago", label: "Pago" },
  { value: "atrasado", label: "Atrasado" },
  { value: "cancelado", label: "Cancelado" },
];

const statusStyle: Record<string, string> = {
  pendente: "bg-warning/10 text-warning border-warning/20",
  pago: "bg-success/10 text-success border-success/20",
  atrasado: "bg-destructive/10 text-destructive border-destructive/20",
  cancelado: "bg-muted text-muted-foreground border-border",
};

const CATEGORIES = ["Honorários", "Custas Processuais", "Aluguel", "Salários", "Energia / Internet", "Marketing", "Impostos", "Outros"];

const fmtCurrency = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const emptyForm = { description: "", amount_display: "", due_date: "", status: "pendente", category: "" };

export default function FinanceiroPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("receber");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

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

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { error } = await supabase.from(tableName).insert(payload);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: [tableName] }); toast.success("Conta criada"); closeDialog(); },
    onError: (e: any) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...payload }: any) => {
      const { error } = await supabase.from(tableName).update(payload).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: [tableName] }); toast.success("Conta atualizada"); closeDialog(); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(tableName).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: [tableName] }); toast.success("Conta excluída"); setDeleteDialogOpen(false); setEditingId(null); },
    onError: (e: any) => toast.error(e.message),
  });

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

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <LexaLoadingOverlay visible={isSaving} message="Salvando..." />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Financeiro</h1>
          <p className="text-sm text-muted-foreground">Controle de contas a pagar e receber</p>
        </div>
        <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Nova Conta</Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "A Receber", value: fmtCurrency(totalReceber), icon: ArrowUpRight, color: "text-success", bg: "bg-success/8", sub: "pendente" },
          { label: "A Pagar", value: fmtCurrency(totalPagar), icon: ArrowDownRight, color: "text-destructive", bg: "bg-destructive/8", sub: "pendente" },
          { label: "Recebido", value: fmtCurrency(totalRecebido), icon: Receipt, color: "text-foreground", bg: "bg-primary/5", sub: "acumulado" },
          { label: "Saldo", value: fmtCurrency(saldo), icon: Wallet, color: saldo >= 0 ? "text-success" : "text-destructive", bg: saldo >= 0 ? "bg-success/8" : "bg-destructive/8", sub: "recebido − pago" },
        ].map((kpi) => (
          <Card key={kpi.label} className="border-border/60">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{kpi.label}</p>
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${kpi.bg}`}>
                  <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                </div>
              </div>
              <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">{kpi.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="receber" className="gap-2 text-xs"><TrendingUp className="h-3.5 w-3.5" /> A Receber</TabsTrigger>
          <TabsTrigger value="pagar" className="gap-2 text-xs"><TrendingDown className="h-3.5 w-3.5" /> A Pagar</TabsTrigger>
          <TabsTrigger value="orcamento" className="gap-2 text-xs"><BarChart2 className="h-3.5 w-3.5" /> Orçamento</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4 space-y-4">
          <Card className="border-border/60">
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Buscar por descrição ou categoria..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center py-20 text-center">
                  <DollarSign className="mb-4 h-12 w-12 text-muted-foreground/20" />
                  <p className="text-sm text-muted-foreground">
                    {contas.length === 0 ? `Nenhuma conta a ${tab === "receber" ? "receber" : "pagar"} cadastrada.` : "Nenhuma conta encontrada."}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Vencimento</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((c: any) => (
                        <TableRow key={c.id} className="group">
                          <TableCell className="font-medium">{c.description}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{c.category || "—"}</TableCell>
                          <TableCell className="font-semibold tabular-nums">{fmtCurrency(Number(c.amount))}</TableCell>
                          <TableCell className="text-muted-foreground text-sm tabular-nums">{format(new Date(c.due_date + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-[11px] ${statusStyle[c.status] || ""}`}>
                              {STATUS_OPTIONS.find((s) => s.value === c.status)?.label || c.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => openEdit(c)}><Edit2 className="h-3.5 w-3.5" /></Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => { setEditingId(c.id); setDeleteDialogOpen(true); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Budget Performance Tab */}
        <TabsContent value="orcamento" className="mt-4">
          {orgId ? (
            <BudgetPerformanceTab orgId={orgId} />
          ) : (
            <div className="flex items-center justify-center py-20">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-semibold">
              {editingId ? "Editar Conta" : `Nova Conta a ${tab === "receber" ? "Receber" : "Pagar"}`}
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
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Categoria</label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger className="h-10"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={isSaving}>{editingId ? "Salvar" : "Criar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="font-semibold">Excluir Conta</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Tem certeza que deseja excluir esta conta? Esta ação não pode ser desfeita.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancelar</Button>
            <Button variant="destructive" disabled={deleteMutation.isPending} onClick={() => editingId && deleteMutation.mutate(editingId)}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
