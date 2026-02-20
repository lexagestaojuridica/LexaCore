import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Scale, Plus, Search, Filter, Edit2, Trash2, Eye, Upload, Download, File, Calculator, X,
  LayoutList, LayoutGrid, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  ArrowUpDown, ArrowUp, ArrowDown, Receipt, Bot, SwitchCamera,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import FormField from "@/components/shared/FormField";
import LexaLoadingOverlay from "@/components/shared/LexaLoadingOverlay";
import { formatCurrencyInput, parseCurrencyToNumber } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

type Processo = Tables<"processos_juridicos">;
type Documento = { id: string; file_name: string; file_path: string; file_type: string | null; created_at: string };
type SortField = "title" | "number" | "court" | "status" | "estimated_value" | "created_at";
type SortDir = "asc" | "desc";

const STATUS_OPTIONS = [
  { value: "ativo", label: "Ativo", variant: "default" as const },
  { value: "arquivado", label: "Arquivado", variant: "secondary" as const },
  { value: "suspenso", label: "Suspenso", variant: "outline" as const },
  { value: "encerrado", label: "Encerrado", variant: "destructive" as const },
];

const KANBAN_COLUMNS = [
  { status: "ativo", label: "Ativo", color: "border-t-emerald-500" },
  { status: "suspenso", label: "Suspenso", color: "border-t-amber-500" },
  { status: "arquivado", label: "Arquivado", color: "border-t-muted-foreground" },
  { status: "encerrado", label: "Encerrado", color: "border-t-destructive" },
];

const PAGE_SIZE = 15;

const statusBadge = (status: string) => {
  const opt = STATUS_OPTIONS.find((o) => o.value === status);
  return <Badge variant={opt?.variant ?? "secondary"}>{opt?.label ?? status}</Badge>;
};

const emptyForm: Partial<TablesInsert<"processos_juridicos">> & { estimated_value_display?: string } = {
  title: "", number: "", court: "", subject: "", status: "ativo",
  estimated_value: null, notes: "", client_id: null, estimated_value_display: "",
  area_direito: null, tipo_acao: null, parte_contraria: null,
  instancia: null, fase_processual: null, comarca: null, uf: null,
  data_distribuicao: null, auto_capture_enabled: false,
};

const AREAS_DIREITO = [
  "Cível", "Trabalhista", "Penal", "Tributário", "Empresarial",
  "Família e Sucessões", "Consumidor", "Ambiental", "Administrativo",
  "Previdenciário", "Imobiliário", "Contratual", "Propriedade Intelectual",
  "Digital", "Internacional", "Outro",
];

const INSTANCIAS = [
  "1ª Instância", "2ª Instância", "Tribunal Superior", "STJ", "STF",
];

const FASES_PROCESSUAIS = [
  "Conhecimento", "Instrução", "Sentença", "Recursal",
  "Execução", "Cumprimento de Sentença", "Encerrado",
];

const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS",
  "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC",
  "SP", "SE", "TO",
];

function ProcessCalculator({ estimatedValue }: { estimatedValue: number | null }) {
  const [percentual, setPercentual] = useState("20");
  const [horas, setHoras] = useState("");
  const [valorHora, setValorHora] = useState("");
  const valor = Number(estimatedValue) || 0;
  const honorariosExito = valor * (Number(percentual) / 100);
  const honorariosHora = Number(horas) * Number(valorHora) || 0;
  const fmtCurrency = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  return (
    <div className="rounded-lg border border-border/50 bg-muted/20 p-4 space-y-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
        <Calculator className="h-3.5 w-3.5" /> Calculadora do Processo
      </h3>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div><span className="text-xs text-muted-foreground">Valor da Causa</span><p className="font-medium">{valor ? fmtCurrency(valor) : "Não informado"}</p></div>
        <div>
          <span className="text-xs text-muted-foreground">Honorários (%)</span>
          <Input type="number" value={percentual} onChange={(e) => setPercentual(e.target.value)} className="h-8 mt-1" />
        </div>
      </div>
      <Separator />
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Horas estimadas</label>
          <Input type="number" value={horas} onChange={(e) => setHoras(e.target.value)} className="h-8" placeholder="40" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Valor/hora</label>
          <Input type="number" value={valorHora} onChange={(e) => setValorHora(e.target.value)} className="h-8" placeholder="R$ 250" />
        </div>
      </div>
      <div className="rounded-lg bg-primary/5 p-3 space-y-1.5">
        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Honorários Êxito</span><span className="font-medium">{fmtCurrency(honorariosExito)}</span></div>
        {honorariosHora > 0 && <div className="flex justify-between text-sm"><span className="text-muted-foreground">Honorários Hora</span><span className="font-medium">{fmtCurrency(honorariosHora)}</span></div>}
        <Separator />
        <div className="flex justify-between text-sm font-bold"><span>Total</span><span className="text-primary">{fmtCurrency(honorariosExito + honorariosHora)}</span></div>
      </div>
    </div>
  );
}

