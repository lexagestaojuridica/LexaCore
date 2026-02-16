import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useGoogleCalendar } from "@/hooks/useGoogleCalendar";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  CalendarDays, Plus, Clock, Trash2, Edit, Zap, Bell, Link2, RefreshCw, Download, Upload,
  AlertTriangle, ChevronLeft, ChevronRight, Gavel, Users, Timer, CheckCircle2, Loader2, Unplug,
} from "lucide-react";
import {
  format, isSameDay, parseISO, startOfDay, addDays, addMonths, subMonths,
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isToday, isPast, isSameMonth,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import lexaIcon from "@/assets/icon-lexa.png";

interface Evento {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  category: string | null;
  organization_id: string;
  user_id: string;
  process_id: string | null;
}

const categories = [
  { value: "audiencia", label: "Audiência", icon: Gavel, color: "bg-destructive/10 text-destructive border-destructive/20", dot: "bg-destructive" },
  { value: "reuniao", label: "Reunião", icon: Users, color: "bg-primary/10 text-primary border-primary/20", dot: "bg-primary" },
  { value: "prazo", label: "Prazo", icon: Timer, color: "bg-warning/10 text-warning border-warning/20", dot: "bg-warning" },
  { value: "compromisso", label: "Compromisso", icon: CheckCircle2, color: "bg-success/10 text-success border-success/20", dot: "bg-success" },
  { value: "lembrete", label: "Lembrete", icon: Bell, color: "bg-accent/10 text-accent-foreground border-accent/20", dot: "bg-accent" },
];

const getCat = (cat: string | null) => categories.find((c) => c.value === cat) || categories[3];

const emptyForm = {
  title: "", description: "", start_date: "", start_hour: "09:00", end_hour: "10:00", category: "compromisso",
};

export default function AgendaPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Evento | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [automationOpen, setAutomationOpen] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);
  const gcal = useGoogleCalendar();

  const { data: eventos = [], isLoading } = useQuery({
    queryKey: ["eventos_agenda"],
    queryFn: async () => {
      const { data, error } = await supabase.from("eventos_agenda").select("*").order("start_time", { ascending: true });
      if (error) throw error;
      return data as Evento[];
    },
  });

  const { data: profileData } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("organization_id").eq("user_id", user!.id).single();
      return data;
    },
    enabled: !!user?.id,
  });

  // Calendar grid: full month with padding
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart, { locale: ptBR });
    const calEnd = endOfWeek(monthEnd, { locale: ptBR });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentMonth]);

  const eventsForDate = eventos.filter((e) => isSameDay(parseISO(e.start_time), selectedDate));

  // Stats
  const todayEvents = eventos.filter((e) => isSameDay(parseISO(e.start_time), new Date()));
  const upcomingDeadlines = eventos.filter((e) => {
    const d = parseISO(e.start_time);
    return e.category === "prazo" && !isPast(d) && d <= addDays(new Date(), 7);
  });
  const overdueCount = eventos.filter((e) => {
    const d = parseISO(e.start_time);
    return e.category === "prazo" && isPast(d);
  }).length;

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { error } = await supabase.from("eventos_agenda").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["eventos_agenda"] }); toast.success("Compromisso criado"); closeDialog(); },
    onError: (err: any) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...payload }: any) => {
      const { error } = await supabase.from("eventos_agenda").update(payload).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["eventos_agenda"] }); toast.success("Compromisso atualizado"); closeDialog(); },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("eventos_agenda").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["eventos_agenda"] }); toast.success("Compromisso excluído"); },
    onError: (err: any) => toast.error(err.message),
  });

  const openCreate = (date?: Date) => {
    setEditingEvent(null);
    setForm({ ...emptyForm, start_date: format(date || selectedDate, "yyyy-MM-dd") });
    setDialogOpen(true);
  };

  const openEdit = (e: Evento) => {
    setEditingEvent(e);
    const start = parseISO(e.start_time);
    const end = parseISO(e.end_time);
    setForm({ title: e.title, description: e.description || "", start_date: format(start, "yyyy-MM-dd"), start_hour: format(start, "HH:mm"), end_hour: format(end, "HH:mm"), category: e.category || "compromisso" });
    setDialogOpen(true);
  };

  const closeDialog = () => { setDialogOpen(false); setEditingEvent(null); setForm(emptyForm); };

  const handleSubmit = () => {
    if (!form.title.trim() || !form.start_date) { toast.error("Preencha título e data"); return; }
    if (!profileData?.organization_id) { toast.error("Organização não encontrada"); return; }
    const start_time = `${form.start_date}T${form.start_hour}:00`;
    const end_time = `${form.start_date}T${form.end_hour}:00`;
    if (editingEvent) {
      updateMutation.mutate({ id: editingEvent.id, title: form.title, description: form.description || null, start_time, end_time, category: form.category });
    } else {
      createMutation.mutate({ title: form.title, description: form.description || null, start_time, end_time, category: form.category, user_id: user!.id, organization_id: profileData.organization_id });
    }
  };

  const weekDayHeaders = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl text-foreground">Agenda</h1>
          <p className="text-sm text-muted-foreground">Gerencie compromissos, prazos e audiências</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setSyncOpen(true)}>
            <Link2 className="h-3.5 w-3.5" /> Sincronizar
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setAutomationOpen(true)}>
            <Zap className="h-3.5 w-3.5" /> Automações
          </Button>
          <Button onClick={() => openCreate()} size="sm" className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Novo
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { icon: CalendarDays, value: todayEvents.length, label: "Hoje", bg: "bg-primary/10", text: "text-primary" },
          { icon: Timer, value: upcomingDeadlines.length, label: "Prazos (7d)", bg: "bg-warning/10", text: "text-warning" },
          { icon: AlertTriangle, value: overdueCount, label: "Vencidos", bg: "bg-destructive/10", text: "text-destructive" },
          { icon: CheckCircle2, value: eventos.length, label: "Total", bg: "bg-success/10", text: "text-success" },
        ].map((s) => (
          <Card key={s.label} className="border-border">
            <CardContent className="flex items-center gap-3 p-4">
              <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", s.bg)}>
                <s.icon className={cn("h-5 w-5", s.text)} />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main calendar layout */}
      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        {/* Full month calendar */}
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth((m) => subMonths(m, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <CardTitle className="font-display text-lg capitalize">
                {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
              </CardTitle>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth((m) => addMonths(m, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Button variant="outline" size="sm" className="text-xs" onClick={() => { setCurrentMonth(new Date()); setSelectedDate(new Date()); }}>
              Hoje
            </Button>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            {/* Weekday headers */}
            <div className="grid grid-cols-7 mb-1">
              {weekDayHeaders.map((d) => (
                <div key={d} className="py-2 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {d}
                </div>
              ))}
            </div>
            {/* Days grid */}
            <div className="grid grid-cols-7 gap-px rounded-lg border border-border bg-border overflow-hidden">
              {calendarDays.map((day) => {
                const dayEvents = eventos.filter((e) => isSameDay(parseISO(e.start_time), day));
                const inMonth = isSameMonth(day, currentMonth);
                const today = isToday(day);
                const selected = isSameDay(day, selectedDate);

                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setSelectedDate(day)}
                    onDoubleClick={() => openCreate(day)}
                    className={cn(
                      "flex min-h-[90px] flex-col bg-background p-1.5 text-left transition-all hover:bg-muted/30 relative",
                      !inMonth && "bg-muted/10",
                      selected && "ring-2 ring-inset ring-primary/40 bg-primary/5",
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-colors",
                        today && "bg-primary text-primary-foreground font-bold",
                        !today && inMonth && "text-foreground",
                        !today && !inMonth && "text-muted-foreground/40",
                      )}>
                        {format(day, "d")}
                      </span>
                      {dayEvents.length > 0 && !today && (
                        <span className="text-[10px] text-muted-foreground font-medium">{dayEvents.length}</span>
                      )}
                    </div>
                    <div className="flex-1 space-y-0.5 overflow-hidden">
                      {dayEvents.slice(0, 3).map((e) => {
                        const cat = getCat(e.category);
                        return (
                          <div key={e.id} className={cn("flex items-center gap-1 rounded px-1 py-0.5 text-[10px] leading-tight truncate", cat.color)}>
                            <div className={cn("h-1.5 w-1.5 rounded-full shrink-0", cat.dot)} />
                            <span className="truncate">{e.title}</span>
                          </div>
                        );
                      })}
                      {dayEvents.length > 3 && (
                        <p className="text-[9px] text-muted-foreground px-1">+{dayEvents.length - 3}</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
            {/* Category legend */}
            <div className="mt-3 flex flex-wrap gap-3 px-1">
              {categories.map((c) => (
                <div key={c.value} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <div className={cn("h-2 w-2 rounded-full", c.dot)} />
                  <span>{c.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Day detail panel */}
        <div className="space-y-4">
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-base">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  <span className="capitalize">{format(selectedDate, "EEEE", { locale: ptBR })}</span>
                </div>
                {isToday(selectedDate) && (
                  <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/20">Hoje</Badge>
                )}
              </CardTitle>
              <p className="text-sm text-muted-foreground">{format(selectedDate, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : eventsForDate.length === 0 ? (
                <div className="flex flex-col items-center py-8 text-center">
                  <CalendarDays className="mb-2 h-8 w-8 text-muted-foreground/20" />
                  <p className="text-sm text-muted-foreground mb-3">Nenhum compromisso</p>
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => openCreate()}>
                    <Plus className="h-3 w-3" /> Adicionar
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <AnimatePresence mode="popLayout">
                    {eventsForDate.map((e, idx) => {
                      const cat = getCat(e.category);
                      const CatIcon = cat.icon;
                      return (
                        <motion.div
                          key={e.id}
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          transition={{ delay: idx * 0.04 }}
                          className="group rounded-lg border border-border p-3 transition-colors hover:bg-muted/30"
                        >
                          <div className="flex items-start gap-2.5">
                            <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg mt-0.5", cat.color)}>
                              <CatIcon className="h-3.5 w-3.5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-foreground leading-tight">{e.title}</p>
                              {e.description && <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{e.description}</p>}
                              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                {format(parseISO(e.start_time), "HH:mm")} – {format(parseISO(e.end_time), "HH:mm")}
                              </p>
                            </div>
                            <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(e)}><Edit className="h-3 w-3" /></Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate(e.id)}><Trash2 className="h-3 w-3" /></Button>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                  <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs mt-2" onClick={() => openCreate()}>
                    <Plus className="h-3 w-3" /> Adicionar
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingEvent ? "Editar Compromisso" : "Novo Compromisso"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground uppercase tracking-wider">Título *</label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex: Audiência Trabalhista" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground uppercase tracking-wider">Descrição</label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Detalhes do compromisso..." rows={3} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground uppercase tracking-wider">Data *</label>
                <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground uppercase tracking-wider">Início</label>
                <Input type="time" value={form.start_hour} onChange={(e) => setForm({ ...form, start_hour: e.target.value })} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground uppercase tracking-wider">Fim</label>
                <Input type="time" value={form.end_hour} onChange={(e) => setForm({ ...form, end_hour: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground uppercase tracking-wider">Categoria</label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => {
                    const Icon = c.icon;
                    return (
                      <SelectItem key={c.value} value={c.value}>
                        <span className="flex items-center gap-2"><Icon className="h-3.5 w-3.5" /> {c.label}</span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
              {editingEvent ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sync Dialog */}
      <Dialog open={syncOpen} onOpenChange={setSyncOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Link2 className="h-5 w-5 text-primary" /> Sincronizar Calendário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">Conecte sua agenda do Google Calendar para importar e exportar compromissos automaticamente.</p>
            <div className="space-y-3">
              {gcal.isConnected ? (
                <div className="rounded-lg border border-success/30 bg-success/5 p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10"><CheckCircle2 className="h-5 w-5 text-success" /></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">Google Calendar conectado</p>
                      <p className="text-xs text-muted-foreground">{gcal.lastSyncAt ? `Última sinc: ${format(parseISO(gcal.lastSyncAt), "dd/MM HH:mm", { locale: ptBR })}` : "Nunca sincronizado"}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs flex-1" onClick={() => gcal.importEvents()} disabled={gcal.importing}>
                      {gcal.importing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />} Importar
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs flex-1" onClick={() => gcal.exportEvents()} disabled={gcal.exporting}>
                      {gcal.exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />} Exportar
                    </Button>
                    <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-destructive" onClick={() => gcal.disconnect()} disabled={gcal.disconnecting}>
                      <Unplug className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ) : (
                <button onClick={() => gcal.connect()} disabled={gcal.connecting} className="flex w-full items-center gap-3 rounded-lg border border-border p-4 transition-colors hover:bg-muted/30 disabled:opacity-50">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
                    {gcal.connecting ? <Loader2 className="h-5 w-5 text-destructive animate-spin" /> : <CalendarDays className="h-5 w-5 text-destructive" />}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-foreground">Google Calendar</p>
                    <p className="text-xs text-muted-foreground">{gcal.connecting ? "Conectando..." : "Clique para conectar via OAuth"}</p>
                  </div>
                </button>
              )}
              <button className="flex w-full items-center gap-3 rounded-lg border border-border p-4 transition-colors hover:bg-muted/30 opacity-60 cursor-not-allowed">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10"><CalendarDays className="h-5 w-5 text-primary" /></div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-foreground">Microsoft Outlook</p>
                  <p className="text-xs text-muted-foreground">Conecte sua conta Microsoft</p>
                </div>
                <Badge variant="outline" className="text-[10px]">Em breve</Badge>
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Automations Dialog */}
      <Dialog open={automationOpen} onOpenChange={setAutomationOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Zap className="h-5 w-5 text-warning" /> Automações da Agenda</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">Configure alertas e ações automáticas para nunca perder um prazo.</p>
            <div className="space-y-3">
              {[
                { title: "Alerta de prazo vencendo", desc: "Notifique 48h antes do vencimento de prazos processuais", enabled: true },
                { title: "Lembrete de audiência", desc: "Envie lembrete 24h e 1h antes de audiências", enabled: true },
                { title: "Resumo diário", desc: "Receba um resumo dos compromissos do dia às 7h", enabled: false },
                { title: "Alerta de conflito", desc: "Avise quando dois compromissos estão sobrepostos", enabled: true },
                { title: "Criação automática de prazos", desc: "Gere prazos automaticamente a partir de movimentações processuais", enabled: false },
              ].map((auto) => (
                <div key={auto.title} className="flex items-start gap-3 rounded-lg border border-border p-3">
                  <Switch defaultChecked={auto.enabled} className="mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{auto.title}</p>
                    <p className="text-xs text-muted-foreground">{auto.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end">
              <Button size="sm" onClick={() => { setAutomationOpen(false); toast.success("Automações salvas"); }}>
                Salvar configurações
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
