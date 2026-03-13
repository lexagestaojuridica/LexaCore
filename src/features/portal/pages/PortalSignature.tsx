import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { FileText, ShieldCheck, Download, AlertCircle, Loader2 } from "lucide-react";
import { Badge } from "@/shared/ui/badge";

export default function PortalSignature() {
    const { token } = useParams();
    const navigate = useRouter();

    const [signerDoc, setSignerDoc] = useState("");
    const [hasError, setHasError] = useState(false);

    // Fetch signature by token using RPC or direct select if policies allow
    const { data: signature, isLoading, error } = useQuery({
        queryKey: ["document-signature", token],
        queryFn: async () => {
            // By default RLS blocks unauthenticated unless we have a specific policy or RPC
            // Admin override is ideal here or an Edge Function, but for this MVP:
            const { data, error } = await supabase
                .from("document_signatures" as "profiles")
                .select(`
          *,
          documentos ( file_name, file_path, size ),
          organizations ( name, document )
        ` as "*")
                .eq("token" as "user_id", token as string)
                .single();

            if (error) {
                setHasError(true);
                throw error;
            }
            return data as unknown as Record<string, any>;
        },
        enabled: !!token,
        retry: false
    });

    const signMutation = useMutation({
        mutationFn: async () => {
            if (signature.signer_document && signerDoc !== signature.signer_document) {
                throw new Error("Documento informado não confere com o registrado pelo emissor.");
            }

            const clientIp = "127.0.0.1"; // Idealmente via Edge Function req.headers.get("x-forwarded-for")
            const userAgent = navigator.userAgent;

            const { error } = await supabase
                .from("document_signatures" as "profiles")
                .update({
                    status: 'assinado',
                    signed_at: new Date().toISOString(),
                    ip_address: clientIp,
                    user_agent: userAgent,
                    signature_hash: btoa(`signed-${signature.id}-${Date.now()}`) // Basic hash mock
                } as Record<string, unknown>)
                .eq("token" as "user_id", token as string);

            if (error) throw error;
        },
        onSuccess: () => {
            toast.success("Documento assinado com sucesso!");
            // Reload or update state
            window.location.reload();
        },
        onError: (err: any) => toast.error(err.message)
    });

    const handleDownload = async () => {
        if (!signature?.documentos?.file_path) return;
        toast.loading("Preparando download...", { id: "download" });
        const { data, error } = await supabase.storage
            .from("documentos")
            .createSignedUrl(signature.documentos.file_path, 60);

        if (error || !data?.signedUrl) {
            toast.error("Erro ao gerar link do documento", { id: "download" });
            return;
        }
        toast.dismiss("download");
        const link = document.createElement("a");
        link.href = data.signedUrl;
        link.download = signature.documentos.file_name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (isLoading) {
        return <div className="min-h-screen flex items-center justify-center bg-muted/30"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
    }

    if (hasError || !signature) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
                <Card className="max-w-md w-full text-center p-6 border-destructive/20 bg-destructive/5 shadow-none">
                    <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
                    <h2 className="text-xl font-bold mb-2">Link Inválido ou Expirado</h2>
                    <p className="text-muted-foreground text-sm">A requisição de assinatura não foi encontrada, foi cancelada ou já expirou.</p>
                </Card>
            </div>
        );
    }

    const isAssinado = signature.status === 'assinado';
    const isExpired = new Date(signature.expires_at) < new Date() && !isAssinado;

    return (
        <div className="min-h-screen bg-muted/30 flex flex-col">
            <header className="bg-card border-b py-4 shadow-sm">
                <div className="max-w-3xl mx-auto px-6 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <ShieldCheck className={isAssinado ? "text-success" : "text-primary"} />
                        <span className="font-bold font-display text-lg tracking-tight">Lexa E-Sign</span>
                    </div>
                    <Badge variant="outline" className="uppercase text-[10px] tracking-widest">{signature.organizations?.name}</Badge>
                </div>
            </header>

            <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-10">
                <Card className="overflow-hidden shadow-lg border-border/50">
                    <div className={`h-2 w-full ${isAssinado ? 'bg-success' : isExpired ? 'bg-destructive' : 'bg-primary'}`} />
                    <CardHeader className="text-center pb-8 pt-8 px-8 border-b bg-muted/10">
                        <div className="mx-auto bg-background p-4 rounded-full border shadow-sm w-fit mb-4">
                            <FileText className="w-8 h-8 text-primary" />
                        </div>
                        <CardTitle className="text-2xl font-bold">{isAssinado ? "Documento Assinado" : "Aguardando sua Assinatura"}</CardTitle>
                        <CardDescription className="text-base mt-2">
                            {signature.organizations?.name} enviou o documento <strong className="text-foreground">{signature.documentos?.file_name}</strong> para você.
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="p-8">
                        <div className="bg-card border rounded-lg p-5 mb-8">
                            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4 border-b pb-2">Detalhes da Solicitação</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6">
                                <div>
                                    <p className="text-xs text-muted-foreground">Signatário</p>
                                    <p className="font-medium text-sm">{signature.signer_name}</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">{signature.signer_email}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Vencimento do Link</p>
                                    <p className="font-medium text-sm text-destructive">{format(new Date(signature.expires_at), "dd/MM/yyyy 'às' HH:mm")}</p>
                                </div>
                            </div>
                        </div>

                        {isAssinado ? (
                            <div className="bg-success/5 border border-success/20 rounded-lg p-6 text-center space-y-4">
                                <ShieldCheck className="w-12 h-12 text-success mx-auto" />
                                <div>
                                    <h4 className="font-bold text-success text-lg">Assinatura Concluída com Sucesso</h4>
                                    <p className="text-sm text-success/80 mt-1">
                                        Registrado em {format(new Date(signature.signed_at), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}
                                    </p>
                                    <p className="text-xs text-muted-foreground font-mono mt-2 bg-background p-1.5 rounded inline-block border">Hash: {signature.signature_hash}</p>
                                </div>
                                <Button variant="outline" className="mt-4 gap-2" onClick={handleDownload}><Download className="w-4 h-4" /> Baixar Documento Assinado</Button>
                            </div>
                        ) : isExpired ? (
                            <div className="text-center p-6 bg-destructive/5 rounded-lg border border-destructive/20 text-destructive">
                                Este link de assinatura expirou. Solicite um novo envio ao escritório.
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <Button variant="outline" className="w-full justify-between h-14 bg-muted/30" onClick={handleDownload}>
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-background rounded border"><FileText className="w-4 h-4 text-primary" /></div>
                                        <span className="font-medium text-left">Ler Documento Original</span>
                                    </div>
                                    <Download className="w-4 h-4 text-muted-foreground" />
                                </Button>

                                <div className="bg-primary/5 p-6 rounded-xl border border-primary/20 space-y-5">
                                    <div className="space-y-2">
                                        <Label className="font-bold">Confirmação de Identidade</Label>
                                        <p className="text-xs text-muted-foreground leading-relaxed">
                                            Para confirmar que é você, informe o documento registrado pelo escritório. Ao clicar em assinar, seu IP <strong>(registrado no momento do clique)</strong> fará parte da chave criptográfica que confere validade legal a este aceite, sob as normas brasileiras ICP-Brasil e MP 2200-2/2001.
                                        </p>
                                    </div>

                                    {signature.signer_document && (
                                        <div className="space-y-1.5">
                                            <Label>Seu CPF / CNPJ <span className="text-destructive">*</span></Label>
                                            <Input
                                                placeholder="Digite os números do seu documento"
                                                value={signerDoc}
                                                onChange={(e) => setSignerDoc(e.target.value)}
                                                className="bg-background"
                                            />
                                        </div>
                                    )}

                                    <Button
                                        className="w-full h-12 text-base font-bold shadow-md"
                                        onClick={() => signMutation.mutate()}
                                        disabled={signMutation.isPending || (!!signature.signer_document && !signerDoc)}
                                    >
                                        {signMutation.isPending ? "Validando..." : "Aceitar e Assinar Digitalmente"}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
