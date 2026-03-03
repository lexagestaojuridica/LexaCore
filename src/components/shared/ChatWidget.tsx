import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format, isToday, isYesterday, parseISO } from "date-fns";
import {
    MessageSquare, Plus, Send, Hash, Users, Scale, Building2, Search,
    Loader2, ArrowLeft, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
    general: Hash, process: Scale, direct: Users, unit: Building2,
};

const CHANNEL_LABELS: Record<string, string> = {
    general: "Geral", process: "Processos", direct: "Direto", unit: "Unidades",
};

// ─── ChatWidget (Global Floating Sheet) ───────────────────────

export default function ChatWidget() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [isOpen, setIsOpen] = useState(false);
    const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
    const [newChannelOpen, setNewChannelOpen] = useState(false);
    const [channelForm, setChannelForm] = useState({ name: "", type: "general" });
    const [messageText, setMessageText] = useState("");
    const [searchChannels, setSearchChannels] = useState("");
    const scrollRef = useRef<HTMLDivElement>(null);

    // Profile
    const { data: profile } = useQuery({
        queryKey: ["profile", user?.id],
        queryFn: async () => {
            const { data } = await supabase
                .from("profiles")
                .select("organization_id, full_name, avatar_url")
                .eq("user_id", user!.id)
                .single();
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
        enabled: !!orgId && isOpen,
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
            return (data || []) as unknown as Message[];
        },
        enabled: !!selectedChannel && isOpen,
    });

    // ── Realtime ────────────────────────────────────────────
    useEffect(() => {
        if (!selectedChannel || !isOpen) return;
        const channel = supabase
            .channel(`chat-widget:${selectedChannel.id}`)
            .on("postgres_changes", { event: "*", schema: "public", table: "chat_messages", filter: `channel_id=eq.${selectedChannel.id}` }, () => {
                queryClient.invalidateQueries({ queryKey: ["chat-messages", selectedChannel.id] });
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [selectedChannel?.id, isOpen, queryClient]);

    // ── Auto scroll ─────────────────────────────────────────
    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [messages.length, messagesLoading]);

    // ── Send ────────────────────────────────────────────────
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
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
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

    // ── Keyboard shortcut (Ctrl+J) ──────────────────────────
    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "j" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setIsOpen((o) => !o);
            }
        };
        document.addEventListener("keydown", down);
        return () => document.removeEventListener("keydown", down);
    }, []);

    return (
        <>
            {/* ── Trigger Button (for TopBar) ── */}
            <Tooltip delayDuration={300}>
                <TooltipTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsOpen(true)}
                        className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-muted/80 relative"
                    >
                        <MessageSquare className="h-4 w-4" />
                        {channels.length > 0 && (
                            <span className="absolute top-0 right-0 flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border-2 border-background" />
                            </span>
                        )}
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                    Chat Interno <kbd className="ml-1 rounded border bg-muted px-1 py-0.5 text-[10px]">⌘J</kbd>
                </TooltipContent>
            </Tooltip>

            {/* ── Sheet Drawer ── */}
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetContent side="right" className="w-full sm:w-[460px] md:w-[520px] flex flex-col p-0 border-l border-border/50 bg-background">
                    <SheetHeader className="px-4 pt-4 pb-3 border-b border-border/50 shrink-0">
                        <div className="flex items-center justify-between">
                            <SheetTitle className="flex items-center gap-2 text-lg font-bold">
                                <span className="bg-primary/10 text-primary p-1.5 rounded-lg">
                                    <MessageSquare className="h-4 w-4" />
                                </span>
                                Chat Interno
                            </SheetTitle>
                        </div>
                    </SheetHeader>

                    {!selectedChannel ? (
                        /* ── Channel List View ── */
                        <div className="flex-1 flex flex-col overflow-hidden">
                            <div className="px-4 pt-3 pb-2 flex items-center gap-2">
                                <div className="relative flex-1">
                                    <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        placeholder="Buscar canais..."
                                        value={searchChannels}
                                        onChange={(e) => setSearchChannels(e.target.value)}
                                        className="h-8 pl-8 text-xs border-border/50"
                                    />
                                </div>
                                <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={() => setNewChannelOpen(true)}>
                                    <Plus className="h-3.5 w-3.5" />
                                </Button>
                            </div>

                            <ScrollArea className="flex-1 px-4 pb-3">
                                {channelsLoading ? (
                                    <div className="space-y-2 p-1">
                                        {[1, 2, 3, 4].map((n) => <div key={n} className="h-9 rounded-lg bg-muted/40 animate-pulse" />)}
                                    </div>
                                ) : Object.keys(grouped).length === 0 ? (
                                    <div className="flex flex-col items-center py-12 text-center px-4">
                                        <MessageSquare className="h-10 w-10 text-muted-foreground/20 mb-3" />
                                        <p className="text-sm font-medium">Nenhum canal</p>
                                        <p className="text-xs text-muted-foreground mt-1 mb-4">Crie o primeiro canal para iniciar.</p>
                                        <Button variant="outline" size="sm" className="text-xs" onClick={() => setNewChannelOpen(true)}>
                                            Criar Canal
                                        </Button>
                                    </div>
                                ) : (
                                    Object.entries(grouped).map(([type, chs]) => {
                                        const TypeIcon = CHANNEL_ICONS[type] || Hash;
                                        return (
                                            <div key={type} className="mb-3">
                                                <p className="px-1 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                                                    {CHANNEL_LABELS[type] || type}
                                                </p>
                                                <div className="space-y-0.5">
                                                    {chs.map((ch) => (
                                                        <button
                                                            key={ch.id}
                                                            onClick={() => setSelectedChannel(ch)}
                                                            className="group flex items-center gap-2 w-full rounded-lg px-2.5 py-2 text-sm font-medium transition-all text-left text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                                                        >
                                                            <div className="p-1 rounded-md bg-background group-hover:bg-muted/80">
                                                                <TypeIcon className="h-3.5 w-3.5 text-muted-foreground" />
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

                            {/* User info */}
                            <div className="border-t border-border/50 p-3 bg-muted/10 shrink-0">
                                <div className="flex items-center gap-2">
                                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20 text-primary text-[10px] font-bold shrink-0">
                                        {getInitials(profile?.full_name)}
                                    </div>
                                    <div className="truncate">
                                        <p className="text-xs font-medium text-foreground truncate">{profile?.full_name || "Usuário"}</p>
                                        <p className="text-[10px] text-emerald-500 font-medium flex items-center gap-1">
                                            <span className="relative flex h-1.5 w-1.5">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                                            </span>
                                            Online
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* ── Chat View (Messages) ── */
                        <div className="flex-1 flex flex-col overflow-hidden">
                            {/* Channel Header */}
                            <div className="flex items-center gap-3 border-b border-border/50 px-4 py-2.5 shrink-0">
                                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setSelectedChannel(null)}>
                                    <ArrowLeft className="h-4 w-4" />
                                </Button>
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                                    {(() => { const I = CHANNEL_ICONS[selectedChannel.type] || Hash; return <I className="h-4 w-4 text-primary" />; })()}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-bold text-foreground truncate">{selectedChannel.name}</p>
                                    <p className="text-[10px] text-muted-foreground uppercase">{CHANNEL_LABELS[selectedChannel.type]}</p>
                                </div>
                                <Badge variant="secondary" className="ml-auto text-[10px] shrink-0">{messages.length}</Badge>
                            </div>

                            {/* Messages */}
                            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                                {messagesLoading ? (
                                    <div className="flex h-full items-center justify-center">
                                        <Loader2 className="h-5 w-5 animate-spin text-primary/40" />
                                    </div>
                                ) : messages.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-center">
                                        <MessageSquare className="h-8 w-8 text-muted-foreground/20 mb-2" />
                                        <p className="text-sm font-medium">Sem mensagens</p>
                                        <p className="text-xs text-muted-foreground mt-1">Envie a primeira mensagem neste canal.</p>
                                    </div>
                                ) : (
                                    <AnimatePresence initial={false}>
                                        {messages.map((msg, i) => {
                                            const isMe = msg.user_id === user?.id;
                                            const name = (msg.profiles as any)?.full_name || "Usuário";
                                            const prev = messages[i - 1];
                                            const isGrouping = prev && prev.user_id === msg.user_id && (new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime() < 5 * 60 * 1000);
                                            const showAvatar = !isGrouping;

                                            return (
                                                <motion.div
                                                    key={msg.id}
                                                    initial={{ opacity: 0, y: 6 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className={cn("flex gap-2", isMe && "flex-row-reverse", isGrouping && "mt-0.5")}
                                                >
                                                    {showAvatar ? (
                                                        <div className={cn(
                                                            "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[9px] font-bold mt-0.5",
                                                            isMe ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground ring-1 ring-border/50"
                                                        )}>
                                                            {getInitials(name)}
                                                        </div>
                                                    ) : (
                                                        <div className="w-7 shrink-0" />
                                                    )}
                                                    <div className={cn("max-w-[80%] flex flex-col", isMe ? "items-end" : "items-start")}>
                                                        {showAvatar && (
                                                            <div className={cn("flex items-baseline gap-1.5 mb-0.5 px-0.5", isMe && "flex-row-reverse")}>
                                                                <span className="text-[11px] font-bold text-foreground/80">{isMe ? "Você" : name}</span>
                                                                <span className="text-[9px] text-muted-foreground/60">{formatMsgDate(msg.created_at)}</span>
                                                            </div>
                                                        )}
                                                        <div className={cn(
                                                            "inline-block px-3 py-2 text-[13px] leading-relaxed",
                                                            isMe ? "bg-primary text-primary-foreground rounded-2xl rounded-tr-md" : "bg-card border border-border/40 text-foreground rounded-2xl rounded-tl-md",
                                                            isGrouping && (isMe ? "rounded-r-md" : "rounded-l-md")
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

                            {/* Input */}
                            <div className="border-t border-border/50 p-3 shrink-0">
                                <div className="flex items-end gap-2 bg-background border border-border/60 rounded-xl focus-within:ring-1 focus-within:ring-primary/30 transition-shadow">
                                    <Textarea
                                        placeholder={`Escreva em #${selectedChannel.name}...`}
                                        value={messageText}
                                        onChange={(e) => setMessageText(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        rows={1}
                                        className="min-h-[40px] max-h-[100px] resize-none border-0 shadow-none focus-visible:ring-0 text-sm py-2.5 px-3 bg-transparent"
                                    />
                                    <div className="p-1.5 shrink-0">
                                        <Button
                                            size="icon"
                                            className={cn("h-8 w-8 rounded-lg transition-all", messageText.trim() ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}
                                            disabled={!messageText.trim() || sendMutation.isPending}
                                            onClick={handleSend}
                                        >
                                            {sendMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </SheetContent>
            </Sheet>

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
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tipo</label>
                            <Select value={channelForm.type} onValueChange={(v) => setChannelForm({ ...channelForm, type: v })}>
                                <SelectTrigger className="h-10 bg-muted/20"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="general"><div className="flex items-center gap-2"><Hash className="h-4 w-4 text-primary" /><span>Geral</span></div></SelectItem>
                                    <SelectItem value="process"><div className="flex items-center gap-2"><Scale className="h-4 w-4 text-emerald-500" /><span>Processos</span></div></SelectItem>
                                    <SelectItem value="unit"><div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-amber-500" /><span>Unidades</span></div></SelectItem>
                                    <SelectItem value="direct"><div className="flex items-center gap-2"><Users className="h-4 w-4 text-blue-500" /><span>Direto</span></div></SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="ghost" onClick={() => setNewChannelOpen(false)}>Cancelar</Button>
                        <Button
                            disabled={!channelForm.name.trim() || createChannelMutation.isPending}
                            onClick={() => {
                                if (!channelForm.name.trim() || !orgId) return;
                                createChannelMutation.mutate({ name: channelForm.name, type: channelForm.type, organization_id: orgId });
                            }}
                        >
                            {createChannelMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Criar Canal
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
