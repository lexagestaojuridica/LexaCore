"use client";

import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR, enUS, es } from "date-fns/locale";
import React from "react";
import {
  Users, Plus, Search, Edit2, Trash2, Eye, MessageCircle,
  RefreshCw, CheckCircle2, ShieldCheck, User,
  ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight
} from "lucide-react";
import { motion } from "framer-motion";
import { ConflitosInteresseDialog } from "@/features/clientes/components/ConflitosInteresseDialog";
import { Button } from "@/shared/ui/button";
import { StatCard } from "@/shared/components/StatCard";
import { Input } from "@/shared/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { Card, CardContent } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import LexaLoadingOverlay from "@/shared/components/LexaLoadingOverlay";
import { TableSkeleton } from "@/shared/components/SkeletonLoaders";
import { cn } from "@/shared/lib/utils";

// FSD Imports
import { useClientes } from "@/features/clientes/hooks/useClientes";
import type { Client, ClientDocumento, ClientForm } from "@/features/clientes/types";
import { emptyClientForm } from "@/features/clientes/types";
import { useQuery } from "@tanstack/react-query";
import { db as supabase } from "@/integrations/supabase/db";

// New Components
import { ClientFormDialog } from "@/features/clientes/components/ClientFormDialog";
import { ClientViewDialog } from "@/features/clientes/components/ClientViewDialog";
import { ClientDeleteDialog } from "@/features/clientes/components/ClientDeleteDialog";

const localeMap: Record<string, any> = {
    "pt-BR": ptBR,
    en: enUS,
    es: es,
};

export default function ClientesPage() {
  const { t, i18n } = useTranslation();
  const currentLocale = localeMap[i18n.language] || ptBR;

  const {
    clients, totalCount, totalPages, page, setPage, search, isLoading,
    biCounts, handleSearch, handleDocDownload,
    createMutation, updateMutation, deleteMutation, uploadDoc,
    requestSignature, syncAsaas, generatePortalAuth,
    PAGE_SIZE,
  } = useClientes();

  // ── Local UI State ──
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [form, setForm] = useState<ClientForm>(emptyClientForm);
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
    const f: ClientForm = { ...emptyClientForm };
    Object.keys(emptyClientForm).forEach((key) => {
      const k = key as keyof ClientForm;
      if (k in c) {
        (f as any)[k] = (c as any)[k] ?? "";
      }
    });
    setForm(f); setSelectedClient(c); setIsEditing(true); setDialogOpen(true);
  };

  const doSave = (formData?: ClientForm) => {
    const dataToSave = formData || form;
    const payload: Partial<Client> = {};
    Object.entries(dataToSave).forEach(([k, v]) => {
      (payload as any)[k] = v || null;
    });
    payload.name = dataToSave.name;
    if (isEditing && selectedClient) {
      updateMutation.mutate({ id: selectedClient.id, ...payload });
      closeDialog();
    } else {
      createMutation.mutate(payload as any);
      closeDialog();
    }
  };

  const handleFormSubmit = (formData: ClientForm) => {
    setForm(formData);
    if (!formData.name) { toast.error(t("clients.nameRequired")); return; }
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
      <LexaLoadingOverlay visible={isSaving} message={t("clients.saving")} />

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
            {t("clients.managementSubtitle")}
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2 shadow-sm"><Plus className="h-4 w-4" /> {t("clients.newClient")}</Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={Users}
          label={t("clients.totalClients")}
          value={biCounts.total}
          color="blue"
          index={0}
        />
        <StatCard
          icon={User}
          label={t("clients.pf")}
          value={biCounts.pf}
          color="emerald"
          index={1}
        />
        <StatCard
          icon={ShieldCheck}
          label={t("clients.pj")}
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
              <Input placeholder={t("clients.searchPlaceholder")} value={search} onChange={(e) => handleSearch(e.target.value)} className="pl-9 bg-white/50 dark:bg-card/50 border-border/40 focus-visible:ring-primary/20 transition-all" />
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
                <h3 className="text-lg font-semibold tracking-tight mb-1">{search ? t("clients.noResults") : t("clients.emptyStateTitle")}</h3>
                <p className="text-sm text-muted-foreground max-w-sm mb-6">{search ? t("clients.noResultsSearch") : t("clients.emptyStateDesc")}</p>
                {!search && <Button size="sm" className="gap-2 shadow-sm" onClick={openCreate}><Plus className="h-4 w-4" /> {t("clients.registerFirst")}</Button>}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/5">
                      <TableRow className="hover:bg-transparent">
                        {[t("common.name"), t("common.type"), t("common.email"), t("common.phone"), "CPF / CNPJ", t("clients.cityState"), t("clients.registeredOn")].map(h => (
                          <TableHead key={h} className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">{h}</TableHead>
                        ))}
                        <TableHead className="text-right text-[10px] uppercase font-bold tracking-wider text-muted-foreground">{t("common.actions")}</TableHead>
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
                          <TableCell className="text-muted-foreground">{format(new Date(c.created_at), t("common.dateFormat"), { locale: currentLocale })}</TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-1">
                              {c.phone && (
                                <Button variant="ghost" size="icon" title="WhatsApp" className="h-8 w-8 text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/10" onClick={() => window.open(`https://wa.me/55${c.phone?.replace(/\D/g, "")}`, "_blank")}>
                                  <MessageCircle className="h-4 w-4" />
                                </Button>
                              )}
                              <Button variant="ghost" size="icon" title={c.asaas_customer_id ? "Sincronizado" : "Sincronizar Asaas"} className={cn("h-8 w-8", c.asaas_customer_id ? "text-emerald-500" : "text-muted-foreground hover:text-primary")} onClick={() => syncAsaas(c)}>
                                {c.asaas_customer_id ? <CheckCircle2 className="h-4 w-4" /> : <RefreshCw className="h-4 w-4" />}
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

      <ClientFormDialog
        open={dialogOpen}
        onClose={closeDialog}
        onSubmit={handleFormSubmit}
        initialData={form}
        isEditing={isEditing}
        isSaving={isSaving}
        clientId={selectedClient?.id}
        onUploadDoc={(file) => selectedClient && uploadDoc(file, selectedClient.id)}
        isUploading={false}
      />

      <ClientViewDialog
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        client={selectedClient}
        docs={clientDocs}
        onEdit={openEdit}
        onGeneratePortal={(c) => generatePortalAuth.mutate(c)}
        isGeneratingPortal={generatePortalAuth.isPending}
        onAsaasSync={(c) => syncAsaas(c)}
        isAsaasSyncing={false}
        onDocDownload={handleDocDownload}
        onSignatureRequest={(doc, c) => requestSignature(doc.id, c.id, { name: c.name, email: c.email! })}
        isSignatureRequesting={false}
        onUploadDoc={(file) => selectedClient && uploadDoc(file, selectedClient.id)}
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
