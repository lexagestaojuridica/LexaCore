import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, isAfter } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Scale, Building2, Calendar, FileText, CheckCircle2, Clock, AlertCircle, ShieldCheck, Lock, ChevronRight, Timer } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import Image from "next/image";

interface PublicProcessData {
    processo: any;
    organizacao: {
        name: string;
        logo_url?: string;
        slug?: string;
        document?: string;
    };
    andamentos: {
        date: string;
        description: string;
        type?: string;
    }[];
}

export default function ProcessPublicView() {
    const { token } = useParams<{ token: string }>();
    const [pin, setPin] = useState("");
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [pinError, setPinError] = useState(false);

    const { data, isLoading, isError } = useQuery({
        queryKey: ["public_process", token],
        queryFn: async () => {
            const { data, error } = await supabase.rpc("get_public_process_with_org" as "get_organization_id", { token_val: token } as Record<string, unknown>);
            if (error) throw error;
            return data as unknown as PublicProcessData;
        },
        enabled: !!token,
    });

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <div className="text-center space-y-6">
                    <div className="h-16 w-16 rounded-full border-4 border-accent border-t-transparent animate-spin mx-auto shadow-lg" />
                    <p className="text-sm font-bold text-foreground/40 uppercase tracking-[0.2em] font-display">Lexa Secure Portal</p>
                </div>
            </div>
        );
    }

    const isExpired = data?.processo?.public_link_expires_at && isAfter(new Date(), new Date(data.processo.public_link_expires_at));

    if (isError || !data || !data.processo || isExpired) {
        return (
            <div className="flex h-screen items-center justify-center bg-background p-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-destructive/5 rounded-full blur-[120px] -z-10" />
                <Card className="max-w-md w-full border-destructive/20 shadow-2xl bg-card/80 glass ring-1 ring-destructive/10">
                    <CardContent className="pt-10 text-center space-y-6">
                        <div className="h-20 w-20 bg-destructive/10 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner ring-1 ring-destructive/20 border-b-2 border-destructive/30">
                            <ShieldCheck className="h-10 w-10 text-destructive" />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-2xl font-bold text-foreground font-display">Acesso Expirado ou Inválido</h2>
                            <p className="text-sm text-muted-foreground leading-relaxed">Este link de acompanhamento não é mais válido ou foi revogado por motivos de segurança.</p>
                        </div>
                        <div className="pt-4">
                            <Button variant="outline" className="w-full rounded-xl gap-2 font-bold" onClick={() => window.location.reload()}>
                                Tentar novamente
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const { processo, organizacao, andamentos } = data;

    // Password Protection Logic
    const isSegredo = processo.segredo_de_justica === true;
    const hasPinSet = processo.public_link_password && processo.public_link_password.length > 0;
    const requiresPin = isSegredo || hasPinSet;

    const handleVerifyPin = () => {
        if (hasPinSet && pin === processo.public_link_password) {
            setIsAuthorized(true);
            setPinError(false);
        } else if (isSegredo && !hasPinSet) {
            // Case where its secret but no password was set by lawyer
            toast.error("Este processo está sob segredo de justiça e não possui chave de acesso configurada. Contate seu advogado.");
            setPinError(true);
        } else {
            setPinError(true);
        }
    };

    if (requiresPin && !isAuthorized) {
        return (
            <div className="flex h-screen items-center justify-center bg-background p-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-accent/5 rounded-full blur-[120px] -z-10" />
                <Card className="max-w-md w-full border-white/5 shadow-2xl bg-card/40 glass-card">
                    <CardHeader className="text-center space-y-2 pt-10">
                        <div className="h-16 w-16 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border-b-2 border-accent/30 shadow-inner group">
                            <Lock className="h-8 w-8 text-accent group-hover:scale-110 transition-transform" />
                        </div>
                        <CardTitle className="text-2xl font-extrabold font-display uppercase tracking-wider">
                            {isSegredo ? "Segredo de Justiça" : "Acesso Restrito"}
                        </CardTitle>
                        <CardDescription>
                            {isSegredo
                                ? "Este processo possui restrição legal de visibilidade. Insira o PIN de acesso."
                                : "Este processo está protegido. Insira o PIN fornecido pelo seu advogado."}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-2 pb-10 space-y-6">
                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Pin de Acesso</label>
                                <Input
                                    type="password"
                                    value={pin}
                                    onChange={(e) => setPin(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleVerifyPin()}
                                    className={cn("h-12 bg-white/50 border-border/40 text-center text-lg tracking-[0.5em] font-mono rounded-xl", pinError && "border-destructive ring-1 ring-destructive/20")}
                                    placeholder="••••"
                                />
                                {pinError && (
                                    <p className="text-[10px] text-destructive font-bold text-center uppercase tracking-wider mt-2 animate-bounce">
                                        {isSegredo && !hasPinSet ? "Acesso não configurado pelo escritório" : "PIN Incorreto. Tente novamente."}
                                    </p>
                                )}
                            </div>
                            <Button
                                className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/20 gap-2 border-b-2 border-black/20"
                                onClick={handleVerifyPin}
                                disabled={isSegredo && !hasPinSet}
                            >
                                Validar Acesso <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const StatusIcon = {
        ativo: Clock,
        arquivado: CheckCircle2,
        suspenso: AlertCircle,
    }[processo.status as "ativo" | "arquivado" | "suspenso"] || Clock;

    return (
        <div className="min-h-screen bg-background font-sans selection:bg-accent/20 relative">
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-accent/5 rounded-full blur-[120px] -z-10 opacity-50" />
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[100px] -z-10 opacity-30" />

            {/* Premium Header */}
            <div className="glass border-b border-border/40 sticky top-0 z-50">
                <div className="max-w-5xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        {organizacao.logo_url ? (
                            <Image src={organizacao.logo_url} alt={organizacao.name} width={120} height={40} className="h-10 w-auto object-contain" unoptimized />
                        ) : (
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 bg-primary rounded-xl flex items-center justify-center shadow-lg border-b-2 border-black/20">
                                    <Scale className="h-5 w-5 text-primary-foreground" />
                                </div>
                                <span className="font-bold text-xl text-foreground tracking-tight font-display">{organizacao.name}</span>
                            </div>
                        )}
                    </div>
                    <Badge variant="outline" className="bg-accent/10 text-accent border-accent/20 text-[10px] px-4 py-1.5 uppercase tracking-widest font-black hidden sm:flex">
                        Secure Client Portal
                    </Badge>
                </div>
            </div>

            <main className="max-w-5xl mx-auto px-6 py-12 space-y-10">
                {/* Process Header Info */}
                <Card className="border-none shadow-2xl bg-card relative overflow-hidden group rounded-3xl ring-1 ring-white/5">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-accent transition-all group-hover:w-2" />
                    <CardHeader className="pl-10 pb-6 pt-10">
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                            <div className="space-y-3">
                                <h1 className="text-3xl font-extrabold tracking-tight text-foreground font-display leading-[1.1]">{processo.title}</h1>
                                <div className="flex items-center gap-2">
                                    <Badge variant="secondary" className="px-3 py-1 bg-muted/50 border border-border/40 text-[11px] font-bold uppercase tracking-tight">
                                        {processo.subject || "Assunto não classificado"}
                                    </Badge>
                                    {processo.segredo_de_justica && (
                                        <Badge variant="destructive" className="px-3 py-1 bg-destructive/10 text-destructive border-destructive/20 text-[11px] font-bold uppercase tracking-tight flex items-center gap-1.5">
                                            <ShieldCheck className="h-3 w-3" /> Segredo de Justiça
                                        </Badge>
                                    )}
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                                <Badge variant="secondary" className="px-4 py-2 text-sm bg-primary text-primary-foreground font-bold rounded-xl shadow-lg shadow-primary/20 border-b-2 border-black/20 flex items-center gap-2">
                                    <StatusIcon className="h-4 w-4" />
                                    <span className="capitalize">{processo.status}</span>
                                </Badge>
                                {processo.public_link_expires_at && (
                                    <span className="text-[10px] text-muted-foreground flex items-center gap-1 uppercase font-bold tracking-tighter">
                                        <Timer className="h-3 w-3" /> Expira: {format(new Date(processo.public_link_expires_at), "dd/MM/yy")}
                                    </span>
                                )}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="pl-10 pb-10">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 pt-8 border-t border-border/40">
                            {[
                                { label: "N. Processo", value: processo.number, icon: FileText },
                                { label: "Tribunal", value: processo.court, icon: Building2 },
                                { label: "Distribuição", value: processo.distribution_date ? format(new Date(processo.distribution_date), "dd/MM/yyyy", { locale: ptBR }) : null, icon: Calendar },
                                { label: "Vara / Comarca", value: processo.jurisdiction, icon: Scale }
                            ].map((item, i) => (
                                <div key={i} className="space-y-2 group/item">
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2 transition-colors group-hover/item:text-accent">
                                        <item.icon className="h-3.5 w-3.5" /> {item.label}
                                    </p>
                                    <p className="text-sm font-semibold text-foreground/90">{item.value || "—"}</p>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Historico / Andamentos */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="flex items-center justify-between px-2">
                            <div className="space-y-1">
                                <h3 className="text-xl font-bold font-display uppercase tracking-wider">Histórico de Andamentos</h3>
                                <p className="text-xs text-muted-foreground uppercase font-medium tracking-tight">Últimas movimentações registradas</p>
                            </div>
                        </div>

                        {!andamentos || andamentos.length === 0 ? (
                            <div className="text-center py-16 glass-card rounded-3xl border border-dashed border-border/60">
                                <div className="h-16 w-16 bg-muted/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-border/40">
                                    <Clock className="h-8 w-8 text-muted-foreground/30" />
                                </div>
                                <p className="text-sm text-muted-foreground font-bold uppercase tracking-widest">Aguardando movimentações</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {andamentos.map((item, idx: number) => (
                                    <div key={idx} className="group glass-card rounded-2xl p-5 border border-border/40 hover:border-accent/40 hover:bg-white/50 transition-all duration-300">
                                        <div className="flex gap-4">
                                            <div className="flex flex-col items-center gap-2">
                                                <div className="h-10 w-10 rounded-xl bg-muted group-hover:bg-accent/10 transition-colors flex items-center justify-center text-muted-foreground group-hover:text-accent border border-border shadow-sm">
                                                    <Calendar className="h-4 w-4" />
                                                </div>
                                                <div className="w-px h-full bg-border/40 group-last:hidden" />
                                            </div>
                                            <div className="flex-1 space-y-2 pb-2">
                                                <div className="flex items-center justify-between">
                                                    <time className="text-[10px] font-bold text-accent uppercase tracking-[0.1em]">
                                                        {format(new Date(item.date), "dd MMMM yyyy", { locale: ptBR })}
                                                    </time>
                                                    {item.type && (
                                                        <Badge variant="outline" className="text-[9px] font-bold uppercase py-0 px-2 h-5 tracking-tighter rounded-md bg-white">
                                                            {item.type}
                                                        </Badge>
                                                    )}
                                                </div>
                                                <p className="text-sm text-foreground/80 leading-relaxed font-semibold">
                                                    {item.description}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="space-y-8">
                        {/* Security Disclaimer */}
                        <Card className="border-none shadow-xl bg-primary/5 rounded-3xl overflow-hidden glass ring-1 ring-primary/10">
                            <CardHeader className="pb-4">
                                <div className="h-10 w-10 bg-primary/20 text-primary rounded-xl flex items-center justify-center mb-2">
                                    <ShieldCheck className="h-6 w-6" />
                                </div>
                                <CardTitle className="text-base font-bold font-display uppercase tracking-wider">Acesso Seguro</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    Este ambiente utiliza criptografia de ponta a ponta. Sua conexão é privada e monitorada para sua segurança conforme as normas da LGPD.
                                </p>
                                <Separator className="bg-primary/10" />
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-[10px] font-bold text-primary uppercase">
                                        <CheckCircle2 className="h-3 w-3" /> SSL Certificado
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] font-bold text-primary uppercase">
                                        <CheckCircle2 className="h-3 w-3" /> Monitoramento 24h
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Contact Organizacao */}
                        <div className="p-6 rounded-3xl border border-border/40 bg-card space-y-4 shadow-sm">
                            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1">Dúvidas sobre o caso?</h4>
                            <Button variant="outline" className="w-full h-11 rounded-xl gap-2 font-bold text-xs uppercase" asChild>
                                <a href={`mailto:contato@${organizacao.slug || 'lexa'}.com`}>
                                    Contatar Escritório
                                </a>
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="text-center pt-8 border-t border-border/40">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                        Ambiente Digital Seguro provido por <span className="text-foreground">{organizacao.name}</span> &copy; {new Date().getFullYear()}
                    </p>
                </div>
            </main>
        </div>
    );
}
