import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CalendarDays, Plus, Clock, Trash2, Edit, Zap, Bell, Link2, RefreshCw,
  AlertTriangle, ChevronLeft, ChevronRight, Gavel, Users, Timer, CheckCircle2,
} from "lucide-react";
import { format, isSameDay, parseISO, startOfDay, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isToday, isPast, isSameMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

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
  { value: "audiencia", label: "Audiência", icon: Gavel, color: "bg-destructive/10 text-destructive border-destructive/20" },
  { value: "reuniao", label: "Reunião", icon: Users, color: "bg-primary/10 text-primary border-primary/20" },
  { value: "prazo", label: "Prazo", icon: Timer, color: "bg-warning/10 text-warning border-warning/20" },
  { value: "compromisso", label: "Compromisso", icon: CheckCircle2, color: "bg-success/10 text-success border-success/20" },
  { value: "lembrete", label: "Lembrete", icon: Bell, color: "bg-accent/10 text-accent-foreground border-accent/20" },
];

const getCategoryStyle = (cat: string | null) =>
  categories.find((c) => c.value === cat)?.color || "bg-muted text-muted-foreground";
const getCategoryLabel = (cat: string | null) =>
  categories.find((c) => c.value === cat)?.label || cat || "Compromisso";
const getCategoryIcon = (cat: string | null) => {
  const Icon = categories.find((c) => c.value === cat)?.icon || CalendarDays;
  return Icon;
};

const emptyForm = {
  title: "",
  description: "",
  start_date: "",
  start_hour: "09:00",
  end_hour: "10:00",
  category: "compromisso",
};

