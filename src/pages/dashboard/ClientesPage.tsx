import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Users, Plus, Search, Edit2, Trash2, Eye, Mail, Phone, FileText, MapPin,
  Building2, User, Upload, Download, File,
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
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import FormField from "@/components/shared/FormField";
import LexaLoadingOverlay from "@/components/shared/LexaLoadingOverlay";
import lexaIcon from "@/assets/icon-lexa.png";

type Client = {
  id: string;
  organization_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  document: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  client_type: string | null;
  rg: string | null;
  birth_date: string | null;
  gender: string | null;
  marital_status: string | null;
  nationality: string | null;
  profession: string | null;
  address_street: string | null;
  address_number: string | null;
  address_complement: string | null;
  address_neighborhood: string | null;
  address_city: string | null;
  address_state: string | null;
  address_zip: string | null;
  secondary_phone: string | null;
  secondary_email: string | null;
  company_name: string | null;
  company_position: string | null;
};

type Documento = {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string | null;
  created_at: string;
};

const GENDER_OPTIONS = [
  { value: "masculino", label: "Masculino" },
  { value: "feminino", label: "Feminino" },
  { value: "outro", label: "Outro" },
];

const MARITAL_OPTIONS = [
  { value: "solteiro", label: "Solteiro(a)" },
  { value: "casado", label: "Casado(a)" },
  { value: "divorciado", label: "Divorciado(a)" },
  { value: "viuvo", label: "Viúvo(a)" },
  { value: "uniao_estavel", label: "União Estável" },
];

const STATE_OPTIONS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"
];

