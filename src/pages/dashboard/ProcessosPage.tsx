import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Scale,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Eye,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

type Processo = Tables<"processos_juridicos">;

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
  title: "",
  number: "",
  court: "",
  subject: "",
  status: "ativo",
  estimated_value: null,
  notes: "",
  client_id: null,
};

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

  // Fetch org id
  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("user_id", user!.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  const orgId = profile?.organization_id;

  // Fetch processos
  const { data: processos = [], isLoading } = useQuery({
    queryKey: ["processos", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("processos_juridicos")
        .select("*")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Processo[];
    },
    enabled: !!orgId,
  });

  // Fetch clients for dropdown
  const { data: clients = [] } = useQuery({
    queryKey: ["clients-list", orgId],
    queryFn: async () => {
      const { data } = await supabase
        .from("clients")
        .select("id, name")
        .eq("organization_id", orgId!);
      return data ?? [];
    },
    enabled: !!orgId,
  });

  // Create
  const createMutation = useMutation({
    mutationFn: async (payload: TablesInsert<"processos_juridicos">) => {
      const { error } = await supabase.from("processos_juridicos").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["processos"] });
      toast.success("Processo criado com sucesso");
      closeDialog();
    },
    onError: () => toast.error("Erro ao criar processo"),
  });

  // Update
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...payload }: Partial<Processo> & { id: string }) => {
      const { error } = await supabase
        .from("processos_juridicos")
        .update(payload)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["processos"] });
      toast.success("Processo atualizado com sucesso");
      closeDialog();
    },
    onError: () => toast.error("Erro ao atualizar processo"),
  });

  // Delete
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("processos_juridicos")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["processos"] });
      toast.success("Processo excluído com sucesso");
      setDeleteDialogOpen(false);
      setSelectedProcesso(null);
    },
    onError: () => toast.error("Erro ao excluir processo"),
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setForm(emptyForm);
    setIsEditing(false);
  };

  const openCreate = () => {
    setForm(emptyForm);
    setIsEditing(false);
    setDialogOpen(true);
  };

  const openEdit = (p: Processo) => {
    setForm({
      title: p.title,
      number: p.number,
      court: p.court,
      subject: p.subject,
      status: p.status,
      estimated_value: p.estimated_value,
      notes: p.notes,
      client_id: p.client_id,
    });
    setSelectedProcesso(p);
    setIsEditing(true);
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title) {
      toast.error("O título é obrigatório");
      return;
    }
    if (isEditing && selectedProcesso) {
      updateMutation.mutate({ id: selectedProcesso.id, ...form });
    } else {
      createMutation.mutate({
        ...form,
        title: form.title!,
        organization_id: orgId!,
        responsible_user_id: user!.id,
      } as TablesInsert<"processos_juridicos">);
    }
  };

  // Filter & search
  const filtered = processos.filter((p) => {
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      p.title.toLowerCase().includes(q) ||
      (p.number ?? "").toLowerCase().includes(q) ||
      (p.court ?? "").toLowerCase().includes(q) ||
      (p.subject ?? "").toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl text-foreground">Processos Jurídicos</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie todos os processos do escritório
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4" /> Novo Processo
        </Button>
      </div>

      {/* Filters */}
      <Card className="border-border bg-card">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por título, número, vara ou assunto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-border bg-card">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <span className="text-sm text-muted-foreground">Carregando...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Scale className="mb-4 h-12 w-12 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                {processos.length === 0
                  ? "Nenhum processo cadastrado. Crie o primeiro!"
                  : "Nenhum processo encontrado com os filtros aplicados."}
              </p>
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
                      <TableCell className="text-muted-foreground">
                        {p.number || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {p.court || "—"}
                      </TableCell>
                      <TableCell>{statusBadge(p.status)}</TableCell>
                      <TableCell>
                        {p.estimated_value != null
                          ? `R$ ${Number(p.estimated_value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                          : "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(p.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => {
                              setSelectedProcesso(p);
                              setViewDialogOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => openEdit(p)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => {
                              setSelectedProcesso(p);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">
              {isEditing ? "Editar Processo" : "Novo Processo"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Título *</label>
              <Input
                value={form.title ?? ""}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Ex: Ação Trabalhista - João Silva"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Número do Processo</label>
                <Input
                  value={form.number ?? ""}
                  onChange={(e) => setForm({ ...form, number: e.target.value })}
                  placeholder="0000000-00.0000.0.00.0000"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Vara / Tribunal</label>
                <Input
                  value={form.court ?? ""}
                  onChange={(e) => setForm({ ...form, court: e.target.value })}
                  placeholder="Ex: 1ª Vara Cível"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Status</label>
                <Select
                  value={form.status ?? "ativo"}
                  onValueChange={(v) => setForm({ ...form, status: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Valor Estimado</label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.estimated_value ?? ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      estimated_value: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  placeholder="R$ 0,00"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Assunto</label>
                <Input
                  value={form.subject ?? ""}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  placeholder="Ex: Dano moral"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Cliente</label>
                <Select
                  value={form.client_id ?? "none"}
                  onValueChange={(v) => setForm({ ...form, client_id: v === "none" ? null : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Observações</label>
              <Textarea
                value={form.notes ?? ""}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
                placeholder="Anotações sobre o processo..."
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {isEditing ? "Salvar" : "Criar Processo"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">
              Detalhes do Processo
            </DialogTitle>
          </DialogHeader>
          {selectedProcesso && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-muted-foreground">Título</span>
                  <p className="text-foreground">{selectedProcesso.title}</p>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Número</span>
                  <p className="text-foreground">{selectedProcesso.number || "—"}</p>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Vara / Tribunal</span>
                  <p className="text-foreground">{selectedProcesso.court || "—"}</p>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Status</span>
                  <div className="mt-1">{statusBadge(selectedProcesso.status)}</div>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Assunto</span>
                  <p className="text-foreground">{selectedProcesso.subject || "—"}</p>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Valor Estimado</span>
                  <p className="text-foreground">
                    {selectedProcesso.estimated_value != null
                      ? `R$ ${Number(selectedProcesso.estimated_value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                      : "—"}
                  </p>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Criado em</span>
                  <p className="text-foreground">
                    {format(new Date(selectedProcesso.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </p>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Atualizado em</span>
                  <p className="text-foreground">
                    {format(new Date(selectedProcesso.updated_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </p>
                </div>
              </div>
              {selectedProcesso.notes && (
                <div className="text-sm">
                  <span className="font-medium text-muted-foreground">Observações</span>
                  <p className="mt-1 whitespace-pre-wrap text-foreground">{selectedProcesso.notes}</p>
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
                  Fechar
                </Button>
                <Button
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={() => {
                    setViewDialogOpen(false);
                    openEdit(selectedProcesso);
                  }}
                >
                  Editar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">Excluir Processo</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja excluir o processo{" "}
            <strong className="text-foreground">{selectedProcesso?.title}</strong>? Esta ação não
            pode ser desfeita.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => selectedProcesso && deleteMutation.mutate(selectedProcesso.id)}
            >
              Excluir
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
