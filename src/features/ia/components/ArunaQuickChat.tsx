import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { trpc } from "@/shared/lib/trpc";
import { motion, AnimatePresence } from "framer-motion";
import { Send, X, Sparkles } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Textarea } from "@/shared/ui/textarea";
import arunaAvatar from "@/assets/aruna-avatar.png";
import ReactMarkdown from "react-markdown";
import Image from "next/image";
import { useUser, useSession } from "@clerk/nextjs";

const BASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const CHAT_URL = `${BASE_URL}/functions/v1/aruna-chat`;

interface Msg {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export default function ArunaQuickChat() {
  const { user } = useUser();
  const { session } = useSession();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const utils = trpc.useUtils();

  const { data: history = [] } = trpc.ia.listHistory.useQuery(undefined, {
    enabled: open,
  });

  const saveMsgMut = trpc.ia.saveMessage.useMutation({
    onSuccess: () => utils.ia.listHistory.invalidate(),
  });

  // Local state for streaming response
  const [localMsgs, setLocalMsgs] = useState<Msg[]>([]);

  // Sync history to localMsgs when not streaming
  useEffect(() => {
    if (!streaming) {
      setLocalMsgs(history.map(h => ({
        id: h.id,
        role: h.role as "user" | "assistant",
        content: h.content
      })));
    }
  }, [history, streaming]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [localMsgs]);

