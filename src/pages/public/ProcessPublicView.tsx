import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Scale, Building2, Calendar, FileText, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export default function ProcessPublicView() {
    const { token } = useParams<{ token: string }>();

    const { data, isLoading, isError } = useQuery({
        queryKey: ["public_process", token],
        queryFn: async () => {
            const { data, error } = await supabase.rpc("get_public_process_with_org", { token_val: token });
            if (error) throw error;
            return data;
        },
        enabled: !!token,
    });

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-muted/20">
                <div className="text-center space-y-4">
                    <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto" />
                    <p className="text-sm font-medium text-muted-foreground animate-pulse">Carregando andamento processual...</p>
                </div>
            </div>
        );
    }

    if (isError || !data || !data.processo) {
        return (
            <div className="flex h-screen items-center justify-center bg-muted/20 p-4">
                <Card className="max-w-md w-full border-destructive/20 shadow-lg">
                    <CardContent className="pt-6 text-center space-y-4">
                        <div className="h-16 w-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertCircle className="h-8 w-8 text-destructive" />
                        </div>
                        <h2 className="text-xl font-bold text-foreground">Acesso Indisponível</h2>
                        <p className="text-sm text-muted-foreground">O link de processo que você tentou acessar é inválido, expirou ou foi revogado pelo escritório.</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const { processo, organizacao, andamentos } = data;

    const StatusIcon = {
        ativo: Clock,
        arquivado: CheckCircle2,
        suspenso: AlertCircle,
    }[processo.status as "ativo" | "arquivado" | "suspenso"] || Clock;

    return (
        <div className="min-h-screen bg-[#f8f9fa] font-sans selection:bg-primary/20">
            {/* Dynamic Header - White Label */}
            <div className="bg-white border-b border-border shadow-sm">
                <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {organizacao.logo_url ? (
                            <img src={organizacao.logo_url} alt={organizacao.name} className="h-8 object-contain" />
                        ) : (
                            <div className="flex items-center gap-2">
                                <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
                                    <Scale className="h-4 w-4 text-primary-foreground" />
                                </div>
                                <span className="font-bold text-lg text-foreground tracking-tight">{organizacao.name}</span>
                            </div>
                        )}
                    </div>
                    <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-xs px-3 py-1 uppercase tracking-wider font-semibold">
                        Portal do Cliente
                    </Badge>
                </div>
            </div>

            <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
                {/* Process Header Info */}
                <Card className="border-none shadow-md bg-white overflow-hidden relative">
                    <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                    <CardHeader className="pl-8 pb-4">
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                            <div className="space-y-1.5">
                                <CardTitle className="text-2xl font-bold tracking-tight text-foreground">{processo.title}</CardTitle>
                                <CardDescription className="flex items-center gap-2 text-sm max-w-xl">
                                    {processo.subject || "Assunto não classificado"}
                                </CardDescription>
                            </div>
                            <Badge variant="secondary" className="w-fit flex items-center gap-1.5 px-3 py-1 text-sm bg-muted/50">
                                <StatusIcon className="h-4 w-4" />
                                <span className="capitalize">{processo.status}</span>
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="pl-8">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-4 border-t border-border/50">
                            <div className="space-y-1">
                                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"><FileText className="h-3 w-3" /> N. Processo</p>
                                <p className="text-sm font-medium text-foreground">{processo.number || "—"}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"><Building2 className="h-3 w-3" /> Tribunal</p>
                                <p className="text-sm font-medium text-foreground">{processo.court || "—"}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"><Calendar className="h-3 w-3" /> Distribuição</p>
                                <p className="text-sm font-medium text-foreground">{processo.distribution_date ? format(new Date(processo.distribution_date), "dd/MM/yyyy", { locale: ptBR }) : "—"}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"><Scale className="h-3 w-3" /> Vara / Comarca</p>
                                <p className="text-sm font-medium text-foreground">{processo.jurisdiction || "—"}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Historico / Andamentos */}
                <Card className="border-border/50 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-lg">Linha do Tempo</CardTitle>
                        <CardDescription>Acompanhe os andamentos e movimentações mais recentes</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {(!andamentos || andamentos.length === 0) ? (
                            <div className="text-center py-10 bg-muted/30 rounded-xl border border-dashed border-border">
                                <Clock className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
                                <p className="text-sm text-muted-foreground">Nenhuma movimentação registrada neste processo até o momento.</p>
                            </div>
                        ) : (
                            <div className="relative border-l-2 border-primary/20 ml-3 md:ml-4 space-y-8 pb-4">
                                {andamentos.map((item: any, idx: number) => (
                                    <div key={idx} className="relative pl-6 md:pl-8">
                                        <span className="absolute -left-[9px] top-1 h-4 w-4 rounded-full border-2 border-white bg-primary shadow-sm ring-2 ring-primary/20" />
                                        <div className="flex flex-col gap-1">
                                            <time className="text-xs font-semibold text-primary uppercase tracking-wider">
                                                {format(new Date(item.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                                            </time>
                                            <div className="bg-muted/30 rounded-lg p-3.5 border border-border/50">
                                                <p className="text-sm text-foreground/90 leading-relaxed font-medium">
                                                    {item.description}
                                                </p>
                                                {item.type && (
                                                    <span className="inline-block mt-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider bg-background px-2 py-0.5 rounded-md border border-border">
                                                        {item.type}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Footer */}
                <div className="text-center pb-8 pt-4">
                    <p className="text-xs text-muted-foreground">
                        Acompanhamento processual online seguro provido por <span className="font-semibold text-foreground">{organizacao.name}</span>.
                    </p>
                </div>
            </main>
        </div>
    );
}
