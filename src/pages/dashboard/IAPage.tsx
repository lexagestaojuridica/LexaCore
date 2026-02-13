import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Sparkles, User } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import iconLexa from "@/assets/icon-lexa.png";
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

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/aruna-chat`;

export default function IAPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState("");
  const [localMessages, setLocalMessages] = useState<LocalMsg[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);

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
    if (!trimmed || isStreaming || !profileData?.organization_id) return;

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
      organization_id: profileData.organization_id,
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
        body: JSON.stringify({ messages: historyForAI }),
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
          organization_id: profileData.organization_id,
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

  const displayMessages = localMessages.length > 0 ? localMessages : [];

  return (
    <div className="flex h-[calc(100vh-6rem)] flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border pb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
          <img src={iconLexa} alt="ARUNA" className="h-6 w-6" />
        </div>
        <div>
          <h1 className="font-display text-xl text-foreground">ARUNA</h1>
          <p className="text-xs text-muted-foreground">
            Assistente Jurídica com Inteligência Artificial
          </p>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <span className="text-xs text-emerald-600">Online</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-6">
        {displayMessages.length === 0 && !isLoading ? (
          <div className="mx-auto max-w-2xl space-y-6">
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <img src={iconLexa} alt="ARUNA" className="h-5 w-5" />
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
                    <img src={iconLexa} alt="ARUNA" className="h-5 w-5" />
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
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <img src={iconLexa} alt="ARUNA" className="h-5 w-5" />
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
