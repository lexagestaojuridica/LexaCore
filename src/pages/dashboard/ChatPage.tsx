import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format, isToday, isYesterday, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
    MessageSquare, Plus, Send, Hash, Users, Scale, Building2, Search,
    MoreVertical, Trash2, Archive, ChevronRight, Smile, Loader2, ArrowLeft
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
    process: "Processos",
    direct: "Direto",
    unit: "Unidades",
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
    const [isMobileListOpen, setIsMobileListOpen] = useState(true);

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
                .order("name", { ascending: true }) as any);
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
            toast.success("Canal criado com sucesso!");
            setNewChannelOpen(false);
            setChannelForm({ name: "", type: "general" });
        },
        onError: (e: any) => toast.error(`Erro ao criar canal: ${e.message}`),
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
                { event: "*", schema: "public", table: "chat_messages", filter: `channel_id=eq.${selectedChannel.id}` },
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
    }, [messages.length, messagesLoading]);

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

    const grouped = filteredChannels.reduce((acc, ch) => {
        acc[ch.type] = acc[ch.type] || [];
        acc[ch.type].push(ch);
        return acc;
    }, {} as Record<string, Channel[]>);

    return (
        <div className="flex h-[calc(100vh-140px)] gap-0 rounded-2xl border border-border overflow-hidden bg-card shadow-sm relative">

            {/* ── Sidebar (Lista de Canais) ── */}
            <div className={cn(
                "absolute md:static inset-y-0 left-0 z-20 w-full md:w-72 shrink-0 border-r border-border flex flex-col bg-muted/10 transition-transform duration-300",
                isMobileListOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
            )}>
                <div className="flex items-center justify-between p-4 border-b border-border/50 bg-card/50 backdrop-blur-sm">
                    <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-primary" />
                        <h2 className="font-semibold text-sm text-foreground">Comunicação</h2>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-primary/10 hover:text-primary" onClick={() => setNewChannelOpen(true)}>
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>

                <div className="p-3">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Buscar canais..."
                            value={searchChannels}
                            onChange={(e) => setSearchChannels(e.target.value)}
                            className="h-9 pl-9 text-xs border-border/50 bg-card/50 focus-visible:ring-primary/20"
                        />
                    </div>
                </div>

                <ScrollArea className="flex-1 px-3 pb-3">
                    {channelsLoading ? (
                        <div className="space-y-3 p-1">
                            {[1, 2, 3, 4, 5].map((n) => (
                                <div key={n} className="h-10 rounded-xl bg-muted/40 animate-pulse" />
                            ))}
                        </div>
                    ) : Object.keys(grouped).length === 0 ? (
                        <div className="flex flex-col items-center py-10 text-center px-4">
                            <MessageSquare className="h-10 w-10 text-muted-foreground/20 mb-3" />
                            <p className="text-sm font-medium text-foreground">Sua equipe está offline</p>
                            <p className="text-xs text-muted-foreground mt-1 mb-4">Crie o primeiro canal corporativo para iniciar.</p>
                            <Button variant="outline" size="sm" className="text-xs w-full" onClick={() => setNewChannelOpen(true)}>
                                Criar Canal
                            </Button>
                        </div>
                    ) : (
                        Object.entries(grouped).map(([type, chs]) => {
                            const TypeIcon = CHANNEL_ICONS[type] || Hash;
                            return (
                                <div key={type} className="mb-4">
                                    <p className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
                                        {CHANNEL_LABELS[type] || type}
                                    </p>
                                    <div className="space-y-0.5">
                                        {chs.map((ch) => (
                                            <button
                                                key={ch.id}
                                                onClick={() => { setSelectedChannel(ch); setIsMobileListOpen(false); }}
                                                className={cn(
                                                    "group flex items-center gap-2.5 w-full rounded-lg px-2.5 py-2 text-sm font-medium transition-all text-left",
                                                    selectedChannel?.id === ch.id
                                                        ? "bg-primary text-primary-foreground shadow-sm"
                                                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                                                )}
                                            >
                                                <div className={cn("p-1 rounded-md", selectedChannel?.id === ch.id ? "bg-white/20" : "bg-background group-hover:bg-muted/80")}>
                                                    <TypeIcon className={cn("h-3.5 w-3.5", selectedChannel?.id === ch.id ? "text-primary-foreground" : "text-muted-foreground")} />
                                                </div>
                                                <span className="truncate">{ch.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </ScrollArea>
                {/* User info at bottom */}
                <div className="border-t border-border/50 p-3 bg-muted/20">
                    <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-primary text-xs font-bold shrink-0">
                            {getInitials(profile?.full_name)}
                        </div>
                        <div className="truncate min-w-0">
                            <p className="text-xs font-bold text-foreground truncate">{profile?.full_name || "Usuário"}</p>
                            <p className="text-[10px] text-emerald-500 font-medium flex items-center gap-1.5 mt-0.5">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </span>
                                Online
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Main Chat Area ── */}
            <div className="flex-1 flex flex-col bg-background relative z-10 w-full">
                {!selectedChannel ? (
                    <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-8 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-muted/20 via-background to-background">
                        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/5 ring-1 ring-primary/10 shadow-sm">
                            <MessageSquare className="h-10 w-10 text-primary/40" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-foreground tracking-tight">Lexa Comm</h3>
                            <p className="text-sm text-muted-foreground max-w-sm mt-2 leading-relaxed">
                                Plataforma de comunicação interna da sua organização. Selecione um canal na lateral para acessar as mensagens.
                            </p>
                        </div>
                        <Button className="mt-4 md:hidden" onClick={() => setIsMobileListOpen(true)}>Visualizar Canais</Button>
                    </div>
                ) : (
                    <>
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-border/60 px-5 py-3.5 bg-card/80 backdrop-blur-md z-10">
                            <div className="flex items-center gap-3">
                                <Button variant="ghost" size="icon" className="md:hidden h-8 w-8 -ml-2 text-muted-foreground mr-1" onClick={() => setIsMobileListOpen(true)}>
                                    <ArrowLeft className="h-4 w-4" />
                                </Button>
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                                    {(() => { const I = CHANNEL_ICONS[selectedChannel.type] || Hash; return <I className="h-5 w-5 text-primary" />; })()}
                                </div>
                                <div>
                                    <p className="text-base font-bold text-foreground leading-none mb-1.5 flex items-center gap-2">
                                        {selectedChannel.name}
                                    </p>
                                    <p className="text-[11px] font-medium text-muted-foreground/80 tracking-wide uppercase px-0">{CHANNEL_LABELS[selectedChannel.type]}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="bg-muted/50 text-muted-foreground text-[10px] hidden sm:flex">{messages.length} mensagens</Badge>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground"><MoreVertical className="h-4 w-4" /></Button>
                            </div>
                        </div>

                        {/* Messages Pattern Background */}
                        <div className="absolute inset-0 z-0 opacity-[0.02] dark:opacity-[0.015] pointer-events-none" style={{ backgroundImage: "url('data:image/svg+xml,%3Csvg width=\\'60\\' height=\\'60\\' viewBox=\\'0 0 60 60\\' xmlns=\\'http://www.w3.org/2000/svg\\'%3E%3Cg fill=\\'none\\' fill-rule=\\'evenodd\\'%3E%3Cg fill=\\'%23000000\\' fill-opacity=\\'1\\'%3E%3Cpath d=\\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')" }} />

                        {/* Messages Area */}
                        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-5 z-10 scroll-smooth">
                            {messagesLoading ? (
                                <div className="flex h-full items-center justify-center">
                                    <Loader2 className="h-6 w-6 animate-spin text-primary/50" />
                                </div>
                            ) : messages.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-center pb-12">
                                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted/50 mb-4">
                                        <Smile className="h-8 w-8 text-muted-foreground/40" />
                                    </div>
                                    <h4 className="text-base font-bold text-foreground">Início do canal {selectedChannel.name}</h4>
                                    <p className="text-sm text-muted-foreground mt-1 max-w-xs">Neste canal a comunicação é aberta para toda a unidade visualizá-lo.</p>
                                </div>
                            ) : (
                                <AnimatePresence initial={false}>
                                    {messages.map((msg, i) => {
                                        const isMe = msg.user_id === user?.id;
                                        const name = (msg.profiles as any)?.full_name || "Usuário";
                                        const prev = messages[i - 1];
                                        // group messages from same user if sent within 5 minutes
                                        const isGrouping = prev && prev.user_id === msg.user_id && (new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime() < 5 * 60 * 1000);
                                        const showAvatar = !isGrouping;

                                        return (
                                            <motion.div
                                                key={msg.id}
                                                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                className={cn("flex gap-3", isMe && "flex-row-reverse", isGrouping && "mt-1.5")}
                                            >
                                                {showAvatar ? (
                                                    <div className={cn(
                                                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold mt-1 shadow-sm",
                                                        isMe ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground ring-1 ring-border/50"
                                                    )}>
                                                        {getInitials(name)}
                                                    </div>
                                                ) : (
                                                    <div className="w-8 shrink-0" />
                                                )}

                                                <div className={cn("max-w-[75%] sm:max-w-[65%] flex flex-col", isMe ? "items-end" : "items-start")}>
                                                    {showAvatar && (
                                                        <div className={cn("flex items-baseline gap-2 mb-1 px-1", isMe && "flex-row-reverse")}>
                                                            <span className="text-xs font-bold text-foreground/80 tracking-tight">{isMe ? "Você" : name}</span>
                                                            <span className="text-[10px] font-medium text-muted-foreground/60">{formatMsgDate(msg.created_at)}</span>
                                                        </div>
                                                    )}
                                                    <div className={cn(
                                                        "relative inline-block px-4 py-2.5 text-[15px] leading-relaxed shadow-sm",
                                                        isMe
                                                            ? "bg-primary text-primary-foreground"
                                                            : "bg-card border border-border/40 text-foreground",
                                                        // bubble rounding
                                                        isMe
                                                            ? cn("rounded-2xl rounded-tr-md", isGrouping && "rounded-r-md")
                                                            : cn("rounded-2xl rounded-tl-md", isGrouping && "rounded-l-md")
                                                    )}>
                                                        <span className="whitespace-pre-wrap break-words">{msg.content}</span>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </AnimatePresence>
                            )}
                        </div>

                        {/* Input Area */}
                        <div className="border-t border-border/60 p-4 bg-muted/10 z-10">
                            <div className="flex items-end gap-3 max-w-4xl mx-auto relative bg-background border border-border/60 rounded-2xl shadow-sm focus-within:ring-1 focus-within:ring-primary/30 focus-within:border-primary/40 transition-shadow">
                                <div className="flex-1 px-1">
                                    <Textarea
                                        placeholder={`Escreva em #${selectedChannel.name}...`}
                                        value={messageText}
                                        onChange={(e) => setMessageText(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        rows={1}
                                        className="min-h-[52px] max-h-[160px] resize-none border-0 shadow-none focus-visible:ring-0 text-sm py-4 bg-transparent"
                                    />
                                </div>
                                <div className="p-2 shrink-0">
                                    <Button
                                        size="icon"
                                        className={cn("h-9 w-9 rounded-xl transition-all", messageText.trim() ? "bg-primary text-primary-foreground shadow-md hover:scale-105" : "bg-muted text-muted-foreground")}
                                        disabled={!messageText.trim() || sendMutation.isPending}
                                        onClick={handleSend}
                                    >
                                        {sendMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 ml-0.5" />}
                                    </Button>
                                </div>
                            </div>
                            <p className="text-[10px] text-center text-muted-foreground/50 mt-2">Pressione Shift + Enter para quebrar a linha.</p>
                        </div>
                    </>
                )}
            </div>

            {/* ── New Channel Dialog ── */}
            <Dialog open={newChannelOpen} onOpenChange={setNewChannelOpen}>
                <DialogContent className="sm:max-w-sm rounded-2xl">
                    <DialogHeader>
                        <DialogTitle>Criar novo canal</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-5 py-3">
                        <FormField
                            label="Nome do Canal *"
                            value={channelForm.name}
                            onChange={(v) => setChannelForm({ ...channelForm, name: v })}
                            placeholder="Ex: Equipe Trabalhista"
                            required
                        />
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Propósito do Canal</label>
                            <Select value={channelForm.type} onValueChange={(v) => setChannelForm({ ...channelForm, type: v })}>
                                <SelectTrigger className="h-10 bg-muted/20"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="general" className="py-2.5"><div className="flex items-center gap-2"><Hash className="h-4 w-4 text-primary" /><span>Geral / Discussão</span></div></SelectItem>
                                    <SelectItem value="process" className="py-2.5"><div className="flex items-center gap-2"><Scale className="h-4 w-4 text-emerald-500" /><span>Processos Jurídicos</span></div></SelectItem>
                                    <SelectItem value="unit" className="py-2.5"><div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-amber-500" /><span>Unidades / Filiais</span></div></SelectItem>
                                    <SelectItem value="direct" className="py-2.5"><div className="flex items-center gap-2"><Users className="h-4 w-4 text-blue-500" /><span>Mensagens Diretas</span></div></SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="ghost" onClick={() => setNewChannelOpen(false)}>Cancelar</Button>
                        <Button
                            className="bg-primary shadow-sm hover:shadow"
                            disabled={!channelForm.name.trim() || createChannelMutation.isPending}
                            onClick={() => {
                                if (!channelForm.name.trim() || !orgId) return;
                                createChannelMutation.mutate({
                                    name: channelForm.name,
                                    type: channelForm.type,
                                    organization_id: orgId,
                                });
                            }}
                        >
                            {createChannelMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Confirmar Criação
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
