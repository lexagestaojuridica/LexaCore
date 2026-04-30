"use client";
import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db as supabase } from "@/integrations/supabase/db";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR, enUS, es } from "date-fns/locale";
import React from "react";
import {
  Scale, Plus, Search, Filter, Edit2, Trash2, Eye,
  LayoutList, LayoutGrid, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  ArrowUpDown, ArrowUp, ArrowDown, Share2, MessageCircle, Sparkles, Clock
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useDebounce } from "@/shared/hooks/useDebounce";
import { ProcessKanban } from "@/features/processos/components/ProcessKanban";
import { ProcessoDialog } from "@/features/processos/components/ProcessoDialog";
import { ProcessoViewSheet } from "@/features/processos/components/ProcessoViewSheet";
import type { Processo, Documento } from "@/features/processos/types";
import { STATUS_OPTIONS } from "@/features/processos/constants";
import type { TablesInsert } from "@/integrations/supabase/types";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/shared/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/shared/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/shared/ui/select";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent } from "@/shared/ui/card";
import { PageHeader } from "@/shared/components/PageHeader";
import { StatCard } from "@/shared/components/StatCard";
import { TableSkeleton } from "@/shared/components/SkeletonLoaders";
import LexaLoadingOverlay from "@/shared/components/LexaLoadingOverlay";
import { formatCurrencyInput, parseCurrencyToNumber } from "@/shared/lib/formatters";
import { cn } from "@/shared/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

// FSD Imports
import { useProcessos } from "@/features/processos/hooks/useProcessos";

// Pagination and View Defaults
type SortField = "title" | "number" | "court" | "status" | "estimated_value" | "created_at";
type SortDir = "asc" | "desc";

const localeMap: Record<string, any> = {
    "pt-BR": ptBR,
    en: enUS,
    es: es,
};

const emptyForm = {
  title: "", number: "", court: "", subject: "", status: "ativo",
  estimated_value: null, notes: "", client_id: null, estimated_value_display: "",
  area_direito: null, tipo_acao: null, parte_contraria: null,
  instancia: null, fase_processual: null, comarca: null, uf: null,
  data_distribuicao: null, auto_capture_enabled: false,
};

// ─── SortableHeader ──────────────────────────────────────────

function SortableHeader({ field, label, sortField, sortDir, onSort }: {
  field: SortField;
  label: string;
  sortField: SortField;
  sortDir: SortDir;
  onSort: (f: SortField) => void;
}) {
  const active = sortField === field;
  return (
    <TableHead
      className="cursor-pointer select-none hover:text-foreground text-[10px] uppercase font-bold tracking-wider text-muted-foreground transition-colors"
      onClick={() => onSort(field)}
    >
      <span className="flex items-center gap-1">
        {active
          ? sortDir === "asc"
            ? <ArrowUp className="h-3 w-3 text-primary" />
            : <ArrowDown className="h-3 w-3 text-primary" />
          : <ArrowUpDown className="h-3 w-3 opacity-30" />}
        {label}
      </span>
    </TableHead>
  );
}

// ─── Main Page ──────────────────────────────────────────────────

