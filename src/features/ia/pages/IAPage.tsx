import { useState, useRef, useEffect, useMemo } from "react";
import { trpc } from "@/shared/lib/trpc";
import { Button } from "@/shared/ui/button";
import { Textarea } from "@/shared/ui/textarea";
import { Input } from "@/shared/ui/input";
import {
  Send, Sparkles, User, Trash2, FileText, Loader2,
  Search, FileSearch, Mic, X, ChevronRight,
  BookOpen, MoreHorizontal, MessageSquare, Briefcase, Scale
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/shared/lib/utils";
import { useToast } from "@/shared/hooks/use-toast";
import arunaAvatar from "@/assets/aruna-avatar.png";
import ReactMarkdown from "react-markdown";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/shared/ui/tooltip";
import { useAuth, useSession } from "@clerk/nextjs";
import { useArunaChat } from "../hooks/useArunaChat";
import type { ArunaContext, ArunaMessage } from "../types";

/* ─── Constants ──────────────────────────────────── */
const ARUNA_GREETING = `Olá! Sou a **ARUNA**, sua assistente jurídica avançada da Lexa Nova. ⚖️✨

Estou conectada diretamente aos dados do seu escritório. Posso **Resumir Processos**, analisar métricas do **Dashboard**, redigir **Petições**, consultar **Jurisprudências**, e até **Transcrever Audiências** em tempo real.

Como posso acelerar seu trabalho hoje?`;

const quickActions = [
  { label: "Prazos Perigosos", prompt: "Quais prazos processuais vencem esta semana?", icon: Search },
  { label: "Resumo de Ativos", prompt: "Faça um resumo dos 5 principais processos ativos", icon: Briefcase },
  { label: "Procuração Ad Judicia", prompt: "Gere um modelo padrão de procuração Ad Judicia", icon: FileText },
  { label: "Pesquisar STJ", prompt: "Pesquise jurisprudência recente no STJ sobre Dano Moral", icon: Scale },
];

const DOC_TYPES = [
  { value: "peticao_inicial", label: "Petição Inicial" },
  { value: "procuracao", label: "Procuração" },
  { value: "contestacao", label: "Contestação" },
  { value: "recurso", label: "Recurso" },
  { value: "contrato", label: "Contrato" },
  { value: "notificacao", label: "Notificação Extrajudicial" },
  { value: "parecer", label: "Parecer Jurídico" },
];

const AREAS_DIREITO = [
  { value: "all", label: "Todas as áreas" },
  { value: "civil", label: "Civil" },
  { value: "trabalhista", label: "Trabalhista" },
  { value: "penal", label: "Penal" },
  { value: "tributario", label: "Tributário" },
  { value: "empresarial", label: "Empresarial" },
  { value: "constitucional", label: "Constitucional" },
  { value: "consumidor", label: "Consumidor" },
  { value: "previdenciario", label: "Previdenciário" },
];

const ANALYSIS_TYPES = [
  { value: "completa", label: "Análise Completa" },
  { value: "resumo", label: "Apenas Resumo" },
  { value: "riscos", label: "Identificar Riscos" },
  { value: "argumentos", label: "Extrair Argumentos" },
  { value: "clausulas", label: "Revisar Cláusulas" },
];

const AUDIO_TYPES = [
  { value: "audiencia", label: "Audiência Judicial" },
  { value: "reuniao", label: "Reunião de Equipe" },
  { value: "depoimento", label: "Depoimento" },
  { value: "consulta", label: "Consulta com Cliente" },
];

const BASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const DOC_GEN_URL = `${BASE_URL}/functions/v1/aruna-generate-doc`;
const JURIS_URL = `${BASE_URL}/functions/v1/aruna-jurisprudencia`;
const ANALYZE_URL = `${BASE_URL}/functions/v1/aruna-analyze-doc`;
const TRANSCRIBE_URL = `${BASE_URL}/functions/v1/aruna-transcribe`;

type Tool = null | "doc" | "juris" | "analyze" | "transcribe";

/* ═══════════════════════════════════════════════════ */

export default function IAPage() {
  const { userId } = useAuth();
  const { session } = useSession();
  const { toast } = useToast();
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [tool, setTool] = useState<Tool>(null);

  // Tool-specific state
  const [docType, setDocType] = useState("");
  const [docInstr, setDocInstr] = useState("");
  const [jurisQ, setJurisQ] = useState("");
  const [jurisArea, setJurisArea] = useState("all");
  const [analyzeDocId, setAnalyzeDocId] = useState("");
  const [analyzeType, setAnalyzeType] = useState("completa");
  const [analyzeInstr, setAnalyzeInstr] = useState("");
  const [audioType, setAudioType] = useState("audiencia");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioInstr, setAudioInstr] = useState("");

  /* ─── tRPC Queries ────────────────────────────────── */
  const contextQuery = trpc.ia.getContext.useQuery();

  const ctx = useMemo((): ArunaContext => {
    const data = contextQuery.data;
    return {
      processos: (data?.processos || []).map((p: { clients?: { name: string } }) => ({ ...p, client_name: p.clients?.name, clients: undefined })),
      clientes: data?.clientes || [],
      eventos: data?.eventos || [],
    };
  }, [contextQuery.data]);

  const docsData = contextQuery.data?.docs || [];

  const { messages, sendMessage, clearHistory, streaming, addUser, addAssistant, setMessages } = useArunaChat({
    initialContext: ctx
  });

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, streaming]);

  /* ─── SSE Stream Header Helper ────────────────────── */
  const AUTH_HEADER = async () => {
    const token = await session?.getToken({ template: "supabase" });
    return { Authorization: `Bearer ${token} ` };
  };

  /* ─── Chat ──────────────────────────────────────── */
  const handleSend = async () => {
    const t = input.trim();
    if (!t || streaming) return;
    setInput("");
    await sendMessage(t, ctx);
  };

  const handleKey = (e: React.KeyboardEvent) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } };

  const handleClear = () => {
    if (!userId || streaming) return;
    clearHistory();
  };

  /* ─── Generate Doc ──────────────────────────────── */
  const handleGenDoc = async () => {
    if (!docType || streaming) return;
    setTool(null);
    const typeLabel = DOC_TYPES.find(d => d.value === docType)?.label || docType;
    const prompt = `📄 Gerar documento: **${typeLabel}**\nInstruções: ${docInstr || "Nenhuma"}`;

    await sendMessage(prompt, {
      ...ctx,
      tool: "generate_doc",
      doc_type: docType,
      instructions: docInstr
    });

    setDocType("");
    setDocInstr("");
  };

  /* ─── Jurisprudence ─────────────────────────────── */
  const handleJuris = async () => {
    if (!jurisQ.trim() || streaming) return;
    setTool(null);
    const areaLabel = AREAS_DIREITO.find(a => a.value === jurisArea)?.label;
    const prompt = `🔍 Pesquisar Jurisprudência: **${jurisQ}** ${jurisArea !== "all" ? `(${areaLabel})` : ""}`;

    await sendMessage(prompt, {
      ...ctx,
      tool: "jurisprudencia",
      query: jurisQ,
      area: jurisArea !== "all" ? jurisArea : ""
    });

    setJurisQ("");
    setJurisArea("all");
  };

  /* ─── Analyze Doc ───────────────────────────────── */
  const handleAnalyze = async () => {
    if (!analyzeDocId || streaming) return;
    setTool(null);
    const docName = docsData?.find((d: { id: string; file_name: string }) => d.id === analyzeDocId)?.file_name || "Documento";
    const typeLabel = ANALYSIS_TYPES.find(a => a.value === analyzeType)?.label;
    const prompt = `📄 Analisar PDF: **${docName}** (${typeLabel})`;

    await sendMessage(prompt, {
      ...ctx,
      tool: "analyze_doc",
      document_id: analyzeDocId,
      analysis_type: analyzeType,
      custom_instructions: analyzeInstr
    });

    setAnalyzeDocId("");
    setAnalyzeInstr("");
  };

  /* ─── Transcribe Audio ──────────────────────────── */
  const handleTranscribe = async () => {
    const orgId = (session as any)?.publicMetadata?.organizationId as string | undefined;
    if (!audioFile || !orgId || !userId || streaming) return;
    setTool(null);
    const typeLabel = AUDIO_TYPES.find(t => t.value === audioType)?.label || audioType;
    const content = `🎙️ Transcrever gravação: **${audioFile.name}** (${typeLabel})`;

    // Use the hook's helper to add a user message and trigger save
    addUser(content);

    const aId = addAssistant();

    try {
      const fd = new FormData();
      fd.append("audio", audioFile);
      fd.append("audio_type", audioType);
      fd.append("instructions", audioInstr);
      fd.append("organization_id", orgId);
      fd.append("user_id", userId);

      const authHeader = await AUTH_HEADER();
      const resp = await fetch(TRANSCRIBE_URL, { method: "POST", headers: { ...authHeader }, body: fd });
      if (!resp.ok) throw new Error((await resp.json().catch(() => ({}))).error || `Erro ${resp.status} `);
      if (!resp.body) throw new Error("Sem resposta");

      let fullText = "";
      const reader = resp.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let ni: number;
        while ((ni = buf.indexOf("\n")) !== -1) {
          let ln = buf.slice(0, ni); buf = buf.slice(ni + 1);
          if (ln.endsWith("\r")) ln = ln.slice(0, -1);
          if (ln.startsWith(":") || !ln.trim() || !ln.startsWith("data: ")) continue;
          const js = ln.slice(6).trim();
          if (js === "[DONE]") break;
          try {
            const c = JSON.parse(js).choices?.[0]?.delta?.content;
            if (c) {
              fullText += c;
              setMessages((p: ArunaMessage[]) => p.map((m: ArunaMessage) => m.id === aId ? { ...m, content: fullText } : m));
            }
          } catch { buf = ln + "\n" + buf; break; }
        }
      }

      trpc.ia.saveMessage.useMutation().mutate({ role: "assistant", content: fullText });
      setAudioFile(null);
      setAudioInstr("");
      if (fileRef.current) fileRef.current.value = "";
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Erro desconhecido";
      toast({ title: "Erro na transcrição de voz", description: message, variant: "destructive" });
      setMessages((p: ArunaMessage[]) => p.filter((m: ArunaMessage) => m.id !== aId));
    }
  };

  const isWorking = streaming || busy;

  /* ═══════════════════════════════════════════════════ */
  return (
    <div className="flex h-[calc(100vh-2rem)] flex-col -m-2 sm:-m-6 bg-card sm:rounded-2xl border border-border shadow-sm overflow-hidden relative">
      <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none mix-blend-overlay" style={{ backgroundImage: "url('data:image/svg+xml,%3Csvg width=\\'60\\' height=\\'60\\' viewBox=\\'0 0 60 60\\' xmlns=\\'http://www.w3.org/2000/svg\\'%3E%3Cg fill=\\'none\\' fill-rule=\\'evenodd\\'%3E%3Cg fill=\\'%239C92AC\\' fill-opacity=\\'1\\'%3E%3Cpath d=\\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')" }} />

      {/* ─── Premium Header ───────────────────────────── */}
      <div className="flex items-center gap-4 px-6 py-4 bg-muted/30 border-b border-border/50 relative z-10 backdrop-blur-sm">
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-2xl shadow-sm ring-1 ring-border bg-gradient-to-br from-indigo-500/20 to-purple-500/20 p-0.5">
          <Image src={arunaAvatar} alt="ARUNA" width={48} height={48} className="h-full w-full object-cover rounded-[14px]" />
          <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background bg-emerald-500 shadow-sm" />
        </div>
        <div className="min-w-0">
          <h1 className="font-display text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            ARUNA <Sparkles className="h-4 w-4 text-accent fill-accent animate-pulse" />
          </h1>
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase mt-0.5">Assistente Inteligente Lexa Nova</p>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* Tool buttons */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant={tool === "juris" ? "default" : "ghost"} size="icon" className={cn("h-10 w-10 transition-all rounded-xl", tool === "juris" && "bg-primary shadow-sm hover:scale-105")} onClick={() => setTool(tool === "juris" ? null : "juris")} disabled={isWorking}>
                  <Search className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Jurisprudência</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant={tool === "analyze" ? "default" : "ghost"} size="icon" className={cn("h-10 w-10 transition-all rounded-xl", tool === "analyze" && "bg-primary shadow-sm hover:scale-105")} onClick={() => setTool(tool === "analyze" ? null : "analyze")} disabled={isWorking}>
                  <FileSearch className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Analisar Documento</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant={tool === "doc" ? "default" : "ghost"} size="icon" className={cn("h-10 w-10 transition-all rounded-xl", tool === "doc" && "bg-primary shadow-sm hover:scale-105")} onClick={() => setTool(tool === "doc" ? null : "doc")} disabled={isWorking}>
                  <FileText className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Gerar Peça/Documento</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant={tool === "transcribe" ? "default" : "ghost"} size="icon" className={cn("h-10 w-10 transition-all rounded-xl", tool === "transcribe" && "bg-primary shadow-sm hover:scale-105")} onClick={() => setTool(tool === "transcribe" ? null : "transcribe")} disabled={isWorking}>
                  <Mic className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Transcrever Áudio de Audiência</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <div className="w-px h-6 bg-border mx-2" />

          {messages.length > 0 && (
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors" onClick={handleClear} disabled={isWorking} title="Apagar Histórico de Conversa">
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* ─── Tool Panel Overlay ─────────────── */}
      <AnimatePresence>
        {tool && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="border-b border-border/50 bg-primary/5 px-6 py-5 relative z-10 shadow-inner">
            <div className="mx-auto max-w-3xl">
              {/* Jurisprudence */}
              {tool === "juris" && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-primary flex items-center gap-2"><Scale className="h-4 w-4" /> Pesquisa Avançada de Jurisprudência STF/STJ</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full bg-background" onClick={() => setTool(null)}><X className="h-4 w-4" /></Button>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Input value={jurisQ} onChange={(e) => setJurisQ(e.target.value)} placeholder="Ex: Dano moral atraso de voo companhia internacional..." className="h-11 flex-1 text-sm bg-background border-border" onKeyDown={(e) => { if (e.key === "Enter") handleJuris(); }} />
                    <Select value={jurisArea} onValueChange={setJurisArea}>
                      <SelectTrigger className="h-11 sm:w-56 text-sm bg-background"><SelectValue /></SelectTrigger>
                      <SelectContent>{AREAS_DIREITO.map((a: { value: string, label: string }) => <SelectItem key={a.value} value={a.value} className="text-sm py-2">{a.label}</SelectItem>)}</SelectContent>
                    </Select>
                    <Button className="h-11 px-8 shadow-sm" onClick={handleJuris} disabled={!jurisQ.trim() || isWorking}>
                      <Search className="mr-2 h-4 w-4" /> Buscar Precedentes
                    </Button>
                  </div>
                </div>
              )}

              {/* Analyze */}
              {tool === "analyze" && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-primary flex items-center gap-2"><FileSearch className="h-4 w-4" /> Análise Preditiva de Documentos</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full bg-background" onClick={() => setTool(null)}><X className="h-4 w-4" /></Button>
                  </div>
                  {(!docsData || docsData.length === 0) ? (
                    <p className="text-sm text-destructive bg-destructive/10 p-4 rounded-xl font-medium text-center">Nenhum documento encontrado. Você precisa primeiro fazer o upload do PDF no módulo "Documentos (GED)".</p>
                  ) : (
                    <>
                      <div className="flex flex-col md:flex-row gap-3">
                        <Select value={analyzeDocId} onValueChange={setAnalyzeDocId}>
                          <SelectTrigger className="h-11 flex-1 text-sm bg-background shadow-sm border-border"><SelectValue placeholder="Selecione o documento armazenado no GED que deseja analisar" /></SelectTrigger>
                          <SelectContent>{docsData.map((d: { id: string, file_name: string }) => <SelectItem key={d.id} value={d.id} className="text-sm py-2">{d.file_name}</SelectItem>)}</SelectContent>
                        </Select>
                        <Select value={analyzeType} onValueChange={setAnalyzeType}>
                          <SelectTrigger className="h-11 md:w-56 text-sm bg-background shadow-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>{ANALYSIS_TYPES.map((a: { value: string, label: string }) => <SelectItem key={a.value} value={a.value} className="text-sm py-2">{a.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      {analyzeDocId && (
                        <div className="flex flex-col sm:flex-row gap-3">
                          <Input value={analyzeInstr} onChange={(e) => setAnalyzeInstr(e.target.value)} placeholder="Instruções adicionais (ex: 'Focar na cláusula de multa rescisória')" className="h-11 flex-1 text-sm bg-background shadow-sm border-border" />
                          <Button className="h-11 px-8 shadow-sm" onClick={handleAnalyze} disabled={isWorking}>
                            {streaming ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />} Analisar Arquivo IA
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Generate Doc */}
              {tool === "doc" && (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-primary flex items-center gap-2"><FileText className="h-4 w-4" /> Elaboração de Peças Judiciais</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full bg-background" onClick={() => setTool(null)}><X className="h-4 w-4" /></Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {DOC_TYPES.map((dt: { value: string, label: string }) => (
                      <button key={dt.value} onClick={() => setDocType(docType === dt.value ? "" : dt.value)}
                        className={cn("rounded-lg border px-4 py-2 text-sm transition-all font-medium", docType === dt.value ? "border-primary bg-primary text-primary-foreground shadow-md hover:scale-105" : "bg-card border-border/80 text-foreground shadow-sm hover:border-primary/50 hover:bg-accent/5")}>
                        {dt.label}
                      </button>
                    ))}
                  </div>
                  {docType && (
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Input value={docInstr} onChange={(e) => setDocInstr(e.target.value)} placeholder="Instruções para a minuta (Ex: 'Para ação de usucapião ordinário do cliente José Silva')" className="h-11 flex-1 text-sm bg-background shadow-sm" />
                      <Button className="h-11 px-8 shadow-sm" onClick={handleGenDoc} disabled={busy}>
                        {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />} Gerar Esboço Jurídico
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Transcribe */}
              {tool === "transcribe" && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-primary flex items-center gap-2"><Mic className="h-4 w-4" /> Transcrição de Audiências (Whisper AI)</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full bg-background" onClick={() => setTool(null)}><X className="h-4 w-4" /></Button>
                  </div>
                  <div className="flex flex-col md:flex-row gap-3">
                    <div className="flex-1 bg-background rounded-md border border-border shadow-sm px-4 py-2 flex items-center transition-colors focus-within:ring-1 focus-within:ring-primary">
                      <input
                        ref={fileRef}
                        type="file"
                        accept="audio/*,video/mp4,video/webm"
                        onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
                        className="w-full text-sm file:mr-4 file:rounded-full file:border-0 file:bg-primary/10 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary hover:file:bg-primary/20 cursor-pointer"
                      />
                    </div>
                    <Select value={audioType} onValueChange={setAudioType}>
                      <SelectTrigger className="h-12 md:w-56 text-sm bg-background shadow-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>{AUDIO_TYPES.map((a: { value: string, label: string }) => <SelectItem key={a.value} value={a.value} className="text-sm py-2">{a.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  {audioFile && (
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Input value={audioInstr} onChange={(e) => setAudioInstr(e.target.value)} placeholder="Identificar vozes? Remover ruídos? Separar advogados do juiz? (Opcional)" className="h-11 flex-1 text-sm bg-background shadow-sm" />
                      <Button className="h-11 px-8 shadow-sm" onClick={handleTranscribe} disabled={isWorking}>
                        {streaming ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mic className="mr-2 h-4 w-4" />} Iniciar Transcrição IA
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Messages Interface ─────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 md:px-12 py-8 relative z-10 scroll-smooth">
        {messages.length === 0 && !busy ? (
          <div className="mx-auto max-w-3xl space-y-8 pt-10">
            {/* Greeting */}
            <div className="flex items-start gap-5">
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-2xl shadow-sm bg-gradient-to-br from-indigo-500/20 to-purple-500/20 p-0.5">
                <Image src={arunaAvatar} alt="ARUNA" width={48} height={48} className="h-full w-full object-cover rounded-[14px]" />
              </div>
              <div className="rounded-3xl rounded-tl-sm bg-muted/40 border border-border/60 px-6 py-5 shadow-sm">
                <div className="prose prose-sm md:prose-base max-w-none text-foreground prose-li:my-1 prose-ul:my-2 prose-strong:text-indigo-600 dark:prose-strong:text-indigo-400">
                  <ReactMarkdown>{ARUNA_GREETING}</ReactMarkdown>
                </div>
              </div>
            </div>
            {/* Quick actions grid */}
            <div className="ml-[68px] grid grid-cols-1 md:grid-cols-2 gap-3">
              {quickActions.map((a: { label: string, prompt: string, icon: any }) => {
                const Icon = a.icon;
                return (
                  <button key={a.label} onClick={() => setInput(a.prompt)}
                    className="group flex flex-col items-start gap-2 rounded-2xl border border-border/80 bg-card p-4 text-left shadow-sm transition-all hover:-translate-y-1 hover:border-primary/50 hover:shadow-md">
                    <div className="flex items-center gap-2 font-bold text-foreground">
                      <div className="p-1.5 rounded-lg bg-primary/10 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        <Icon className="h-4 w-4" />
                      </div>
                      {a.label}
                    </div>
                    <span className="text-sm text-muted-foreground line-clamp-2">{a.prompt}</span>
                  </button>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-4xl space-y-6">
            {messages.map((m: ArunaMessage) => (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={m.id} className={cn("flex gap-4", m.role === "user" && "flex-row-reverse")}>
                <div className={cn("h-10 w-10 shrink-0 overflow-hidden rounded-2xl flex items-center justify-center shadow-sm", m.role === "user" ? "bg-primary text-primary-foreground" : "bg-gradient-to-br from-indigo-500/20 to-purple-500/20 p-0.5 ring-1 ring-border/50")}>
                  {m.role === "user" ? <User className="h-5 w-5" /> : <Image src={arunaAvatar} alt="ARUNA" width={40} height={40} className="h-full w-full object-cover rounded-[14px]" />}
                </div>
                <div className={cn("max-w-[85%] rounded-3xl px-6 py-4 shadow-sm relative", m.role === "user" ? "rounded-tr-sm bg-primary text-primary-foreground" : "rounded-tl-sm bg-card border border-border/60")}>
                  {m.role === "assistant" ? (
                    <div className="prose prose-sm md:prose-base max-w-none text-foreground prose-headings:text-foreground prose-strong:text-foreground prose-a:text-primary hover:prose-a:text-primary/80 prose-li:my-1 prose-ul:my-2 prose-p:my-2">
                      {/* Adicionar marca d'agua aruna light on bg */}
                      <Sparkles className="absolute top-4 right-4 h-24 w-24 text-muted/10 pointer-events-none -rotate-12" />
                      <ReactMarkdown>{m.content || "..."}</ReactMarkdown>
                    </div>
                  ) : (
                    <div className="prose prose-sm md:prose-base max-w-none text-primary-foreground prose-strong:text-primary-foreground prose-p:my-0.5">
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </div>
                  )}
                  <p className={cn("mt-2 text-xs font-medium text-right flex items-center gap-1 justify-end", m.role === "user" ? "text-primary-foreground/70" : "text-muted-foreground")}>
                    {m.role === "assistant" && <Sparkles className="h-3 w-3" />} {m.created_at ? format(parseISO(m.created_at), "HH:mm", { locale: ptBR }) : ""}
                  </p>
                </div>
              </motion.div>
            ))}
            {streaming && messages[messages.length - 1]?.role !== "assistant" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-4">
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 p-0.5 ring-1 ring-border/50 shadow-sm">
                  <Image src={arunaAvatar} alt="ARUNA" width={40} height={40} className="h-full w-full object-cover rounded-[14px]" />
                </div>
                <div className="rounded-3xl rounded-tl-sm bg-card border border-border/60 px-6 py-5 shadow-sm flex items-center gap-2">
                  <p className="text-sm font-medium text-muted-foreground mr-2">Aruna está processando</p>
                  <div className="flex gap-1.5">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-primary/60" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-primary/60 [animation-delay:0.15s]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-primary/60 [animation-delay:0.3s]" />
                  </div>
                </div>
              </motion.div>
            )}
            <div ref={endRef} className="h-4" />
          </div>
        )}
      </div>

      {/* ─── Premium Input Box ────────────────────────────────────── */}
      <div className="p-4 sm:p-6 bg-background/80 backdrop-blur-md border-t border-border/50 relative z-20">
        <div className="mx-auto flex flex-col max-w-4xl relative">
          <div className="relative flex items-end gap-3 rounded-3xl border border-border/80 bg-card p-2 shadow-sm focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/50 transition-all">
            <div className="flex-1 px-3">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Digite sua ordem legal complexa, peça um relatório financeiro ou converse naturalmente com ARUNA..."
                rows={1}
                className="min-h-[52px] max-h-[200px] resize-none border-0 bg-transparent text-sm md:text-base focus-visible:ring-0 py-4 placeholder:text-muted-foreground/60 p-0"
              />
            </div>
            <div className="flex h-full items-end pb-1 pr-1">
              <Button onClick={handleSend} disabled={!input.trim() || isWorking} size="icon" className={cn("h-12 w-12 rounded-2xl transition-all duration-300", input.trim() ? "bg-primary shadow-md hover:scale-105" : "bg-muted text-muted-foreground")}>
                {isWorking ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5 ml-1" />}
              </Button>
            </div>
          </div>
          <div className="flex items-center justify-between mt-3 px-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <BookOpen className="h-3.5 w-3.5" />
              <span>Integração total ativada: {ctx.processos.length} P · {ctx.clientes.length} C · {ctx.eventos.length} E</span>
            </div>
            <p className="text-[11px] text-muted-foreground/60 hidden sm:block">
              A Aruna IA avalia o banco de forma sensível. Verifique precedentes vitais. Use Shift+Enter para quebrar linhas.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