// ─── SortableHeader ──────────────────────────────────────────

function SortableHeader({ field, label, sortField, sortDir, onSort }: {
  field: SortField; label: string; sortField: SortField; sortDir: SortDir;
  onSort: (f: SortField) => void;
}) {
  const active = sortField === field;
  return (
    <TableHead
      className="cursor-pointer select-none hover:text-foreground"
      onClick={() => onSort(field)}
    >
      <span className="flex items-center gap-1">
        {label}
        {active
          ? sortDir === "asc"
            ? <ArrowUp className="h-3 w-3" />
            : <ArrowDown className="h-3 w-3" />
          : <ArrowUpDown className="h-3 w-3 opacity-30" />}
      </span>
    </TableHead>
  );
}

// ─── KanbanCard ────────────────────────────────────────────────

function KanbanCard({ p, onEdit, onView, onDelete }: {
  p: Processo;
  onEdit: (p: Processo) => void;
  onView: (p: Processo) => void;
  onDelete: (p: Processo) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="group rounded-xl border border-border/60 bg-card p-3.5 hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer space-y-2"
      onClick={() => onView(p)}
    >
      <p className="text-sm font-medium text-foreground leading-tight line-clamp-2">{p.title}</p>
      {p.number && <p className="text-xs text-muted-foreground">Nº {p.number}</p>}
      {p.court && <p className="text-xs text-muted-foreground truncate">{p.court}</p>}
      {p.estimated_value != null && (
        <p className="text-xs font-medium text-primary">
          R$ {Number(p.estimated_value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
        </p>
      )}
      <div className="flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity pt-1 border-t border-border/40 mt-1">
        <span className="text-[10px] text-muted-foreground">{format(new Date(p.created_at), "dd/MM/yy", { locale: ptBR })}</span>
        <div className="flex gap-0.5">
          <button onClick={(e) => { e.stopPropagation(); onEdit(p); }} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            <Edit2 className="h-3 w-3" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(p); }} className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────

export default function ProcessosPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedProcesso, setSelectedProcesso] = useState<Processo | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [isEditing, setIsEditing] = useState(false);
  const [viewMode, setViewMode] = useState<"table" | "kanban">("table");
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const navigate = useNavigate();

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("organization_id").eq("user_id", user!.id).single();
      return data;
    },
    enabled: !!user,
  });
  const orgId = profile?.organization_id;

  const { data: processos = [], isLoading } = useQuery({
    queryKey: ["processos", orgId],
    queryFn: async () => {
      const { data, error } = await supabase.from("processos_juridicos").select("*").eq("organization_id", orgId!).order("created_at", { ascending: false });
      if (error) throw error;
      return data as Processo[];
    },
    enabled: !!orgId,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients-list", orgId],
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("id, name").eq("organization_id", orgId!);
      return data ?? [];
    },
    enabled: !!orgId,
  });

  const { data: processDocs = [] } = useQuery({
    queryKey: ["process-docs", selectedProcesso?.id],
    queryFn: async () => {
      const { data } = await supabase.from("documentos").select("id, file_name, file_path, file_type, created_at").eq("process_id", selectedProcesso!.id).order("created_at", { ascending: false });
      return (data || []) as Documento[];
    },
    enabled: !!selectedProcesso?.id && (viewDialogOpen || dialogOpen),
  });

  const { data: captures = [] } = useQuery({
    queryKey: ["process-captures", selectedProcesso?.id],
    queryFn: async () => {
      // @ts-ignore - Supabase type reference
      const { data } = await supabase.from("process_captures").select("*").eq("process_id", selectedProcesso!.id).order("capture_date", { ascending: false });
      return data ?? [];
    },
    enabled: !!selectedProcesso?.id && viewDialogOpen,
  });

  const createMutation = useMutation({
    mutationFn: async (payload: TablesInsert<"processos_juridicos">) => {
      const { error } = await supabase.from("processos_juridicos").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["processos"] }); toast.success("Processo criado"); closeDialog(); },
    onError: () => toast.error("Erro ao criar processo"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...payload }: Partial<Processo> & { id: string }) => {
      const { error } = await supabase.from("processos_juridicos").update(payload).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["processos"] }); toast.success("Processo atualizado"); closeDialog(); },
    onError: () => toast.error("Erro ao atualizar processo"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("processos_juridicos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["processos"] }); toast.success("Processo excluído"); setDeleteDialogOpen(false); setSelectedProcesso(null); },
    onError: () => toast.error("Erro ao excluir processo"),
  });

  const createContaMutation = useMutation({
    mutationFn: async ({ processoTitle, value, orgId: oid }: { processoTitle: string; value: number; orgId: string }) => {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);
      const { error } = await supabase.from("contas_receber").insert({
        description: `Honorários — ${processoTitle}`,
        amount: value,
        due_date: dueDate.toISOString().split("T")[0],
        status: "pendente",
        category: "Honorários",
        organization_id: oid,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Conta a Receber criada! Redirecionando para o Financeiro...");
      setViewDialogOpen(false);
      setTimeout(() => navigate("/dashboard/financeiro"), 1200);
    },
    onError: () => toast.error("Erro ao criar conta a receber"),
  });

  const uploadDocMutation = useMutation({
    mutationFn: async ({ file, processId }: { file: File; processId: string }) => {
      const filePath = `${orgId}/${crypto.randomUUID()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from("documentos").upload(filePath, file);
      if (uploadError) throw uploadError;
      const { error: dbError } = await supabase.from("documentos").insert({
        file_name: file.name, file_path: filePath, file_type: file.type || null,
        user_id: user!.id, organization_id: orgId!, process_id: processId,
      });
      if (dbError) throw dbError;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["process-docs"] }); toast.success("Documento vinculado ao processo"); },
    onError: () => toast.error("Erro ao enviar documento"),
  });

  const closeDialog = () => { setDialogOpen(false); setForm(emptyForm); setIsEditing(false); };
  const openCreate = () => { setForm(emptyForm); setIsEditing(false); setDialogOpen(true); };
  const openEdit = (p: Processo) => {
    const display = p.estimated_value != null ? formatCurrencyInput(String(Math.round(Number(p.estimated_value) * 100))) : "";
    setForm({ title: p.title, number: p.number, court: p.court, subject: p.subject, status: p.status, estimated_value: p.estimated_value, notes: p.notes, client_id: p.client_id, estimated_value_display: display, auto_capture_enabled: p.auto_capture_enabled || false, area_direito: p.area_direito, tipo_acao: p.tipo_acao, parte_contraria: p.parte_contraria, instancia: p.instancia, fase_processual: p.fase_processual, comarca: p.comarca, uf: p.uf, data_distribuicao: p.data_distribuicao });
    setSelectedProcesso(p); setIsEditing(true); setDialogOpen(true);
  };

  const setField = useCallback((key: string, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleValueChange = (v: string) => {
    const formatted = formatCurrencyInput(v);
    const num = parseCurrencyToNumber(formatted);
    setForm((prev) => ({ ...prev, estimated_value_display: formatted, estimated_value: num || null }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title) { toast.error("O título é obrigatório"); return; }
    const { estimated_value_display, ...rest } = form;
    if (isEditing && selectedProcesso) {
      updateMutation.mutate({ id: selectedProcesso.id, ...rest });
    } else {
      createMutation.mutate({ ...rest, title: rest.title!, organization_id: orgId!, responsible_user_id: user!.id } as TablesInsert<"processos_juridicos">);
    }
  };

  const handleDocDownload = async (doc: Documento) => {
    const { data } = await supabase.storage.from("documentos").createSignedUrl(doc.file_path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  const triggerFileUpload = (processId: string) => {
    const input = document.createElement("input");
    input.type = "file"; input.multiple = true;
    input.onchange = (ev) => {
      const files = (ev.target as HTMLInputElement).files;
      if (files) Array.from(files).forEach((f) => uploadDocMutation.mutate({ file: f, processId }));
    };
    input.click();
  };

  // ── Filter, sort, paginate ──
  const filtered = processos.filter((p) => {
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    const q = search.toLowerCase();
    const matchesSearch = !q || p.title.toLowerCase().includes(q) || (p.number ?? "").toLowerCase().includes(q) || (p.court ?? "").toLowerCase().includes(q) || (p.subject ?? "").toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  const sorted = [...filtered].sort((a, b) => {
    let va: any = a[sortField as keyof Processo] ?? "";
    let vb: any = b[sortField as keyof Processo] ?? "";
    if (sortField === "estimated_value") { va = Number(va); vb = Number(vb); }
    if (sortField === "created_at") { va = new Date(va).getTime(); vb = new Date(vb).getTime(); }
    if (va < vb) return sortDir === "asc" ? -1 : 1;
    if (va > vb) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paged = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
    setPage(1);
  };

  const handleSearch = (v: string) => { setSearch(v); setPage(1); };
  const handleStatusFilter = (v: string) => { setStatusFilter(v); setPage(1); };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <LexaLoadingOverlay visible={isSaving} message="Salvando processo..." />

      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Processos Jurídicos</h1>
          <p className="text-sm text-muted-foreground">
            {processos.length} processo{processos.length !== 1 ? "s" : ""} cadastrado{processos.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center rounded-lg border border-border/60 p-0.5">
            <button
              onClick={() => setViewMode("table")}
              className={cn("flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs transition-all", viewMode === "table" ? "bg-muted text-foreground font-medium" : "text-muted-foreground hover:text-foreground")}
            >
              <LayoutList className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Tabela</span>
            </button>
            <button
              onClick={() => setViewMode("kanban")}
              className={cn("flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs transition-all", viewMode === "kanban" ? "bg-muted text-foreground font-medium" : "text-muted-foreground hover:text-foreground")}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Kanban</span>
            </button>
          </div>
          <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Novo Processo</Button>
        </div>
      </div>

      {/* ── Filters ── */}
      <Card className="border-border bg-card">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar por título, número, vara ou assunto..." value={search} onChange={(e) => handleSearch(e.target.value)} className="pl-9" />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={handleStatusFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* ── Table View ── */}
      {viewMode === "table" && (
        <Card className="border-border bg-card">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="space-y-3 p-4">
                {[1, 2, 3, 4, 5].map((n) => (
                  <div key={n} className="flex gap-4">
                    <div className="h-5 flex-1 rounded bg-muted/50 animate-pulse" />
                    <div className="h-5 w-24 rounded bg-muted/50 animate-pulse" />
                    <div className="h-5 w-20 rounded bg-muted/50 animate-pulse" />
                    <div className="h-5 w-16 rounded bg-muted/50 animate-pulse" />
                  </div>
                ))}
              </div>
            ) : sorted.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Scale className="mb-4 h-12 w-12 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">{processos.length === 0 ? "Nenhum processo cadastrado." : "Nenhum processo encontrado."}</p>
                {processos.length === 0 && (
                  <Button variant="outline" size="sm" className="mt-3 gap-1.5 text-xs" onClick={openCreate}>
                    <Plus className="h-3 w-3" /> Criar primeiro processo
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <SortableHeader field="title" label="Título" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                        <SortableHeader field="number" label="Número" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                        <SortableHeader field="court" label="Vara / Tribunal" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                        <SortableHeader field="status" label="Status" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                        <SortableHeader field="estimated_value" label="Valor Estimado" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                        <SortableHeader field="created_at" label="Criado em" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <AnimatePresence>
                        {paged.map((p) => (
                          <TableRow key={p.id} className="hover:bg-muted/20">
                            <TableCell className="font-medium max-w-[200px] truncate">{p.title}</TableCell>
                            <TableCell className="text-muted-foreground">{p.number || "—"}</TableCell>
                            <TableCell className="text-muted-foreground max-w-[160px] truncate">{p.court || "—"}</TableCell>
                            <TableCell>{statusBadge(p.status)}</TableCell>
                            <TableCell>{p.estimated_value != null ? `R$ ${Number(p.estimated_value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"}</TableCell>
                            <TableCell className="text-muted-foreground">{format(new Date(p.created_at), "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                            <TableCell>
                              <div className="flex items-center justify-end gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => { setSelectedProcesso(p); setViewDialogOpen(true); }}><Eye className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => openEdit(p)}><Edit2 className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => { setSelectedProcesso(p); setDeleteDialogOpen(true); }}><Trash2 className="h-4 w-4" /></Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </AnimatePresence>
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between border-t border-border/60 px-4 py-3">
                    <p className="text-xs text-muted-foreground">
                      {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, sorted.length)} de {sorted.length} processos
                    </p>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" disabled={page === 1} onClick={() => setPage(1)}><ChevronsLeft className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" disabled={page === 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-3.5 w-3.5" /></Button>
                      <span className="px-3 text-xs font-medium">{page} / {totalPages}</span>
                      <Button variant="ghost" size="icon" className="h-7 w-7" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" disabled={page === totalPages} onClick={() => setPage(totalPages)}><ChevronsRight className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Kanban View ── */}
      {viewMode === "kanban" && (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
          {KANBAN_COLUMNS.map((col) => {
            const colProcessos = filtered.filter((p) => p.status === col.status);
            return (
              <div key={col.status} className="flex flex-col gap-3">
                <div className={cn("rounded-t-xl border-t-2 bg-muted/30 rounded-xl border border-border/60 overflow-hidden", col.color)}>
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm font-semibold text-foreground">{col.label}</span>
                    <Badge variant="secondary" className="text-[10px]">{colProcessos.length}</Badge>
                  </div>
                </div>
                <div className="space-y-2 min-h-[100px]">
                  <AnimatePresence>
                    {colProcessos.length === 0 ? (
                      <div className="flex items-center justify-center py-8 rounded-xl border border-dashed border-border/60">
                        <p className="text-xs text-muted-foreground/50">Nenhum processo</p>
                      </div>
                    ) : (
                      colProcessos.map((p) => (
                        <KanbanCard
                          key={p.id}
                          p={p}
                          onEdit={openEdit}
                          onView={(p) => { setSelectedProcesso(p); setViewDialogOpen(true); }}
                          onDelete={(p) => { setSelectedProcesso(p); setDeleteDialogOpen(true); }}
                        />
                      ))
                    )}
                  </AnimatePresence>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Dialogs (Create/Edit, View, Delete) — unchanged ── */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) closeDialog(); }}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto p-0">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-6 py-4">
            <div>
              <DialogTitle className="text-lg font-semibold">{isEditing ? "Editar Processo" : "Novo Processo"}</DialogTitle>
              <p className="text-xs text-muted-foreground">Informações do processo jurídico</p>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={closeDialog}><X className="h-4 w-4" /></Button>
          </div>
          <form onSubmit={handleSubmit} className="px-6 pb-6">
            <Tabs defaultValue="dados" className="w-full">
              <TabsList className="my-4 grid w-full grid-cols-3">
                <TabsTrigger value="dados" className="text-xs">Dados</TabsTrigger>
                <TabsTrigger value="documentos" className="text-xs">Documentos</TabsTrigger>
                <TabsTrigger value="calculadora" className="text-xs">Calculadora</TabsTrigger>
              </TabsList>
              <TabsContent value="dados" className="space-y-4">
                <div className="rounded-lg border border-border/50 bg-muted/20 p-4 space-y-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Informações Principais</h3>
                  <FormField label="Título" value={form.title ?? ""} onChange={(v) => setField("title", v)} placeholder="Ex: Ação Trabalhista - João Silva" required />
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Número do Processo" value={form.number ?? ""} onChange={(v) => setField("number", v)} placeholder="0000000-00.0000.0.00.0000" />
                    <FormField label="Vara / Tribunal" value={form.court ?? ""} onChange={(v) => setField("court", v)} placeholder="Ex: 1ª Vara Cível" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</label>
                      <Select value={form.status ?? "ativo"} onValueChange={(v) => setField("status", v)}>
                        <SelectTrigger className="h-10 bg-background"><SelectValue /></SelectTrigger>
                        <SelectContent>{STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <FormField label="Valor Estimado" value={form.estimated_value_display ?? ""} onChange={handleValueChange} placeholder="0,00" />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-border bg-background p-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 text-primary rounded-md"><Bot className="h-4 w-4" /></div>
                      <div>
                        <p className="text-sm font-medium">Robô de Captura</p>
                        <p className="text-xs text-muted-foreground">Monitorar Diários Oficiais (Jusbrasil/Escavador)</p>
                      </div>
                    </div>
                    <Switch checked={form.auto_capture_enabled || false} onCheckedChange={(v) => setField("auto_capture_enabled", v)} />
                  </div>
                </div>
                <div className="rounded-lg border border-border/50 bg-muted/20 p-4 space-y-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Dados Jurídicos</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Área do Direito</label>
                      <Select value={form.area_direito ?? "none"} onValueChange={(v) => setField("area_direito", v === "none" ? null : v)}>
                        <SelectTrigger className="h-10 bg-background"><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">—</SelectItem>
                          {AREAS_DIREITO.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <FormField label="Tipo da Ação" value={form.tipo_acao ?? ""} onChange={(v) => setField("tipo_acao", v)} placeholder="Ex: Ação de Indenização" />
                  </div>
                  <FormField label="Parte Contrária" value={form.parte_contraria ?? ""} onChange={(v) => setField("parte_contraria", v)} placeholder="Nome da parte contrária" />
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Instância</label>
                      <Select value={form.instancia ?? "none"} onValueChange={(v) => setField("instancia", v === "none" ? null : v)}>
                        <SelectTrigger className="h-10 bg-background"><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">—</SelectItem>
                          {INSTANCIAS.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Fase Processual</label>
                      <Select value={form.fase_processual ?? "none"} onValueChange={(v) => setField("fase_processual", v === "none" ? null : v)}>
                        <SelectTrigger className="h-10 bg-background"><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">—</SelectItem>
                          {FASES_PROCESSUAIS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <FormField label="Comarca" value={form.comarca ?? ""} onChange={(v) => setField("comarca", v)} placeholder="Ex: São Paulo" />
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">UF</label>
                      <Select value={form.uf ?? "none"} onValueChange={(v) => setField("uf", v === "none" ? null : v)}>
                        <SelectTrigger className="h-10 bg-background"><SelectValue placeholder="UF" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">—</SelectItem>
                          {UFS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <FormField label="Data Distribuição" type="date" value={form.data_distribuicao ?? ""} onChange={(v) => setField("data_distribuicao", v || null)} />
                  </div>
                </div>
                <div className="rounded-lg border border-border/50 bg-muted/20 p-4 space-y-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Detalhes</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Assunto" value={form.subject ?? ""} onChange={(v) => setField("subject", v)} placeholder="Ex: Dano moral" />
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Cliente</label>
                      <Select value={form.client_id ?? "none"} onValueChange={(v) => setField("client_id", v === "none" ? null : v)}>
                        <SelectTrigger className="h-10 bg-background"><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nenhum</SelectItem>
                          {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Observações</label>
                    <Textarea value={form.notes ?? ""} onChange={(e) => setField("notes", e.target.value)} rows={3} placeholder="Anotações sobre o processo..." className="bg-background" />
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="documentos" className="space-y-4">
                <div className="rounded-lg border border-border/50 bg-muted/20 p-4 space-y-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Documentos do Processo</h3>
                  {isEditing && selectedProcesso ? (
                    <>
                      <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => triggerFileUpload(selectedProcesso.id)}>
                        <Upload className="h-3.5 w-3.5" /> Anexar Documento
                      </Button>
                      {processDocs.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-3">Nenhum documento vinculado.</p>
                      ) : (
                        <div className="space-y-2">
                          {processDocs.map((doc) => (
                            <div key={doc.id} className="flex items-center justify-between rounded-lg border border-border p-2.5">
                              <div className="flex items-center gap-2">
                                <File className="h-4 w-4 text-primary" />
                                <span className="text-sm truncate max-w-[200px]">{doc.file_name}</span>
                                <span className="text-xs text-muted-foreground">{format(new Date(doc.created_at), "dd/MM/yy")}</span>
                              </div>
                              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDocDownload(doc)}>
                                <Download className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground py-4 text-center">Salve o processo primeiro para anexar documentos.</p>
                  )}
                </div>
              </TabsContent>
              <TabsContent value="calculadora">
                <ProcessCalculator estimatedValue={form.estimated_value ?? null} />
              </TabsContent>
            </Tabs>
            <Separator className="my-4" />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={closeDialog}>Cancelar</Button>
              <Button type="submit" disabled={isSaving}>{isEditing ? "Salvar" : "Criar Processo"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto p-0">
          <div className="flex items-center justify-between border-b border-border bg-card px-6 py-4">
            {selectedProcesso && (
              <div>
                <DialogTitle className="text-lg font-semibold">{selectedProcesso.title}</DialogTitle>
                <div className="mt-1">{statusBadge(selectedProcesso.status)}</div>
              </div>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewDialogOpen(false)}><X className="h-4 w-4" /></Button>
          </div>
          {selectedProcesso && (
            <div className="space-y-5 px-6 pb-6 pt-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-xs text-muted-foreground">Número</span><p className="font-medium">{selectedProcesso.number || "—"}</p></div>
                <div><span className="text-xs text-muted-foreground">Vara / Tribunal</span><p className="font-medium">{selectedProcesso.court || "—"}</p></div>
                <div><span className="text-xs text-muted-foreground">Assunto</span><p className="font-medium">{selectedProcesso.subject || "—"}</p></div>
                <div><span className="text-xs text-muted-foreground">Valor Estimado</span><p className="font-medium">{selectedProcesso.estimated_value != null ? `R$ ${Number(selectedProcesso.estimated_value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"}</p></div>
                <div><span className="text-xs text-muted-foreground">Criado em</span><p>{format(new Date(selectedProcesso.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p></div>
                <div><span className="text-xs text-muted-foreground">Atualizado em</span><p>{format(new Date(selectedProcesso.updated_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p></div>
              </div>
              {(selectedProcesso.area_direito || selectedProcesso.tipo_acao || selectedProcesso.parte_contraria || selectedProcesso.instancia || selectedProcesso.fase_processual || selectedProcesso.comarca) && (
                <>
                  <Separator />
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Dados Jurídicos</span>
                    <div className="grid grid-cols-2 gap-4 text-sm mt-2">
                      {selectedProcesso.area_direito && <div><span className="text-xs text-muted-foreground">Área do Direito</span><p className="font-medium">{selectedProcesso.area_direito}</p></div>}
                      {selectedProcesso.tipo_acao && <div><span className="text-xs text-muted-foreground">Tipo da Ação</span><p className="font-medium">{selectedProcesso.tipo_acao}</p></div>}
                      {selectedProcesso.parte_contraria && <div><span className="text-xs text-muted-foreground">Parte Contrária</span><p className="font-medium">{selectedProcesso.parte_contraria}</p></div>}
                      {selectedProcesso.instancia && <div><span className="text-xs text-muted-foreground">Instância</span><p className="font-medium">{selectedProcesso.instancia}</p></div>}
                      {selectedProcesso.fase_processual && <div><span className="text-xs text-muted-foreground">Fase Processual</span><p className="font-medium">{selectedProcesso.fase_processual}</p></div>}
                      {(selectedProcesso.comarca || selectedProcesso.uf) && <div><span className="text-xs text-muted-foreground">Comarca / UF</span><p className="font-medium">{[selectedProcesso.comarca, selectedProcesso.uf].filter(Boolean).join(" — ")}</p></div>}
                      {selectedProcesso.data_distribuicao && <div><span className="text-xs text-muted-foreground">Data Distribuição</span><p className="font-medium">{format(new Date(selectedProcesso.data_distribuicao + "T00:00"), "dd/MM/yyyy")}</p></div>}
                    </div>
                  </div>
                </>
              )}
              {selectedProcesso.notes && (
                <><Separator /><div><span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Observações</span><p className="mt-1 whitespace-pre-wrap text-sm">{selectedProcesso.notes}</p></div></>
              )}
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Documentos</h4>
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => triggerFileUpload(selectedProcesso.id)}>
                    <Upload className="h-3 w-3" /> Anexar
                  </Button>
                </div>
                {processDocs.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Nenhum documento vinculado</p>
                ) : (
                  <div className="space-y-2">
                    {processDocs.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between rounded-lg border border-border p-2.5">
                        <div className="flex items-center gap-2">
                          <File className="h-4 w-4 text-primary" />
                          <span className="text-sm truncate max-w-[200px]">{doc.file_name}</span>
                          <span className="text-xs text-muted-foreground">{format(new Date(doc.created_at), "dd/MM/yy")}</span>
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDocDownload(doc)}><Download className="h-3.5 w-3.5" /></Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator />
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><Bot className="h-4 w-4" /> Andamentos Robô</h4>
                  <Badge variant={selectedProcesso.auto_capture_enabled ? "default" : "secondary"} className="text-[10px]">
                    {selectedProcesso.auto_capture_enabled ? "Monitoramento Ativo" : "Monitoramento Inativo"}
                  </Badge>
                </div>
                {captures.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4 bg-muted/20 rounded-lg border border-border border-dashed">Nenhum andamento ou publicação capturada até o momento.</p>
                ) : (
                  <div className="space-y-3 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent pt-2">
                    {captures.map((cap: any) => (
                      <div key={cap.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full border border-border bg-card shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 text-primary">
                          <Bot className="h-4 w-4" />
                        </div>
                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-3 rounded border border-border bg-card shadow-sm">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-xs text-foreground">{cap.source}</span>
                            <span className="text-[10px] text-muted-foreground">{format(new Date(cap.capture_date), "dd/MM/yy HH:mm")}</span>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">{cap.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator />
              <ProcessCalculator estimatedValue={selectedProcesso.estimated_value} />
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setViewDialogOpen(false)}>Fechar</Button>
                {selectedProcesso?.estimated_value != null && orgId && (
                  <Button
                    variant="outline"
                    className="gap-1.5 border-emerald-500/30 text-emerald-700 hover:bg-emerald-500/5"
                    disabled={createContaMutation.isPending}
                    onClick={() => createContaMutation.mutate({
                      processoTitle: selectedProcesso.title,
                      value: Number(selectedProcesso.estimated_value),
                      orgId,
                    })}
                  >
                    <Receipt className="h-3.5 w-3.5" />
                    {createContaMutation.isPending ? "Criando..." : "Gerar Conta a Receber"}
                  </Button>
                )}
                <Button onClick={() => { setViewDialogOpen(false); openEdit(selectedProcesso!); }}>Editar</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="font-semibold">Excluir Processo</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Tem certeza que deseja excluir o processo <strong className="text-foreground">{selectedProcesso?.title}</strong>?</p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancelar</Button>
            <Button variant="destructive" disabled={deleteMutation.isPending} onClick={() => selectedProcesso && deleteMutation.mutate(selectedProcesso.id)}>Excluir</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div >
  );
}
