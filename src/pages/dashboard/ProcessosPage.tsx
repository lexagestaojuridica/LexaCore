import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Scale, Plus, Search, Filter, Edit2, Trash2, Eye, Upload, Download, File, Calculator,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import lexaIcon from "@/assets/icon-lexa.png";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

type Processo = Tables<"processos_juridicos">;
type Documento = { id: string; file_name: string; file_path: string; file_type: string | null; created_at: string };

const STATUS_OPTIONS = [
  { value: "ativo", label: "Ativo", variant: "default" as const },
  { value: "arquivado", label: "Arquivado", variant: "secondary" as const },
  { value: "suspenso", label: "Suspenso", variant: "outline" as const },
  { value: "encerrado", label: "Encerrado", variant: "destructive" as const },
];

const statusBadge = (status: string) => {
  const opt = STATUS_OPTIONS.find((o) => o.value === status);
  return <Badge variant={opt?.variant ?? "secondary"}>{opt?.label ?? status}</Badge>;
};

const emptyForm: Partial<TablesInsert<"processos_juridicos">> = {
  title: "", number: "", court: "", subject: "", status: "ativo",
  estimated_value: null, notes: "", client_id: null,
};

// Inline calculator for process
function ProcessCalculator({ estimatedValue }: { estimatedValue: number | null }) {
  const [percentual, setPercentual] = useState("20");
  const [horas, setHoras] = useState("");
  const [valorHora, setValorHora] = useState("");
  const valor = Number(estimatedValue) || 0;
  const honorariosExito = valor * (Number(percentual) / 100);
  const honorariosHora = Number(horas) * Number(valorHora) || 0;
  const formatCurrency = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  return (
    <div className="rounded-lg border border-border/50 bg-muted/20 p-4 space-y-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
        <Calculator className="h-3.5 w-3.5" /> Calculadora do Processo
      </h3>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div><span className="text-xs text-muted-foreground">Valor da Causa</span><p className="font-medium">{valor ? formatCurrency(valor) : "Não informado"}</p></div>
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
        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Honorários Êxito</span><span className="font-medium">{formatCurrency(honorariosExito)}</span></div>
        {honorariosHora > 0 && <div className="flex justify-between text-sm"><span className="text-muted-foreground">Honorários Hora</span><span className="font-medium">{formatCurrency(honorariosHora)}</span></div>}
        <Separator />
        <div className="flex justify-between text-sm font-bold"><span>Total</span><span className="text-primary">{formatCurrency(honorariosExito + honorariosHora)}</span></div>
      </div>
    </div>
  );
}

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

  // Docs for selected process
  const { data: processDocs = [] } = useQuery({
    queryKey: ["process-docs", selectedProcesso?.id],
    queryFn: async () => {
      const { data } = await supabase.from("documentos").select("id, file_name, file_path, file_type, created_at").eq("process_id", selectedProcesso!.id).order("created_at", { ascending: false });
      return (data || []) as Documento[];
    },
    enabled: !!selectedProcesso?.id && (viewDialogOpen || dialogOpen),
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
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["process-docs"] }); queryClient.invalidateQueries({ queryKey: ["documentos"] }); toast.success("Documento vinculado ao processo"); },
    onError: () => toast.error("Erro ao enviar documento"),
  });

  const closeDialog = () => { setDialogOpen(false); setForm(emptyForm); setIsEditing(false); };
  const openCreate = () => { setForm(emptyForm); setIsEditing(false); setDialogOpen(true); };

  const openEdit = (p: Processo) => {
    setForm({ title: p.title, number: p.number, court: p.court, subject: p.subject, status: p.status, estimated_value: p.estimated_value, notes: p.notes, client_id: p.client_id });
    setSelectedProcesso(p);
    setIsEditing(true);
    setDialogOpen(true);
  };

  const setField = useCallback((key: string, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title) { toast.error("O título é obrigatório"); return; }
    if (isEditing && selectedProcesso) {
      updateMutation.mutate({ id: selectedProcesso.id, ...form });
    } else {
      createMutation.mutate({ ...form, title: form.title!, organization_id: orgId!, responsible_user_id: user!.id } as TablesInsert<"processos_juridicos">);
    }
  };

  const handleDocDownload = async (doc: Documento) => {
    const { data } = await supabase.storage.from("documentos").createSignedUrl(doc.file_path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  const triggerFileUpload = (processId: string) => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.onchange = (ev) => {
      const files = (ev.target as HTMLInputElement).files;
      if (files) Array.from(files).forEach((f) => uploadDocMutation.mutate({ file: f, processId }));
    };
    input.click();
  };

  const filtered = processos.filter((p) => {
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    const q = search.toLowerCase();
    const matchesSearch = !q || p.title.toLowerCase().includes(q) || (p.number ?? "").toLowerCase().includes(q) || (p.court ?? "").toLowerCase().includes(q) || (p.subject ?? "").toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <LexaLoadingOverlay visible={isSaving} message="Salvando processo..." />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl text-foreground">Processos Jurídicos</h1>
          <p className="text-sm text-muted-foreground">Gerencie todos os processos do escritório</p>
        </div>
        <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Novo Processo</Button>
      </div>

      <Card className="border-border bg-card">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar por título, número, vara ou assunto..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-20"><span className="text-sm text-muted-foreground">Carregando...</span></div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Scale className="mb-4 h-12 w-12 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">{processos.length === 0 ? "Nenhum processo cadastrado." : "Nenhum processo encontrado."}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead>Número</TableHead>
                    <TableHead>Vara / Tribunal</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Valor Estimado</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.title}</TableCell>
                      <TableCell className="text-muted-foreground">{p.number || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{p.court || "—"}</TableCell>
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
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto p-0">
          <div className="sticky top-0 z-10 border-b border-border bg-gradient-to-r from-primary/5 to-accent/5 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <img src={lexaIcon} alt="" className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="font-display text-lg">{isEditing ? "Editar Processo" : "Novo Processo"}</DialogTitle>
                <p className="text-xs text-muted-foreground">Informações do processo jurídico</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="px-6 pb-6">
            <Tabs defaultValue="dados" className="w-full">
              <TabsList className="my-4 grid w-full grid-cols-3">
                <TabsTrigger value="dados" className="gap-1.5 text-xs"><Scale className="h-3.5 w-3.5" /> Dados</TabsTrigger>
                <TabsTrigger value="documentos" className="gap-1.5 text-xs"><File className="h-3.5 w-3.5" /> Documentos</TabsTrigger>
                <TabsTrigger value="calculadora" className="gap-1.5 text-xs"><Calculator className="h-3.5 w-3.5" /> Calculadora</TabsTrigger>
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
                    <FormField label="Valor Estimado" value={form.estimated_value?.toString() ?? ""} onChange={(v) => setField("estimated_value", v ? Number(v) : null)} placeholder="R$ 0,00" type="number" />
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
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><File className="h-3.5 w-3.5" /> Documentos do Processo</h3>
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

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto p-0">
          <div className="border-b border-border bg-gradient-to-r from-primary/5 to-accent/5 px-6 py-4">
            {selectedProcesso && (
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <Scale className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <DialogTitle className="font-display text-lg">{selectedProcesso.title}</DialogTitle>
                  <div className="mt-1">{statusBadge(selectedProcesso.status)}</div>
                </div>
              </div>
            )}
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
              {selectedProcesso.notes && (
                <><Separator /><div><span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Observações</span><p className="mt-1 whitespace-pre-wrap text-sm">{selectedProcesso.notes}</p></div></>
              )}

              {/* Documents */}
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><File className="h-3.5 w-3.5" /> Documentos</h4>
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

              {/* Inline calculator */}
              <Separator />
              <ProcessCalculator estimatedValue={selectedProcesso.estimated_value} />

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setViewDialogOpen(false)}>Fechar</Button>
                <Button onClick={() => { setViewDialogOpen(false); openEdit(selectedProcesso); }}>Editar</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="font-display">Excluir Processo</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Tem certeza que deseja excluir o processo <strong className="text-foreground">{selectedProcesso?.title}</strong>?</p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancelar</Button>
            <Button variant="destructive" disabled={deleteMutation.isPending} onClick={() => selectedProcesso && deleteMutation.mutate(selectedProcesso.id)}>Excluir</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
