import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Users,
  Plus,
  Search,
  Edit2,
  Trash2,
  Eye,
  Mail,
  Phone,
  FileText,
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
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

type Client = Tables<"clients">;

const emptyForm: Partial<TablesInsert<"clients">> = {
  name: "",
  email: "",
  phone: "",
  document: "",
  notes: "",
};

export default function ClientesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [isEditing, setIsEditing] = useState(false);

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

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["clients", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Client[];
    },
    enabled: !!orgId,
  });

  const createMutation = useMutation({
    mutationFn: async (payload: TablesInsert<"clients">) => {
      const { error } = await supabase.from("clients").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Cliente criado com sucesso");
      closeDialog();
    },
    onError: () => toast.error("Erro ao criar cliente"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...payload }: Partial<Client> & { id: string }) => {
      const { error } = await supabase.from("clients").update(payload).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Cliente atualizado com sucesso");
      closeDialog();
    },
    onError: () => toast.error("Erro ao atualizar cliente"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clients").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Cliente excluído com sucesso");
      setDeleteDialogOpen(false);
      setSelectedClient(null);
    },
    onError: () => toast.error("Erro ao excluir cliente"),
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

  const openEdit = (c: Client) => {
    setForm({
      name: c.name,
      email: c.email,
      phone: c.phone,
      document: c.document,
      notes: c.notes,
    });
    setSelectedClient(c);
    setIsEditing(true);
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) {
      toast.error("O nome é obrigatório");
      return;
    }
    if (isEditing && selectedClient) {
      updateMutation.mutate({ id: selectedClient.id, ...form });
    } else {
      createMutation.mutate({
        ...form,
        name: form.name!,
        organization_id: orgId!,
      } as TablesInsert<"clients">);
    }
  };

  const filtered = clients.filter((c) => {
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      (c.email ?? "").toLowerCase().includes(q) ||
      (c.phone ?? "").toLowerCase().includes(q) ||
      (c.document ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl text-foreground">Clientes</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie todos os clientes do escritório
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4" /> Novo Cliente
        </Button>
      </div>

      {/* Search */}
      <Card className="border-border bg-card">
        <CardContent className="flex items-center gap-3 p-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, e-mail, telefone ou documento..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
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
              <Users className="mb-4 h-12 w-12 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                {clients.length === 0
                  ? "Nenhum cliente cadastrado. Cadastre o primeiro!"
                  : "Nenhum cliente encontrado com a busca aplicada."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>CPF / CNPJ</TableHead>
                    <TableHead>Cadastrado em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="text-muted-foreground">{c.email || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{c.phone || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{c.document || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(c.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => {
                              setSelectedClient(c);
                              setViewDialogOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => openEdit(c)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => {
                              setSelectedClient(c);
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
              {isEditing ? "Editar Cliente" : "Novo Cliente"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Nome *</label>
              <Input
                value={form.name ?? ""}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Nome completo ou razão social"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">E-mail</label>
                <Input
                  type="email"
                  value={form.email ?? ""}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="cliente@email.com"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Telefone</label>
                <Input
                  value={form.phone ?? ""}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">CPF / CNPJ</label>
              <Input
                value={form.document ?? ""}
                onChange={(e) => setForm({ ...form, document: e.target.value })}
                placeholder="000.000.000-00 ou 00.000.000/0000-00"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Observações</label>
              <Textarea
                value={form.notes ?? ""}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
                placeholder="Anotações sobre o cliente..."
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
                {isEditing ? "Salvar" : "Cadastrar Cliente"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">Detalhes do Cliente</DialogTitle>
          </DialogHeader>
          {selectedClient && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-muted-foreground">Nome</span>
                  <p className="text-foreground">{selectedClient.name}</p>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">CPF / CNPJ</span>
                  <p className="text-foreground">{selectedClient.document || "—"}</p>
                </div>
                <div className="flex items-start gap-2">
                  <Mail className="mt-0.5 h-3.5 w-3.5 text-muted-foreground" />
                  <div>
                    <span className="font-medium text-muted-foreground">E-mail</span>
                    <p className="text-foreground">{selectedClient.email || "—"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Phone className="mt-0.5 h-3.5 w-3.5 text-muted-foreground" />
                  <div>
                    <span className="font-medium text-muted-foreground">Telefone</span>
                    <p className="text-foreground">{selectedClient.phone || "—"}</p>
                  </div>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Cadastrado em</span>
                  <p className="text-foreground">
                    {format(new Date(selectedClient.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </p>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Atualizado em</span>
                  <p className="text-foreground">
                    {format(new Date(selectedClient.updated_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </p>
                </div>
              </div>
              {selectedClient.notes && (
                <div className="text-sm">
                  <div className="flex items-center gap-2">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-medium text-muted-foreground">Observações</span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-foreground">{selectedClient.notes}</p>
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
                    openEdit(selectedClient);
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
            <DialogTitle className="font-display">Excluir Cliente</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja excluir o cliente{" "}
            <strong className="text-foreground">{selectedClient?.name}</strong>? Esta ação não
            pode ser desfeita.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => selectedClient && deleteMutation.mutate(selectedClient.id)}
            >
              Excluir
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
