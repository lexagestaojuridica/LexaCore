import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Bot, Send, Sparkles, User, Trash2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import iconLexa from "@/assets/icon-lexa.png";

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

export default function IAPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState("");

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

  const { data: messages = [], isLoading } = useQuery({
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

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!profileData?.organization_id) throw new Error("Organização não encontrada");
      // Save user message
      const { error } = await supabase.from("conversas_ia").insert({
        content,
        role: "user",
        user_id: user!.id,
        organization_id: profileData.organization_id,
      });
      if (error) throw error;

      // Simulate ARUNA response (will be replaced with real AI later)
      const response = generateArunaResponse(content);
      const { error: err2 } = await supabase.from("conversas_ia").insert({
        content: response,
        role: "assistant",
        user_id: user!.id,
        organization_id: profileData.organization_id,
      });
      if (err2) throw err2;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversas_ia", user?.id] });
      setInput("");
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || sendMutation.isPending) return;
    sendMutation.mutate(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

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
        {messages.length === 0 && !isLoading ? (
          <div className="mx-auto max-w-2xl space-y-6">
            {/* Greeting */}
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <img src={iconLexa} alt="ARUNA" className="h-5 w-5" />
              </div>
              <div className="rounded-2xl rounded-tl-sm bg-muted px-4 py-3">
                <p className="whitespace-pre-line text-sm text-foreground leading-relaxed">
                  {ARUNA_GREETING.split("**").map((part, i) =>
                    i % 2 === 1 ? (
                      <strong key={i} className="text-primary">{part}</strong>
                    ) : (
                      part
                    )
                  )}
                </p>
              </div>
            </div>
            {/* Suggestions */}
            <div className="ml-11 flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setInput(s);
                  }}
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
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "flex gap-3",
                  msg.role === "user" && "flex-row-reverse"
                )}
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
                  <p className="whitespace-pre-line text-sm leading-relaxed">
                    {msg.content}
                  </p>
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
            {sendMutation.isPending && (
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
            disabled={!input.trim() || sendMutation.isPending}
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

// Temporary local response generator — will be replaced with real AI
function generateArunaResponse(input: string): string {
  const lower = input.toLowerCase();
  if (lower.includes("prazo") || lower.includes("vence")) {
    return "📅 Consultei sua agenda e no momento não encontrei prazos cadastrados para esta semana. Deseja que eu ajude a criar um lembrete de prazo?";
  }
  if (lower.includes("processo") || lower.includes("resum")) {
    return "📋 Para resumir um processo específico, me informe o número ou título do processo. Posso analisar as informações cadastradas e gerar um resumo completo com as últimas movimentações.";
  }
  if (lower.includes("petição") || lower.includes("minuta") || lower.includes("procuração") || lower.includes("modelo")) {
    return "📝 Posso ajudar a gerar modelos de documentos jurídicos! Por favor, especifique:\n\n• Tipo do documento (petição, procuração, contestação, etc.)\n• Dados das partes envolvidas\n• Contexto ou finalidade\n\nAssim consigo gerar um modelo adequado para sua necessidade.";
  }
  if (lower.includes("cliente")) {
    return "👥 Para consultar informações sobre clientes, posso verificar os dados cadastrados no sistema. Me diga o nome do cliente ou que tipo de informação você precisa.";
  }
  if (lower.includes("olá") || lower.includes("oi") || lower.includes("bom dia") || lower.includes("boa tarde") || lower.includes("boa noite")) {
    return "Olá! 👋 Como posso ajudar você hoje? Estou pronta para auxiliar com processos, prazos, documentos ou qualquer questão jurídica.";
  }
  return "Entendi sua solicitação. No momento estou operando em modo demonstração, mas em breve terei acesso completo à IA para fornecer respostas mais precisas e detalhadas.\n\nPosso ajudar com:\n• Consultas a processos e clientes cadastrados\n• Gerenciamento de prazos e compromissos\n• Geração de modelos de documentos\n\nO que mais posso fazer por você?";
}