const emptyForm: Record<string, string> = {
  name: "", email: "", phone: "", document: "", notes: "",
  client_type: "pessoa_fisica", rg: "", birth_date: "", gender: "",
  marital_status: "", nationality: "Brasileira", profession: "",
  address_street: "", address_number: "", address_complement: "",
  address_neighborhood: "", address_city: "", address_state: "", address_zip: "",
  secondary_phone: "", secondary_email: "", company_name: "", company_position: "",
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
      return data as unknown as Client[];
    },
    enabled: !!orgId,
  });

  // Documents for selected client (view mode)
  const { data: clientDocs = [] } = useQuery({
    queryKey: ["client-docs", selectedClient?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("documentos")
        .select("id, file_name, file_path, file_type, created_at")
        .eq("client_id", selectedClient!.id)
        .order("created_at", { ascending: false });
      return (data || []) as Documento[];
    },
    enabled: !!selectedClient?.id && viewDialogOpen,
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
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
    mutationFn: async ({ id, ...payload }: any) => {
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

  // Document upload for client
  const uploadDocMutation = useMutation({
    mutationFn: async ({ file, clientId }: { file: File; clientId: string }) => {
      const filePath = `${orgId}/${crypto.randomUUID()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from("documentos").upload(filePath, file);
      if (uploadError) throw uploadError;
      const { error: dbError } = await supabase.from("documentos").insert({
        file_name: file.name,
        file_path: filePath,
        file_type: file.type || null,
        user_id: user!.id,
        organization_id: orgId!,
        client_id: clientId,
      });
      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-docs"] });
      queryClient.invalidateQueries({ queryKey: ["documentos"] });
      toast.success("Documento vinculado ao cliente");
    },
    onError: () => toast.error("Erro ao enviar documento"),
  });

  const closeDialog = () => { setDialogOpen(false); setForm(emptyForm); setIsEditing(false); };
  const openCreate = () => { setForm(emptyForm); setIsEditing(false); setDialogOpen(true); };

  const openEdit = (c: Client) => {
    const f: Record<string, string> = {};
    Object.keys(emptyForm).forEach((k) => { f[k] = (c as any)[k] ?? ""; });
    setForm(f);
    setSelectedClient(c);
    setIsEditing(true);
    setDialogOpen(true);
  };

  const setField = useCallback((key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) { toast.error("O nome é obrigatório"); return; }
    const payload: Record<string, any> = {};
    Object.entries(form).forEach(([k, v]) => { payload[k] = v || null; });
    payload.name = form.name;
    if (isEditing && selectedClient) {
      updateMutation.mutate({ id: selectedClient.id, ...payload });
    } else {
      createMutation.mutate({ ...payload, organization_id: orgId! });
    }
  };

  const handleDocDownload = async (doc: Documento) => {
    const { data } = await supabase.storage.from("documentos").createSignedUrl(doc.file_path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  const filtered = clients.filter((c) => {
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      (c.email ?? "").toLowerCase().includes(q) ||
      (c.phone ?? "").toLowerCase().includes(q) ||
      (c.document ?? "").toLowerCase().includes(q) ||
      (c.company_name ?? "").toLowerCase().includes(q)
    );
  });

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <LexaLoadingOverlay visible={isSaving} message="Salvando cliente..." />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <img src={lexaIcon} alt="" className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-display text-2xl text-foreground">Clientes</h1>
            <p className="text-sm text-muted-foreground">Gerencie todos os clientes do escritório</p>
          </div>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" /> Novo Cliente
        </Button>
      </div>

      <Card className="border-border bg-card">
        <CardContent className="flex items-center gap-3 p-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar por nome, e-mail, telefone, documento ou empresa..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-20"><span className="text-sm text-muted-foreground">Carregando...</span></div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Users className="mb-4 h-12 w-12 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">{clients.length === 0 ? "Nenhum cliente cadastrado. Cadastre o primeiro!" : "Nenhum cliente encontrado."}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>CPF / CNPJ</TableHead>
                    <TableHead>Cidade/UF</TableHead>
                    <TableHead>Cadastrado</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {c.client_type === "pessoa_juridica" ? "PJ" : "PF"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{c.email || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{c.phone || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{c.document || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {c.address_city && c.address_state ? `${c.address_city}/${c.address_state}` : "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{format(new Date(c.created_at), "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => { setSelectedClient(c); setViewDialogOpen(true); }}><Eye className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => openEdit(c)}><Edit2 className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => { setSelectedClient(c); setDeleteDialogOpen(true); }}><Trash2 className="h-4 w-4" /></Button>
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

      {/* Create / Edit Dialog - Redesigned */}
      <Dialog open={dialogOpen} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto p-0">
          {/* Header with branding */}
          <div className="sticky top-0 z-10 border-b border-border bg-gradient-to-r from-primary/5 to-accent/5 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <img src={lexaIcon} alt="" className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="font-display text-lg">{isEditing ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
                <p className="text-xs text-muted-foreground">Preencha as informações do cliente</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="px-6 pb-6">
            <Tabs defaultValue="pessoal" className="w-full">
              <TabsList className="my-4 grid w-full grid-cols-4">
                <TabsTrigger value="pessoal" className="gap-1.5 text-xs"><User className="h-3.5 w-3.5" /> Pessoal</TabsTrigger>
                <TabsTrigger value="endereco" className="gap-1.5 text-xs"><MapPin className="h-3.5 w-3.5" /> Endereço</TabsTrigger>
                <TabsTrigger value="profissional" className="gap-1.5 text-xs"><Building2 className="h-3.5 w-3.5" /> Profissional</TabsTrigger>
                <TabsTrigger value="documentos" className="gap-1.5 text-xs"><FileText className="h-3.5 w-3.5" /> Documentos</TabsTrigger>
              </TabsList>

              <TabsContent value="pessoal" className="space-y-4">
                <div className="rounded-lg border border-border/50 bg-muted/20 p-4 space-y-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Identificação</h3>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tipo de Cliente</label>
                    <Select value={form.client_type || "pessoa_fisica"} onValueChange={(v) => setField("client_type", v)}>
                      <SelectTrigger className="h-10 bg-background"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pessoa_fisica">Pessoa Física</SelectItem>
                        <SelectItem value="pessoa_juridica">Pessoa Jurídica</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <FormField label="Nome Completo / Razão Social" value={form.name} onChange={(v) => setField("name", v)} placeholder="Nome completo ou razão social" required icon={<User className="h-4 w-4" />} />
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="CPF / CNPJ" value={form.document} onChange={(v) => setField("document", v)} placeholder="000.000.000-00" />
                    <FormField label="RG" value={form.rg} onChange={(v) => setField("rg", v)} placeholder="00.000.000-0" />
                  </div>
                </div>

                <div className="rounded-lg border border-border/50 bg-muted/20 p-4 space-y-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Dados Pessoais</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Data de Nascimento" value={form.birth_date} onChange={(v) => setField("birth_date", v)} type="date" />
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Gênero</label>
                      <Select value={form.gender || "none"} onValueChange={(v) => setField("gender", v === "none" ? "" : v)}>
                        <SelectTrigger className="h-10 bg-background"><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Não informado</SelectItem>
                          {GENDER_OPTIONS.map((g) => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Estado Civil</label>
                      <Select value={form.marital_status || "none"} onValueChange={(v) => setField("marital_status", v === "none" ? "" : v)}>
                        <SelectTrigger className="h-10 bg-background"><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Não informado</SelectItem>
                          {MARITAL_OPTIONS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <FormField label="Nacionalidade" value={form.nationality} onChange={(v) => setField("nationality", v)} placeholder="Brasileira" />
                  </div>
                </div>

                <div className="rounded-lg border border-border/50 bg-muted/20 p-4 space-y-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> Contato</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="E-mail Principal" value={form.email} onChange={(v) => setField("email", v)} placeholder="cliente@email.com" type="email" icon={<Mail className="h-4 w-4" />} />
                    <FormField label="E-mail Secundário" value={form.secondary_email} onChange={(v) => setField("secondary_email", v)} placeholder="outro@email.com" type="email" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Telefone Principal" value={form.phone} onChange={(v) => setField("phone", v)} placeholder="(00) 00000-0000" icon={<Phone className="h-4 w-4" />} />
                    <FormField label="Telefone Secundário" value={form.secondary_phone} onChange={(v) => setField("secondary_phone", v)} placeholder="(00) 00000-0000" />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="endereco" className="space-y-4">
                <div className="rounded-lg border border-border/50 bg-muted/20 p-4 space-y-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> Endereço</h3>
                  <FormField label="CEP" value={form.address_zip} onChange={(v) => setField("address_zip", v)} placeholder="00000-000" />
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2"><FormField label="Logradouro" value={form.address_street} onChange={(v) => setField("address_street", v)} placeholder="Rua, Avenida..." /></div>
                    <FormField label="Número" value={form.address_number} onChange={(v) => setField("address_number", v)} placeholder="000" />
                  </div>
                  <FormField label="Complemento" value={form.address_complement} onChange={(v) => setField("address_complement", v)} placeholder="Apto, Sala, Bloco..." />
                  <FormField label="Bairro" value={form.address_neighborhood} onChange={(v) => setField("address_neighborhood", v)} placeholder="Bairro" />
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Cidade" value={form.address_city} onChange={(v) => setField("address_city", v)} placeholder="Cidade" />
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Estado</label>
                      <Select value={form.address_state || "none"} onValueChange={(v) => setField("address_state", v === "none" ? "" : v)}>
                        <SelectTrigger className="h-10 bg-background"><SelectValue placeholder="UF" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Selecione</SelectItem>
                          {STATE_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="profissional" className="space-y-4">
                <div className="rounded-lg border border-border/50 bg-muted/20 p-4 space-y-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" /> Dados Profissionais</h3>
                  <FormField label="Profissão" value={form.profession} onChange={(v) => setField("profession", v)} placeholder="Ex: Engenheiro, Médico..." />
                  <FormField label="Empresa / Empregador" value={form.company_name} onChange={(v) => setField("company_name", v)} placeholder="Nome da empresa" icon={<Building2 className="h-4 w-4" />} />
                  <FormField label="Cargo" value={form.company_position} onChange={(v) => setField("company_position", v)} placeholder="Cargo ou função" />
                </div>
                <div className="rounded-lg border border-border/50 bg-muted/20 p-4 space-y-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Observações</h3>
                  <Textarea value={form.notes ?? ""} onChange={(e) => setField("notes", e.target.value)} rows={4} placeholder="Anotações sobre o cliente..." className="bg-background" />
                </div>
              </TabsContent>

              <TabsContent value="documentos" className="space-y-4">
                <div className="rounded-lg border border-border/50 bg-muted/20 p-4 space-y-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" /> Documentos Vinculados</h3>
                  {isEditing && selectedClient ? (
                    <>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-1.5"
                          onClick={() => {
                            const input = document.createElement("input");
                            input.type = "file";
                            input.multiple = true;
                            input.onchange = (ev) => {
                              const files = (ev.target as HTMLInputElement).files;
                              if (files) {
                                Array.from(files).forEach((f) =>
                                  uploadDocMutation.mutate({ file: f, clientId: selectedClient.id })
                                );
                              }
                            };
                            input.click();
                          }}
                        >
                          <Upload className="h-3.5 w-3.5" /> Anexar Documento
                        </Button>
                        {uploadDocMutation.isPending && <span className="text-xs text-muted-foreground">Enviando...</span>}
                      </div>
                      <ClientDocsList clientId={selectedClient.id} orgId={orgId!} />
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground py-4 text-center">Salve o cliente primeiro para anexar documentos.</p>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            <Separator className="my-4" />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={closeDialog}>Cancelar</Button>
              <Button type="submit" disabled={isSaving}>
                {isEditing ? "Salvar Alterações" : "Cadastrar Cliente"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto p-0">
          <div className="border-b border-border bg-gradient-to-r from-primary/5 to-accent/5 px-6 py-4">
            {selectedClient && (
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-lg">
                  {selectedClient.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <DialogTitle className="font-display text-lg">{selectedClient.name}</DialogTitle>
                  <Badge variant="outline" className="text-xs mt-0.5">
                    {selectedClient.client_type === "pessoa_juridica" ? "Pessoa Jurídica" : "Pessoa Física"}
                  </Badge>
                </div>
              </div>
            )}
          </div>
          {selectedClient && (
            <div className="space-y-5 px-6 pb-6 pt-4">
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                {[
                  ["CPF/CNPJ", selectedClient.document],
                  ["RG", selectedClient.rg],
                  ["Data de Nascimento", selectedClient.birth_date ? format(new Date(selectedClient.birth_date + "T00:00:00"), "dd/MM/yyyy") : null],
                  ["Gênero", selectedClient.gender ? GENDER_OPTIONS.find(g => g.value === selectedClient.gender)?.label : null],
                  ["Estado Civil", selectedClient.marital_status ? MARITAL_OPTIONS.find(m => m.value === selectedClient.marital_status)?.label : null],
                  ["Nacionalidade", selectedClient.nationality],
                  ["Profissão", selectedClient.profession],
                  ["Empresa", selectedClient.company_name],
                  ["Cargo", selectedClient.company_position],
                ].map(([label, value]) => value && (
                  <div key={label as string}>
                    <span className="text-muted-foreground text-xs">{label}</span>
                    <p className="text-foreground">{value}</p>
                  </div>
                ))}
              </div>

              <Separator />
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> Contato</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground text-xs">E-mail</span><p>{selectedClient.email || "—"}</p></div>
                  <div><span className="text-muted-foreground text-xs">E-mail Sec.</span><p>{selectedClient.secondary_email || "—"}</p></div>
                  <div><span className="text-muted-foreground text-xs">Telefone</span><p>{selectedClient.phone || "—"}</p></div>
                  <div><span className="text-muted-foreground text-xs">Tel. Sec.</span><p>{selectedClient.secondary_phone || "—"}</p></div>
                </div>
              </div>

              {(selectedClient.address_street || selectedClient.address_city) && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> Endereço</h4>
                    <p className="text-sm text-foreground">
                      {[selectedClient.address_street, selectedClient.address_number, selectedClient.address_complement].filter(Boolean).join(", ")}
                      {selectedClient.address_neighborhood && ` — ${selectedClient.address_neighborhood}`}
                      <br />
                      {[selectedClient.address_city, selectedClient.address_state].filter(Boolean).join("/")}
                      {selectedClient.address_zip && ` — CEP: ${selectedClient.address_zip}`}
                    </p>
                  </div>
                </>
              )}

              {/* Documents section in view */}
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" /> Documentos</h4>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs"
                    onClick={() => {
                      const input = document.createElement("input");
                      input.type = "file";
                      input.multiple = true;
                      input.onchange = (ev) => {
                        const files = (ev.target as HTMLInputElement).files;
                        if (files) {
                          Array.from(files).forEach((f) =>
                            uploadDocMutation.mutate({ file: f, clientId: selectedClient.id })
                          );
                        }
                      };
                      input.click();
                    }}
                  >
                    <Upload className="h-3 w-3" /> Anexar
                  </Button>
                </div>
                {clientDocs.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Nenhum documento vinculado</p>
                ) : (
                  <div className="space-y-2">
                    {clientDocs.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between rounded-lg border border-border p-2.5">
                        <div className="flex items-center gap-2">
                          <File className="h-4 w-4 text-primary" />
                          <span className="text-sm truncate max-w-[200px]">{doc.file_name}</span>
                          <span className="text-xs text-muted-foreground">{format(new Date(doc.created_at), "dd/MM/yy")}</span>
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDocDownload(doc)}>
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {selectedClient.notes && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" /> Observações</h4>
                    <p className="whitespace-pre-wrap text-sm text-foreground">{selectedClient.notes}</p>
                  </div>
                </>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setViewDialogOpen(false)}>Fechar</Button>
                <Button onClick={() => { setViewDialogOpen(false); openEdit(selectedClient); }}>Editar</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="font-display">Excluir Cliente</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Tem certeza que deseja excluir o cliente <strong className="text-foreground">{selectedClient?.name}</strong>? Esta ação não pode ser desfeita.</p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancelar</Button>
            <Button variant="destructive" disabled={deleteMutation.isPending} onClick={() => selectedClient && deleteMutation.mutate(selectedClient.id)}>Excluir</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Sub-component for listing client docs in edit mode
function ClientDocsList({ clientId, orgId }: { clientId: string; orgId: string }) {
  const { data: docs = [] } = useQuery({
    queryKey: ["client-docs-edit", clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("documentos")
        .select("id, file_name, file_path, file_type, created_at")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });
      return (data || []) as Documento[];
    },
    enabled: !!clientId,
  });

  const handleDownload = async (doc: Documento) => {
    const { data } = await supabase.storage.from("documentos").createSignedUrl(doc.file_path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  if (docs.length === 0) return <p className="text-sm text-muted-foreground text-center py-3">Nenhum documento vinculado ainda.</p>;

  return (
    <div className="space-y-2">
      {docs.map((doc) => (
        <div key={doc.id} className="flex items-center justify-between rounded-lg border border-border p-2.5">
          <div className="flex items-center gap-2">
            <File className="h-4 w-4 text-primary" />
            <span className="text-sm truncate max-w-[200px]">{doc.file_name}</span>
          </div>
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDownload(doc)}>
            <Download className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
    </div>
  );
}
