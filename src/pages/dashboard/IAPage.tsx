import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Send, Sparkles, User, Trash2, FileText, Loader2,
  Search, FileSearch, Mic, X, ChevronRight,
  BookOpen, MoreHorizontal,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import arunaAvatar from "@/assets/aruna-avatar.png";
import ReactMarkdown from "react-markdown";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

/* ─── Types ──────────────────────────────────────── */
interface LocalMsg {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

interface Message {
  id: string;
  role: string;
  content: string;
  created_at: string;
}

/* ─── Constants ──────────────────────────────────── */
const ARUNA_GREETING = `Olá! Sou a **ARUNA**, sua assistente jurídica inteligente. 🏛️

Posso ajudar com:
- 📋 Resumir processos e consultar prazos
- 📝 Gerar petições, procurações e contratos
- 🔍 Pesquisar jurisprudência brasileira
- 📄 Analisar documentos jurídicos
- 🎙️ Transcrever áudios de audiências

Como posso ajudar?`;

const quickActions = [
  { label: "Prazos da semana", prompt: "Quais prazos vencem esta semana?" },
  { label: "Processos ativos", prompt: "Resuma os processos ativos" },
  { label: "Modelo de procuração", prompt: "Gere um modelo de procuração" },
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
  { value: "completa", label: "Completa" },
  { value: "resumo", label: "Resumo" },
  { value: "riscos", label: "Riscos" },
  { value: "argumentos", label: "Argumentos" },
  { value: "clausulas", label: "Cláusulas" },
];

const AUDIO_TYPES = [
  { value: "audiencia", label: "Audiência Judicial" },
  { value: "reuniao", label: "Reunião" },
  { value: "depoimento", label: "Depoimento" },
  { value: "consulta", label: "Consulta com Cliente" },
  { value: "outro", label: "Outro" },
];

const BASE_URL = import.meta.env.VITE_SUPABASE_URL;
const CHAT_URL = `${BASE_URL}/functions/v1/aruna-chat`;
const DOC_GEN_URL = `${BASE_URL}/functions/v1/aruna-generate-doc`;
const JURIS_URL = `${BASE_URL}/functions/v1/aruna-jurisprudencia`;
const ANALYZE_URL = `${BASE_URL}/functions/v1/aruna-analyze-doc`;
const TRANSCRIBE_URL = `${BASE_URL}/functions/v1/aruna-transcribe`;
const AUTH_HEADER = { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` };

type Tool = null | "doc" | "juris" | "analyze" | "transcribe";

/* ═══════════════════════════════════════════════════ */

export default function IAPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<LocalMsg[]>([]);
  const [streaming, setStreaming] = useState(false);
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

  /* ─── Queries ────────────────────────────────────── */
  const { data: profileData } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("organization_id").eq("user_id", user!.id).single();
      return data;
    },
    enabled: !!user?.id,
  });
  const orgId = profileData?.organization_id;

  const { data: processosData } = useQuery({
    queryKey: ["processos_context", orgId],
    queryFn: async () => {
      const { data } = await supabase.from("processos_juridicos")
        .select("title, number, court, status, subject, estimated_value, notes, client_id, clients(name)")
        .eq("organization_id", orgId!).order("updated_at", { ascending: false }).limit(50);
      return data;
    },
    enabled: !!orgId,
  });

  const { data: clientesData } = useQuery({
    queryKey: ["clientes_context", orgId],
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("name, email, phone, document")
        .eq("organization_id", orgId!).order("name").limit(50);
      return data;
    },
    enabled: !!orgId,
  });

  const { data: eventosData } = useQuery({
    queryKey: ["eventos_context", orgId],
    queryFn: async () => {
      const { data } = await supabase.from("eventos_agenda")
        .select("title, start_time, end_time, category, description")
        .eq("organization_id", orgId!).gte("start_time", new Date().toISOString())
        .order("start_time").limit(30);
      return data;
    },
    enabled: !!orgId,
  });

  const { data: docsData } = useQuery({
    queryKey: ["documentos_for_analysis", orgId],
    queryFn: async () => {
      const { data } = await supabase.from("documentos").select("id, file_name, file_type, created_at")
        .eq("organization_id", orgId!).order("created_at", { ascending: false }).limit(50);
      return data;
    },
    enabled: !!orgId,
  });

  const ctx = useMemo(() => ({
    processos: processosData?.map((p: any) => ({ ...p, client_name: p.clients?.name, clients: undefined })) || [],
    clientes: clientesData || [],
    eventos: eventosData || [],
  }), [processosData, clientesData, eventosData]);

  const { data: dbMsgs = [], isLoading } = useQuery({
    queryKey: ["conversas_ia", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("conversas_ia").select("*")
        .eq("user_id", user!.id).order("created_at", { ascending: true });
      if (error) throw error;
      return data as Message[];
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (dbMsgs.length > 0 && msgs.length === 0)
      setMsgs(dbMsgs.map((m) => ({ id: m.id, role: m.role as "user" | "assistant", content: m.content, created_at: m.created_at })));
  }, [dbMsgs]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  /* ─── SSE Stream Helper ──────────────────────────── */
  const stream = useCallback(async (url: string, body: Record<string, unknown>, aId: string) => {
    let content = "";
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...AUTH_HEADER },
      body: JSON.stringify(body),
    });
    if (!resp.ok) { const e = await resp.json().catch(() => ({})); throw new Error(e.error || `Erro ${resp.status}`); }
    if (!resp.body) throw new Error("Sem resposta");

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
          if (c) { content += c; setMsgs((p) => p.map((m) => m.id === aId ? { ...m, content } : m)); }
        } catch { buf = ln + "\n" + buf; break; }
      }
    }
    // flush
    if (buf.trim()) {
      for (let raw of buf.split("\n")) {
        if (!raw || !raw.replace("\r", "").startsWith("data: ")) continue;
        const js = raw.replace("\r", "").slice(6).trim();
        if (js === "[DONE]") continue;
        try { const c = JSON.parse(js).choices?.[0]?.delta?.content; if (c) { content += c; setMsgs((p) => p.map((m) => m.id === aId ? { ...m, content } : m)); } } catch {}
      }
    }
    return content;
  }, []);

  /* ─── Add message helpers ────────────────────────── */
  const addUser = (text: string) => {
    const m: LocalMsg = { id: crypto.randomUUID(), role: "user", content: text, created_at: new Date().toISOString() };
    setMsgs((p) => [...p, m]);
    if (orgId) supabase.from("conversas_ia").insert({ content: text, role: "user", user_id: user!.id, organization_id: orgId });
    return m;
  };
  const addAssistant = () => {
    const id = crypto.randomUUID();
    setMsgs((p) => [...p, { id, role: "assistant", content: "", created_at: new Date().toISOString() }]);
    return id;
  };
  const saveAssistant = (content: string) => {
    if (content && orgId) supabase.from("conversas_ia").insert({ content, role: "assistant", user_id: user!.id, organization_id: orgId });
  };

  /* ─── Chat ──────────────────────────────────────── */
  const handleSend = async () => {
    const t = input.trim();
    if (!t || streaming || !orgId) return;
    const um = addUser(t);
    setInput("");
    setStreaming(true);
    const aId = addAssistant();
    try {
      const history = [...msgs, um].slice(-20).map((m) => ({ role: m.role, content: m.content }));
      const c = await stream(CHAT_URL, { messages: history, context: ctx }, aId);
      saveAssistant(c);
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
      setMsgs((p) => p.filter((m) => m.id !== aId));
    } finally { setStreaming(false); }
  };

  const handleKey = (e: React.KeyboardEvent) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } };

  const handleClear = async () => {
    if (!user?.id || streaming) return;
    await supabase.from("conversas_ia").delete().eq("user_id", user.id);
    setMsgs([]);
    qc.invalidateQueries({ queryKey: ["conversas_ia", user.id] });
    toast({ title: "Histórico limpo" });
  };

  /* ─── Generate Doc ──────────────────────────────── */
  const handleGenDoc = async () => {
    if (!docType || !orgId || !user?.id || busy) return;
    setBusy(true);
    const label = DOC_TYPES.find((d) => d.value === docType)?.label || "Documento";
    addUser(`📝 Gerar: **${label}**${docInstr ? ` — ${docInstr}` : ""}`);
    setTool(null);
    const aId = addAssistant();
    setMsgs((p) => p.map((m) => m.id === aId ? { ...m, content: "⏳ Gerando documento..." } : m));
    try {
      const r = await fetch(DOC_GEN_URL, { method: "POST", headers: { "Content-Type": "application/json", ...AUTH_HEADER }, body: JSON.stringify({ doc_type: docType, instructions: docInstr, organization_id: orgId, user_id: user.id }) });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || `Erro ${r.status}`);
      const res = await r.json();
      const c = `✅ **${res.document.file_name}** gerado e salvo no módulo de Documentos.\n\n${res.content_preview?.slice(0, 300)}...`;
      setMsgs((p) => p.map((m) => m.id === aId ? { ...m, content: c } : m));
      saveAssistant(c);
      qc.invalidateQueries({ queryKey: ["documentos"] });
      toast({ title: "Documento gerado!" });
    } catch (e: any) {
      setMsgs((p) => p.map((m) => m.id === aId ? { ...m, content: `❌ ${e.message}` } : m));
    } finally { setBusy(false); setDocType(""); setDocInstr(""); }
  };

  /* ─── Jurisprudence ─────────────────────────────── */
  const handleJuris = async () => {
    if (!jurisQ.trim() || streaming || !orgId) return;
    setStreaming(true); setTool(null);
    const area = jurisArea !== "all" ? jurisArea : "";
    addUser(`🔍 Jurisprudência: **${jurisQ}**${area ? ` (${AREAS_DIREITO.find(a => a.value === jurisArea)?.label})` : ""}`);
    const aId = addAssistant();
    try {
      const c = await stream(JURIS_URL, { query: jurisQ, area }, aId);
      saveAssistant(c);
      setJurisQ(""); setJurisArea("all");
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
      setMsgs((p) => p.filter((m) => m.id !== aId));
    } finally { setStreaming(false); }
  };

  /* ─── Analyze Doc ───────────────────────────────── */
  const handleAnalyze = async () => {
    if (!analyzeDocId || !orgId || streaming) return;
    setStreaming(true); setTool(null);
    const dn = docsData?.find((d) => d.id === analyzeDocId)?.file_name || "Documento";
    addUser(`📄 Analisar: **${dn}** (${ANALYSIS_TYPES.find(a => a.value === analyzeType)?.label})`);
    const aId = addAssistant();
    try {
      const c = await stream(ANALYZE_URL, { document_id: analyzeDocId, organization_id: orgId, analysis_type: analyzeType, custom_instructions: analyzeInstr }, aId);
      saveAssistant(c);
      setAnalyzeDocId(""); setAnalyzeInstr("");
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
      setMsgs((p) => p.filter((m) => m.id !== aId));
    } finally { setStreaming(false); }
  };

  /* ─── Transcribe Audio ──────────────────────────── */
  const handleTranscribe = async () => {
    if (!audioFile || !orgId || !user?.id || streaming) return;
    setStreaming(true); setTool(null);
    const typeLabel = AUDIO_TYPES.find(t => t.value === audioType)?.label || audioType;
    addUser(`🎙️ Transcrever: **${audioFile.name}** (${typeLabel})`);
    const aId = addAssistant();
    try {
      const fd = new FormData();
      fd.append("audio", audioFile);
      fd.append("audio_type", audioType);
      fd.append("instructions", audioInstr);
      fd.append("organization_id", orgId);
      fd.append("user_id", user.id);

      const resp = await fetch(TRANSCRIBE_URL, { method: "POST", headers: AUTH_HEADER, body: fd });
      if (!resp.ok) throw new Error((await resp.json().catch(() => ({}))).error || `Erro ${resp.status}`);
      if (!resp.body) throw new Error("Sem resposta");

      let content = "";
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
          try { const c = JSON.parse(js).choices?.[0]?.delta?.content; if (c) { content += c; setMsgs((p) => p.map((m) => m.id === aId ? { ...m, content } : m)); } } catch { buf = ln + "\n" + buf; break; }
        }
      }
      saveAssistant(content);
      setAudioFile(null); setAudioInstr("");
      if (fileRef.current) fileRef.current.value = "";
    } catch (e: any) {
      toast({ title: "Erro na transcrição", description: e.message, variant: "destructive" });
      setMsgs((p) => p.filter((m) => m.id !== aId));
    } finally { setStreaming(false); }
  };

  const isWorking = streaming || busy;

  /* ═══════════════════════════════════════════════════ */
  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* ─── Compact Header ───────────────────────────── */}
      <div className="flex items-center gap-3 border-b border-border/40 px-1 pb-3">
        <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-accent/10">
          <img src={arunaAvatar} alt="ARUNA" className="h-full w-full object-cover" />
        </div>
        <div className="min-w-0">
          <h1 className="font-display text-base font-semibold leading-tight text-foreground">ARUNA</h1>
          <p className="text-[11px] leading-tight text-muted-foreground">Assistente Jurídica IA</p>
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <span className="mr-1 flex items-center gap-1 text-[11px] text-emerald-600">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Online
          </span>

          {/* Tool buttons — icon-only on mobile */}
          <Button variant={tool === "juris" ? "default" : "ghost"} size="sm" className="h-8 gap-1.5 px-2.5 text-xs" onClick={() => setTool(tool === "juris" ? null : "juris")} disabled={isWorking}>
            <Search className="h-3.5 w-3.5" /><span className="hidden sm:inline">Jurisprudência</span>
          </Button>
          <Button variant={tool === "analyze" ? "default" : "ghost"} size="sm" className="h-8 gap-1.5 px-2.5 text-xs" onClick={() => setTool(tool === "analyze" ? null : "analyze")} disabled={isWorking}>
            <FileSearch className="h-3.5 w-3.5" /><span className="hidden sm:inline">Analisar</span>
          </Button>
          <Button variant={tool === "doc" ? "default" : "ghost"} size="sm" className="h-8 gap-1.5 px-2.5 text-xs" onClick={() => setTool(tool === "doc" ? null : "doc")} disabled={isWorking}>
            <FileText className="h-3.5 w-3.5" /><span className="hidden sm:inline">Gerar Doc</span>
          </Button>
          <Button variant={tool === "transcribe" ? "default" : "ghost"} size="sm" className="h-8 gap-1.5 px-2.5 text-xs" onClick={() => setTool(tool === "transcribe" ? null : "transcribe")} disabled={isWorking}>
            <Mic className="h-3.5 w-3.5" /><span className="hidden sm:inline">Transcrever</span>
          </Button>

          {msgs.length > 0 && (
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={handleClear} disabled={isWorking}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* ─── Tool Panel (compact, inline) ─────────────── */}
      {tool && (
        <div className="border-b border-border/40 bg-muted/20 px-4 py-3 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="mx-auto max-w-2xl">
            {/* Jurisprudence */}
            {tool === "juris" && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-foreground">🔍 Pesquisa de Jurisprudência</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setTool(null)}><X className="h-3 w-3" /></Button>
                </div>
                <div className="flex gap-2">
                  <Input value={jurisQ} onChange={(e) => setJurisQ(e.target.value)} placeholder="Tema jurídico..." className="h-9 flex-1 text-sm" onKeyDown={(e) => { if (e.key === "Enter") handleJuris(); }} />
                  <Select value={jurisArea} onValueChange={setJurisArea}>
                    <SelectTrigger className="h-9 w-40 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{AREAS_DIREITO.map(a => <SelectItem key={a.value} value={a.value} className="text-xs">{a.label}</SelectItem>)}</SelectContent>
                  </Select>
                  <Button size="sm" className="h-9" onClick={handleJuris} disabled={!jurisQ.trim() || isWorking}>
                    <Search className="mr-1 h-3.5 w-3.5" />Pesquisar
                  </Button>
                </div>
              </div>
            )}

            {/* Analyze */}
            {tool === "analyze" && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-foreground">📄 Análise de Documento</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setTool(null)}><X className="h-3 w-3" /></Button>
                </div>
                {(!docsData || docsData.length === 0) ? (
                  <p className="text-xs text-muted-foreground">Nenhum documento encontrado. Faça upload no módulo de Documentos.</p>
                ) : (
                  <>
                    <div className="flex gap-2">
                      <Select value={analyzeDocId} onValueChange={setAnalyzeDocId}>
                        <SelectTrigger className="h-9 flex-1 text-xs"><SelectValue placeholder="Selecione o documento" /></SelectTrigger>
                        <SelectContent>{docsData.map(d => <SelectItem key={d.id} value={d.id} className="text-xs">{d.file_name}</SelectItem>)}</SelectContent>
                      </Select>
                      <Select value={analyzeType} onValueChange={setAnalyzeType}>
                        <SelectTrigger className="h-9 w-32 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>{ANALYSIS_TYPES.map(a => <SelectItem key={a.value} value={a.value} className="text-xs">{a.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    {analyzeDocId && (
                      <div className="flex gap-2">
                        <Input value={analyzeInstr} onChange={(e) => setAnalyzeInstr(e.target.value)} placeholder="Instruções adicionais (opcional)" className="h-9 flex-1 text-sm" />
                        <Button size="sm" className="h-9" onClick={handleAnalyze} disabled={isWorking}>
                          {streaming ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <FileSearch className="mr-1 h-3.5 w-3.5" />}Analisar
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Generate Doc */}
            {tool === "doc" && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-foreground">📝 Gerar Documento</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setTool(null)}><X className="h-3 w-3" /></Button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {DOC_TYPES.map(dt => (
                    <button key={dt.value} onClick={() => setDocType(docType === dt.value ? "" : dt.value)}
                      className={cn("rounded-md border px-2.5 py-1 text-xs transition-colors", docType === dt.value ? "border-primary bg-primary/10 text-primary" : "border-border/60 text-muted-foreground hover:bg-muted hover:text-foreground")}>
                      {dt.label}
                    </button>
                  ))}
                </div>
                {docType && (
                  <div className="flex gap-2">
                    <Input value={docInstr} onChange={(e) => setDocInstr(e.target.value)} placeholder="Instruções adicionais (opcional)" className="h-9 flex-1 text-sm" />
                    <Button size="sm" className="h-9" onClick={handleGenDoc} disabled={busy}>
                      {busy ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <FileText className="mr-1 h-3.5 w-3.5" />}Gerar
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Transcribe */}
            {tool === "transcribe" && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-foreground">🎙️ Transcrever Áudio</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setTool(null)}><X className="h-3 w-3" /></Button>
                </div>
                <div className="flex gap-2">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="audio/*"
                    onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
                    className="flex-1 text-xs file:mr-2 file:rounded-md file:border-0 file:bg-primary/10 file:px-3 file:py-1.5 file:text-xs file:text-primary hover:file:bg-primary/20"
                  />
                  <Select value={audioType} onValueChange={setAudioType}>
                    <SelectTrigger className="h-9 w-44 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{AUDIO_TYPES.map(a => <SelectItem key={a.value} value={a.value} className="text-xs">{a.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                {audioFile && (
                  <div className="flex gap-2">
                    <Input value={audioInstr} onChange={(e) => setAudioInstr(e.target.value)} placeholder="Instruções adicionais (opcional)" className="h-9 flex-1 text-sm" />
                    <Button size="sm" className="h-9" onClick={handleTranscribe} disabled={isWorking}>
                      {streaming ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Mic className="mr-1 h-3.5 w-3.5" />}Transcrever
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Messages ─────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-2 py-6">
        {msgs.length === 0 && !isLoading ? (
          <div className="mx-auto max-w-xl space-y-5 pt-8">
            {/* Greeting */}
            <div className="flex gap-3">
              <div className="h-7 w-7 shrink-0 overflow-hidden rounded-full bg-accent/10">
                <img src={arunaAvatar} alt="ARUNA" className="h-full w-full object-cover" />
              </div>
              <div className="rounded-2xl rounded-tl-sm bg-muted/60 px-4 py-3">
                <div className="prose prose-sm max-w-none text-foreground prose-li:my-0.5 prose-ul:my-1">
                  <ReactMarkdown>{ARUNA_GREETING}</ReactMarkdown>
                </div>
              </div>
            </div>
            {/* Quick actions */}
            <div className="ml-10 flex flex-wrap gap-1.5">
              {quickActions.map((a) => (
                <button key={a.label} onClick={() => setInput(a.prompt)}
                  className="group flex items-center gap-1.5 rounded-full border border-border/50 bg-background px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground">
                  <Sparkles className="h-3 w-3 text-accent group-hover:text-primary transition-colors" />{a.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-xl space-y-3">
            {msgs.map((m) => (
              <div key={m.id} className={cn("flex gap-2.5", m.role === "user" && "flex-row-reverse")}>
                <div className={cn("h-7 w-7 shrink-0 overflow-hidden rounded-full flex items-center justify-center", m.role === "user" ? "bg-primary text-primary-foreground" : "bg-accent/10")}>
                  {m.role === "user" ? <User className="h-3.5 w-3.5" /> : <img src={arunaAvatar} alt="ARUNA" className="h-full w-full object-cover" />}
                </div>
                <div className={cn("max-w-[82%] rounded-2xl px-3.5 py-2.5", m.role === "user" ? "rounded-tr-sm bg-primary text-primary-foreground" : "rounded-tl-sm bg-muted/60")}>
                  {m.role === "assistant" ? (
                    <div className="prose prose-sm max-w-none text-foreground prose-headings:text-foreground prose-strong:text-foreground prose-li:my-0.5 prose-ul:my-1 prose-p:my-1.5 prose-headings:my-2">
                      <ReactMarkdown>{m.content || "..."}</ReactMarkdown>
                    </div>
                  ) : (
                    <div className="prose prose-sm max-w-none text-primary-foreground prose-strong:text-primary-foreground prose-p:my-0.5">
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </div>
                  )}
                  <p className={cn("mt-1 text-[10px]", m.role === "user" ? "text-primary-foreground/50" : "text-muted-foreground/60")}>
                    {format(parseISO(m.created_at), "HH:mm", { locale: ptBR })}
                  </p>
                </div>
              </div>
            ))}
            {streaming && msgs[msgs.length - 1]?.role !== "assistant" && (
              <div className="flex gap-2.5">
                <div className="h-7 w-7 shrink-0 overflow-hidden rounded-full bg-accent/10">
                  <img src={arunaAvatar} alt="ARUNA" className="h-full w-full object-cover" />
                </div>
                <div className="rounded-2xl rounded-tl-sm bg-muted/60 px-3.5 py-2.5">
                  <div className="flex gap-1">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/40" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/40 [animation-delay:0.15s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/40 [animation-delay:0.3s]" />
                  </div>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>
        )}
      </div>

      {/* ─── Input ────────────────────────────────────── */}
      <div className="border-t border-border/40 bg-background px-2 pt-3 pb-2">
        <div className="mx-auto flex max-w-xl gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Mensagem para ARUNA..."
            rows={1}
            className="min-h-[40px] resize-none rounded-xl border-border/40 bg-muted/30 text-sm focus:bg-background"
          />
          <Button onClick={handleSend} disabled={!input.trim() || isWorking} size="icon" className="h-10 w-10 shrink-0 rounded-xl">
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="mt-1.5 text-center text-[10px] text-muted-foreground/50">
          ARUNA pode cometer erros · Verifique informações importantes
        </p>
      </div>
    </div>
  );
}
