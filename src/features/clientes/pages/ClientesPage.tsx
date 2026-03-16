import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Users, Plus, Search, Edit2, Trash2, Eye, Upload, Download, File, X, ShieldAlert,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, MessageCircle,
  RefreshCw, CheckCircle2, ShieldCheck, User
} from "lucide-react";
import { motion } from "framer-motion";
import { ConflitosInteresseDialog } from "@/features/clientes/components/ConflitosInteresseDialog";
import { Button } from "@/shared/ui/button";
import { StatCard } from "@/shared/components/StatCard";
import { Input } from "@/shared/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Textarea } from "@/shared/ui/textarea";
import { Card, CardContent } from "@/shared/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { Badge } from "@/shared/ui/badge";
import { Separator } from "@/shared/ui/separator";
import FormField from "@/shared/components/FormField";
import LexaLoadingOverlay from "@/shared/components/LexaLoadingOverlay";
import { formatDocument, formatPhone, formatCEP, fetchAddressByCEP } from "@/shared/lib/formatters";
import { TableSkeleton } from "@/shared/components/SkeletonLoaders";
import { cn } from "@/shared/lib/utils";

// FSD Imports
import { useClientes } from "@/features/clientes/hooks/useClientes";
import type { Client, ClientDocumento } from "@/features/clientes/types";
import { emptyClientForm } from "@/features/clientes/types";
import { useQuery } from "@tanstack/react-query";
import { db as supabase } from "@/integrations/supabase/db";

// New Components
import { ClientFormDialog } from "@/features/clientes/components/ClientFormDialog";
import { ClientViewDialog } from "@/features/clientes/components/ClientViewDialog";
import { ClientDeleteDialog } from "@/features/clientes/components/ClientDeleteDialog";