export default function ProcessosPage() {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const { t, i18n } = useTranslation();
  const currentLocale = localeMap[i18n.language] || ptBR;
  
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [viewMode, setViewMode] = useState<"table" | "kanban">("table");

  const debouncedSearch = useDebounce(search, 400);

  const {
    orgId, processos, totalCount, biCounts, isLoading,
    createMutation, updateMutation, deleteMutation,
    PAGE_SIZE
  } = useProcessos(page, debouncedSearch, statusFilter, sortField, sortDir, viewMode);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedProcesso, setSelectedProcesso] = useState<Processo | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [isEditing, setIsEditing] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const navigate = useRouter();

  const totalPages = viewMode === "table" ? Math.max(1, Math.ceil(totalCount / PAGE_SIZE)) : 1;

  const { data: clientes = [] } = useQuery({
    queryKey: ["clientes-select", orgId],
    queryFn: async () => {
      const { data } = await supabase.from("clientes").select("id, name").eq("organization_id", orgId!);
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
      const { data } = await supabase.from("process_captures").select("*").eq("process_id", selectedProcesso!.id).order("capture_date", { ascending: false });
      return data ?? [];
    },
    enabled: !!selectedProcesso?.id && viewDialogOpen,
  });

  const handleShare = (p: Processo) => {
    const token = (p as { public_token?: string }).public_token;
    if (!token) {
      toast.error(t("processes.copyLinkError"));
      return;
    }
    const url = `${window.location.origin}/public/processo/${token}`;
    navigator.clipboard.writeText(url);
    toast.success(t("processes.copyLinkSuccess"));
  };

  const createContaMutation = useMutation({
    mutationFn: async ({ processoTitle, value, clientId, asaasCustomerId }: { processoTitle: string; value: number; clientId: string | null; asaasCustomerId: string | null }) => {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);
      const { data: res, error } = await supabase.functions.invoke("billing-gateway", {
        body: { action: "create-charge", customerId: asaasCustomerId, clientId, value, dueDate: dueDate.toISOString().split("T")[0], description: `Honorários — ${processoTitle}` }
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Fatura criada! Redirecionando..."); setViewDialogOpen(false); setTimeout(() => navigate.push("/dashboard/financeiro"), 1200); },
    onError: (err: unknown) => toast.error(`Erro ao faturar: ${err instanceof Error ? err.message : 'Erro desconhecido'}`),
  });

  const aiSummaryMutation = useMutation({
    mutationFn: async ({ processId, content }: { processId: string; content: string }) => {
      const { data, error } = await supabase.functions.invoke("aruna-process-summary", {
        body: { process_id: processId, content, organization_id: orgId },
      });
      if (error) throw error;
      return data.summary;
    },
    onSuccess: (summary) => { setAiSummary(summary); toast.success("Sumário gerado com sucesso!"); },
    onError: (err: unknown) => toast.error(`Erro ao gerar sumário: ${err instanceof Error ? err.message : 'Erro desconhecido'}`),
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
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["process-docs"] }); toast.success("Documento vinculado"); },
    onError: () => toast.error("Erro ao enviar documento"),
  });

  const closeDialog = () => { setDialogOpen(false); setForm(emptyForm); setIsEditing(false); };
  const openCreate = () => { setForm(emptyForm); setIsEditing(false); setDialogOpen(true); };
  const openEdit = (p: Processo) => {
    const display = p.estimated_value != null ? formatCurrencyInput(String(Math.round(Number(p.estimated_value) * 100))) : "";
    setForm({
      title: p.title,
      number: p.number || "",
      court: p.court || "",
      subject: p.subject || "",
      status: p.status,
      estimated_value: p.estimated_value,
      notes: p.notes || "",
      client_id: p.client_id,
      estimated_value_display: display,
      auto_capture_enabled: p.auto_capture_enabled || false,
      area_direito: p.area_direito,
      tipo_acao: p.tipo_acao,
      parte_contraria: p.parte_contraria,
      instancia: p.instancia,
      fase_processual: p.fase_processual,
      comarca: p.comarca,
      uf: p.uf,
      data_distribuicao: p.data_distribuicao
    });
    setSelectedProcesso(p); setIsEditing(true); setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title) { toast.error("O título é obrigatório"); return; }
    const { estimated_value_display, ...rest } = form;
    if (isEditing && selectedProcesso) {
      updateMutation.mutate({ id: selectedProcesso.id, ...rest });
      closeDialog();
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

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
    setPage(1);
  };

  const handleSearch = (v: string) => { setSearch(v); setPage(1); };
  const handleStatusFilter = (v: string) => { setStatusFilter(v); setPage(1); };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const statusBadge = (status: string) => {
    const opt = STATUS_OPTIONS.find((o) => o.value === status);
    return <Badge variant="outline" className={`font-bold uppercase tracking-widest text-[10px] border ${opt?.color ?? "bg-muted text-muted-foreground"}`}>{opt?.label ?? status}</Badge>;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <LexaLoadingOverlay visible={isSaving} message={t("processes.saving")} />

      <PageHeader
        title={t("processes.managementTitle")}
        subtitle={t("processes.managementSubtitle")}
        icon={Scale}
        gradient="from-blue-600 to-cyan-600"
        actions={
          <>
            <div className="flex bg-white/10 backdrop-blur-md p-1 rounded-lg border border-white/20">
              <button
                onClick={() => setViewMode("table")}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs transition-all",
                  viewMode === "table" ? "bg-white text-primary font-semibold shadow-sm" : "text-primary-foreground hover:bg-white/10"
                )}
              >
                <LayoutList className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t("processes.table")}</span>
              </button>
              <button
                onClick={() => setViewMode("kanban")}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs transition-all",
                  viewMode === "kanban" ? "bg-white text-primary font-semibold shadow-sm" : "text-primary-foreground hover:bg-white/10"
                )}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t("processes.kanban")}</span>
              </button>
            </div>
            <Button
              onClick={openCreate}
              className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90 shadow-lg shadow-accent/20"
            >
              <Plus className="h-4 w-4" /> {t("processes.newProcess")}
            </Button>
          </>
        }
      />

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={Scale}
          label={t("processes.totalProcesses")}
          value={biCounts.total}
          color="blue"
          index={0}
        />
        <StatCard
          icon={Sparkles}
          label={t("processes.activeProcesses")}
          value={biCounts.ativos}
          color="emerald"
          index={1}
        />
        <StatCard
          icon={Clock}
          label={t("processes.suspendedProcesses")}
          value={biCounts.suspensos}
          color="amber"
          index={2}
        />
      </div>

      {/* ── Filters ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
      >
        <Card className="glass-card border-border/40 shadow-sm overflow-hidden">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
            <div className="relative flex-1 group">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                placeholder={t("processes.searchPlaceholder")}
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-9 bg-white/50 dark:bg-card/50 border-border/40 focus-visible:ring-primary/20 transition-all"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={handleStatusFilter}>
                <SelectTrigger className="w-[160px] bg-white/50 dark:bg-card/50 border-border/40">
                  <SelectValue placeholder={t("common.status")} />
                </SelectTrigger>
                <SelectContent className="glass">
                  <SelectItem value="all">{t("processes.allStatus")}</SelectItem>
                  {STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Table Section */}
      {viewMode === "table" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: 0.1 }}>
          <Card className="glass-card border-border/40 shadow-xl shadow-black/5 overflow-hidden rounded-xl premium-shadow">
            <CardContent className="p-0">
              {isLoading ? (
                <TableSkeleton cols={7} rows={8} />
              ) : processos.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center bg-muted/5 border-2 border-dashed border-border/50 rounded-lg m-6">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <Scale className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold tracking-tight mb-1">
                    {search || statusFilter !== 'all' ? t("clients.noResults") : t("processes.welcomeTitle")}
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-sm mb-6">
                    {search || statusFilter !== 'all'
                      ? t("clients.noResultsSearch")
                      : t("processes.welcomeDesc")}
                  </p>
                  {!search && statusFilter === 'all' && (
                    <Button size="sm" className="gap-2 shadow-sm" onClick={openCreate}>
                      <Plus className="h-4 w-4" /> {t("processes.registerFirst")}
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-muted/5">
                        <TableRow className="hover:bg-transparent">
                          <SortableHeader field="title" label={t("common.title")} sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                          <SortableHeader field="number" label={t("processes.number")} sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                          <SortableHeader field="court" label={t("processes.court")} sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                          <SortableHeader field="status" label={t("common.status")} sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                          <SortableHeader field="estimated_value" label={t("processes.estimatedValue")} sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                          <SortableHeader field="created_at" label={t("processes.createdAt")} sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                          <TableHead className="text-right text-[10px] uppercase font-bold tracking-wider text-muted-foreground">{t("common.actions")}</TableHead>
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
                              <TableCell className="text-muted-foreground">{format(new Date(p.created_at), t("common.dateFormat"), { locale: currentLocale })}</TableCell>
                              <TableCell>
                                <div className="flex items-center justify-end gap-1">
                                  {p.clientes?.phone && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      title="WhatsApp do Cliente"
                                      className="h-8 w-8 text-emerald-500/80 hover:bg-emerald-500/10 hover:text-emerald-600"
                                      onClick={() => window.open(`https://wa.me/55${p.clientes?.phone?.replace(/\D/g, '')}`, '_blank')}
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
                        {t("clients.showingCount", {
                            start: (page - 1) * PAGE_SIZE + 1,
                            end: Math.min(page * PAGE_SIZE, totalCount),
                            total: totalCount
                        })}
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
        <ProcessKanban
          processos={processos}
          onEdit={openEdit}
          onView={(p) => { setSelectedProcesso(p); setViewDialogOpen(true); }}
          onDelete={(p) => { setSelectedProcesso(p); setDeleteDialogOpen(true); }}
          onStatusChange={(id, status) => updateMutation.mutate({ id, status })}
        />
      )}

      <ProcessoDialog
        open={dialogOpen}
        onOpenChange={(o) => { if (!o) closeDialog(); }}
        isEditing={isEditing}
        selectedProcesso={selectedProcesso}
        clientes={clientes}
        processDocs={processDocs}
        isSaving={isSaving}
        onSave={(payload) => {
          if (isEditing && selectedProcesso) {
            updateMutation.mutate({ id: selectedProcesso.id, ...payload });
            closeDialog();
          } else {
            createMutation.mutate(payload);
            closeDialog();
          }
        }}
        onUploadDoc={(file) => selectedProcesso && uploadDocMutation.mutate({ file, processId: selectedProcesso.id })}
        onDownloadDoc={handleDocDownload}
      />

      <ProcessoViewSheet
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
        selectedProcesso={selectedProcesso}
        captures={captures as any}
        processDocs={processDocs}
        aiSummary={aiSummary}
        isAiLoading={aiSummaryMutation.isPending}
        onGenerateAiSummary={(content) => selectedProcesso && aiSummaryMutation.mutate({ processId: selectedProcesso.id, content })}
        onUploadDoc={(pid) => triggerFileUpload(pid)}
        onDownloadDoc={handleDocDownload}
        onBilling={(p) => createContaMutation.mutate({
          processoTitle: p.title,
          value: Number(p.estimated_value),
          clientId: p.client_id,
          asaasCustomerId: p.clientes?.asaas_customer_id || null
        })}
        onEdit={(p) => openEdit(p)}
        isBillingLoading={createContaMutation.isPending}
      />

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-sm rounded-2xl border-none shadow-2xl">
          <DialogHeader><DialogTitle className="font-bold text-lg">{t("processes.deleteTitle")}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t("processes.deleteConfirm", { title: selectedProcesso?.title })}
          </p>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="ghost" onClick={() => setDeleteDialogOpen(false)}>{t("common.cancel")}</Button>
            <Button variant="destructive" className="rounded-xl px-6" disabled={deleteMutation.isPending} onClick={() => selectedProcesso && deleteMutation.mutate(selectedProcesso.id, { onSuccess: () => setDeleteDialogOpen(false) })}>{t("common.delete")}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div >
  );
}
