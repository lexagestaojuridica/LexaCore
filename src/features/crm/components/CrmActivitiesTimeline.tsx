"use client";

import { useState } from "react";
import { useDebounce } from "@/shared/hooks/useDebounce";
import { Phone, Mail, Calendar, CheckCircle2, Plus, Filter, Clock, UserCircle, Trash2, Zap, Search } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Input } from "@/shared/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Textarea } from "@/shared/ui/textarea";
import FormField from "@/shared/components/FormField";
import { useCrm } from "@/features/crm/contexts/CrmContext";
import { useTranslation } from "react-i18next";
import { cn } from "@/shared/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const ACTIVITY_CONFIG = {
    ligacao: { icon: Phone, label: "Ligação", color: "text-emerald-600", bg: "bg-emerald-500/10", border: "border-emerald-200", dotColor: "bg-emerald-500", gradient: "from-emerald-500/15 to-transparent" },
    email: { icon: Mail, label: "E-mail", color: "text-blue-600", bg: "bg-blue-500/10", border: "border-blue-200", dotColor: "bg-blue-500", gradient: "from-blue-500/15 to-transparent" },
    reuniao: { icon: Calendar, label: "Reunião", color: "text-violet-600", bg: "bg-violet-500/10", border: "border-violet-200", dotColor: "bg-violet-500", gradient: "from-violet-500/15 to-transparent" },
    tarefa: { icon: CheckCircle2, label: "Tarefa", color: "text-amber-600", bg: "bg-amber-500/10", border: "border-amber-200", dotColor: "bg-amber-500", gradient: "from-amber-500/15 to-transparent" },
};

type FormState = { title: string; description: string; contactName: string; type: "ligacao" | "email" | "reuniao" | "tarefa"; date: string; time: string };
const emptyForm: FormState = { title: "", description: "", contactName: "", type: "ligacao", date: "", time: "" };