export default function AgendaPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Evento | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [view, setView] = useState<"calendar" | "week">("calendar");
  const [automationOpen, setAutomationOpen] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);

  const { data: eventos = [], isLoading } = useQuery({
    queryKey: ["eventos_agenda"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("eventos_agenda")
        .select("*")
        .order("start_time", { ascending: true });
      if (error) throw error;
      return data as Evento[];
    },
  });

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

  const eventsForDate = eventos.filter((e) =>
    isSameDay(parseISO(e.start_time), selectedDate)
  );

  const datesWithEvents = eventos.map((e) => startOfDay(parseISO(e.start_time)));

  // Week view data
  const weekStart = startOfWeek(selectedDate, { locale: ptBR });
  const weekEnd = endOfWeek(selectedDate, { locale: ptBR });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["eventos_agenda"] });
      toast.success("Compromisso criado com sucesso");
      closeDialog();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...payload }: any) => {
      const { error } = await supabase.from("eventos_agenda").update(payload).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["eventos_agenda"] });
      toast.success("Compromisso atualizado");
      closeDialog();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("eventos_agenda").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["eventos_agenda"] });
      toast.success("Compromisso excluído");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const openCreate = () => {
    setEditingEvent(null);
    setForm({ ...emptyForm, start_date: format(selectedDate, "yyyy-MM-dd") });
    setDialogOpen(true);
  };

  const openEdit = (e: Evento) => {
    setEditingEvent(e);
    const start = parseISO(e.start_time);
    const end = parseISO(e.end_time);
    setForm({
      title: e.title,
      description: e.description || "",
      start_date: format(start, "yyyy-MM-dd"),
      start_hour: format(start, "HH:mm"),
      end_hour: format(end, "HH:mm"),
      category: e.category || "compromisso",
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingEvent(null);
    setForm(emptyForm);
  };

  const handleSubmit = () => {
    if (!form.title.trim() || !form.start_date) {
      toast.error("Preencha título e data");
      return;
    }
    if (!profileData?.organization_id) {
      toast.error("Organização não encontrada");
      return;
    }
    const start_time = `${form.start_date}T${form.start_hour}:00`;
    const end_time = `${form.start_date}T${form.end_hour}:00`;

    if (editingEvent) {
      updateMutation.mutate({
        id: editingEvent.id,
        title: form.title,
        description: form.description || null,
        start_time,
        end_time,
        category: form.category,
      });
    } else {
      createMutation.mutate({
        title: form.title,
        description: form.description || null,
        start_time,
        end_time,
        category: form.category,
        user_id: user!.id,
        organization_id: profileData.organization_id,
      });
    }
  };

  const navigateWeek = (dir: number) => {
    setSelectedDate((d) => addDays(d, dir * 7));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl text-foreground">Agenda</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie compromissos, prazos e audiências
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setSyncOpen(true)}>
            <Link2 className="h-3.5 w-3.5" /> Sincronizar
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setAutomationOpen(true)}>
            <Zap className="h-3.5 w-3.5" /> Automações
          </Button>
          <Button onClick={openCreate} size="sm" className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Novo
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="border-border">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <CalendarDays className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{todayEvents.length}</p>
              <p className="text-xs text-muted-foreground">Hoje</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/10">
              <Timer className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{upcomingDeadlines.length}</p>
              <p className="text-xs text-muted-foreground">Prazos (7d)</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{overdueCount}</p>
              <p className="text-xs text-muted-foreground">Vencidos</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10">
              <CheckCircle2 className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{eventos.length}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* View Tabs */}
      <Tabs value={view} onValueChange={(v) => setView(v as any)} className="space-y-4">
        <TabsList className="h-9">
          <TabsTrigger value="calendar" className="text-xs">Calendário</TabsTrigger>
          <TabsTrigger value="week" className="text-xs">Semana</TabsTrigger>
        </TabsList>

        {/* Calendar View */}
        <TabsContent value="calendar" className="mt-0">
          <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
            <Card className="border-border">
              <CardContent className="p-3">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(d) => d && setSelectedDate(d)}
                  locale={ptBR}
                  className="pointer-events-auto"
                  modifiers={{ hasEvent: datesWithEvents }}
                  modifiersClassNames={{
                    hasEvent: "bg-primary/10 font-bold text-primary",
                  }}
                />
                {/* Category legend */}
                <div className="mt-3 border-t border-border pt-3 space-y-1.5 px-1">
                  {categories.map((c) => {
                    const Icon = c.icon;
                    return (
                      <div key={c.value} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Icon className="h-3 w-3" />
                        <span>{c.label}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  {format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
                  {isToday(selectedDate) && (
                    <Badge variant="outline" className="ml-auto text-[10px] bg-primary/5 text-primary border-primary/20">Hoje</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center py-10">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </div>
                ) : eventsForDate.length === 0 ? (
                  <div className="flex flex-col items-center py-12 text-center">
                    <CalendarDays className="mb-3 h-10 w-10 text-muted-foreground/20" />
                    <p className="text-sm text-muted-foreground">Nenhum compromisso neste dia</p>
                    <Button variant="outline" size="sm" className="mt-4 gap-1.5" onClick={openCreate}>
                      <Plus className="h-3.5 w-3.5" /> Adicionar
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <AnimatePresence mode="popLayout">
                      {eventsForDate.map((e, idx) => {
                        const CatIcon = getCategoryIcon(e.category);
                        return (
                          <motion.div
                            key={e.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ delay: idx * 0.05 }}
                            className="group flex items-start gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted/30"
                          >
                            <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", getCategoryStyle(e.category))}>
                              <CatIcon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium text-foreground">{e.title}</p>
                                <Badge variant="outline" className={cn("text-[10px]", getCategoryStyle(e.category))}>
                                  {getCategoryLabel(e.category)}
                                </Badge>
                              </div>
                              {e.description && (
                                <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{e.description}</p>
                              )}
                              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                {format(parseISO(e.start_time), "HH:mm")} – {format(parseISO(e.end_time), "HH:mm")}
                              </p>
                            </div>
                            <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(e)}>
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate(e.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Week View */}
        <TabsContent value="week" className="mt-0">
          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigateWeek(-1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <CardTitle className="text-base">
                  {format(weekStart, "d MMM", { locale: ptBR })} – {format(weekEnd, "d MMM yyyy", { locale: ptBR })}
                </CardTitle>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigateWeek(1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <Button variant="outline" size="sm" className="text-xs" onClick={() => setSelectedDate(new Date())}>
                Hoje
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-px rounded-lg border border-border bg-border overflow-hidden">
                {weekDays.map((day) => {
                  const dayEvents = eventos.filter((e) => isSameDay(parseISO(e.start_time), day));
                  const today = isToday(day);
                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => { setSelectedDate(day); setView("calendar"); }}
                      className={cn(
                        "flex min-h-[120px] flex-col bg-background p-2 text-left transition-colors hover:bg-muted/30",
                        today && "bg-primary/5",
                        isSameDay(day, selectedDate) && "ring-2 ring-inset ring-primary/30"
                      )}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className={cn(
                          "flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                          today ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                        )}>
                          {format(day, "d")}
                        </span>
                        <span className="text-[10px] uppercase text-muted-foreground">
                          {format(day, "EEE", { locale: ptBR })}
                        </span>
                      </div>
                      <div className="mt-1.5 space-y-1 flex-1">
                        {dayEvents.slice(0, 3).map((e) => (
                          <div key={e.id} className={cn("truncate rounded px-1.5 py-0.5 text-[10px] font-medium", getCategoryStyle(e.category))}>
                            {format(parseISO(e.start_time), "HH:mm")} {e.title}
                          </div>
                        ))}
                        {dayEvents.length > 3 && (
                          <p className="text-[10px] text-muted-foreground px-1.5">+{dayEvents.length - 3} mais</p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingEvent ? "Editar Compromisso" : "Novo Compromisso"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Título *</label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex: Audiência Trabalhista" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Descrição</label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Detalhes do compromisso..." rows={3} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Data *</label>
                <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Início</label>
                <Input type="time" value={form.start_hour} onChange={(e) => setForm({ ...form, start_hour: e.target.value })} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Fim</label>
                <Input type="time" value={form.end_hour} onChange={(e) => setForm({ ...form, end_hour: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Categoria</label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => {
                    const Icon = c.icon;
                    return (
                      <SelectItem key={c.value} value={c.value}>
                        <span className="flex items-center gap-2">
                          <Icon className="h-3.5 w-3.5" /> {c.label}
                        </span>
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
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-primary" /> Sincronizar Calendário
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Conecte sua agenda do Google Calendar ou Microsoft Outlook para importar e exportar compromissos automaticamente.
            </p>
            <div className="space-y-3">
              <button className="flex w-full items-center gap-3 rounded-lg border border-border p-4 transition-colors hover:bg-muted/30">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
                  <CalendarDays className="h-5 w-5 text-destructive" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-foreground">Google Calendar</p>
                  <p className="text-xs text-muted-foreground">Sincronize eventos bidirecionalmente</p>
                </div>
                <Badge variant="outline" className="text-[10px]">Em breve</Badge>
              </button>
              <button className="flex w-full items-center gap-3 rounded-lg border border-border p-4 transition-colors hover:bg-muted/30">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <CalendarDays className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-foreground">Microsoft Outlook</p>
                  <p className="text-xs text-muted-foreground">Conecte sua conta Microsoft</p>
                </div>
                <Badge variant="outline" className="text-[10px]">Em breve</Badge>
              </button>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">
                <strong className="text-foreground">Exportar .ICS</strong> — Exporte seus compromissos no formato iCalendar para importar em qualquer aplicativo de agenda.
              </p>
              <Button variant="outline" size="sm" className="mt-2 text-xs" onClick={() => toast.info("Exportação ICS será disponibilizada em breve")}>
                Exportar agenda
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Automations Dialog */}
      <Dialog open={automationOpen} onOpenChange={setAutomationOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-warning" /> Automações da Agenda
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Configure alertas e ações automáticas para nunca perder um prazo.
            </p>
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
