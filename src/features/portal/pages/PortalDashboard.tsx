"use client";
import { useEffect, useState } from "react";
import { useUser, useAuth } from "@clerk/nextjs";
import { db as supabase } from "@/integrations/supabase/db";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Progress } from "@/shared/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/shared/ui/dialog";
import { Scale, LogOut, FileText, Calendar, Receipt, Download, Loader2, QrCode, Copy, ExternalLink, Upload, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

export default function PortalDashboard() {
    const { user } = useUser();
    const { signOut } = useAuth();
    const queryClient = useQueryClient();

    const [pixModalOpen, setPixModalOpen] = useState(false);
    const [selectedPix, setSelectedPix] = useState<{ amount: number; description: string; pix_code?: string; asaas_billing_url?: string } | null>(null);

    // Pegar o Client ID real vinculado a este Auth User
    const { data: clientUser, isLoading: loadingClient } = useQuery({
        queryKey: ["portal-client-user", user?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("clientes")
                .select("*")
                .eq("auth_user_id", user?.id)
                .single();
            if (error) throw error;
            return data;
        },
        enabled: !!user?.id,
    });

    const clientId = clientUser?.id;

    const { data: processos, isLoading: loadingProcs } = useQuery({
        queryKey: ["portal-processos", clientId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("processos_juridicos")
                .select("*")
                .eq("client_id", clientId)
                .order("created_at", { ascending: false });
            if (error) throw error;
            return data;
        },
        enabled: !!clientId,
    });

    const { data: faturas, isLoading: loadingFaturas } = useQuery({
        queryKey: ["portal-faturas", clientId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("contas_receber")
                .select("*")
                .eq("client_id", clientId)
                .order("due_date", { ascending: true });
            if (error) throw error;
            return data;
        },
        enabled: !!clientId,
    });

    const { data: documentos, isLoading: loadingDocs } = useQuery({
        queryKey: ["portal-documentos", clientId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("documentos")
                .select("*")
                .eq("client_id", clientId)
                .order("created_at", { ascending: false });
            if (error) throw error;
            return data;
        },
        enabled: !!clientId,
    });

    const uploadDocMutation = useMutation({
        mutationFn: async ({ file }: { file: File }) => {
            const orgId = clientUser?.organization_id;
            if (!orgId) throw new Error("ID da organização não encontrado.");

            const filePath = `${orgId}/${crypto.randomUUID()}-${file.name}`;
            const { error: uploadError } = await supabase.storage.from("documentos").upload(filePath, file);
            if (uploadError) throw uploadError;

            const { error: dbError } = await supabase.from("documentos").insert({
                file_name: file.name,
                file_path: filePath,
                file_type: file.type || null,
                user_id: user!.id,
                organization_id: orgId,
                client_id: clientId,
            });
            if (dbError) throw dbError;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["portal-documentos"] });
            toast.success("Documento enviado com sucesso! Seu advogado será notificado.");
        },
        onError: (err: Error) => toast.error(`Erro ao enviar documento: ${err.message}`),
    });

    const triggerUpload = () => {
        const input = document.createElement("input");
        input.type = "file";
        input.multiple = true;
        input.onchange = (e: Event) => {
            const files = (e.target as HTMLInputElement).files;
            if (files) {
                Array.from(files).forEach((file) => {
                    uploadDocMutation.mutate({ file });
                });
            }
        };
        input.click();
    };

    const getProgressValue = (fase: string | null) => {
        if (!fase) return 10;
        const PROGRESS_MAP: Record<string, number> = {
            "Conhecimento": 20,
            "Instrução": 40,
            "Sentença": 60,
            "Recursal": 80,
            "Execução": 95,
            "Cumprimento de Sentença": 100,
            "Encerrado": 100,
        };
        return PROGRESS_MAP[fase] || 15;
    };

    if (loadingClient || loadingProcs || loadingFaturas || loadingDocs) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-muted/30">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    };

    return (
        <div className="min-h-screen bg-muted/30 pb-12">
            {/* Header */}
            <header className="bg-card border-b border-border sticky top-0 z-30 shadow-sm">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                            <Scale className="h-4 w-4 text-primary-foreground" />
                        </div>
                        <div>
                            <h1 className="font-display text-lg font-bold">Portal do Cliente</h1>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest leading-none">
                                Lexa Nova
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-sm font-medium hidden sm:inline-block">Olá, {clientUser?.name?.split(' ')[0]}</span>
                        <Button variant="ghost" size="sm" onClick={signOut} className="text-muted-foreground hover:text-destructive">
                            <LogOut className="h-4 w-4 mr-2" /> Sair
                        </Button>
                    </div>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
                {/* Welcome Banner */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-primary text-primary-foreground rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        <Scale className="w-48 h-48 -mr-10 -mt-20 transform rotate-12" />
                    </div>
                    <div className="relative z-10">
                        <h2 className="text-2xl font-bold mb-1">Bem-vindo ao seu espaço seguro</h2>
                        <p className="text-primary-foreground/80 text-sm max-w-xl">Acompanhe seus processos, baixe documentos e verifique faturas sem complicação. Nossa equipe mantém tudo atualizado aqui para você.</p>
                    </div>
                    <Badge variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-0 py-1.5 px-3 z-10">
                        <Calendar className="w-3.5 h-3.5 mr-1" /> {format(new Date(), "dd 'de' MMMM", { locale: ptBR })}
                    </Badge>
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Content (Processos) */}
                    <div className="lg:col-span-2 space-y-6">
                        <h3 className="text-lg font-semibold flex items-center gap-2 border-b pb-2"><Briefcase className="w-5 h-5 text-primary" /> Meus Processos</h3>

                        {processos?.length === 0 ? (
                            <Card className="bg-transparent border-dashed">
                                <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                                    <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                                        <Scale className="h-6 w-6 text-muted-foreground" />
                                    </div>
                                    <p className="font-medium">Nenhum processo ativo encontrado.</p>
                                    <p className="text-sm text-muted-foreground">Seu advogado vinculará seus casos a esta conta em breve.</p>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="grid gap-4">
                                {processos?.map((proc: any) => {
                                    return (
                                        <Card key={proc.id} className="overflow-hidden hover:shadow-md transition-shadow">
                                            <CardHeader className="bg-muted/30 pb-3">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <CardTitle className="text-base text-primary">{proc.title}</CardTitle>
                                                        <CardDescription className="font-mono text-xs mt-1">{proc.numero_processo || "Sem numeração"}</CardDescription>
                                                    </div>
                                                    <Badge variant="outline" className={proc.status === 'ativo' ? 'bg-success/10 text-success border-success/20' : ''}>
                                                        {proc.status?.toUpperCase() || "ATIVO"}
                                                    </Badge>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="pt-4 pb-4">
                                                <div className="grid grid-cols-2 gap-4 text-sm">
                                                    <div>
                                                        <p className="text-muted-foreground text-xs mb-0.5">Tribunal/Órgão</p>
                                                        <p className="font-medium">{proc.tribunal || "N/A"}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-muted-foreground text-xs mb-0.5">Assunto</p>
                                                        <p className="font-medium line-clamp-1">{proc.subject || proc.assunto || "N/A"}</p>
                                                    </div>
                                                </div>
                                                <div className="mt-4 space-y-1.5">
                                                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
                                                        <span>Progresso do Processo</span>
                                                        <span>{getProgressValue(proc.fase_processual)}%</span>
                                                    </div>
                                                    <Progress value={getProgressValue(proc.fase_processual)} className="h-1.5" />
                                                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                                        Fase Atual: <span className="text-foreground font-medium">{proc.fase_processual || "Início"}</span>
                                                    </p>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Sidebar (Faturas & Documentos) */}
                    <div className="space-y-6">
                        {/* Faturas */}
                        <Card>
                            <CardHeader className="pb-3 border-b border-border/50">
                                <CardTitle className="text-sm flex items-center gap-2"><Receipt className="w-4 h-4 text-primary" /> Minhas Faturas</CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                {faturas?.length === 0 ? (
                                    <div className="p-6 text-center text-sm text-muted-foreground">Você não possui faturas pendentes.</div>
                                ) : (
                                    <div className="divide-y divide-border/50">
                                        {faturas?.map((fat: any) => {
                                            const isVencido = new Date(fat.due_date) < new Date() && fat.status === 'pendente';
                                            return (
                                                <div key={fat.id} className="p-4 flex items-center justify-between hover:bg-muted/20 transition-colors">
                                                    <div>
                                                        <p className="font-medium text-sm line-clamp-1">{fat.description}</p>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="font-bold text-foreground">{formatCurrency(fat.amount)}</span>
                                                            <Badge className="text-[9px] px-1.5 py-0 h-4 bg-muted text-muted-foreground border-border">{format(parseISO(fat.due_date), "dd/MM/yyyy")}</Badge>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        {fat.status === 'pago' ? (
                                                            <Badge className="bg-success/10 text-success border-0">Pago</Badge>
                                                        ) : (
                                                            <Button
                                                                size="sm"
                                                                variant={isVencido ? "destructive" : "default"}
                                                                className="h-7 text-xs px-2 shadow-sm gap-1.5"
                                                                onClick={() => {
                                                                    if ((fat as unknown as { pix_code?: string }).pix_code) {
                                                                        setSelectedPix(fat as unknown as typeof selectedPix);
                                                                        setPixModalOpen(true);
                                                                    } else {
                                                                        toast.error("Boleto/PIX ainda não gerado pelo escritório.");
                                                                    }
                                                                }}
                                                            >
                                                                {(fat as unknown as { pix_code?: string; asaas_billing_url?: string }).pix_code || (fat as unknown as { asaas_billing_url?: string }).asaas_billing_url ? <QrCode className="w-3.5 h-3.5" /> : null} Pagar
                                                            </Button>
                                                        )}
                                                        {(fat as unknown as { asaas_billing_url?: string }).asaas_billing_url && (
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className="h-7 w-7 p-0 ml-1 text-blue-600"
                                                                onClick={() => window.open((fat as unknown as { asaas_billing_url: string }).asaas_billing_url, "_blank")}
                                                                title="Abrir no Gateway"
                                                            >
                                                                <ExternalLink className="h-3.5 w-3.5" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Documentos */}
                        <Card>
                            <CardHeader className="pb-3 border-b border-border/50 flex flex-row items-center justify-between space-y-0">
                                <CardTitle className="text-sm flex items-center gap-2"><FileText className="w-4 h-4 text-primary" /> Documentos</CardTitle>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-[10px] gap-1 px-2 border-primary/20 text-primary hover:bg-primary/5"
                                    onClick={triggerUpload}
                                    disabled={uploadDocMutation.isPending}
                                >
                                    {uploadDocMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                                    Upload
                                </Button>
                            </CardHeader>
                            <CardContent className="p-0">
                                {documentos?.length === 0 ? (
                                    <div className="p-6 text-center text-sm text-muted-foreground">Nenhum documento anexado.</div>
                                ) : (
                                    <div className="divide-y divide-border/50 max-h-[300px] overflow-y-auto">
                                        {documentos?.map((doc: any) => (
                                            <div key={doc.id} className="p-3 hover:bg-muted/30 transition-colors flex items-center justify-between group">
                                                <div className="flex items-center gap-2 overflow-hidden mx-1">
                                                    <div className="p-1.5 rounded bg-primary/10 text-primary shrink-0"><FileText className="w-3.5 h-3.5" /></div>
                                                    <span className="text-xs font-medium truncate" title={doc.file_name}>{doc.file_name}</span>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    onClick={async () => {
                                                        try {
                                                            const { data, error } = await supabase.storage.from("documentos").createSignedUrl(doc.file_path, 60);
                                                            if (error) throw error;
                                                            window.open(data.signedUrl, '_blank');
                                                        } catch (error) {
                                                            toast.error("Erro ao baixar documento.");
                                                            console.error(error);
                                                        }
                                                    }}
                                                >
                                                    <Download className="w-3 h-3 text-muted-foreground" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>
            {/* ── Pix Modal ── */}
            <Dialog open={pixModalOpen} onOpenChange={setPixModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center justify-center gap-2 text-xl">
                            <QrCode className="w-5 h-5 text-primary" /> Pagar Fatura
                        </DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col items-center py-6 space-y-4">
                        {/* Mock PIX Image */}
                        <div className="bg-white p-4 rounded-xl border-4 border-muted/50 w-48 h-48 flex items-center justify-center">
                            <QrCode className="w-32 h-32 text-slate-800" />
                        </div>
                        <p className="font-bold text-lg text-primary">{formatCurrency(Number(selectedPix?.amount || 0))}</p>
                        <p className="text-sm text-muted-foreground text-center">Referente a: {selectedPix?.description}</p>

                        <div className="w-full mt-4">
                            <p className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 flex justify-between">
                                Copia e Cola
                            </p>
                            <div className="flex gap-2 relative">
                                <Input readOnly value={selectedPix?.pix_code || ""} className="pr-12 bg-muted/30 font-mono text-[10px]" />
                                <Button
                                    size="icon"
                                    className="absolute right-0 top-0 bottom-0 rounded-l-none"
                                    onClick={() => {
                                        navigator.clipboard.writeText(selectedPix?.pix_code ?? "");
                                        toast.success("Código PIX copiado!");
                                    }}
                                >
                                    <Copy className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setPixModalOpen(false)} className="w-full">Fechar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    );
}

const Briefcase = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect width="20" height="14" x="2" y="7" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>
);
