import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { X, Scale, Sparkles, Bot, File, Upload, Download, Receipt, Loader2, Search } from "lucide-react";
import { motion } from "framer-motion";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { STATUS_OPTIONS } from "../constants";
import type { Processo, Documento } from "../types";

interface ProcessoViewSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    selectedProcesso: Processo | null;
    captures: any[];
    processDocs: Documento[];
    aiSummary: string | null;
    onGenerateAiSummary: (content: string) => void;
    isAiLoading: boolean;
    onUploadDoc: (processId: string) => void;
    onDownloadDoc: (doc: Documento) => void;
    onBilling: (p: Processo) => void;
    onEdit: (p: Processo) => void;
    isBillingLoading: boolean;
}

export function ProcessoViewSheet({
    open, onOpenChange, selectedProcesso, captures, processDocs,
    aiSummary, onGenerateAiSummary, isAiLoading,
    onUploadDoc, onDownloadDoc, onBilling, onEdit, isBillingLoading
}: ProcessoViewSheetProps) {

    if (!selectedProcesso) return null;

    const statusObj = STATUS_OPTIONS.find(s => s.value === selectedProcesso.status) || STATUS_OPTIONS[0];

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="w-[95vw] sm:w-[600px] sm:max-w-[700px] overflow-y-auto p-0 border-l border-border/50 bg-background shadow-2xl">
                <div className="flex flex-col h-full bg-background relative">
                    <SheetHeader className="p-6 pb-6 border-b border-border/50 bg-muted/10 sticky top-0 z-10 backdrop-blur-md">
                        <div className="flex items-start justify-between gap-4">
                            <div className="space-y-1 text-left flex-1 min-w-0">
                                <SheetTitle className="text-xl font-bold leading-tight text-foreground truncate pr-4">
                                    {selectedProcesso.title}
                                </SheetTitle>
                                <div className="flex items-center justify-between gap-2 mt-2">
                                    <div className="flex items-center gap-2 text-primary font-bold text-sm">
                                        <Scale className="h-4 w-4" />
                                        <span>{selectedProcesso.number || "Processo Administrativo"}</span>
                                    </div>
                                    {captures.length > 0 && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 gap-2 text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 rounded-full border border-primary/20 transition-all shadow-sm"
                                            onClick={() => {
                                                const content = captures.map((c: any) => `${format(new Date(c.capture_date), "dd/MM/yyyy")}: ${c.content}`).join("\n");
                                                onGenerateAiSummary(content);
                                            }}
                                            disabled={isAiLoading}
                                        >
                                            {isAiLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                                            Aruna IA
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 pt-6 mt-2 border-t border-border/40">
                            <Badge variant="outline" className={`px-3 py-1 font-bold uppercase tracking-widest text-[10px] border ${statusObj.color}`}>
                                {statusObj.label}
                            </Badge>
                            {selectedProcesso.comarca && (
                                <Badge variant="outline" className="text-[10px] bg-background border-border/60">
                                    {selectedProcesso.comarca} {selectedProcesso.uf && `- ${selectedProcesso.uf}`}
                                </Badge>
                            )}
                            {selectedProcesso.area_direito && (
                                <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/20 font-bold">
                                    {selectedProcesso.area_direito}
                                </Badge>
                            )}
                            {selectedProcesso.fase_processual && (
                                <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-600 border-blue-500/20 font-bold">
                                    {selectedProcesso.fase_processual}
                                </Badge>
                            )}
                        </div>
                    </SheetHeader>

                    <div className="flex-1 p-6 pb-24">
                        <Tabs defaultValue="detalhes" className="w-full">
                            <TabsList className="w-full justify-start h-11 bg-transparent border-b border-border/50 rounded-none p-0 overflow-x-auto hide-scrollbar space-x-6">
                                <TabsTrigger value="detalhes" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-foreground rounded-none px-0 pb-3 text-sm font-bold text-muted-foreground transition-all">Geral</TabsTrigger>
                                <TabsTrigger value="timeline" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-foreground rounded-none px-0 pb-3 text-sm font-bold text-muted-foreground transition-all flex gap-1.5"><Bot className="w-4 h-4" /> Capas & Mov</TabsTrigger>
                                <TabsTrigger value="docs" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-foreground rounded-none px-0 pb-3 text-sm font-bold text-muted-foreground transition-all flex gap-1.5"><File className="w-4 h-4" /> Anexos ({processDocs.length})</TabsTrigger>
                            </TabsList>

                            <div className="mt-8">
                                <TabsContent value="detalhes" className="space-y-8 mt-0">
                                    <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                                        <div className="space-y-1">
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Cliente / Autor</span>
                                            <p className="text-sm font-bold text-foreground bg-muted/20 px-3 py-2 rounded-lg border border-border/40 line-clamp-1">{selectedProcesso.cliente_nome || "—"}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Parte Contrária</span>
                                            <p className="text-sm font-bold text-foreground bg-muted/20 px-3 py-2 rounded-lg border border-border/40 line-clamp-1">{selectedProcesso.parte_contraria || "—"}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Órgão Julgador</span>
                                            <p className="text-sm font-semibold text-foreground/80">{selectedProcesso.court || "—"}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Instância</span>
                                            <p className="text-sm font-semibold text-foreground/80">{selectedProcesso.instancia || "1ª Instância"}</p>
                                        </div>
                                    </div>

                                    <Separator className="opacity-50" />

                                    <div className="space-y-3">
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Assunto Estratégico</span>
                                        <p className="text-sm leading-relaxed text-foreground/70 italic">"{selectedProcesso.subject || "Nenhum assunto definido para este processo."}"</p>
                                    </div>

                                    {selectedProcesso.notes && (
                                        <div className="space-y-3 p-5 bg-amber-500/[0.03] rounded-2xl border border-amber-500/10 shadow-sm">
                                            <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest flex items-center gap-2">
                                                <div className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                                                Notas Jurídicas Internas
                                            </span>
                                            <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">{selectedProcesso.notes}</p>
                                        </div>
                                    )}
                                </TabsContent>

                                <TabsContent value="timeline" className="mt-0">
                                    <div className="space-y-6">
                                        {aiSummary && (
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.95 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                className="p-5 bg-primary/5 rounded-2xl border border-primary/20 space-y-4 shadow-sm"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <h4 className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                                                        <Sparkles className="h-4 w-4" /> Aruna IA Brain
                                                    </h4>
                                                </div>
                                                <div className="text-sm text-foreground/90 font-medium leading-relaxed prose prose-sm max-w-none prose-headings:text-primary">
                                                    {aiSummary}
                                                </div>
                                            </motion.div>
                                        )}

                                        {captures.length === 0 ? (
                                            <div className="text-center py-16 bg-muted/10 rounded-2xl border border-dashed border-border/40">
                                                <Search className="h-10 w-10 text-muted-foreground/20 mx-auto mb-4" />
                                                <p className="text-sm text-muted-foreground font-bold uppercase tracking-widest">Sem Movimentações</p>
                                                <p className="text-xs text-muted-foreground/60 mt-2">Habilite o Robô na edição do processo.</p>
                                            </div>
                                        ) : (
                                            <div className="relative space-y-8 pl-4">
                                                <div className="absolute left-0 inset-y-0 w-0.5 bg-gradient-to-b from-primary/30 to-muted/20 ml-[-1px]" />
                                                {captures.map((cap: any) => (
                                                    <div key={cap.id} className="relative pl-8">
                                                        <div className="absolute left-[-5px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary shadow-sm" />
                                                        <div className="bg-card border border-border/50 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
                                                            <div className="flex items-center justify-between mb-2">
                                                                <span className="text-[10px] font-bold text-primary uppercase tracking-widest">{format(new Date(cap.capture_date), "dd MMM yyyy", { locale: ptBR })}</span>
                                                                <Badge variant="secondary" className="text-[9px] px-2 py-0 bg-muted/50 rounded-full font-bold">{cap.source}</Badge>
                                                            </div>
                                                            <p className="text-sm font-medium text-foreground/90 leading-relaxed font-sans">{cap.content}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </TabsContent>

                                <TabsContent value="docs" className="mt-0">
                                    <div className="flex items-center justify-between mb-8">
                                        <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Documentação Oficial</h3>
                                        <Button variant="outline" size="sm" className="h-9 gap-2 shadow-sm border-primary/20 hover:bg-primary/5 font-bold text-xs" onClick={() => onUploadDoc(selectedProcesso.id)}>
                                            <Upload className="h-4 w-4" /> Upload PDF
                                        </Button>
                                    </div>
                                    {processDocs.length === 0 ? (
                                        <div className="text-center py-16 bg-muted/10 rounded-2xl border border-dashed border-border/40">
                                            <File className="h-10 w-10 text-muted-foreground/20 mx-auto mb-4" />
                                            <p className="text-sm text-muted-foreground font-bold uppercase tracking-widest">Pasta Vazia</p>
                                        </div>
                                    ) : (
                                        <div className="grid gap-3">
                                            {processDocs.map((doc) => (
                                                <div key={doc.id} className="flex items-center justify-between p-4 rounded-2xl border border-border/50 bg-card hover:border-primary/30 transition-all group">
                                                    <div className="flex items-center gap-4">
                                                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary/20 transition-colors">
                                                            <File className="h-5 w-5" />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold truncate max-w-[200px]">{doc.file_name}</p>
                                                            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">{format(new Date(doc.created_at), "dd MMM yyyy")}</p>
                                                        </div>
                                                    </div>
                                                    <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover:text-primary rounded-xl" onClick={() => onDownloadDoc(doc)}>
                                                        <Download className="h-5 w-5" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </TabsContent>
                            </div>
                        </Tabs>
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 border-t border-border/50 bg-background/80 backdrop-blur-xl p-6 flex justify-end gap-3 z-20">
                        {selectedProcesso?.estimated_value != null && (
                            <Button
                                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold mr-auto shadow-lg shadow-emerald-500/20 px-6 rounded-xl transition-all hover:scale-105 active:scale-95"
                                disabled={isBillingLoading}
                                onClick={() => onBilling(selectedProcesso)}
                            >
                                <Receipt className="h-4 w-4" /> Faturar Honorários
                            </Button>
                        )}
                        <Button variant="outline" className="rounded-xl px-6 font-bold" onClick={() => { onOpenChange(false); onEdit(selectedProcesso); }}>Editar</Button>
                        <Button className="rounded-xl px-6 font-bold" onClick={() => onOpenChange(false)}>Fechar</Button>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
