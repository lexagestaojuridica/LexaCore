import { useState, useRef, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Sparkles, User, Trash2, FileText, Loader2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import arunaAvatar from "@/assets/aruna-avatar.png";
import ReactMarkdown from "react-markdown";

interface Message {
  id: string;
  role: string;
  content: string;
  created_at: string;
}

interface LocalMsg {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

const ARUNA_GREETING = `Olá! Eu sou a **ARUNA**, sua assistente jurídica inteligente. 🏛️

Estou aqui para ajudar com o dia a dia do seu escritório. Posso:

• **Resumir processos** e atualizações
• **Gerar minutas** e petições
• **Consultar prazos** e compromissos
• **Analisar documentos** jurídicos
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

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/aruna-chat`;
const DOC_GEN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/aruna-generate-doc`;

export default function IAPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState("");
  const [localMessages, setLocalMessages] = useState<LocalMsg[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isGeneratingDoc, setIsGeneratingDoc] = useState(false);
  const [showDocPanel, setShowDocPanel] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState("");
  const [docInstructions, setDocInstructions] = useState("");

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

  // Fetch office context data
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

  const officeContext = useMemo(() => ({
    processos: processosData?.map((p: any) => ({
      ...p,
      client_name: p.clients?.name,
      clients: undefined,
    })) || [],
    clientes: clientesData || [],
    eventos: eventosData || [],
  }), [processosData, clientesData, eventosData]);

  // Load persisted messages on mount
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

  // Sync db messages to local state once
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

    // Save user message to DB
    await supabase.from("conversas_ia").insert({
      content: trimmed,
      role: "user",
      user_id: user!.id,
      organization_id: orgId,
    });

    // Build conversation history for AI (last 20 messages for context)
    const historyForAI = [...localMessages, userMsg]
      .slice(-20)
      .map((m) => ({ role: m.role, content: m.content }));

    let assistantContent = "";
    const assistantId = crypto.randomUUID();

    // Add empty assistant message
    setLocalMessages((prev) => [
      ...prev,
      { id: assistantId, role: "assistant", content: "", created_at: new Date().toISOString() },
    ]);

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: historyForAI, context: officeContext }),
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
                prev.map((m) =>
                  m.id === assistantId ? { ...m, content: assistantContent } : m
                )
              );
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Flush remaining buffer
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
                prev.map((m) =>
                  m.id === assistantId ? { ...m, content: assistantContent } : m
                )
              );
            }
          } catch {}
        }
      }

      // Persist assistant message
      if (assistantContent) {
        await supabase.from("conversas_ia").insert({
          content: assistantContent,
          role: "assistant",
          user_id: user!.id,
          organization_id: orgId,
        });
      }
    } catch (e: any) {
      toast({
        title: "Erro na ARUNA",
        description: e.message || "Não foi possível obter resposta.",
        variant: "destructive",
      });
      // Remove empty assistant message on error
      setLocalMessages((prev) => prev.filter((m) => m.id !== assistantId));
    } finally {
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearHistory = async () => {
    if (!user?.id || isStreaming) return;
    try {
      const { error } = await supabase
        .from("conversas_ia")
        .delete()
        .eq("user_id", user.id);
      if (error) throw error;
      setLocalMessages([]);
      queryClient.invalidateQueries({ queryKey: ["conversas_ia", user.id] });
      toast({ title: "Histórico limpo", description: "Todas as conversas foram removidas." });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message || "Não foi possível limpar o histórico.", variant: "destructive" });
    }
  };

  const handleGenerateDoc = async () => {
    if (!selectedDocType || !orgId || !user?.id || isGeneratingDoc) return;

    setIsGeneratingDoc(true);
    const docLabel = DOC_TYPES.find((d) => d.value === selectedDocType)?.label || "Documento";

    // Add a user message about the generation
    const userMsg: LocalMsg = {
      id: crypto.randomUUID(),
      role: "user",
      content: `📝 Gerar documento: **${docLabel}**${docInstructions ? `\n\nInstruções: ${docInstructions}` : ""}`,
      created_at: new Date().toISOString(),
    };
    setLocalMessages((prev) => [...prev, userMsg]);
    setShowDocPanel(false);

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
          doc_type: selectedDocType,
          instructions: docInstructions,
          organization_id: orgId,
          user_id: user.id,
        }),
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || `Erro ${resp.status}`);
      }

      const result = await resp.json();

      const successContent = `${result.message}\n\n**Arquivo:** ${result.document.file_name}\n\nO documento foi salvo automaticamente no módulo de **Documentos**. Você pode acessá-lo lá para baixar ou visualizar.\n\n---\n\n**Prévia do conteúdo:**\n\n${result.content_preview}${result.content_preview.length >= 500 ? "..." : ""}`;

      setLocalMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, content: successContent } : m
        )
      );

      // Save both messages to DB
      await supabase.from("conversas_ia").insert([
        { content: userMsg.content, role: "user", user_id: user.id, organization_id: orgId },
        { content: successContent, role: "assistant", user_id: user.id, organization_id: orgId },
      ]);

      // Invalidate documents query so the list updates
      queryClient.invalidateQueries({ queryKey: ["documentos"] });

      toast({ title: "Documento gerado!", description: `${docLabel} criado e salvo com sucesso.` });
    } catch (e: any) {
      setLocalMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: `❌ Erro ao gerar documento: ${e.message}` }
            : m
        )
      );
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setIsGeneratingDoc(false);
      setSelectedDocType("");
      setDocInstructions("");
    }
  };

  const displayMessages = localMessages.length > 0 ? localMessages : [];

  return (
    <div className="flex h-[calc(100vh-6rem)] flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border pb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 overflow-hidden">
          <img src={arunaAvatar} alt="ARUNA" className="h-8 w-8 object-cover" />
        </div>
        <div>
          <h1 className="font-display text-xl text-foreground">ARUNA</h1>
          <p className="text-xs text-muted-foreground">
            Assistente Jurídica com Inteligência Artificial
          </p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDocPanel(!showDocPanel)}
            disabled={isStreaming || isGeneratingDoc}
            className="text-primary"
          >
            <FileText className="mr-1.5 h-4 w-4" />
            Gerar Documento
          </Button>
          {displayMessages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearHistory}
              disabled={isStreaming}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="mr-1.5 h-4 w-4" />
              Limpar
            </Button>
          )}
          <div className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-xs text-emerald-600">Online</span>
          </div>
        </div>
      </div>

      {/* Document Generation Panel */}
      {showDocPanel && (
        <div className="border-b border-border bg-muted/30 px-4 py-4">
          <div className="mx-auto max-w-2xl space-y-3">
            <h3 className="text-sm font-medium text-foreground">📝 Gerar Documento Jurídico</h3>
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
                  <Button variant="ghost" size="sm" onClick={() => { setShowDocPanel(false); setSelectedDocType(""); setDocInstructions(""); }}>
                    Cancelar
                  </Button>
                  <Button size="sm" onClick={handleGenerateDoc} disabled={isGeneratingDoc}>
                    {isGeneratingDoc ? (
                      <>
                        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                        Gerando...
                      </>
                    ) : (
                      <>
                        <FileText className="mr-1.5 h-4 w-4" />
                        Gerar e Salvar
                      </>
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
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-primary/10"
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
                    <p className="whitespace-pre-line text-sm leading-relaxed">
                      {msg.content}
                    </p>
                  )}
                  <p
                    className={cn(
                      "mt-1 text-[10px]",
                      msg.role === "user"
                        ? "text-primary-foreground/60"
                        : "text-muted-foreground"
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
      <div className="border-t border-border pt-4">
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
