import { useState } from "react";
import { Phone, Mail, Calendar, CheckCircle2, Plus, Filter, Clock, UserCircle, Trash2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import FormField from "@/components/shared/FormField";
import { useCrm } from "@/contexts/CrmContext";

const ACTIVITY_CONFIG = {
    ligacao: { icon: Phone, label: "Ligação", color: "text-emerald-600", bg: "bg-emerald-500/10", border: "border-emerald-200", dotColor: "bg-emerald-500", gradient: "from-emerald-500/15 to-transparent" },
    email: { icon: Mail, label: "E-mail", color: "text-blue-600", bg: "bg-blue-500/10", border: "border-blue-200", dotColor: "bg-blue-500", gradient: "from-blue-500/15 to-transparent" },
    reuniao: { icon: Calendar, label: "Reunião", color: "text-violet-600", bg: "bg-violet-500/10", border: "border-violet-200", dotColor: "bg-violet-500", gradient: "from-violet-500/15 to-transparent" },
    tarefa: { icon: CheckCircle2, label: "Tarefa", color: "text-amber-600", bg: "bg-amber-500/10", border: "border-amber-200", dotColor: "bg-amber-500", gradient: "from-amber-500/15 to-transparent" },
};

type FormState = { title: string; description: string; contactName: string; type: "ligacao" | "email" | "reuniao" | "tarefa"; date: string; time: string };
const emptyForm: FormState = { title: "", description: "", contactName: "", type: "ligacao", date: "", time: "" };

export default function CrmActivitiesTimeline() {
    const { activities, contacts, addActivity, updateActivity, deleteActivity } = useCrm();
    const [filterType, setFilterType] = useState("todos");
    const [search, setSearch] = useState("");
    const [dialogOpen, setDialogOpen] = useState(false);
    const [form, setForm] = useState<FormState>(emptyForm);

    const filtered = activities.filter((a) => {
        const matchType = filterType === "todos" || a.type === filterType;
        const q = search.toLowerCase();
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

    const completedCount = activities.filter((a) => a.completed).length;
    const completionRate = activities.length > 0 ? Math.round((completedCount / activities.length) * 100) : 0;

    return (
        <div className="space-y-5">
            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                    { label: "Total", value: activities.length, icon: Zap, color: "text-foreground", bg: "bg-muted", accent: "bg-primary" },
                    { label: "Concluídas", value: completedCount, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50", accent: "bg-emerald-500" },
                    { label: "Pendentes", value: activities.length - completedCount, icon: Clock, color: "text-amber-600", bg: "bg-amber-50", accent: "bg-amber-500" },
                    { label: "Taxa de Conclusão", value: `${completionRate}%`, icon: CheckCircle2, color: "text-primary", bg: "bg-primary/8", accent: "bg-primary" },
                ].map((kpi) => (
                    <Card key={kpi.label} className="border-border/50 overflow-hidden group hover:shadow-md transition-all duration-300">
                        <div className="p-4"><div className="flex items-center justify-between mb-2.5"><p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{kpi.label}</p><div className={`flex h-8 w-8 items-center justify-center rounded-lg ${kpi.bg} transition-transform group-hover:scale-110`}><kpi.icon className={`h-4 w-4 ${kpi.color}`} /></div></div><p className={`text-xl font-bold ${kpi.color}`}>{kpi.value}</p></div>
                        <div className={`h-0.5 ${kpi.accent} opacity-60`} />
                    </Card>
                ))}
            </div>

            {/* Filters */}
            <Card className="border-border/50">
                <CardContent className="flex flex-wrap items-center gap-3 p-3">
                    <div className="relative flex-1 min-w-[200px]"><Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Buscar atividade..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" /></div>
                    <div className="flex items-center gap-1 flex-wrap">
                        {[{ value: "todos", label: "Todos", emoji: "" }, { value: "ligacao", label: "Ligações", emoji: "📞" }, { value: "email", label: "E-mails", emoji: "✉️" }, { value: "reuniao", label: "Reuniões", emoji: "📅" }, { value: "tarefa", label: "Tarefas", emoji: "✅" }].map((f) => (
                            <Button key={f.value} variant={filterType === f.value ? "default" : "ghost"} size="sm" className={`text-xs h-8 gap-1 ${filterType === f.value ? "shadow-sm" : ""}`} onClick={() => setFilterType(f.value)}>{f.emoji && <span>{f.emoji}</span>}{f.label}</Button>
                        ))}
                    </div>
                    <Button className="gap-1.5 shadow-sm" size="sm" onClick={() => { setForm(emptyForm); setDialogOpen(true); }}><Plus className="h-3.5 w-3.5" /> Nova Atividade</Button>
                </CardContent>
            </Card>

            {/* Timeline */}
            {sortedDates.length === 0 ? (
                <Card className="border-border/50"><CardContent className="flex flex-col items-center justify-center py-20 text-center"><div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-3"><Clock className="h-7 w-7 text-muted-foreground/30" /></div><p className="text-sm font-medium text-muted-foreground">Nenhuma atividade registrada</p></CardContent></Card>
            ) : (
                <div className="space-y-6 max-w-4xl">
                    {sortedDates.map((dateStr) => (
                        <div key={dateStr}>
                            <div className="flex items-center gap-3 mb-3">
                                <h3 className="text-sm font-bold text-foreground capitalize whitespace-nowrap">{formatDateLabel(dateStr)}</h3>
                                <div className="flex-1 h-px bg-gradient-to-r from-border/60 to-transparent" />
                                <Badge variant="outline" className="text-[10px] bg-muted/50">{grouped[dateStr].length}</Badge>
                            </div>
                            <div className="relative pl-7">
                                <div className="absolute left-[11px] top-1 bottom-1 w-px bg-gradient-to-b from-border/60 via-border/30 to-transparent" />
                                <div className="space-y-2.5">
                                    {grouped[dateStr].sort((a, b) => b.time.localeCompare(a.time)).map((activity) => {
                                        const config = ACTIVITY_CONFIG[activity.type];
                                        const Icon = config.icon;
                                        return (
                                            <div key={activity.id} className="relative group">
                                                <div className={`absolute -left-7 top-4 h-[10px] w-[10px] rounded-full ring-[3px] ring-background ${config.dotColor} shadow-sm ${activity.completed ? "opacity-60" : ""}`} />
                                                <Card className={`border-border/40 overflow-hidden transition-all duration-200 hover:shadow-md ${activity.completed ? "opacity-60" : ""}`}>
                                                    <div className={`absolute inset-y-0 left-0 w-1 bg-gradient-to-b ${config.gradient}`} />
                                                    <CardContent className="p-4 pl-5">
                                                        <div className="flex items-start gap-3">
                                                            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${config.bg} shrink-0 transition-transform group-hover:scale-105`}><Icon className={`h-4 w-4 ${config.color}`} /></div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-start justify-between gap-2">
                                                                    <div>
                                                                        <p className={`text-[13px] font-semibold leading-tight ${activity.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>{activity.title}</p>
                                                                        <p className="text-[11px] text-muted-foreground/70 mt-1 line-clamp-2 leading-relaxed">{activity.description}</p>
                                                                    </div>
                                                                    <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-all">
                                                                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={() => toggleComplete(activity.id)}><CheckCircle2 className={`h-3.5 w-3.5 ${activity.completed ? "text-emerald-500 fill-emerald-500/20" : "text-muted-foreground/60"}`} /></Button>
                                                                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-muted-foreground hover:text-destructive" onClick={() => deleteActivity(activity.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-3 mt-2.5 flex-wrap">
                                                                    <div className="flex items-center gap-1.5 text-xs"><div className="h-5 w-5 rounded-full bg-primary/8 flex items-center justify-center"><UserCircle className="h-3 w-3 text-primary/70" /></div><span className="text-muted-foreground font-medium">{activity.contactName}</span></div>
                                                                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground/50"><Clock className="h-3 w-3" /><span>{activity.time}</span></div>
                                                                    <Badge variant="outline" className={`text-[9px] px-2 py-0 ${config.bg} ${config.color} ${config.border}`}>{config.label}</Badge>
                                                                    {activity.completed && <Badge variant="outline" className="text-[9px] px-2 py-0 bg-emerald-50 text-emerald-600 border-emerald-200">✓ Concluída</Badge>}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader><DialogTitle className="flex items-center gap-2"><Plus className="h-4 w-4" /> Nova Atividade</DialogTitle></DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                        <FormField label="Título" value={form.title} onChange={(v) => setForm((p) => ({ ...p, title: v }))} placeholder="Ex: Follow-up com cliente" required />
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Contato</label>
                            <input list="activity-contact-suggestions" value={form.contactName} onChange={(e) => setForm((p) => ({ ...p, contactName: e.target.value }))} placeholder="Nome do contato" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />
                            <datalist id="activity-contact-suggestions">{contacts.map((c) => <option key={c.id} value={c.name} />)}</datalist>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tipo</label>
                                <Select value={form.type} onValueChange={(v: any) => setForm((p) => ({ ...p, type: v }))}><SelectTrigger className="h-10 bg-background"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ligacao">📞 Ligação</SelectItem><SelectItem value="email">✉️ E-mail</SelectItem><SelectItem value="reuniao">📅 Reunião</SelectItem><SelectItem value="tarefa">✅ Tarefa</SelectItem></SelectContent></Select>
                            </div>
                            <FormField label="Data" value={form.date} onChange={(v) => setForm((p) => ({ ...p, date: v }))} type="date" />
                        </div>
                        <FormField label="Horário" value={form.time} onChange={(v) => setForm((p) => ({ ...p, time: v }))} type="time" />
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Descrição</label>
                            <Textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={3} placeholder="Detalhes..." className="bg-background" />
                        </div>
                        <div className="flex justify-end gap-2 pt-2"><Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button><Button type="submit" className="gap-1.5"><Plus className="h-3.5 w-3.5" /> Registrar</Button></div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