  const stream = useCallback(async (url: string, body: Record<string, unknown>, aId: string) => {
    const token = await session?.getToken({ template: "supabase" });
    let content = "";
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
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
          if (c) {
            content += c;
            setLocalMsgs((p) => p.map((m) => m.id === aId ? { ...m, content } : m));
          }
        } catch { break; }
      }
    }
    return content;
  }, [session]);

  const handleSend = async () => {
    const t = input.trim();
    const orgId = session?.publicMetadata?.organizationId as string;
    if (!t || streaming || !orgId) return;

    const uId = crypto.randomUUID();
    const userMsg: Msg = { id: uId, role: "user", content: t };

    // Save user message immediately to DB
    saveMsgMut.mutate({ id: uId, role: "user", content: t });

    setLocalMsgs((p) => [...p, userMsg]);
    setInput("");
    setStreaming(true);

    const aId = crypto.randomUUID();
    setLocalMsgs((p) => [...p, { id: aId, role: "assistant", content: "" }]);

    try {
      const hist = [...localMsgs, userMsg].slice(-10).map((m) => ({ role: m.role, content: m.content }));
      const content = await stream(CHAT_URL, {
        messages: hist,
        organization_id: orgId,
        context: "quick_chat"
      }, aId);

      // Save assistant message to DB
      saveMsgMut.mutate({ id: aId, role: "assistant", content });
    } catch {
      setLocalMsgs((p) => p.filter((m) => m.id !== aId));
    } finally { setStreaming(false); }
  };

  return (
    <>
      {/* Floating button with ARUNA photo */}
      <motion.button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg shadow-primary/30 transition-transform hover:scale-105 active:scale-95 overflow-hidden border-2 border-accent/40 bg-card"
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        aria-label="Chat com ARUNA"
      >
        <Image src={arunaAvatar} alt="ARUNA" width={56} height={56} className="h-full w-full object-cover scale-110" />
        <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-50" />
          <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-success border border-background" />
        </span>
      </motion.button>

      {/* Chat modal */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95, transformOrigin: 'bottom right' }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="fixed bottom-24 right-6 z-50 flex h-[520px] w-[380px] flex-col overflow-hidden rounded-3xl border border-border/80 bg-card/95 backdrop-blur-xl shadow-2xl ring-1 ring-border/50"
          >
            {/* Header Premium */}
            <div className="flex items-center gap-3 border-b border-border/50 bg-muted/30 px-5 py-4 relative">
              <div className="absolute inset-0 z-0 opacity-[0.02] pointer-events-none mix-blend-overlay" style={{ backgroundImage: "url('data:image/svg+xml,%3Csvg width=\\'60\\' height=\\'60\\' viewBox=\\'0 0 60 60\\' xmlns=\\'http://www.w3.org/2000/svg\\'%3E%3Cg fill=\\'none\\' fill-rule=\\'evenodd\\'%3E%3Cg fill=\\'%239C92AC\\' fill-opacity=\\'1\\'%3E%3Cpath d=\\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')" }} />

              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-[14px] shadow-sm ring-1 ring-border bg-gradient-to-br from-indigo-500/20 to-purple-500/20 p-0.5 z-10">
                <Image src={arunaAvatar} alt="ARUNA" width={40} height={40} className="h-full w-full object-cover rounded-[12px]" />
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-background bg-emerald-500 shadow-sm" />
              </div>
              <div className="flex-1 z-10">
                <p className="text-sm font-bold text-foreground flex items-center gap-1.5 font-display tracking-tight">
                  ARUNA <Sparkles className="h-3.5 w-3.5 text-accent fill-accent animate-pulse" />
                </p>
                <p className="text-[10px] uppercase font-medium tracking-wider text-muted-foreground mt-0.5">Quick Assistant</p>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full z-10 hover:bg-destructive/10 hover:text-destructive" onClick={() => setOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5 scroll-smooth relative">
              {localMsgs.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-4 max-w-[240px] mx-auto">
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 p-1 ring-1 ring-border/50">
                    <Image src={arunaAvatar} alt="ARUNA" width={80} height={80} className="h-full w-full object-cover rounded-[20px] opacity-60 grayscale-[30%]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Acesso Rápido</p>
                    <p className="text-xs text-muted-foreground/80 mt-1 leading-relaxed">Pergunte sobre seus processos ou peça resumos de atividades do dia.</p>
                  </div>
                </div>
              )}
              {localMsgs.map((m) => (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={m.id} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                  {m.role === "assistant" && (
                    <div className="h-8 w-8 shrink-0 overflow-hidden rounded-[10px] bg-gradient-to-br from-indigo-500/20 to-purple-500/20 p-px ring-1 ring-border/50 mt-1">
                      <Image src={arunaAvatar} alt="ARUNA" width={32} height={32} className="h-full w-full object-cover rounded-[8px]" />
                    </div>
                  )}
                  <div className={`shadow-sm px-4 py-3 text-[13px] relative ${m.role === "user"
                    ? "bg-primary text-primary-foreground rounded-2xl rounded-tr-sm max-w-[80%]"
                    : "bg-card border border-border/60 rounded-2xl rounded-tl-sm w-full"
                    }`}>
                    {m.role === "assistant" ? (
                      <div className="prose prose-sm max-w-none text-foreground prose-p:my-1 prose-headings:text-foreground prose-strong:text-foreground prose-a:text-primary">
                        <ReactMarkdown>{m.content || "..."}</ReactMarkdown>
                      </div>
                    ) : (
                      <div className="leading-relaxed whitespace-pre-wrap">{m.content}</div>
                    )}
                  </div>
                </motion.div>
              ))}
              {streaming && localMsgs[localMsgs.length - 1]?.role !== "assistant" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
                  <div className="h-8 w-8 shrink-0 overflow-hidden rounded-[10px] bg-gradient-to-br from-indigo-500/20 to-purple-500/20 p-px ring-1 ring-border/50">
                    <Image src={arunaAvatar} alt="ARUNA" width={32} height={32} className="h-full w-full object-cover rounded-[8px]" />
                  </div>
                  <div className="rounded-2xl rounded-tl-sm bg-card border border-border/60 px-4 py-3 shadow-sm flex items-center justify-center">
                    <div className="flex gap-1.5">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/60" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/60 [animation-delay:0.15s]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/60 [animation-delay:0.3s]" />
                    </div>
                  </div>
                </motion.div>
              )}
              <div ref={endRef} className="h-2" />
            </div>

            {/* Input Premium */}
            <div className="p-3 bg-muted/10 border-t border-border/50 backdrop-blur-md">
              <div className="relative flex items-end gap-2 rounded-2xl border border-border/80 bg-background px-2 py-1.5 shadow-sm focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/50 transition-all">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder="Pergunte à ARUNA..."
                  className="min-h-[40px] max-h-[120px] resize-none border-0 bg-transparent text-sm focus-visible:ring-0 py-2.5 px-2 placeholder:text-muted-foreground/60 w-full"
                  rows={1}
                />
                <Button size="icon" className={`h-9 w-9 shrink-0 rounded-xl mb-1 mr-1 transition-all ${input.trim() ? 'bg-primary shadow-md hover:scale-105' : 'bg-muted text-muted-foreground'}`} onClick={handleSend} disabled={streaming || !input.trim()}>
                  <Send className="h-4 w-4 ml-0.5 mt-0.5" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
