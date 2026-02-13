import { useState, useRef, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Send, Sparkles, User, Trash2, FileText, Loader2,
  Search, BookOpen, FileSearch, ChevronDown,
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

const ARUNA_GREETING = `Olá! Eu sou a **ARUNA**, sua assistente jurídica inteligente. 🏛️

Estou aqui para ajudar com o dia a dia do seu escritório. Posso:

• **Resumir processos** e atualizações
• **Gerar minutas** e petições
• **Pesquisar jurisprudência** dos tribunais brasileiros
• **Analisar documentos** jurídicos detalhadamente
• **Consultar prazos** e compromissos
• **Responder dúvidas** sobre legislação brasileira

Como posso ajudar você hoje?`;

const suggestions = [
  "Quais prazos vencem esta semana?",
  "Resuma os processos ativos",
  "Gere um modelo de procuração",
  "Qual cliente tem mais processos?",
];

const DOC_TYPES = [
  { value: "peticao_inicial", label: "Petição Inicial", icon: "📄" },
  { value: "procuracao", label: "Procuração", icon: "📋" },
  { value: "contestacao", label: "Contestação", icon: "📝" },
  { value: "recurso", label: "Recurso", icon: "⚖️" },
  { value: "contrato", label: "Contrato", icon: "📑" },
  { value: "notificacao", label: "Notificação Extrajudicial", icon: "📬" },
  { value: "parecer", label: "Parecer Jurídico", icon: "🔍" },
];

const AREAS_DIREITO = [
  { value: "", label: "Todas as áreas" },
  { value: "civil", label: "Direito Civil" },
  { value: "trabalhista", label: "Direito Trabalhista" },
  { value: "penal", label: "Direito Penal" },
  { value: "tributario", label: "Direito Tributário" },
  { value: "empresarial", label: "Direito Empresarial" },
  { value: "constitucional", label: "Direito Constitucional" },
  { value: "administrativo", label: "Direito Administrativo" },
  { value: "consumidor", label: "Direito do Consumidor" },
  { value: "ambiental", label: "Direito Ambiental" },
  { value: "previdenciario", label: "Direito Previdenciário" },
];

const ANALYSIS_TYPES = [
  { value: "completa", label: "Análise Completa", icon: "📋" },
  { value: "resumo", label: "Resumo Executivo", icon: "📝" },
  { value: "riscos", label: "Identificação de Riscos", icon: "⚠️" },
  { value: "argumentos", label: "Argumentos Jurídicos", icon: "⚖️" },
  { value: "clausulas", label: "Análise de Cláusulas", icon: "🔍" },
];

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/aruna-chat`;
const DOC_GEN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/aruna-generate-doc`;
const JURIS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/aruna-jurisprudencia`;
const ANALYZE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/aruna-analyze-doc`;

type ActivePanel = null | "doc" | "juris" | "analyze";

export default function IAPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState("");
  const [localMessages, setLocalMessages] = useState<LocalMsg[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isGeneratingDoc, setIsGeneratingDoc] = useState(false);
  const [activePanel, setActivePanel] = useState<ActivePanel>(null);

  // Doc generation state
  const [selectedDocType, setSelectedDocType] = useState("");
  const [docInstructions, setDocInstructions] = useState("");

  // Jurisprudence search state
  const [jurisQuery, setJurisQuery] = useState("");
  const [jurisArea, setJurisArea] = useState("");

  // Document analysis state
  const [selectedDocId, setSelectedDocId] = useState("");
  const [analysisType, setAnalysisType] = useState("completa");
  const [analysisInstructions, setAnalysisInstructions] = useState("");

  const { data: profileData } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("user_id", user!.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
  });

  const orgId = profileData?.organization_id;

  const { data: processosData } = useQuery({
    queryKey: ["processos_context", orgId],
    queryFn: async () => {
      const { data } = await supabase
        .from("processos_juridicos")
        .select("title, number, court, status, subject, estimated_value, notes, client_id, clients(name)")
        .eq("organization_id", orgId!)
        .order("updated_at", { ascending: false })
        .limit(50);
      return data;
    },
    enabled: !!orgId,
  });

  const { data: clientesData } = useQuery({
    queryKey: ["clientes_context", orgId],
    queryFn: async () => {
      const { data } = await supabase
        .from("clients")
        .select("name, email, phone, document")
        .eq("organization_id", orgId!)
        .order("name")
        .limit(50);
      return data;
    },
    enabled: !!orgId,
  });

  const { data: eventosData } = useQuery({
    queryKey: ["eventos_context", orgId],
    queryFn: async () => {
      const { data } = await supabase
        .from("eventos_agenda")
        .select("title, start_time, end_time, category, description")
        .eq("organization_id", orgId!)
        .gte("start_time", new Date().toISOString())
        .order("start_time")
        .limit(30);
      return data;
    },
    enabled: !!orgId,
  });

  // Fetch documents for analysis
  const { data: documentosData } = useQuery({
    queryKey: ["documentos_for_analysis", orgId],
    queryFn: async () => {
      const { data } = await supabase
        .from("documentos")
        .select("id, file_name, file_type, created_at")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false })
        .limit(50);
      return data;
    },
    enabled: !!orgId,
  });

  const officeContext = useMemo(() => ({
    processos: processosData?.map((p: any) => ({
      ...p,
      client_name: p.clients?.name,
      clients: undefined,
    })) || [],
    clientes: clientesData || [],
    eventos: eventosData || [],
  }), [processosData, clientesData, eventosData]);

  const { data: dbMessages = [], isLoading } = useQuery({
    queryKey: ["conversas_ia", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversas_ia")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as Message[];
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (dbMessages.length > 0 && localMessages.length === 0) {
      setLocalMessages(
        dbMessages.map((m) => ({
          id: m.id,
          role: m.role as "user" | "assistant",
          content: m.content,
          created_at: m.created_at,
        }))
      );
    }
  }, [dbMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [localMessages]);

  // ─── SSE stream helper ───────────────────────────────
  const streamResponse = async (
    url: string,
    body: Record<string, unknown>,
    assistantId: string,
  ) => {
    let assistantContent = "";
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const errData = await resp.json().catch(() => ({}));
      throw new Error(errData.error || `Erro ${resp.status}`);
    }
    if (!resp.body) throw new Error("Sem corpo de resposta");

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      textBuffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);
        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;
        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") break;
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            assistantContent += content;
            setLocalMessages((prev) =>
              prev.map((m) => (m.id === assistantId ? { ...m, content: assistantContent } : m))
            );
          }
        } catch {
          textBuffer = line + "\n" + textBuffer;
          break;
        }
      }
    }

    // Flush
    if (textBuffer.trim()) {
      for (let raw of textBuffer.split("\n")) {
        if (!raw) continue;
        if (raw.endsWith("\r")) raw = raw.slice(0, -1);
        if (!raw.startsWith("data: ")) continue;
        const jsonStr = raw.slice(6).trim();
        if (jsonStr === "[DONE]") continue;
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            assistantContent += content;
            setLocalMessages((prev) =>
              prev.map((m) => (m.id === assistantId ? { ...m, content: assistantContent } : m))
            );
          }
        } catch {}
      }
    }

    return assistantContent;
  };

  // ─── Chat ──────────────────────────────────────────
  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming || !orgId) return;

    const userMsg: LocalMsg = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
      created_at: new Date().toISOString(),
    };

    setLocalMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsStreaming(true);

    await supabase.from("conversas_ia").insert({
      content: trimmed, role: "user", user_id: user!.id, organization_id: orgId,
    });

    const historyForAI = [...localMessages, userMsg]
      .slice(-20)
      .map((m) => ({ role: m.role, content: m.content }));

    const assistantId = crypto.randomUUID();
    setLocalMessages((prev) => [
      ...prev,
      { id: assistantId, role: "assistant", content: "", created_at: new Date().toISOString() },
    ]);

    try {
      const assistantContent = await streamResponse(
        CHAT_URL,
        { messages: historyForAI, context: officeContext },
        assistantId,
      );

      if (assistantContent) {
        await supabase.from("conversas_ia").insert({
          content: assistantContent, role: "assistant", user_id: user!.id, organization_id: orgId,
        });
      }
    } catch (e: any) {
      toast({ title: "Erro na ARUNA", description: e.message, variant: "destructive" });
      setLocalMessages((prev) => prev.filter((m) => m.id !== assistantId));
    } finally {
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleClearHistory = async () => {
    if (!user?.id || isStreaming) return;
    try {
      const { error } = await supabase.from("conversas_ia").delete().eq("user_id", user.id);
      if (error) throw error;
      setLocalMessages([]);
      queryClient.invalidateQueries({ queryKey: ["conversas_ia", user.id] });
      toast({ title: "Histórico limpo", description: "Todas as conversas foram removidas." });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  // ─── Generate Doc ──────────────────────────────────
  const handleGenerateDoc = async () => {
    if (!selectedDocType || !orgId || !user?.id || isGeneratingDoc) return;
    setIsGeneratingDoc(true);
    const docLabel = DOC_TYPES.find((d) => d.value === selectedDocType)?.label || "Documento";

    const userMsg: LocalMsg = {
      id: crypto.randomUUID(), role: "user",
      content: `📝 Gerar documento: **${docLabel}**${docInstructions ? `\n\nInstruções: ${docInstructions}` : ""}`,
      created_at: new Date().toISOString(),
    };
    setLocalMessages((prev) => [...prev, userMsg]);
    setActivePanel(null);

    const assistantId = crypto.randomUUID();
    setLocalMessages((prev) => [
      ...prev,
      { id: assistantId, role: "assistant", content: "⏳ Gerando documento...", created_at: new Date().toISOString() },
    ]);

    try {
      const resp = await fetch(DOC_GEN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          doc_type: selectedDocType, instructions: docInstructions,
          organization_id: orgId, user_id: user.id,
        }),
      });
      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || `Erro ${resp.status}`);
      }
      const result = await resp.json();
      const successContent = `${result.message}\n\n**Arquivo:** ${result.document.file_name}\n\nO documento foi salvo automaticamente no módulo de **Documentos**.\n\n---\n\n**Prévia do conteúdo:**\n\n${result.content_preview}${result.content_preview.length >= 500 ? "..." : ""}`;
      setLocalMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: successContent } : m));

      await supabase.from("conversas_ia").insert([
        { content: userMsg.content, role: "user", user_id: user.id, organization_id: orgId },
        { content: successContent, role: "assistant", user_id: user.id, organization_id: orgId },
      ]);
      queryClient.invalidateQueries({ queryKey: ["documentos"] });
      toast({ title: "Documento gerado!", description: `${docLabel} criado com sucesso.` });
    } catch (e: any) {
      setLocalMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: `❌ Erro: ${e.message}` } : m));
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setIsGeneratingDoc(false);
      setSelectedDocType("");
      setDocInstructions("");
    }
  };

  // ─── Jurisprudence Search ──────────────────────────
  const handleJurisSearch = async () => {
    if (!jurisQuery.trim() || isStreaming || !orgId) return;
    setIsStreaming(true);
    setActivePanel(null);

    const userMsg: LocalMsg = {
      id: crypto.randomUUID(), role: "user",
      content: `🔍 Pesquisa de Jurisprudência: **${jurisQuery}**${jurisArea ? `\n\nÁrea: ${AREAS_DIREITO.find(a => a.value === jurisArea)?.label}` : ""}`,
      created_at: new Date().toISOString(),
    };
    setLocalMessages((prev) => [...prev, userMsg]);

    await supabase.from("conversas_ia").insert({
      content: userMsg.content, role: "user", user_id: user!.id, organization_id: orgId,
    });

    const assistantId = crypto.randomUUID();
    setLocalMessages((prev) => [
      ...prev,
      { id: assistantId, role: "assistant", content: "", created_at: new Date().toISOString() },
    ]);

    try {
      const assistantContent = await streamResponse(
        JURIS_URL,
        { query: jurisQuery, area: jurisArea },
        assistantId,
      );

      if (assistantContent) {
        await supabase.from("conversas_ia").insert({
          content: assistantContent, role: "assistant", user_id: user!.id, organization_id: orgId,
        });
      }
      setJurisQuery("");
      setJurisArea("");
    } catch (e: any) {
      toast({ title: "Erro na pesquisa", description: e.message, variant: "destructive" });
      setLocalMessages((prev) => prev.filter((m) => m.id !== assistantId));
    } finally {
      setIsStreaming(false);
    }
  };

  // ─── Document Analysis ─────────────────────────────
  const handleAnalyzeDoc = async () => {
    if (!selectedDocId || !orgId || !user?.id || isStreaming) return;
    setIsStreaming(true);
    setActivePanel(null);

    const docName = documentosData?.find((d) => d.id === selectedDocId)?.file_name || "Documento";
    const analysisLabel = ANALYSIS_TYPES.find((a) => a.value === analysisType)?.label || "Completa";

    const userMsg: LocalMsg = {
      id: crypto.randomUUID(), role: "user",
      content: `📄 Analisar documento: **${docName}**\nTipo de análise: ${analysisLabel}${analysisInstructions ? `\n\nInstruções: ${analysisInstructions}` : ""}`,
      created_at: new Date().toISOString(),
    };
    setLocalMessages((prev) => [...prev, userMsg]);

    await supabase.from("conversas_ia").insert({
      content: userMsg.content, role: "user", user_id: user!.id, organization_id: orgId,
    });

    const assistantId = crypto.randomUUID();
    setLocalMessages((prev) => [
      ...prev,
      { id: assistantId, role: "assistant", content: "", created_at: new Date().toISOString() },
    ]);

    try {
      const assistantContent = await streamResponse(
        ANALYZE_URL,
        {
          document_id: selectedDocId,
          organization_id: orgId,
          analysis_type: analysisType,
          custom_instructions: analysisInstructions,
        },
        assistantId,
      );

      if (assistantContent) {
        await supabase.from("conversas_ia").insert({
          content: assistantContent, role: "assistant", user_id: user!.id, organization_id: orgId,
        });
      }
      setSelectedDocId("");
      setAnalysisInstructions("");
    } catch (e: any) {
      toast({ title: "Erro na análise", description: e.message, variant: "destructive" });
      setLocalMessages((prev) => prev.filter((m) => m.id !== assistantId));
    } finally {
      setIsStreaming(false);
    }
  };

  const togglePanel = (panel: ActivePanel) => {
    setActivePanel((prev) => (prev === panel ? null : panel));
  };

  const displayMessages = localMessages.length > 0 ? localMessages : [];

  return (
    <div className="flex h-[calc(100vh-6rem)] flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border/60 pb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 overflow-hidden">
          <img src={arunaAvatar} alt="ARUNA" className="h-8 w-8 object-cover" />
        </div>
        <div>
          <h1 className="font-display text-xl text-foreground">ARUNA</h1>
          <p className="text-xs text-muted-foreground">
            Assistente Jurídica com Inteligência Artificial
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2 flex-wrap">
          {/* Feature buttons */}
          <Button
            variant={activePanel === "juris" ? "default" : "outline"}
            size="sm"
            onClick={() => togglePanel("juris")}
            disabled={isStreaming || isGeneratingDoc}
            className="text-xs"
          >
            <Search className="mr-1.5 h-3.5 w-3.5" />
            Jurisprudência
          </Button>
          <Button
            variant={activePanel === "analyze" ? "default" : "outline"}
            size="sm"
            onClick={() => togglePanel("analyze")}
            disabled={isStreaming || isGeneratingDoc}
            className="text-xs"
          >
            <FileSearch className="mr-1.5 h-3.5 w-3.5" />
            Analisar Doc
          </Button>
          <Button
            variant={activePanel === "doc" ? "default" : "outline"}
            size="sm"
            onClick={() => togglePanel("doc")}
            disabled={isStreaming || isGeneratingDoc}
            className="text-xs"
          >
            <FileText className="mr-1.5 h-3.5 w-3.5" />
            Gerar Doc
          </Button>
          {displayMessages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearHistory}
              disabled={isStreaming}
              className="text-muted-foreground hover:text-destructive text-xs"
            >
              <Trash2 className="mr-1 h-3.5 w-3.5" />
              Limpar
            </Button>
          )}
          <div className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-xs text-emerald-600">Online</span>
          </div>
        </div>
      </div>

      {/* ─── Panels ────────────────────────────────────── */}

      {/* Jurisprudence Panel */}
      {activePanel === "juris" && (
        <div className="border-b border-border/60 bg-muted/30 px-4 py-4 animate-in slide-in-from-top-2">
          <div className="mx-auto max-w-2xl space-y-3">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-medium text-foreground">Pesquisa de Jurisprudência</h3>
            </div>
            <Input
              value={jurisQuery}
              onChange={(e) => setJurisQuery(e.target.value)}
              placeholder="Ex: dano moral em relações de consumo, indenização por acidente de trabalho..."
              className="text-sm"
              onKeyDown={(e) => { if (e.key === "Enter") handleJurisSearch(); }}
            />
            <div className="flex items-center gap-3">
              <Select value={jurisArea} onValueChange={setJurisArea}>
                <SelectTrigger className="w-56 text-xs">
                  <SelectValue placeholder="Área do Direito (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  {AREAS_DIREITO.map((a) => (
                    <SelectItem key={a.value} value={a.value || "all"} className="text-xs">
                      {a.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex-1" />
              <Button
                size="sm"
                onClick={handleJurisSearch}
                disabled={!jurisQuery.trim() || isStreaming}
              >
                <Search className="mr-1.5 h-3.5 w-3.5" />
                Pesquisar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Document Analysis Panel */}
      {activePanel === "analyze" && (
        <div className="border-b border-border/60 bg-muted/30 px-4 py-4 animate-in slide-in-from-top-2">
          <div className="mx-auto max-w-2xl space-y-3">
            <div className="flex items-center gap-2">
              <FileSearch className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-medium text-foreground">Análise de Documento</h3>
            </div>
            {(!documentosData || documentosData.length === 0) ? (
              <p className="text-sm text-muted-foreground">
                Nenhum documento encontrado. Faça upload de documentos no módulo de Documentos primeiro.
              </p>
            ) : (
              <>
                <Select value={selectedDocId} onValueChange={setSelectedDocId}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Selecione um documento para análise" />
                  </SelectTrigger>
                  <SelectContent>
                    {documentosData.map((doc) => (
                      <SelectItem key={doc.id} value={doc.id} className="text-xs">
                        📄 {doc.file_name}
                        <span className="ml-2 text-muted-foreground">
                          ({format(parseISO(doc.created_at), "dd/MM/yyyy", { locale: ptBR })})
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex flex-wrap gap-2">
                  {ANALYSIS_TYPES.map((at) => (
                    <button
                      key={at.value}
                      onClick={() => setAnalysisType(at.value)}
                      className={cn(
                        "rounded-lg border px-3 py-1.5 text-xs transition-colors",
                        analysisType === at.value
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-background text-foreground hover:bg-muted"
                      )}
                    >
                      <span className="mr-1">{at.icon}</span>
                      {at.label}
                    </button>
                  ))}
                </div>
                {selectedDocId && (
                  <div className="space-y-2">
                    <Textarea
                      value={analysisInstructions}
                      onChange={(e) => setAnalysisInstructions(e.target.value)}
                      placeholder="Instruções adicionais (opcional): ex. 'foque nas cláusulas penais'"
                      rows={2}
                      className="resize-none text-sm"
                    />
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => { setActivePanel(null); setSelectedDocId(""); setAnalysisInstructions(""); }}>
                        Cancelar
                      </Button>
                      <Button size="sm" onClick={handleAnalyzeDoc} disabled={isStreaming}>
                        {isStreaming ? (
                          <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Analisando...</>
                        ) : (
                          <><FileSearch className="mr-1.5 h-3.5 w-3.5" />Analisar</>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Document Generation Panel */}
      {activePanel === "doc" && (
        <div className="border-b border-border/60 bg-muted/30 px-4 py-4 animate-in slide-in-from-top-2">
          <div className="mx-auto max-w-2xl space-y-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-medium text-foreground">Gerar Documento Jurídico</h3>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {DOC_TYPES.map((dt) => (
                <button
                  key={dt.value}
                  onClick={() => setSelectedDocType(selectedDocType === dt.value ? "" : dt.value)}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-left text-xs transition-colors",
                    selectedDocType === dt.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background text-foreground hover:bg-muted"
                  )}
                >
                  <span className="mr-1">{dt.icon}</span>
                  {dt.label}
                </button>
              ))}
            </div>
            {selectedDocType && (
              <div className="space-y-2">
                <Textarea
                  value={docInstructions}
                  onChange={(e) => setDocInstructions(e.target.value)}
                  placeholder="Instruções adicionais (opcional): ex. 'para ação de despejo, comarca de São Paulo'"
                  rows={2}
                  className="resize-none text-sm"
                />
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => { setActivePanel(null); setSelectedDocType(""); setDocInstructions(""); }}>
                    Cancelar
                  </Button>
                  <Button size="sm" onClick={handleGenerateDoc} disabled={isGeneratingDoc}>
                    {isGeneratingDoc ? (
                      <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Gerando...</>
                    ) : (
                      <><FileText className="mr-1.5 h-3.5 w-3.5" />Gerar e Salvar</>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-6">
        {displayMessages.length === 0 && !isLoading ? (
          <div className="mx-auto max-w-2xl space-y-6">
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 overflow-hidden">
                <img src={arunaAvatar} alt="ARUNA" className="h-7 w-7 object-cover" />
              </div>
              <div className="rounded-2xl rounded-tl-sm bg-muted px-4 py-3">
                <div className="prose prose-sm max-w-none text-foreground">
                  <ReactMarkdown>{ARUNA_GREETING}</ReactMarkdown>
                </div>
              </div>
            </div>
            <div className="ml-11 flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => setInput(s)}
                  className="rounded-full border border-border bg-background px-4 py-2 text-xs text-foreground transition-colors hover:bg-muted"
                >
                  <Sparkles className="mr-1.5 inline h-3 w-3 text-primary" />
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-2xl space-y-4">
            {displayMessages.map((msg) => (
              <div
                key={msg.id}
                className={cn("flex gap-3", msg.role === "user" && "flex-row-reverse")}
              >
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full overflow-hidden",
                    msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-primary/10"
                  )}
                >
                  {msg.role === "user" ? (
                    <User className="h-4 w-4" />
                  ) : (
                    <img src={arunaAvatar} alt="ARUNA" className="h-7 w-7 object-cover" />
                  )}
                </div>
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-3",
                    msg.role === "user"
                      ? "rounded-tr-sm bg-primary text-primary-foreground"
                      : "rounded-tl-sm bg-muted text-foreground"
                  )}
                >
                  {msg.role === "assistant" ? (
                    <div className="prose prose-sm max-w-none text-foreground">
                      <ReactMarkdown>{msg.content || "..."}</ReactMarkdown>
                    </div>
                  ) : (
                    <div className="prose prose-sm max-w-none text-primary-foreground prose-strong:text-primary-foreground">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  )}
                  <p
                    className={cn(
                      "mt-1 text-[10px]",
                      msg.role === "user" ? "text-primary-foreground/60" : "text-muted-foreground"
                    )}
                  >
                    {format(parseISO(msg.created_at), "HH:mm", { locale: ptBR })}
                  </p>
                </div>
              </div>
            ))}
            {isStreaming &&
              displayMessages[displayMessages.length - 1]?.role !== "assistant" && (
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 overflow-hidden">
                    <img src={arunaAvatar} alt="ARUNA" className="h-7 w-7 object-cover" />
                  </div>
                  <div className="rounded-2xl rounded-tl-sm bg-muted px-4 py-3">
                    <div className="flex gap-1">
                      <span className="h-2 w-2 animate-bounce rounded-full bg-primary/40" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-primary/40 [animation-delay:0.15s]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-primary/40 [animation-delay:0.3s]" />
                    </div>
                  </div>
                </div>
              )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border/60 pt-4">
        <div className="mx-auto flex max-w-2xl gap-3">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite sua mensagem para a ARUNA..."
            rows={1}
            className="min-h-[44px] resize-none"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
            size="icon"
            className="h-11 w-11 shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="mx-auto mt-2 max-w-2xl text-center text-[10px] text-muted-foreground">
          ARUNA pode cometer erros. Verifique informações importantes.
        </p>
      </div>
    </div>
  );
}
