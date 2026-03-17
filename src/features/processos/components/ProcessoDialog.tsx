import { useState, useEffect } from "react";
import { X, Bot, Upload, File, Download, ChevronRight, ChevronLeft, Check, Scale, ShieldCheck, Wallet, Loader2, Share2, Copy, ExternalLink, Timer } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/shared/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Input } from "@/shared/ui/input";
import { Switch } from "@/shared/ui/switch";
import { Textarea } from "@/shared/ui/textarea";
import { Separator } from "@/shared/ui/separator";
import FormField from "@/shared/components/FormField";
import { formatCNJ } from "@/shared/lib/utils";
import { STATUS_OPTIONS, AREAS_DIREITO, INSTANCIAS, FASES_PROCESSUAIS, UFS } from "../constants";
import type { Processo, Documento } from "../types";
import { ProcessCalculator } from "./ProcessCalculator";
import { DeadlineCalculator } from "./DeadlineCalculator";

interface ProcessoDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    isEditing: boolean;
    selectedProcesso: Processo | null;
    clientes: { id: string, name: string }[];
    processDocs: Documento[];
    onSave: (data: Partial<Processo>) => void;
    isSaving: boolean;
    onUploadDoc: (file: File) => void;
    onDownloadDoc: (doc: Documento) => void;
}