export default function CrmActivitiesTimeline() {
    const { t } = useTranslation();
    const { activities, contacts, addActivity, updateActivity, deleteActivity } = useCrm();
    const [filterType, setFilterType] = useState("todos");
    const [search, setSearch] = useState("");
    const debouncedSearch = useDebounce(search, 400);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [form, setForm] = useState<FormState>(emptyForm);

    const filtered = activities.filter((a) => {
        const matchType = filterType === "todos" || a.type === filterType;
        const q = debouncedSearch.toLowerCase();
        const matchSearch = !q || a.title.toLowerCase().includes(q) || a.contactName.toLowerCase().includes(q);
        return matchType && matchSearch;
    });

    const grouped = filtered.reduce<Record<string, typeof activities>>((acc, a) => {
        if (!acc[a.date]) acc[a.date] = [];
        acc[a.date].push(a);
        return acc;
    }, {});
    const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.title || !form.contactName) return;
        addActivity({ type: form.type, title: form.title, description: form.description, contactName: form.contactName, date: form.date || new Date().toISOString().split("T")[0], time: form.time || new Date().toTimeString().slice(0, 5), completed: false });
        setDialogOpen(false); setForm(emptyForm);
    };

    const toggleComplete = (id: string) => {
        const a = activities.find((x) => x.id === id);
        if (a) updateActivity(id, { completed: !a.completed });
    };

    const formatDateLabel = (dateStr: string) => {
        const d = new Date(dateStr + "T00:00:00");
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
        if (d.getTime() === today.getTime()) return "Hoje";
        if (d.getTime() === yesterday.getTime()) return "Ontem";
        return d.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
    };

    return (
        <div className="space-y-6">
            {/* Professional Filters */}
            <Card className="border-border/40 shadow-sm bg-card/50 overflow-hidden rounded-2xl">
                <CardContent className="flex flex-wrap items-center gap-4 p-4">
                    <div className="relative flex-1 min-w-[280px]">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Buscar atividade..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 h-11 bg-background border-border/60 rounded-xl shadow-sm"
                        />
                    </div>
                    <div className="flex items-center gap-1.5 bg-muted/40 p-1.5 rounded-2xl border border-border/40">
                        {[{ value: "todos", label: "Todos", emoji: "🏠" }, { value: "ligacao", label: "Ligações", emoji: "📞" }, { value: "email", label: "E-mails", emoji: "✉️" }, { value: "reuniao", label: "Reuniões", emoji: "📅" }, { value: "tarefa", label: "Tarefas", emoji: "✅" }].map((f) => (
                            <Button
                                key={f.value}
                                variant={filterType === f.value ? "background" : "ghost"}
                                size="sm"
                                className={cn(
                                    "text-[11px] h-8 px-3 gap-1.5 rounded-xl font-bold transition-all",
                                    filterType === f.value ? "bg-background shadow-md text-primary" : "text-muted-foreground"
                                )}
                                onClick={() => setFilterType(f.value)}
                            >
                                <span className="text-sm">{f.emoji}</span>
                                <span className="hidden md:inline">{f.label}</span>
                            </Button>
                        ))}
                    </div>
                    <Button className="gap-2 shadow-lg shadow-primary/10 h-11 px-6 rounded-xl" onClick={() => { setForm(emptyForm); setDialogOpen(true); }}>
                        <Plus className="h-4 w-4" /> Nova Atividade
                    </Button>
                </CardContent>
            </Card>

            {/* Timeline Area */}
            {sortedDates.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center bg-muted/5 border-2 border-dashed border-border/40 rounded-3xl m-4">
                    <div className="h-16 w-16 rounded-3xl bg-primary/10 flex items-center justify-center mb-4"><Clock className="h-8 w-8 text-primary" /></div>
                    <h3 className="text-lg font-bold text-foreground tracking-tight">Nenhuma atividade registrada</h3>
                    <p className="text-sm text-muted-foreground max-w-xs mt-1">Registre ligações, e-mails ou reuniões para acompanhar o histórico.</p>
                </div>
            ) : (
                <div className="space-y-8 max-w-5xl mx-auto px-2">
                    {sortedDates.map((dateStr, dateIdx) => (
                        <motion.div
                            key={dateStr}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: dateIdx * 0.1 }}
                        >
                            <div className="flex items-center gap-4 mb-6">
                                <Badge variant="secondary" className="rounded-full px-4 py-1.5 bg-primary/5 text-primary border-primary/20 font-black text-[11px] uppercase tracking-widest shadow-sm">
                                    {formatDateLabel(dateStr)}
                                </Badge>
                                <div className="flex-1 h-px bg-gradient-to-r from-border/60 via-border/20 to-transparent" />
                                <span className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest">{grouped[dateStr].length} items</span>
                            </div>
                            <div className="relative pl-10">
                                {/* Vertical Timeline Line */}
                                <div className="absolute left-[19px] top-2 bottom-0 w-1 bg-gradient-to-b from-primary/20 via-primary/5 to-transparent rounded-full shadow-inner" />

                                <div className="space-y-4">
                                    <AnimatePresence>
                                        {grouped[dateStr].sort((a, b) => b.time.localeCompare(a.time)).map((activity, actIdx) => {
                                            const config = ACTIVITY_CONFIG[activity.type];
                                            const Icon = config.icon;
                                            return (
                                                <motion.div
                                                    key={activity.id}
                                                    initial={{ opacity: 0, scale: 0.95 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    transition={{ delay: actIdx * 0.05 }}
                                                    className="relative group"
                                                >
                                                    {/* Timeline Dot */}
                                                    <div className={cn(
                                                        "absolute -left-10 top-5 h-5 w-5 rounded-full ring-4 ring-background shadow-lg transition-all duration-300 group-hover:scale-125 z-10",
                                                        config.dotColor,
                                                        activity.completed && "opacity-40 grayscale"
                                                    )} />

                                                    <Card className={cn(
                                                        "border-border/40 overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 bg-card/60 backdrop-blur-sm rounded-2xl",
                                                        activity.completed && "opacity-60 saturate-50"
                                                    )}>
                                                        <div className={cn("absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b shadow-inner", config.gradient)} />
                                                        <CardContent className="p-5 pl-7">
                                                            <div className="flex items-start gap-4">
                                                                <div className={cn(
                                                                    "flex h-12 w-12 items-center justify-center rounded-2xl shrink-0 shadow-lg ring-1 ring-white/10 transition-transform group-hover:rotate-6",
                                                                    config.bg
                                                                )}>
                                                                    <Icon className={cn("h-6 w-6", config.color)} />
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-start justify-between gap-3">
                                                                        <div className="min-w-0">
                                                                            <h4 className={cn(
                                                                                "text-base font-black tracking-tight leading-tight",
                                                                                activity.completed ? "line-through text-muted-foreground" : "text-foreground"
                                                                            )}>
                                                                                {activity.title}
                                                                            </h4>
                                                                            <p className="text-sm text-muted-foreground/80 mt-1.5 font-medium leading-relaxed max-w-2xl whitespace-pre-wrap">
                                                                                {activity.description}
                                                                            </p>
                                                                        </div>
                                                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100">
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="icon"
                                                                                className="h-9 w-9 rounded-xl bg-background shadow-sm border border-border/20"
                                                                                onClick={() => toggleComplete(activity.id)}
                                                                            >
                                                                                <CheckCircle2 className={cn("h-5 w-5", activity.completed ? "text-emerald-500 fill-emerald-500/20" : "text-muted-foreground/30")} />
                                                                            </Button>
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="icon"
                                                                                className="h-9 w-9 rounded-xl bg-background shadow-sm border border-border/20 text-muted-foreground hover:text-destructive"
                                                                                onClick={() => deleteActivity(activity.id)}
                                                                            >
                                                                                <Trash2 className="h-4 w-4" />
                                                                            </Button>
                                                                        </div>
                                                                    </div>

                                                                    <div className="flex items-center gap-4 mt-4 flex-wrap border-t border-border/30 pt-3">
                                                                        <div className="flex items-center gap-2">
                                                                            <div className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center shadow-inner">
                                                                                <UserCircle className="h-3.5 w-3.5 text-primary" />
                                                                            </div>
                                                                            <span className="text-xs font-bold text-foreground/70">{activity.contactName}</span>
                                                                        </div>
                                                                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">
                                                                            <Clock className="h-3.5 w-3.5" />
                                                                            <span>{activity.time}</span>
                                                                        </div>
                                                                        <Badge variant="outline" className={cn("text-[10px] px-3 py-1 font-black uppercase rounded-full border-none shadow-sm", config.bg, config.color)}>
                                                                            {config.label}
                                                                        </Badge>
                                                                        {activity.completed && (
                                                                            <Badge className="bg-emerald-500 text-white border-none text-[10px] font-black px-3 py-1 rounded-full shadow-lg shadow-emerald-500/20">
                                                                                ✓ CONCLUÍDA
                                                                            </Badge>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                </motion.div>
                                            );
                                        })}
                                    </AnimatePresence>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Create Dialog - Premium Style */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-md rounded-[32px] border-none shadow-2xl p-0 overflow-hidden">
                    <div className="bg-gradient-to-br from-primary to-primary/80 p-7 text-white">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-3 text-white">
                                <Plus className="h-5 w-5" /> Nova Atividade
                            </DialogTitle>
                        </DialogHeader>
                    </div>
                    <form onSubmit={handleSubmit} className="p-7 space-y-5 bg-background">
                        <FormField label="Título" value={form.title} onChange={(v) => setForm((p) => ({ ...p, title: v }))} placeholder="Ex: Follow-up com cliente" required />
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Contato</label>
                            <input list="activity-contact-suggestions" value={form.contactName} onChange={(e) => setForm((p) => ({ ...p, contactName: e.target.value }))} placeholder="Nome do contato" required className="flex h-11 w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm" />
                            <datalist id="activity-contact-suggestions">{contacts.map((c) => <option key={c.id} value={c.name} />)}</datalist>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Tipo</label>
                                <Select value={form.type} onValueChange={(v: any) => setForm((p) => ({ ...p, type: v }))}>
                                    <SelectTrigger className="h-11 bg-background rounded-xl border-border/60 shadow-sm"><SelectValue /></SelectTrigger>
                                    <SelectContent className="rounded-xl shadow-xl">{Object.entries(ACTIVITY_CONFIG).map(([key, cfg]) => <SelectItem key={key} value={key}>{cfg.label}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <FormField label="Data" value={form.date} onChange={(v) => setForm((p) => ({ ...p, date: v }))} type="date" />
                        </div>
                        <FormField label="Horário" value={form.time} onChange={(v) => setForm((p) => ({ ...p, time: v }))} type="time" />
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Descrição</label>
                            <Textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={4} placeholder="Detalhes da atividade..." className="bg-background rounded-xl border-border/60 shadow-sm" />
                        </div>
                        <div className="flex justify-end gap-3 pt-3">
                            <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)} className="rounded-xl">Cancelar</Button>
                            <Button type="submit" className="gap-2 rounded-xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 h-11 px-8 font-bold text-white">Registrar</Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
