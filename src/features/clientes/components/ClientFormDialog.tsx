import { useCallback, useState } from "react";
import { X, Upload } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { Separator } from "@/shared/ui/separator";
import { Textarea } from "@/shared/ui/textarea";
import FormField from "@/shared/components/FormField";
import { formatDocument, formatPhone, formatCEP, fetchAddressByCEP } from "@/shared/lib/formatters";
import { GENDER_OPTIONS, MARITAL_OPTIONS, STATE_OPTIONS } from "../types";
import { useQuery } from "@tanstack/react-query";
import { db as supabase } from "@/integrations/supabase/db";
import { Download, File } from "lucide-react";
import type { ClientForm } from "../types";

interface ClientFormDialogProps {
    open: boolean;
    onClose: () => void;
    onSubmit: (form: ClientForm) => void;
    initialData: ClientForm;
    isEditing: boolean;
    isSaving: boolean;
    clientId?: string;
    onUploadDoc?: (file: File) => void;
    isUploading?: boolean;
}

export function ClientFormDialog({
    open,
    onClose,
    onSubmit,
    initialData,
    isEditing,
    isSaving,
    clientId,
    onUploadDoc,
    isUploading,
}: ClientFormDialogProps) {
    const [form, setForm] = useState<ClientForm>(initialData);
    const [cepLoading, setCepLoading] = useState(false);

    const setField = (key: keyof ClientForm, value: string) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    const handleCEPChange = async (value: string) => {
        const formatted = formatCEP(value);
        setField("address_zip", formatted);
        const digits = value.replace(/\D/g, "");
        if (digits.length === 8) {
            setCepLoading(true);
            const addr = await fetchAddressByCEP(digits);
            if (addr) {
                setForm((prev) => ({
                    ...prev,
                    address_zip: formatted,
                    address_street: addr.street,
                    address_neighborhood: addr.neighborhood,
                    address_city: addr.city,
                    address_state: addr.state,
                }));
            }
            setCepLoading(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(form);
    };

    return (
        <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
            <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto p-0">
                <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-6 py-4">
                    <div>
                        <DialogTitle className="text-lg font-semibold">{isEditing ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
                        <p className="text-xs text-muted-foreground">Preencha as informações do cliente</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}><X className="h-4 w-4" /></Button>
                </div>
                <form onSubmit={handleSubmit} className="px-6 pb-6">
                    <Tabs defaultValue="pessoal" className="w-full">
                        <TabsList className="my-4 grid w-full grid-cols-4">
                            <TabsTrigger value="pessoal" className="text-xs">Pessoal</TabsTrigger>
                            <TabsTrigger value="endereco" className="text-xs">Endereço</TabsTrigger>
                            <TabsTrigger value="profissional" className="text-xs">Profissional</TabsTrigger>
                            <TabsTrigger value="documentos" className="text-xs">Documentos</TabsTrigger>
                        </TabsList>

                        <TabsContent value="pessoal" className="space-y-4">
                            {/* Identificação */}
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
                                <FormField label="Nome Completo / Razão Social" value={form.name} onChange={(v) => setField("name", v)} placeholder="Nome completo ou razão social" required />
                                <div className="grid grid-cols-2 gap-3">
                                    <FormField label="CPF / CNPJ" value={form.document} onChange={(v) => setField("document", formatDocument(v))} placeholder="000.000.000-00" />
                                    <FormField label="RG" value={form.rg} onChange={(v) => setField("rg", v)} placeholder="00.000.000-0" />
                                </div>
                            </div>
                            {/* Dados Pessoais */}
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
                            {/* Contato */}
                            <div className="rounded-lg border border-border/50 bg-muted/20 p-4 space-y-4">
                                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contato</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <FormField label="E-mail Principal" value={form.email} onChange={(v) => setField("email", v)} placeholder="cliente@email.com" type="email" />
                                    <FormField label="E-mail Secundário" value={form.secondary_email} onChange={(v) => setField("secondary_email", v)} type="email" />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <FormField label="Telefone Principal" value={form.phone} onChange={(v) => setField("phone", formatPhone(v))} placeholder="(00) 00000-0000" />
                                    <FormField label="Telefone Secundário" value={form.secondary_phone} onChange={(v) => setField("secondary_phone", formatPhone(v))} />
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="endereco" className="space-y-4">
                            <div className="rounded-lg border border-border/50 bg-muted/20 p-4 space-y-4">
                                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Endereço</h3>
                                <div className="relative">
                                    <FormField label="CEP" value={form.address_zip} onChange={handleCEPChange} placeholder="00000-000" />
                                    {cepLoading && <span className="absolute right-3 top-8 text-xs text-muted-foreground animate-pulse">Buscando...</span>}
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="col-span-2"><FormField label="Logradouro" value={form.address_street} onChange={(v) => setField("address_street", v)} /></div>
                                    <FormField label="Número" value={form.address_number} onChange={(v) => setField("address_number", v)} placeholder="000" />
                                </div>
                                <FormField label="Complemento" value={form.address_complement} onChange={(v) => setField("address_complement", v)} />
                                <FormField label="Bairro" value={form.address_neighborhood} onChange={(v) => setField("address_neighborhood", v)} />
                                <div className="grid grid-cols-2 gap-3">
                                    <FormField label="Cidade" value={form.address_city} onChange={(v) => setField("address_city", v)} />
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
                                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Dados Profissionais</h3>
                                <FormField label="Profissão" value={form.profession} onChange={(v) => setField("profession", v)} />
                                <FormField label="Empresa / Empregador" value={form.company_name} onChange={(v) => setField("company_name", v)} />
                                <FormField label="Cargo" value={form.company_position} onChange={(v) => setField("company_position", v)} />
                            </div>
                            <div className="rounded-lg border border-border/50 bg-muted/20 p-4 space-y-4">
                                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Observações</h3>
                                <Textarea value={form.notes ?? ""} onChange={(e) => setField("notes", e.target.value)} rows={4} className="bg-background" />
                            </div>
                        </TabsContent>

                        <TabsContent value="documentos" className="space-y-4">
                            <div className="rounded-lg border border-border/50 bg-muted/20 p-4 space-y-4">
                                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Documentos Vinculados</h3>
                                {isEditing && clientId ? (
                                    <>
                                        <div className="flex items-center gap-2">
                                            <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => {
                                                const input = document.createElement("input");
                                                input.type = "file"; input.multiple = true;
                                                input.onchange = (ev) => {
                                                    const files = (ev.target as HTMLInputElement).files;
                                                    if (files && onUploadDoc) Array.from(files).forEach(onUploadDoc);
                                                };
                                                input.click();
                                            }}>
                                                <Upload className="h-3.5 w-3.5" /> Anexar Documento
                                            </Button>
                                            {isUploading && <span className="text-xs text-muted-foreground">Enviando...</span>}
                                        </div>
                                        <ClientDocsList clientId={clientId} />
                                    </>
                                ) : (
                                    <p className="text-sm text-muted-foreground py-4 text-center">Salve o cliente primeiro para anexar documentos.</p>
                                )}
                            </div>
                        </TabsContent>
                    </Tabs>
                    <Separator className="my-4" />
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
                        <Button type="submit" disabled={isSaving}>{isEditing ? "Salvar Alterações" : "Cadastrar Cliente"}</Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function ClientDocsList({ clientId }: { clientId: string }) {
    const { data: docs = [] } = useQuery({
        queryKey: ["client-docs-edit", clientId],
        queryFn: async () => {
            const { data } = await supabase.from("documentos").select("id, file_name, file_path, file_type, created_at").eq("client_id", clientId).order("created_at", { ascending: false });
            return (data || []) as { id: string; file_name: string; file_path: string; file_type: string | null; created_at: string }[];
        },
        enabled: !!clientId,
    });

    const handleDownload = async (doc: { file_path: string }) => {
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
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDownload(doc)}><Download className="h-3.5 w-3.5" /></Button>
                </div>
            ))}
        </div>
    );
}
