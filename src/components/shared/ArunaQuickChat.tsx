import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Send, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import arunaAvatar from "@/assets/aruna-avatar.png";
import ReactMarkdown from "react-markdown";

const BASE_URL = import.meta.env.VITE_SUPABASE_URL;
const CHAT_URL = `${BASE_URL}/functions/v1/aruna-chat`;
const AUTH_HEADER = { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` };

interface Msg {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export default function ArunaQuickChat() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [streaming, setStreaming] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const { data: profileData } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("organization_id").eq("user_id", user!.id).single();
      return data;
    },
    enabled: !!user?.id,
  });
  const orgId = profileData?.organization_id;

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const stream = useCallback(async (url: string, body: Record<string, unknown>, aId: string) => {
    let content = "";
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...AUTH_HEADER },
      body: JSON.stringify(body),
    });
    if (!resp.ok) throw new Error(`Erro ${resp.status}`);
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
        if (!ln.startsWith("data: ") || ln.startsWith(":")) continue;
        const js = ln.slice(6).trim();
        if (js === "[DONE]") break;
        try {
          const c = JSON.parse(js).choices?.[0]?.delta?.content;
          if (c) { content += c; setMsgs((p) => p.map((m) => m.id === aId ? { ...m, content } : m)); }
        } catch { break; }
      }
    }
    return content;
  }, []);

  const handleSend = async () => {
    const t = input.trim();
    if (!t || streaming || !orgId) return;
    const userMsg: Msg = { id: crypto.randomUUID(), role: "user", content: t };
    setMsgs((p) => [...p, userMsg]);
    setInput("");
    setStreaming(true);
    const aId = crypto.randomUUID();
    setMsgs((p) => [...p, { id: aId, role: "assistant", content: "" }]);
    try {
      const history = [...msgs, userMsg].slice(-10).map((m) => ({ role: m.role, content: m.content }));
      await stream(CHAT_URL, { messages: history, context: {} }, aId);
    } catch {
      setMsgs((p) => p.filter((m) => m.id !== aId));
    } finally { setStreaming(false); }
  };

  return (
    <>
      {/* Floating button */}
      <motion.button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary shadow-lg shadow-primary/25 text-primary-foreground transition-transform hover:scale-105 active:scale-95"
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        aria-label="Chat com ARUNA"
      >
        <Bot className="h-6 w-6" />
        <span className="absolute -top-1 -right-1 flex h-4 w-4">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-50" />
          <span className="relative inline-flex h-4 w-4 rounded-full bg-accent" />
        </span>
      </motion.button>

      {/* Chat modal */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed bottom-24 right-6 z-50 flex h-[480px] w-[380px] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-border bg-gradient-to-r from-primary/5 to-accent/5 px-4 py-3">
              <img src={arunaAvatar} alt="ARUNA" className="h-9 w-9 rounded-full object-cover" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  ARUNA <Sparkles className="h-3 w-3 text-accent" />
                </p>
                <p className="text-[11px] text-muted-foreground">Assistente Jurídica IA</p>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {msgs.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <Bot className="h-10 w-10 text-muted-foreground/20 mb-3" />
                  <p className="text-sm text-muted-foreground">Pergunte algo à ARUNA</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Ex: "Quais prazos vencem amanhã?"</p>
                </div>
              )}
              {msgs.map((m) => (
                <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  }`}>
                    {m.role === "assistant" ? (
                      <div className="prose prose-sm max-w-none [&_p]:mb-1 [&_p]:leading-relaxed text-foreground">
                        <ReactMarkdown>{m.content || "..."}</ReactMarkdown>
                      </div>
                    ) : m.content}
                  </div>
                </div>
              ))}
              <div ref={endRef} />
            </div>

            {/* Input */}
            <div className="border-t border-border p-3">
              <div className="flex items-end gap-2">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder="Pergunte à ARUNA..."
                  className="min-h-[36px] max-h-[80px] resize-none text-sm"
                  rows={1}
                />
                <Button size="icon" className="h-9 w-9 shrink-0" onClick={handleSend} disabled={streaming || !input.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
