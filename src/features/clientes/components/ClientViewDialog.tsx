import { format } from "date-fns";
import { X, ShieldAlert, RefreshCw, Upload, File, ShieldCheck, Download } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Separator } from "@/shared/ui/separator";
import { GENDER_OPTIONS, MARITAL_OPTIONS, Client, ClientDocumento } from "../types";
import { cn } from "@/shared/lib/utils";

interface ClientViewDialogProps {
    open: boolean;
    onClose: () => void;
    client: Client | null;
    docs: ClientDocumento[];
    onEdit: (client: Client) => void;
    onGeneratePortal: (client: Client) => void;
    isGeneratingPortal: boolean;
    onAsaasSync: (client: Client) => void;
    isAsaasSyncing: boolean;
    onDocDownload: (doc: ClientDocumento) => void;
    onSignatureRequest: (doc: ClientDocumento, client: Client) => void;
    isSignatureRequesting: boolean;
    onUploadDoc: (file: File) => void;
}

export function ClientViewDialog({
    open,
    onClose,
    client,
    docs,
    onEdit,
    onGeneratePortal,
    isGeneratingPortal,
    onAsaasSync,
    isAsaasSyncing,
    onDocDownload,
    onSignatureRequest,
    isSignatureRequesting,
    onUploadDoc,
}: ClientViewDialogProps) {
    if (!client) return null;

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto p-0">
                <div className="flex items-center justify-between border-b border-border bg-card px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-lg">
                            {client.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <DialogTitle className="text-lg font-semibold">{client.name}</DialogTitle>
                            <Badge variant="outline" className="text-xs mt-0.5">
                                {client.client_type === "pessoa_juridica" ? "Pessoa Jurídica" : "Pessoa Física"}
                            </Badge>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onGeneratePortal(client)}
                            disabled={isGeneratingPortal || !client.email}
                        >
                            <ShieldAlert className="w-4 h-4 mr-2" /> Portal
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onAsaasSync(client)}
                            disabled={isAsaasSyncing}
                            className={client.asaas_customer_id ? "text-emerald-600" : ""}
                        >
                            <RefreshCw className={cn("w-4 h-4 mr-2", isAsaasSyncing && "animate-spin")} />
                            {client.asaas_customer_id ? "Atualizar Asaas" : "Sincronizar Asaas"}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}><X className="h-4 w-4" /></Button>
                    </div>
                </div>

                <div className="space-y-5 px-6 pb-6 pt-4">
                    <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                        {[
                            ["CPF/CNPJ", client.document],
                            ["RG", client.rg],
                            ["Data de Nascimento", client.birth_date ? format(new Date(client.birth_date + "T00:00:00"), "dd/MM/yyyy") : null],
                            ["Gênero", client.gender ? GENDER_OPTIONS.find(g => g.value === client.gender)?.label : null],
                            ["Estado Civil", client.marital_status ? MARITAL_OPTIONS.find(m => m.value === client.marital_status)?.label : null],
                            ["Nacionalidade", client.nationality],
                            ["Profissão", client.profession],
                            ["Empresa", client.company_name],
                            ["Cargo", client.company_position],
                        ].map(([label, value]) => value && (
                            <div key={label as string}>
                                <span className="text-muted-foreground text-xs">{label}</span>
                                <p className="text-foreground">{value}</p>
                            </div>
                        ))}
                    </div>
                    <Separator />
                    <div className="space-y-2">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contato</h4>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div><span className="text-muted-foreground text-xs">E-mail</span><p>{client.email || "—"}</p></div>
                            <div><span className="text-muted-foreground text-xs">E-mail Sec.</span><p>{client.secondary_email || "—"}</p></div>
                            <div><span className="text-muted-foreground text-xs">Telefone</span><p>{client.phone || "—"}</p></div>
                            <div><span className="text-muted-foreground text-xs">Tel. Sec.</span><p>{client.secondary_phone || "—"}</p></div>
                        </div>
                    </div>
                    {(client.address_street || client.address_city) && (
                        <>
                            <Separator />
                            <div className="space-y-2">
                                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Endereço</h4>
                                <p className="text-sm text-foreground">
                                    {[client.address_street, client.address_number, client.address_complement].filter(Boolean).join(", ")}
                                    {client.address_neighborhood && ` — ${client.address_neighborhood}`}
                                    <br />
                                    {[client.address_city, client.address_state].filter(Boolean).join("/")}
                                    {client.address_zip && ` — CEP: ${client.address_zip}`}
                                </p>
                            </div>
                        </>
                    )}
                    <Separator />
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Documentos</h4>
                            <Button
                                variant="outline"
                                size="sm"
                                className="gap-1.5 text-xs"
                                onClick={() => {
                                    const input = document.createElement("input");
                                    input.type = "file"; input.multiple = true;
                                    input.onchange = (ev) => {
                                        const files = (ev.target as HTMLInputElement).files;
                                        if (files) Array.from(files).forEach(onUploadDoc);
                                    };
                                    input.click();
                                }}
                            >
                                <Upload className="h-3 w-3" /> Anexar
                            </Button>
                        </div>
                        {docs.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">Nenhum documento vinculado</p>
                        ) : (
                            <div className="space-y-2">
                                {docs.map((doc) => (
                                    <div key={doc.id} className="flex items-center justify-between rounded-lg border border-border p-2.5">
                                        <div className="flex items-center gap-2">
                                            <File className="h-4 w-4 text-primary" />
                                            <span className="text-sm truncate max-w-[200px]">{doc.file_name}</span>
                                            <span className="text-xs text-muted-foreground">{format(new Date(doc.created_at), "dd/MM/yy")}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                title="Solicitar Assinatura"
                                                className="h-7 w-7 text-primary hover:bg-primary/10"
                                                onClick={() => onSignatureRequest(doc, client)}
                                                disabled={isSignatureRequesting || !client.email}
                                            >
                                                <ShieldCheck className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDocDownload(doc)}>
                                                <Download className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    {client.notes && (
                        <>
                            <Separator />
                            <div className="space-y-2">
                                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Observações</h4>
                                <p className="whitespace-pre-wrap text-sm text-foreground">{client.notes}</p>
                            </div>
                        </>
                    )}
                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="outline" onClick={onClose}>Fechar</Button>
                        <Button onClick={() => { onClose(); onEdit(client); }}>Editar</Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