export function ProcessoDialog({
    open, onOpenChange, isEditing, selectedProcesso, clientes, processDocs,
    onSave, isSaving, onUploadDoc, onDownloadDoc
}: ProcessoDialogProps) {
    const [form, setForm] = useState<Partial<Processo>>({});
    const [step, setStep] = useState(1);
    const [maxStepVisited, setMaxStepVisited] = useState(1);
    const [copiedShareLink, setCopiedShareLink] = useState(false);
    const totalSteps = 4;

    useEffect(() => {
        if (step > maxStepVisited) setMaxStepVisited(step);
    }, [step]);

    useEffect(() => {
        if (open && selectedProcesso && isEditing) {
            setForm({
                ...selectedProcesso,
                estimated_value_display: selectedProcesso.estimated_value
                    ? new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2 }).format(Number(selectedProcesso.estimated_value))
                    : ""
            });
            setStep(1);
        } else if (open && !isEditing) {
            setForm({ status: "ativo" });
            setStep(1);
        }
    }, [open, selectedProcesso, isEditing]);

    const setField = <K extends keyof Processo | string>(field: K, value: any) => setForm((prev) => ({ ...prev, [field]: value }));

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const { estimated_value_display: _, ...cleanPayload } = form as Partial<Processo> & { estimated_value_display?: string };
        onSave(cleanPayload);
    };

    const handleValueChange = (v: string) => {
        const clean = v.replace(/\D/g, "");
        if (!clean) {
            setForm({ ...form, estimated_value_display: "", estimated_value: null });
            return;
        }
        const val = Number(clean) / 100;
        setForm({
            ...form,
            estimated_value_display: new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2 }).format(val),
            estimated_value: val
        });
    };

    const nextStep = () => setStep(s => Math.min(s + 1, totalSteps));
    const prevStep = () => setStep(s => Math.max(s - 1, 1));
    const jumpToStep = (s: number) => {
        if (s <= maxStepVisited) setStep(s);
    };

    const steps = [
        { id: 1, title: "Identificação", icon: Scale },
        { id: 2, title: "Jurídico", icon: ShieldCheck },
        { id: 3, title: "Vantagens & IA", icon: Bot },
        { id: 4, title: "Documentos", icon: File },
    ];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[95vh] max-w-2xl overflow-hidden p-0 border-none shadow-2xl flex flex-col bg-card">
                {/* ── Header with Progress ── */}
                <div className="flex flex-col border-b border-border bg-card">
                    <div className="flex items-center justify-between px-6 py-4">
                        <div>
                            <DialogTitle className="text-lg font-bold">{isEditing ? "Editar Processo" : "Novo Processo Wizard"}</DialogTitle>
                            <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium">Passo {step} de {totalSteps} — {steps[step - 1].title}</p>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => onOpenChange(false)}><X className="h-4 w-4" /></Button>
                    </div>

                    {/* Stepper Indicator */}
                    <div className="flex px-6 pb-4 gap-2">
                        {steps.map((s) => (
                            <div key={s.id} className="flex-1 space-y-2">
                                <div className={cn(
                                    "h-1.5 rounded-full transition-all duration-500",
                                    step >= s.id ? "bg-primary shadow-[0_0_8px_rgba(var(--primary),0.4)]" : "bg-muted"
                                )} />
                                <div className="flex items-center gap-1.5 px-1">
                                    <s.icon className={cn("h-3 w-3", step >= s.id ? "text-primary" : "text-muted-foreground")} />
                                    <span className={cn("text-[9px] font-bold uppercase tracking-tighter hidden sm:inline", step >= s.id ? "text-primary" : "text-muted-foreground")}>
                                        {s.title}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-8">
                    <form onSubmit={handleSubmit} id="processo-form">
                        <AnimatePresence mode="wait">
                            {step === 1 && (
                                <motion.div
                                    key="step1"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="space-y-6"
                                >
                                    <div className="grid grid-cols-1 gap-5">
                                        <FormField label="Título do Caso" value={form.title ?? ""} onChange={(v) => setField("title", v)} placeholder="Ex: Ação contra Empresa X - Danos Morais" required />

                                        <div className="grid grid-cols-2 gap-4">
                                            <FormField label="Número (CNJ)" value={form.number ?? ""} onChange={(v) => setField("number", formatCNJ(v))} placeholder="0000000-00.0000.0.00.0000" />
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Vincular Cliente</label>
                                                <Select value={form.client_id ?? "none"} onValueChange={(v) => setField("client_id", v === "none" ? null : v)}>
                                                    <SelectTrigger className="h-10 bg-background/50 border-border/40 shadow-sm focus:ring-primary/20"><SelectValue placeholder="Selecione um cliente" /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="none">Sem cliente vinculado</SelectItem>
                                                        {clientes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Status Interno</label>
                                            <Select value={form.status ?? "ativo"} onValueChange={(v) => setField("status", v)}>
                                                <SelectTrigger className="h-10 bg-background/50 border-border/40"><SelectValue /></SelectTrigger>
                                                <SelectContent>{STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {step === 2 && (
                                <motion.div
                                    key="step2"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="space-y-6"
                                >
                                    <div className="grid grid-cols-1 gap-5">
                                        <FormField label="Vara / Tribunal / Órgão" value={form.court ?? ""} onChange={(v) => setField("court", v)} placeholder="Ex: 1ª Vara Cível da Capital" />

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Área Jurídica</label>
                                                <Select value={form.area_direito ?? "none"} onValueChange={(v) => setField("area_direito", v === "none" ? null : v)}>
                                                    <SelectTrigger className="h-10 bg-background/50 border-border/40"><SelectValue placeholder="Selecione" /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="none">—</SelectItem>
                                                        {AREAS_DIREITO.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <FormField label="Tipo da Ação" value={form.tipo_acao ?? ""} onChange={(v) => setField("tipo_acao", v)} placeholder="Ex: Declaratória" />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Instância Atual</label>
                                                <Select value={form.instancia ?? "none"} onValueChange={(v) => setField("instancia", v === "none" ? null : v)}>
                                                    <SelectTrigger className="h-10 bg-background/50 border-border/40"><SelectValue placeholder="Selecione" /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="none">—</SelectItem>
                                                        {INSTANCIAS.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Fase Processual</label>
                                                <Select value={form.fase_processual ?? "none"} onValueChange={(v) => setField("fase_processual", v === "none" ? null : v)}>
                                                    <SelectTrigger className="h-10 bg-background/50 border-border/40"><SelectValue placeholder="Selecione" /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="none">—</SelectItem>
                                                        {FASES_PROCESSUAIS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between rounded-2xl border border-destructive/20 bg-destructive/5 p-4 transition-all shadow-sm">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-destructive/10 text-destructive rounded-lg"><ShieldCheck className="h-5 w-5" /></div>
                                                <div>
                                                    <p className="text-xs font-bold text-destructive">Segredo de Justiça</p>
                                                    <p className="text-[10px] text-muted-foreground">Restringir acesso a documentos no Portal do Cliente</p>
                                                </div>
                                            </div>
                                            <Switch checked={form.segredo_de_justica || false} onCheckedChange={(v) => setField("segredo_de_justica", v)} />
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {step === 3 && (
                                <motion.div
                                    key="step3"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="space-y-6"
                                >
                                    <div className="space-y-5">
                                        <FormField label="Valor da Causa (Estimativa R$)" value={form.estimated_value_display ?? ""} onChange={handleValueChange} placeholder="0,00" />

                                        <div className="flex items-center justify-between rounded-2xl border border-primary/20 bg-primary/5 p-5 transition-all shadow-sm">
                                            <div className="flex items-center gap-4">
                                                <div className="p-3 bg-primary/20 text-primary rounded-xl shadow-inner"><Bot className="h-6 w-6" /></div>
                                                <div>
                                                    <p className="text-sm font-bold text-primary">Aruna AI: Captura Ativa</p>
                                                    <p className="text-xs text-muted-foreground max-w-[240px]">Monitorar movimentações e avisar via WhatsApp/Email</p>
                                                </div>
                                            </div>
                                            <Switch checked={form.auto_capture_enabled || false} onCheckedChange={(v) => setField("auto_capture_enabled", v)} />
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Estratégia / Notas Internas</label>
                                            <Textarea value={form.notes ?? ""} onChange={(e) => setField("notes", e.target.value)} rows={4} placeholder="Anotações confidenciais sobre a tese..." className="bg-background/50 border-border/40 resize-none shadow-inner" />
                                        </div>

                                        <DeadlineCalculator />

                                        {/* Lexa Share Section */}
                                        {isEditing && selectedProcesso?.public_token && (
                                            <div className="mt-8 pt-6 border-t border-border/50">
                                                <div className="flex items-center gap-2 mb-4">
                                                    <Share2 className="h-4 w-4 text-primary" />
                                                    <h4 className="text-sm font-semibold text-foreground">Lexa Share — Acompanhamento do Cliente</h4>
                                                </div>
                                                <div className="bg-primary/5 rounded-2xl p-6 border border-primary/10 space-y-4">
                                                    <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                                                        Gere um link seguro para seu cliente acompanhar o status deste processo sem precisar de login.
                                                    </p>
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex-1 bg-background border border-border/50 rounded-xl h-11 px-4 flex items-center text-[10px] text-muted-foreground truncate font-mono">
                                                            {`${window.location.origin}/public/processo/${selectedProcesso.public_token}`}
                                                        </div>
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="icon"
                                                            className="h-11 w-11 rounded-xl shrink-0"
                                                            onClick={() => {
                                                                navigator.clipboard.writeText(`${window.location.origin}/public/processo/${selectedProcesso.public_token}`);
                                                                setCopiedShareLink(true);
                                                                setTimeout(() => setCopiedShareLink(false), 2000);
                                                            }}
                                                        >
                                                            {copiedShareLink ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                                                        </Button>
                                                        <Button type="button" variant="outline" size="icon" className="h-11 w-11 rounded-xl shrink-0" asChild>
                                                            <a href={`/public/processo/${selectedProcesso.public_token}`} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /></a>
                                                        </Button>
                                                    </div>

                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-primary/10">
                                                        <div className="space-y-1.5">
                                                            <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                                                                <ShieldCheck className="h-3 w-3" /> Senha do Link (Opcional)
                                                            </label>
                                                            <Input
                                                                type="password"
                                                                placeholder="Definir PIN de acesso"
                                                                value={form.public_link_password ?? ""}
                                                                onChange={(e) => setField("public_link_password", e.target.value)}
                                                                className="h-9 text-xs bg-background"
                                                            />
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                                                                <Timer className="h-3 w-3" /> Expira em
                                                            </label>
                                                            <Input
                                                                type="date"
                                                                value={form.public_link_expires_at ? form.public_link_expires_at.split('T')[0] : ""}
                                                                onChange={(e) => setField("public_link_expires_at", e.target.value)}
                                                                className="h-9 text-xs bg-background"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )}

                            {step === 4 && (
                                <motion.div
                                    key="step4"
                                    initial={{ opacity: 0, scale: 0.98 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.98 }}
                                    className="space-y-6"
                                >
                                    <div className="rounded-2xl border border-dashed border-primary/30 bg-muted/5 p-8 flex flex-col items-center justify-center text-center space-y-4">
                                        <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                                            <Upload className="h-7 w-7" />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold tracking-tight">Cofre de Documentos</h4>
                                            <p className="text-xs text-muted-foreground max-w-xs mx-auto mt-1 leading-relaxed">
                                                {isEditing ? "Suba petições, liminares e provas. Tudo criptografado." : "Finalize o cadastro para habilitar o upload de anexos no cofre digital."}
                                            </p>
                                        </div>
                                        {isEditing && (
                                            <Button type="button" variant="outline" className="gap-2 border-primary/20 hover:bg-primary/5 rounded-xl px-6" onClick={() => {
                                                const input = document.createElement('input');
                                                input.type = 'file';
                                                input.onchange = (e) => {
                                                    const file = (e.target as HTMLInputElement).files?.[0];
                                                    if (file) onUploadDoc(file);
                                                };
                                                input.click();
                                            }}>
                                                Enviar Documento
                                            </Button>
                                        )}
                                    </div>

                                    {isEditing && processDocs.length > 0 && (
                                        <div className="space-y-3">
                                            <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">Arquivos no Case</h4>
                                            <div className="grid gap-2">
                                                {processDocs.map((doc) => (
                                                    <div key={doc.id} className="flex items-center justify-between p-3.5 rounded-2xl border border-border/60 bg-card hover:border-primary/40 hover:bg-primary/[0.02] transition-all group">
                                                        <div className="flex items-center gap-3">
                                                            <div className="p-2.5 bg-muted text-muted-foreground rounded-xl group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                                                <File className="h-4 w-4" />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="text-sm font-bold truncate max-w-[180px]">{doc.file_name}</p>
                                                                <p className="text-[10px] text-muted-foreground">{format(new Date(doc.created_at), "dd MMM yyyy", { locale: ptBR })}</p>
                                                            </div>
                                                        </div>
                                                        <Button type="button" variant="ghost" size="icon" className="h-9 w-9 hover:text-primary hover:bg-primary/10 rounded-xl" onClick={() => onDownloadDoc(doc)}>
                                                            <Download className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </form>
                </div>

                {/* ── Footer Navigation ── */}
                <div className="flex items-center justify-between px-6 py-5 bg-muted/20 border-t border-border/50">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={step === 1 ? () => onOpenChange(false) : prevStep}
                        className="gap-2 text-xs font-semibold uppercase tracking-wider h-11 px-6 rounded-xl transition-all"
                    >
                        {step === 1 ? <X className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                        {step === 1 ? "Fechar" : "Voltar"}
                    </Button>

                    <div className="flex gap-3">
                        {step < totalSteps ? (
                            <Button
                                type="button"
                                onClick={nextStep}
                                className="gap-2 h-11 px-8 rounded-xl shadow-lg shadow-primary/20 font-bold group"
                            >
                                Continuar
                                <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                            </Button>
                        ) : (
                            <Button
                                type="submit"
                                form="processo-form"
                                disabled={isSaving}
                                className="gap-2 h-11 px-8 rounded-xl bg-accent text-accent-foreground hover:bg-accent/90 shadow-lg shadow-accent/20 font-bold"
                            >
                                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                {isEditing ? "Salvar Alterações" : "Concluir Cadastro"}
                            </Button>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
