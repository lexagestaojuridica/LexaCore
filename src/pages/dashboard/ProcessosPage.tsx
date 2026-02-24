import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Scale, Plus, Search, Filter, Edit2, Trash2, Eye, Upload, Download, File, Calculator, X,
  LayoutList, LayoutGrid, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  ArrowUpDown, ArrowUp, ArrowDown, Receipt, Bot, SwitchCamera, Share2, MessageCircle, Sparkles, Timer, Clock
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { TableSkeleton } from "@/components/shared/SkeletonLoaders";
import FormField from "@/components/shared/FormField";
import LexaLoadingOverlay from "@/components/shared/LexaLoadingOverlay";
import { formatCurrencyInput, parseCurrencyToNumber } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

type Processo = Tables<"processos_juridicos"> & { clients?: { id: string; name: string; phone: string | null; } | null };
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

const emptyForm: Record<string, any> = {
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
  const { t } = useTranslation();
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
  const [aiSummary, setAiSummary] = useState<string | null>(null);
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

  const { data: processosData, isLoading } = useQuery({
    queryKey: ["processos", orgId, page, search, statusFilter, sortField, sortDir],
    queryFn: async () => {
      let query = supabase
        .from("processos_juridicos")
        .select("*, clients(id, name, phone)", { count: "exact" })
        .eq("organization_id", orgId!);

      // Apply Filters
      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      if (search) {
        // Busca textual em título, número de processo contendo a strig
        query = query.or(`title.ilike.%${search}%,number.ilike.%${search}%,court.ilike.%${search}%,subject.ilike.%${search}%`);
      }

      // Apply Sorting
      query = query.order(sortField, { ascending: sortDir === "asc" });

      // Only paginate if we are in table mode (Kanban needs all for columns, or we can deal with kanban separately)
      // Actually, standard practice for Kanban is also to limit, but let's apply the limit strictly here.
      // Wait, Kanban mode expects 'filtered', which was all processes. If we paginate, Kanban only sees 15.
      // We'll pass the unpaginated for Kanban in a separate hook if needed, or disable pagination on Kanban.
      if (viewMode === "table") {
        const from = (page - 1) * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;
        query = query.range(from, to);
      } else {
        // Hard limit for Kanban to prevent crash, e.g., 200 items max or no pagination.
        query = query.limit(200);
      }


      const { data, error, count } = await query;
      if (error) throw error;
      return { data: data as Processo[], count: count ?? 0 };
    },
    enabled: !!orgId,
    placeholderData: keepPreviousData,
  });

  const processos = processosData?.data || [];
  const totalCount = processosData?.count || 0;
  // If view mode is table, we use the server's count. If Kanban, we might just use the array length.
  const totalPages = viewMode === "table" ? Math.max(1, Math.ceil(totalCount / PAGE_SIZE)) : 1;


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

  const handleShare = (p: Processo) => {
    const token = (p as any).public_token;
    if (!token) {
      toast.error("Processo sem token público. Abra e salve-o novamente ou aplique a migração de banco.");
      return;
    }
    const url = `${window.location.origin}/public/processo/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Link do Portal do Cliente copiado!");
  };

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

  const aiSummaryMutation = useMutation({
    mutationFn: async ({ processId, content }: { processId: string; content: string }) => {
      const { data, error } = await supabase.functions.invoke("aruna-process-summary", {
        body: { process_id: processId, content, organization_id: orgId },
      });
      if (error) throw error;
      return data.summary;
    },
    onSuccess: (summary) => {
      setAiSummary(summary);
      toast.success("Sumário gerado com sucesso!");
    },
    onError: (err: any) => toast.error(`Erro ao gerar sumário: ${err.message}`),
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
  // The 'processos' array is already filtered, sorted, and paginated by the server.
  // We only need to compute totalPages based on totalCount for pagination UI.
  // Note: For Kanban, 'processos' contains up to 200 items filtered by search/status.

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
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t("processes.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {totalCount} {totalCount !== 1 ? t("processes.subtitle") + "s" : t("processes.subtitle")} {totalCount !== 1 ? t("common.registeredPlural") : t("common.registered")}
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
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="glass-card border-border/40 shadow-sm overflow-hidden">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
            <div className="relative flex-1 group">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                placeholder="Buscar por título, número, vara ou assunto..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-9 bg-white/50 dark:bg-card/50 border-border/40 focus-visible:ring-primary/20 transition-all"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={handleStatusFilter}>
                <SelectTrigger className="w-[160px] bg-white/50 dark:bg-card/50 border-border/40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="glass">
                  <SelectItem value="all">Todos</SelectItem>
                  {STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Table View ── */}
      {viewMode === "table" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Card className="glass-card border-border/40 shadow-xl shadow-black/5 overflow-hidden rounded-xl">
            <CardContent className="p-0">
              {isLoading ? (
                <TableSkeleton columns={6} rows={8} />
              ) : processos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <Scale className="mb-4 h-12 w-12 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">{search || statusFilter !== 'all' ? "Nenhum processo encontrado para os filtros." : "Nenhum processo cadastrado."}</p>
                  {!search && statusFilter === 'all' && (
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
                          {processos.map((p) => (
                            <TableRow key={p.id} className="hover:bg-muted/20">
                              <TableCell className="font-medium max-w-[200px] truncate">{p.title}</TableCell>
                              <TableCell className="text-muted-foreground">{p.number || "—"}</TableCell>
                              <TableCell className="text-muted-foreground max-w-[160px] truncate">{p.court || "—"}</TableCell>
                              <TableCell>{statusBadge(p.status)}</TableCell>
                              <TableCell>{p.estimated_value != null ? `R$ ${Number(p.estimated_value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"}</TableCell>
                              <TableCell className="text-muted-foreground">{format(new Date(p.created_at), "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                              <TableCell>
                                <div className="flex items-center justify-end gap-1">
                                  {p.clients?.phone && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      title="WhatsApp do Cliente"
                                      className="h-8 w-8 text-emerald-500/80 hover:bg-emerald-500/10 hover:text-emerald-600"
                                      onClick={() => window.open(`https://wa.me/55${p.clients?.phone?.replace(/\\D/g, '')}`, '_blank')}
                                    >
                                      <MessageCircle className="h-4 w-4" />
                                    </Button>
                                  )}
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:bg-primary/10 hover:text-primary" title="Copiar Link para o Cliente" onClick={() => handleShare(p)}><Share2 className="h-4 w-4" /></Button>
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
                    <div className="flex items-center justify-between border-t border-border/60 px-4 py-3 bg-muted/5">
                      <p className="text-xs text-muted-foreground">
                        Mostrando <span className="font-semibold text-foreground">{(page - 1) * PAGE_SIZE + 1}</span>–<span className="font-semibold text-foreground">{Math.min(page * PAGE_SIZE, totalCount)}</span> de <span className="font-semibold text-foreground">{totalCount}</span> processos
                      </p>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" disabled={page === 1} onClick={() => setPage(1)}><ChevronsLeft className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" disabled={page === 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-3.5 w-3.5" /></Button>
                        <span className="px-3 text-xs font-medium bg-muted/50 rounded-md py-1">{page} / {totalPages}</span>
                        <Button variant="ghost" size="icon" className="h-7 w-7" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" disabled={page === totalPages} onClick={() => setPage(totalPages)}><ChevronsRight className="h-3.5 w-3.5" /></Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ── Kanban View ── */}
      {viewMode === "kanban" && (
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid gap-6 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4"
        >
          {KANBAN_COLUMNS.map((col) => {
            const colProcessos = processos.filter((p) => p.status === col.status);
            return (
              <motion.div variants={item} key={col.status} className="flex flex-col gap-4">
                <div className={cn("rounded-xl border border-border/60 bg-muted/20 overflow-hidden shadow-sm", col.color, "border-t-4")}>
                  <div className="flex items-center justify-between px-4 py-3 bg-white/40 dark:bg-card/40 backdrop-blur-sm">
                    <span className="text-xs font-bold uppercase tracking-widest text-foreground/70">{col.label}</span>
                    <Badge variant="secondary" className="text-[10px] font-bold bg-white/60 dark:bg-muted/60">{colProcessos.length}</Badge>
                  </div>
                </div>
                <div className="space-y-3 min-h-[200px] p-1">
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
              </motion.div>
            );
          })}
        </motion.div>
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

      {/* VER PROCESSO (SHEET MODAL) */}
      <Sheet open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <SheetContent side="right" className="w-[95vw] sm:w-[600px] sm:max-w-[700px] overflow-y-auto p-0 border-l border-border/50 bg-background">
          {selectedProcesso && (
            <div className="flex flex-col h-full bg-background">
              {/* Header do Panel */}
              <SheetHeader className="p-6 pb-4 border-b border-border/50 bg-muted/10 sticky top-0 z-10 backdrop-blur-md">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 pr-6 flex-1 text-left">
                    <SheetTitle className="text-xl font-bold leading-tight text-foreground text-left">
                      {selectedProcesso.title}
                    </SheetTitle>
                    <SheetDescription asChild>
                      <div className="flex items-center justify-between gap-2 text-sm text-primary">
                        <div className="flex items-center gap-2">
                          <Scale className="h-4 w-4" />
                          <span className="font-semibold">{selectedProcesso.number || "Sem Número (Administrativo)"}</span>
                        </div>
                        {captures.length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-2 text-xs font-bold text-primary bg-primary/5 hover:bg-primary/10 rounded-full border border-primary/20 transition-all shadow-sm"
                            onClick={() => {
                              const content = captures.map((c: any) => `${format(new Date(c.capture_date), "dd/MM/yyyy")}: ${c.content}`).join("\n");
                              aiSummaryMutation.mutate({ processId: selectedProcesso.id, content });
                            }}
                            disabled={aiSummaryMutation.isPending}
                          >
                            {aiSummaryMutation.isPending ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Sparkles className="h-3.5 w-3.5" />
                            )}
                            Aruna IA
                          </Button>
                        )}
                      </div>
                    </SheetDescription>
                  </div>
                </div>

                {/* Meta Bar */}
                <div className="flex flex-wrap items-center gap-3 pt-4 mt-2 border-t border-border/40">
                  {statusBadge(selectedProcesso.status)}
                  {selectedProcesso.comarca && (
                    <Badge variant="outline" className="text-[10px] bg-background">
                      {selectedProcesso.comarca} {selectedProcesso.uf && `- ${selectedProcesso.uf}`}
                    </Badge>
                  )}
                  {selectedProcesso.area_direito && (
                    <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/20">
                      {selectedProcesso.area_direito}
                    </Badge>
                  )}
                  {selectedProcesso.fase_processual && (
                    <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-600 border-blue-500/20">
                      {selectedProcesso.fase_processual}
                    </Badge>
                  )}
                </div>
              </SheetHeader>

              {/* Corpo do Conteúdo / Tabs */}
              <div className="flex-1 p-6">
                <Tabs defaultValue="detalhes" className="w-full">
                  <TabsList className="w-full justify-start h-10 bg-transparent border-b border-border/50 rounded-none p-0 overflow-x-auto hide-scrollbar">
                    <TabsTrigger value="detalhes" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 pb-2.5">Detalhes</TabsTrigger>
                    <TabsTrigger value="timeline" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 pb-2.5 flex gap-1.5"><Bot className="w-3.5 h-3.5" /> Movimentações</TabsTrigger>
                    <TabsTrigger value="docs" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 pb-2.5 flex gap-1.5"><File className="w-3.5 h-3.5" /> Docs ({processDocs.length})</TabsTrigger>
                  </TabsList>

                  <div className="mt-6">
                    {/* TAB: DETALHES */}
                    <TabsContent value="detalhes" className="space-y-6 mt-0">
                      {/* Grid de Informações Básicas */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cliente/Autor</span>
                          <p className="text-sm font-medium">{selectedProcesso.cliente_nome || "Não informado"}</p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Parte Contrária</span>
                          <p className="text-sm font-medium">{selectedProcesso.parte_contraria || "Não informada"}</p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Órgão / Vara</span>
                          <p className="text-sm font-medium">{selectedProcesso.court || "Não informado"}</p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Instância</span>
                          <p className="text-sm font-medium">{selectedProcesso.instancia || "1ª Instância"}</p>
                        </div>
                      </div>

                      <Separator />

                      {/* Assunto / Resumo */}
                      <div className="space-y-2">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Assunto Principal</span>
                        <p className="text-sm leading-relaxed text-foreground/80">{selectedProcesso.subject || "Sem assunto definido"}</p>
                      </div>

                      {selectedProcesso.notes && (
                        <div className="space-y-2 p-4 bg-amber-500/5 rounded-lg border border-amber-500/20">
                          <span className="text-xs font-bold text-amber-600 uppercase tracking-wider flex items-center gap-1.5">Anotações Internas</span>
                          <p className="text-sm text-foreground/80 whitespace-pre-wrap">{selectedProcesso.notes}</p>
                        </div>
                      )}

                      <Separator />
                      <ProcessCalculator estimatedValue={selectedProcesso.estimated_value} />
                    </TabsContent>

                    {/* TAB: TIMELINE CAPTURAS */}
                    <TabsContent value="timeline" className="mt-0">
                      <div className="space-y-6">
                        <div className="flex items-center justify-between pb-4 border-b border-border/50">
                          <h3 className="text-sm font-medium flex items-center gap-2">
                            <Bot className="h-4 w-4 text-emerald-500" /> Andamentos Robô
                          </h3>
                          <div className="flex items-center gap-2">
                            {selectedProcesso.auto_capture_enabled ? (
                              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] h-6">Captura ON</Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] h-6 text-muted-foreground border-muted-foreground/30">Captura OFF</Badge>
                            )}
                          </div>
                        </div>

                        {aiSummary && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            className="p-4 bg-primary/5 rounded-lg border border-primary/20 space-y-3"
                          >
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                                <Sparkles className="h-3 w-3" /> Resumo Inteligente (Aruna)
                              </h4>
                              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setAiSummary(null)}>
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                            <div className="text-sm text-foreground/90 whitespace-pre-wrap font-sans prose prose-sm max-w-none prose-headings:text-primary prose-strong:text-primary/80">
                              {aiSummary}
                            </div>
                          </motion.div>
                        )}

                        {captures.length === 0 ? (
                          <div className="text-center py-12 bg-muted/20 rounded-lg border border-dashed border-border/60">
                            <Search className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
                            <p className="text-sm text-muted-foreground font-medium">Nenhuma movimentação capturada</p>
                            <p className="text-xs text-muted-foreground/60 mt-1">Acione a Captura Automática na edição</p>
                          </div>
                        ) : (
                          <div className="relative before:absolute before:inset-y-0 before:left-3.5 before:w-0.5 before:bg-muted ml-0 space-y-8 pl-10 pr-2">
                            {captures.map((cap: any) => (
                              <div key={cap.id} className="relative">
                                {/* Ponto na linha */}
                                <div className="absolute left-[-2rem] top-1.5 h-3 w-3 rounded-full border-2 border-background bg-primary ring-2 ring-primary/20" />
                                {/* Cartão de Movimentação */}
                                <div className="flex flex-col gap-1 w-full bg-muted/20 border border-border/60 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                      {format(new Date(cap.capture_date), "dd MMM yyyy", { locale: ptBR })}
                                    </span>
                                    <span className="text-[9px] text-muted-foreground bg-muted/60 px-2 py-0.5 rounded">
                                      {cap.source}
                                    </span>
                                  </div>
                                  <p className="text-sm font-medium text-foreground leading-relaxed">{cap.content}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </TabsContent>

                    {/* TAB: DOCUMENTOS */}
                    <TabsContent value="docs" className="mt-0">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between pb-4">
                          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Peças do Processo</h3>
                          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => triggerFileUpload(selectedProcesso.id)}>
                            <Upload className="h-3 w-3" /> Upload PDF
                          </Button>
                        </div>
                        {processDocs.length === 0 ? (
                          <div className="text-center py-12 bg-muted/20 rounded-lg border border-dashed border-border/60">
                            <File className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
                            <p className="text-sm text-muted-foreground font-medium">Pasta vazia</p>
                            <p className="text-xs text-muted-foreground/60 mt-1">Armazene petições e procurações aqui</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {processDocs.map((doc) => (
                              <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-card hover:bg-muted/30 transition-colors group">
                                <div className="flex items-center gap-3 overflow-hidden">
                                  <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center shrink-0">
                                    <File className="h-4 w-4 text-primary" />
                                  </div>
                                  <div className="truncate">
                                    <p className="text-sm font-medium truncate">{doc.file_name}</p>
                                    <p className="text-[10px] text-muted-foreground">{format(new Date(doc.created_at), "dd/MM/yyyy")}</p>
                                  </div>
                                </div>
                                <Button variant="ghost" size="icon" className="h-8 w-8 transition-opacity" onClick={() => handleDocDownload(doc)}>
                                  <Download className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </TabsContent>
                  </div>
                </Tabs>
              </div>

              {/* Botões do Rodapé Fixos */}
              <div className="border-t border-border/50 bg-muted/10 p-4 sticky bottom-0 mt-auto flex justify-end gap-2 backdrop-blur-md">
                {selectedProcesso?.estimated_value != null && orgId && (
                  <Button
                    variant="outline"
                    className="gap-1.5 border-emerald-500/30 text-emerald-700 hover:bg-emerald-500/5 mr-auto"
                    disabled={createContaMutation.isPending}
                    onClick={() => createContaMutation.mutate({
                      processoTitle: selectedProcesso.title,
                      value: Number(selectedProcesso.estimated_value),
                      orgId,
                    })}
                  >
                    <Receipt className="h-3.5 w-3.5" />
                    Gerar C.R.
                  </Button>
                )}
                <Button variant="outline" onClick={() => { setViewDialogOpen(false); openEdit(selectedProcesso!); }}>Editar</Button>
                <Button onClick={() => setViewDialogOpen(false)}>Fechar Processo</Button>
              </div>

            </div>
          )}
        </SheetContent>
      </Sheet>

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
