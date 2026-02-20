import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format, isToday, isYesterday, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
    MessageSquare, Plus, Send, Hash, Users, Scale, Building2, Search,
    MoreVertical, Trash2, Archive, ChevronRight, Smile, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import FormField from "@/components/shared/FormField";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types ────────────────────────────────────────────────────

interface Channel {
    id: string;
    name: string;
    type: "general" | "process" | "direct" | "unit";
    is_archived: boolean;
    created_at: string;
}

interface Message {
    id: string;
    channel_id: string;
    user_id: string;
    content: string;
    created_at: string;
    is_edited: boolean;
    profiles?: { full_name: string | null; avatar_url: string | null } | null;
}

const CHANNEL_ICONS: Record<string, any> = {
    general: Hash,
    process: Scale,
    direct: Users,
    unit: Building2,
};

const CHANNEL_LABELS: Record<string, string> = {
    general: "Geral",
    process: "Processo",
    direct: "Direto",
    unit: "Unidade",
};

// ─── ChatPage ─────────────────────────────────────────────────

export default function ChatPage() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
    const [newChannelOpen, setNewChannelOpen] = useState(false);
    const [channelForm, setChannelForm] = useState({ name: "", type: "general" });
    const [messageText, setMessageText] = useState("");
    const [searchChannels, setSearchChannels] = useState("");
    const scrollRef = useRef<HTMLDivElement>(null);

    const { data: profile } = useQuery({
        queryKey: ["profile", user?.id],
        queryFn: async () => {
            const { data } = await supabase.from("profiles").select("organization_id, full_name, avatar_url").eq("user_id", user!.id).single();
            return data;
        },
        enabled: !!user,
    });
    const orgId = profile?.organization_id;

    // ── Channels ────────────────────────────────────────────

    const { data: channels = [], isLoading: channelsLoading } = useQuery({
        queryKey: ["chat-channels", orgId],
        queryFn: async () => {
            const { data, error } = await (supabase
                .from("chat_channels")
                .select("*")
                .eq("organization_id", orgId!)
                .eq("is_archived", false)
                .order("type")
                .order("name") as any);
            if (error) throw error;
            return (data || []) as Channel[];
        },
        enabled: !!orgId,
    });

    const createChannelMutation = useMutation({
        mutationFn: async (payload: any) => {
            const { error } = await supabase.from("chat_channels").insert(payload);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["chat-channels"] });
            toast.success("Canal criado!");
            setNewChannelOpen(false);
            setChannelForm({ name: "", type: "general" });
        },
        onError: (e: any) => toast.error(e.message),
    });

    // ── Messages ────────────────────────────────────────────

    const { data: messages = [], isLoading: messagesLoading } = useQuery({
        queryKey: ["chat-messages", selectedChannel?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("chat_messages")
                .select("*, profiles:user_id(full_name, avatar_url)")
                .eq("channel_id", selectedChannel!.id)
                .order("created_at", { ascending: true })
                .limit(200);
            if (error) throw error;
            return (data || []) as Message[];
        },
        enabled: !!selectedChannel,
    });

    // ── Realtime subscription ───────────────────────────────

    useEffect(() => {
        if (!selectedChannel) return;

        const channel = supabase
            .channel(`chat:${selectedChannel.id}`)
            .on(
                "postgres_changes",
                { event: "INSERT", schema: "public", table: "chat_messages", filter: `channel_id=eq.${selectedChannel.id}` },
                () => {
                    queryClient.invalidateQueries({ queryKey: ["chat-messages", selectedChannel.id] });
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [selectedChannel?.id, queryClient]);

    // ── Auto scroll ─────────────────────────────────────────

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages.length]);

    // ── Send message ────────────────────────────────────────

    const sendMutation = useMutation({
        mutationFn: async (content: string) => {
            const { error } = await supabase.from("chat_messages").insert({
                channel_id: selectedChannel!.id,
                user_id: user!.id,
                content,
            });
            if (error) throw error;
        },
        onSuccess: () => {
            setMessageText("");
            queryClient.invalidateQueries({ queryKey: ["chat-messages", selectedChannel?.id] });
        },
        onError: (e: any) => toast.error(e.message),
    });

    const handleSend = () => {
        const text = messageText.trim();
        if (!text || !selectedChannel) return;
        sendMutation.mutate(text);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // ── Helpers ─────────────────────────────────────────────

    const formatMsgDate = (dateStr: string) => {
        const d = parseISO(dateStr);
        if (isToday(d)) return format(d, "'Hoje' HH:mm");
        if (isYesterday(d)) return format(d, "'Ontem' HH:mm");
        return format(d, "dd/MM HH:mm");
    };

    const getInitials = (name: string | null) =>
        (name || "?").split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();

    const filteredChannels = channels.filter((c) =>
        !searchChannels || c.name.toLowerCase().includes(searchChannels.toLowerCase())
    );

    // Group channels by type
    const grouped = filteredChannels.reduce((acc, ch) => {
        acc[ch.type] = acc[ch.type] || [];
        acc[ch.type].push(ch);
        return acc;
    }, {} as Record<string, Channel[]>);

    return (
        <div className="flex h-[calc(100vh-140px)] gap-0 rounded-xl border border-border overflow-hidden bg-card">
            {/* ── Sidebar ── */}
            <div className="w-72 shrink-0 border-r border-border flex flex-col bg-muted/5">
                <div className="flex items-center justify-between p-4 border-b border-border/50">
                    <h2 className="font-semibold text-sm text-foreground">Chat Interno</h2>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setNewChannelOpen(true)}>
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>

                <div className="p-3">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Buscar canais..."
                            value={searchChannels}
                            onChange={(e) => setSearchChannels(e.target.value)}
                            className="h-8 pl-8 text-xs"
                        />
                    </div>
                </div>

                <ScrollArea className="flex-1 px-2 pb-2">
                    {channelsLoading ? (
                        <div className="space-y-2 p-2">
                            {[1, 2, 3, 4].map((n) => (
                                <div key={n} className="h-9 rounded-lg bg-muted/40 animate-pulse" />
                            ))}
                        </div>
                    ) : Object.keys(grouped).length === 0 ? (
                        <div className="flex flex-col items-center py-10 text-center px-4">
                            <MessageSquare className="h-8 w-8 text-muted-foreground/20 mb-2" />
                            <p className="text-xs text-muted-foreground">Nenhum canal ainda</p>
                            <Button variant="link" size="sm" className="text-xs mt-1" onClick={() => setNewChannelOpen(true)}>
                                Criar o primeiro canal
                            </Button>
                        </div>
                    ) : (
                        Object.entries(grouped).map(([type, chs]) => {
                            const TypeIcon = CHANNEL_ICONS[type] || Hash;
                            return (
                                <div key={type} className="mb-3">
                                    <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                                        {CHANNEL_LABELS[type] || type}
                                    </p>
                                    {chs.map((ch) => (
                                        <button
                                            key={ch.id}
                                            onClick={() => setSelectedChannel(ch)}
                                            className={cn(
                                                "flex items-center gap-2 w-full rounded-lg px-2.5 py-2 text-xs transition-colors text-left",
                                                selectedChannel?.id === ch.id
                                                    ? "bg-primary/10 text-primary font-medium"
                                                    : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                                            )}
                                        >
                                            <TypeIcon className="h-3.5 w-3.5 shrink-0" />
                                            <span className="truncate">{ch.name}</span>
                                        </button>
                                    ))}
                                </div>
                            );
                        })
                    )}
                </ScrollArea>
            </div>

            {/* ── Main Chat Area ── */}
            <div className="flex-1 flex flex-col">
                {!selectedChannel ? (
                    <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/5">
                            <MessageSquare className="h-8 w-8 text-primary/40" />
                        </div>
                        <h3 className="text-lg font-semibold text-foreground">Selecione um canal</h3>
                        <p className="text-sm text-muted-foreground max-w-xs">
                            Escolha um canal no menu lateral ou crie um novo para começar a conversar com a equipe.
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-border px-5 py-3">
                            <div className="flex items-center gap-2.5">
                                {(() => { const I = CHANNEL_ICONS[selectedChannel.type] || Hash; return <I className="h-4 w-4 text-primary" />; })()}
                                <div>
                                    <p className="text-sm font-semibold text-foreground">{selectedChannel.name}</p>
                                    <p className="text-[10px] text-muted-foreground capitalize">{CHANNEL_LABELS[selectedChannel.type]}</p>
                                </div>
                            </div>
                            <Badge variant="outline" className="text-[10px]">{messages.length} mensagens</Badge>
                        </div>

                        {/* Messages */}
                        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                            {messagesLoading ? (
                                <div className="flex items-center justify-center py-20">
                                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                </div>
                            ) : messages.length === 0 ? (
                                <div className="flex flex-col items-center py-20 text-center">
                                    <MessageSquare className="h-10 w-10 text-muted-foreground/15 mb-2" />
                                    <p className="text-sm text-muted-foreground">Nenhuma mensagem ainda. Envie a primeira!</p>
                                </div>
                            ) : (
                                <AnimatePresence initial={false}>
                                    {messages.map((msg, i) => {
                                        const isMe = msg.user_id === user?.id;
                                        const name = (msg.profiles as any)?.full_name || "Usuário";
                                        const prev = messages[i - 1];
                                        const showAvatar = !prev || prev.user_id !== msg.user_id;

                                        return (
                                            <motion.div
                                                key={msg.id}
                                                initial={{ opacity: 0, y: 6 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className={cn("flex gap-2.5", isMe && "flex-row-reverse")}
                                            >
                                                {showAvatar ? (
                                                    <div className={cn(
                                                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                                                        isMe ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                                                    )}>
                                                        {getInitials(name)}
                                                    </div>
                                                ) : (
                                                    <div className="w-8 shrink-0" />
                                                )}
                                                <div className={cn("max-w-[70%] space-y-0.5", isMe && "text-right")}>
                                                    {showAvatar && (
                                                        <div className={cn("flex items-center gap-2 text-[10px] text-muted-foreground", isMe && "justify-end")}>
                                                            <span className="font-medium text-foreground/70">{isMe ? "Você" : name}</span>
                                                            <span>{formatMsgDate(msg.created_at)}</span>
                                                        </div>
                                                    )}
                                                    <div className={cn(
                                                        "inline-block rounded-2xl px-3.5 py-2 text-sm leading-relaxed",
                                                        isMe
                                                            ? "bg-primary text-primary-foreground rounded-tr-md"
                                                            : "bg-muted/60 text-foreground rounded-tl-md"
                                                    )}>
                                                        {msg.content}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </AnimatePresence>
                            )}
                        </div>

                        {/* Input */}
                        <div className="border-t border-border px-4 py-3">
                            <div className="flex items-end gap-2">
                                <div className="relative flex-1">
                                    <Textarea
                                        placeholder={`Mensagem em #${selectedChannel.name}...`}
                                        value={messageText}
                                        onChange={(e) => setMessageText(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        rows={1}
                                        className="min-h-[40px] max-h-[120px] resize-none pr-10 text-sm"
                                    />
                                </div>
                                <Button
                                    size="icon"
                                    className="h-10 w-10 shrink-0"
                                    disabled={!messageText.trim() || sendMutation.isPending}
                                    onClick={handleSend}
                                >
                                    {sendMutation.isPending ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Send className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* ── New Channel Dialog ── */}
            <Dialog open={newChannelOpen} onOpenChange={setNewChannelOpen}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Novo Canal</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <FormField
                            label="Nome do Canal"
                            value={channelForm.name}
                            onChange={(v) => setChannelForm({ ...channelForm, name: v })}
                            placeholder="Ex: Equipe Trabalhista"
                            required
                        />
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tipo</label>
                            <Select value={channelForm.type} onValueChange={(v) => setChannelForm({ ...channelForm, type: v })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="general">Geral</SelectItem>
                                    <SelectItem value="process">Processo</SelectItem>
                                    <SelectItem value="unit">Unidade</SelectItem>
                                    <SelectItem value="direct">Direto</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setNewChannelOpen(false)}>Cancelar</Button>
                        <Button
                            disabled={!channelForm.name.trim() || createChannelMutation.isPending}
                            onClick={() => {
                                if (!channelForm.name.trim() || !orgId) return;
                                createChannelMutation.mutate({
                                    name: channelForm.name,
                                    type: channelForm.type,
                                    organization_id: orgId,
                                    created_by: user!.id,
                                });
                            }}
                        >
                            Criar Canal
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
