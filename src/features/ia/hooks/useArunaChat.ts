import { useState, useCallback, useMemo } from "react";
import { trpc } from "@/shared/lib/trpc";
import { useSession } from "@clerk/nextjs";
import { useToast } from "@/shared/hooks/use-toast";

import type { ArunaMessage, ArunaChatOptions, ArunaContext } from "../types";

const CHAT_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/aruna-chat`;

export function useArunaChat(options: ArunaChatOptions = {}) {
  const { session } = useSession();
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const [streaming, setStreaming] = useState(false);
  const [tempMsgs, setTempMsgs] = useState<ArunaMessage[]>([]);

  const historyQuery = trpc.ia.listHistory.useQuery(undefined, {
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const { data: history = [], isLoading: loadingHistory } = historyQuery;

  const saveMsgMut = trpc.ia.saveMessage.useMutation({
    onSuccess: () => utils.ia.listHistory.invalidate(),
  });

  const clearHistoryMut = trpc.ia.clearHistory.useMutation({
    onSuccess: () => {
      setTempMsgs([]);
      utils.ia.listHistory.invalidate();
    },
  });

  const messages = useMemo(() => {
    const historyMapped: ArunaMessage[] = (history || []).map((h: { id: string; role: string; content: string; created_at?: string }) => ({
      id: h.id,
      role: h.role as "user" | "assistant",
      content: h.content,
      created_at: h.created_at,
    }));

    const filteredTemp = tempMsgs.filter(
      (tm) => !historyMapped.some((hm) => hm.id === tm.id)
    );

    return [...historyMapped, ...filteredTemp];
  }, [history, tempMsgs]);

  const stream = useCallback(async (body: Record<string, unknown>, assistantId: string) => {
    let token: string | null = null;
    try {
      token = await session?.getToken({ template: "supabase" }) ?? null;
    } catch (e) {
      console.warn("Supabase JWT template not found in Clerk");
    }

    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "",
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const errorData = await resp.json().catch(() => ({}));
      throw new Error(errorData.error || `Erro ${resp.status}`);
    }

    if (!resp.body) throw new Error("Sem resposta do servidor");

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let currentContent = "";
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        let nextIndex;

        while ((nextIndex = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, nextIndex).trim();
          buffer = buffer.slice(nextIndex + 1);

          if (!line.startsWith("data: ") || line.includes("[DONE]")) continue;

          try {
            const jsonStr = line.replace("data: ", "");
            const delta = JSON.parse(jsonStr).choices?.[0]?.delta?.content;
            if (delta) {
              currentContent += delta;
              setTempMsgs((prev) =>
                prev.map((m) => (m.id === assistantId ? { ...m, content: currentContent } : m))
              );
            }
          } catch (e) {
            // Ignore parse errors for partial chunks
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return currentContent;
  }, [session]);

  const sendMessage = useCallback(async (text: string, customContext?: ArunaContext) => {
    const trimmedText = text.trim();
    if (!trimmedText || streaming) return;

    const orgId = (session as any)?.publicMetadata?.organizationId as string | undefined;
    if (!orgId) {
      toast({ title: "Erro de Contexto", description: "Organização não identificada.", variant: "destructive" });
      return;
    }

    const userMsgId = crypto.randomUUID();
    const assistantId = crypto.randomUUID();

    // Optimistic UI update
    setTempMsgs((prev) => [
      ...prev,
      { id: userMsgId, role: "user", content: trimmedText },
      { id: assistantId, role: "assistant", content: "" },
    ]);

    setStreaming(true);

    try {
      const context = customContext || options.initialContext;
      const historyContext = messages.slice(-10).map(m => ({ role: m.role, content: m.content }));

      const fullHistory = [...historyContext, { role: "user", content: trimmedText }];

      const finalContent = await stream({
        messages: fullHistory,
        organization_id: orgId,
        context: context || "general_chat",
      }, assistantId);

      // Persist both messages
      await Promise.all([
        saveMsgMut.mutateAsync({ id: userMsgId, role: "user", content: trimmedText }),
        saveMsgMut.mutateAsync({ id: assistantId, role: "assistant", content: finalContent }),
      ]);

      // Remove temp messages now that they are in the database (query invalidation will handle the rest)
      setTempMsgs((prev) => prev.filter((m) => m.id !== userMsgId && m.id !== assistantId));

      options.onSuccess?.(finalContent);
    } catch (error: unknown) {
      console.error("Aruna Chat Error:", error);
      setTempMsgs((prev) => prev.filter((m) => m.id !== assistantId));
      const message = error instanceof Error ? error.message : "Erro desconhecido";
      toast({ title: "Falha na ARUNA", description: message, variant: "destructive" });
      options.onError?.(error instanceof Error ? error : new Error(message));
    } finally {
      setStreaming(false);
    }
  }, [session, streaming, messages, stream, saveMsgMut, options, toast]);

  const clearHistory = useCallback(async () => {
    try {
      await clearHistoryMut.mutateAsync();
      toast({ title: "Histórico limpo com sucesso." });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro desconhecido";
      toast({ title: "Erro ao limpar histórico", description: message, variant: "destructive" });
    }
  }, [clearHistoryMut, toast]);

  /* ─── Add assistant message ────────────────────── */
  const addAssistant = useCallback(() => {
    const id = crypto.randomUUID();
    setTempMsgs((p) => [...p, { id, role: "assistant", content: "", created_at: new Date().toISOString() }]);
    return id;
  }, []);

  /* ─── Add user message ─────────────────────────── */
  const addUser = useCallback((text: string) => {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const msg = { id, role: "user" as const, content: text, created_at: now };
    setTempMsgs((p) => [...p, msg]);
    saveMsgMut.mutate({ id, role: "user", content: text });
    return msg;
  }, [saveMsgMut]);

  return {
    messages,
    setMessages: setTempMsgs,
    sendMessage,
    clearHistory,
    streaming,
    loadingHistory,
    saveMessage: saveMsgMut.mutate,
    historyQuery,
    addUser,
    addAssistant
  };
}