export default function ClientesPage() {
  const { t } = useTranslation();
  const {
    clients, totalCount, totalPages, page, setPage, search, isLoading,
    biCounts, handleSearch, handleDocDownload,
    createMutation, updateMutation, deleteMutation, uploadDoc,
    requestSignature, syncAsaas, generatePortalAuth,
    PAGE_SIZE, user,
  } = useClientes();

  // ── Local UI State ──
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [form, setForm] = useState(emptyClientForm);
  const [isEditing, setIsEditing] = useState(false);
  const [conflitosOpen, setConflitosOpen] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState(false);

  // Client docs for view dialog
  const { data: clientDocs = [] } = useQuery({
    queryKey: ["client-docs", selectedClient?.id],
    queryFn: async () => {
      const { data } = await supabase.from("documentos").select("id, file_name, file_path, file_type, created_at").eq("client_id", selectedClient!.id).order("created_at", { ascending: false });
      return (data || []) as ClientDocumento[];
    },
    enabled: !!selectedClient?.id && viewDialogOpen,
  });

  const closeDialog = () => { setDialogOpen(false); setForm(emptyClientForm); setIsEditing(false); };
  const openCreate = () => { setForm(emptyClientForm); setIsEditing(false); setDialogOpen(true); };
  const openEdit = (c: Client) => {
    const f: Record<string, string> = {};
    Object.keys(emptyClientForm).forEach((k) => { f[k] = (c as unknown as Record<string, string | null>)[k] ?? ""; });
    setForm(f); setSelectedClient(c); setIsEditing(true); setDialogOpen(true);
  };

  const doSave = (formData?: Record<string, string>) => {
    const dataToSave = formData || form;
    const payload: Record<string, any> = {};
    Object.entries(dataToSave).forEach(([k, v]) => { payload[k] = v || null; });
    payload.name = dataToSave.name;
    if (isEditing && selectedClient) {
      updateMutation.mutate({ id: selectedClient.id, ...payload } as Parameters<typeof updateMutation.mutate>[0], { onSuccess: closeDialog });
    } else {
      createMutation.mutate({ ...payload, organization_id: orgId! }, { onSuccess: closeDialog });
    }
  };

  const handleFormSubmit = (formData: Record<string, string>) => {
    setForm(formData);
    if (!formData.name) { toast.error("O nome é obrigatório"); return; }
    if (!isEditing) { setConflitosOpen(true); setPendingSubmit(true); return; }
    doSave(formData);
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <LexaLoadingOverlay visible={isSaving} message="Salvando cliente..." />

      <ConflitosInteresseDialog
        open={conflitosOpen}
        onClose={() => { setConflitosOpen(false); setPendingSubmit(false); }}
        clientName={form.name} clientEmail={form.email} clientDocument={form.document}
        onProceed={() => { if (pendingSubmit) { setPendingSubmit(false); doSave(); } }}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{t("clients.title")}</h1>
          <p className="text-sm text-muted-foreground">
            Gestão e acompanhamento da sua base de clientes
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2 shadow-sm"><Plus className="h-4 w-4" /> Novo Cliente</Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={Users}
          label="Total de Clientes"
          value={biCounts.total}
          color="blue"
          index={0}
        />
        <StatCard
          icon={User}
          label="Pessoas Físicas"
          value={biCounts.pf}
          color="emerald"
          index={1}
        />
        <StatCard
          icon={ShieldCheck}
          label="Pessoas Jurídicas"
          value={biCounts.pj}
          color="purple"
          index={2}
        />
      </div>

      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.3 }}>
        <Card className="glass-card border-border/40 shadow-sm overflow-hidden">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="relative flex-1 group">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input placeholder="Buscar por nome, e-mail, telefone, documento ou empresa..." value={search} onChange={(e) => handleSearch(e.target.value)} className="pl-9 bg-white/50 dark:bg-card/50 border-border/40 focus-visible:ring-primary/20 transition-all" />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Client Table */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: 0.1 }}>
        <Card className="glass-card border-border/40 shadow-xl shadow-black/5 overflow-hidden rounded-xl">
          <CardContent className="p-0">
            {isLoading ? (
              <TableSkeleton cols={8} rows={8} />
            ) : clients.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center bg-muted/5 border-2 border-dashed border-border/50 rounded-lg m-6">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4"><Users className="h-8 w-8 text-primary" /></div>
                <h3 className="text-lg font-semibold tracking-tight mb-1">{search ? "Nenhum resultado" : "Nenhum cliente cadastrado"}</h3>
                <p className="text-sm text-muted-foreground max-w-sm mb-6">{search ? "Sua pesquisa não retornou resultados." : "Comece adicionando seu primeiro cliente."}</p>
                {!search && <Button size="sm" className="gap-2 shadow-sm" onClick={openCreate}><Plus className="h-4 w-4" /> Cadastrar primeiro cliente</Button>}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/5">
                      <TableRow className="hover:bg-transparent">
                        {["Nome", "Tipo", "E-mail", "Telefone", "CPF / CNPJ", "Cidade/UF", "Cadastrado"].map(h => (
                          <TableHead key={h} className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">{h}</TableHead>
                        ))}
                        <TableHead className="text-right text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {clients.map((c) => (
                        <TableRow key={c.id} className="hover:bg-muted/20">
                          <TableCell className="font-medium">{c.name}</TableCell>
                          <TableCell><Badge variant="outline" className="text-xs">{c.client_type === "pessoa_juridica" ? "PJ" : "PF"}</Badge></TableCell>
                          <TableCell className="text-muted-foreground">{c.email || "—"}</TableCell>
                          <TableCell className="text-muted-foreground">{c.phone || "—"}</TableCell>
                          <TableCell className="text-muted-foreground">{c.document || "—"}</TableCell>
                          <TableCell className="text-muted-foreground">{c.address_city && c.address_state ? `${c.address_city}/${c.address_state}` : "—"}</TableCell>
                          <TableCell className="text-muted-foreground">{format(new Date(c.created_at), "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-1">
                              {c.phone && (
                                <Button variant="ghost" size="icon" title="WhatsApp" className="h-8 w-8 text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/10" onClick={() => window.open(`https://wa.me/55${c.phone?.replace(/\D/g, "")}`, "_blank")}>
                                  <MessageCircle className="h-4 w-4" />
                                </Button>
                              )}
                              <Button variant="ghost" size="icon" title={c.asaas_customer_id ? "Sincronizado" : "Sincronizar Asaas"} className={cn("h-8 w-8", c.asaas_customer_id ? "text-emerald-500" : "text-muted-foreground hover:text-primary")} onClick={() => syncAsaasMutation.mutate(c)} disabled={syncAsaasMutation.isPending}>
                                {c.asaas_customer_id ? <CheckCircle2 className="h-4 w-4" /> : <RefreshCw className={cn("h-4 w-4", syncAsaasMutation.isPending && "animate-spin")} />}
                              </Button>
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
                {totalPages > 1 && (
                  <div className="flex items-center justify-between border-t border-border/60 px-4 py-3 bg-muted/5">
                    <p className="text-xs text-muted-foreground">
                      Mostrando <span className="font-semibold text-foreground">{(page - 1) * PAGE_SIZE + 1}</span>–<span className="font-semibold text-foreground">{Math.min(page * PAGE_SIZE, totalCount)}</span> de <span className="font-semibold text-foreground">{totalCount}</span>
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

      <ClientFormDialog
        open={dialogOpen}
        onClose={closeDialog}
        onSubmit={handleFormSubmit}
        initialData={form}
        isEditing={isEditing}
        isSaving={isSaving}
        clientId={selectedClient?.id}
        onUploadDoc={(file) => uploadDocMutation.mutate({ file, clientId: selectedClient!.id })}
        isUploading={uploadDocMutation.isPending}
      />

      <ClientViewDialog
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        client={selectedClient}
        docs={clientDocs}
        onEdit={openEdit}
        onGeneratePortal={(c) => generatePortalAuth.mutate(c)}
        isGeneratingPortal={generatePortalAuth.isPending}
        onAsaasSync={(c) => syncAsaasMutation.mutate(c)}
        isAsaasSyncing={syncAsaasMutation.isPending}
        onDocDownload={handleDocDownload}
        onSignatureRequest={(doc, c) => requestSignatureMutation.mutate({ doc, client: c })}
        isSignatureRequesting={requestSignatureMutation.isPending}
        onUploadDoc={(file) => uploadDocMutation.mutate({ file, clientId: selectedClient!.id })}
      />

      <ClientDeleteDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={(id) => deleteMutation.mutate(id, { onSuccess: () => { setDeleteDialogOpen(false); setSelectedClient(null); } })}
        client={selectedClient}
        isDeleting={deleteMutation.isPending}
      />
    </motion.div>
  );
}
