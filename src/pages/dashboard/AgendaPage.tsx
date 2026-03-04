import { useState, useMemo, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useGoogleCalendar } from "@/hooks/useGoogleCalendar";
import { useMicrosoftCalendar } from "@/hooks/useMicrosoftCalendar";
import { useAppleCalendar } from "@/hooks/useAppleCalendar";
import { toast } from "sonner";
import {
  format, isSameDay, parseISO, addMonths, subMonths, addWeeks, subWeeks, addDays,
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isToday, isSameMonth,
  isWithinInterval, differenceInMinutes
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ChevronLeft, ChevronRight, Gavel, Calendar, LayoutGrid, List,
  Filter, Plus, Link2, CalendarDays, Clock, AlertTriangle
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { CalendarEmptyState } from "@/components/dashboard/CalendarEmptyState";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { KPISkeleton } from "@/components/shared/SkeletonLoaders";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";

// FSD Feature Imports
import { Evento, ViewMode, EventFormState, emptyEventForm } from "@/features/agenda/types";
import { CATEGORIES, getCategoryConfig } from "@/features/agenda/utils/categories";
import { useAgenda } from "@/features/agenda/hooks/useAgenda";
import { KPICard } from "@/features/agenda/components/KPICard";
import { PrazosFataisBanner } from "@/features/agenda/components/PrazosFataisBanner";
import { WeekView } from "@/features/agenda/components/WeekView";
import { DayView } from "@/features/agenda/components/DayView";
import { ListView } from "@/features/agenda/components/ListView";
import { CalendarsIntegrationDialog } from "@/features/agenda/components/CalendarsIntegrationDialog";
import { EventDialog } from "@/features/agenda/components/EventDialog";


// ─── Main Page ────────────────────────────────────────────────
export default function AgendaPage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Evento | null>(null);
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);
  const [form, setForm] = useState<EventFormState>(emptyEventForm);
  const [syncOpen, setSyncOpen] = useState(false);
  const [filteredCategories, setFilteredCategories] = useState<string[]>([]);
  const gcal = useGoogleCalendar();
  const mscal = useMicrosoftCalendar();
  const appleCal = useAppleCalendar();

  const organizationId = (user as any)?.organization_id as string | undefined;

  const { eventos, isLoading, createMutation, updateMutation, deleteMutation } = useAgenda(organizationId, user?.id, currentMonth);


  // ─── Handlers ───
  const openCreate = useCallback((date?: Date) => {
    setEditingEvent(null);
    setForm({ ...emptyEventForm, start_date: format(date || selectedDate, "yyyy-MM-dd") });
    setDialogOpen(true);
  }, [selectedDate]);

  const openEdit = useCallback((e: Evento) => {
    setEditingEvent(e);
    const start = parseISO(e.start_time);
    const end = parseISO(e.end_time);
    setForm({
      title: e.title, description: e.description || "",
      start_date: format(start, "yyyy-MM-dd"), start_hour: format(start, "HH:mm"),
      end_hour: format(end, "HH:mm"), category: e.category || "compromisso",
      process_id: e.process_id,
      recurrence_rule: e.recurrence_rule || "none",
    });
    setDialogOpen(true);
  }, []);

  const closeDialog = useCallback(() => { setDialogOpen(false); setEditingEvent(null); setForm(emptyEventForm); }, []);

  const handleSubmit = useCallback(() => {
    if (!form.title.trim() || !form.start_date) { toast.error("Preencha título e data"); return; }
    if (!organizationId) { toast.error("Organização não encontrada"); return; }

    // Convert to local dates to prevent timezone issues
    const [year, month, day] = form.start_date.split('-').map(Number);
    const [startH, startM] = form.start_hour.split(':').map(Number);
    const [endH, endM] = form.end_hour.split(':').map(Number);

    const start_time = new Date(year, month - 1, day, startH, startM);
    const end_time = new Date(year, month - 1, day, endH, endM);

    if (end_time < start_time) {
      toast.error("A hora de término não pode ser anterior à hora de início.");
      return;
    }

    const start_time_iso = start_time.toISOString();
    const end_time_iso = end_time.toISOString();

    const payload: Partial<Evento> = {
      title: form.title, description: form.description || null,
      start_time: start_time_iso, end_time: end_time_iso, category: form.category,
      process_id: form.process_id || null,
      recurrence_rule: form.recurrence_rule === "none" ? null : form.recurrence_rule,
    };
    if (editingEvent) {
      updateMutation.mutate({ id: editingEvent.id, ...payload });
    } else {
      createMutation.mutate({ ...payload, user_id: user!.id, organization_id: organizationId });
    }
  }, [form, organizationId, editingEvent, user, createMutation, updateMutation]);

  const handleEventDrop = useCallback((id: string, newStart: Date) => {
    const evento = eventos.find(e => e.id === id);
    if (!evento) return;
    if (evento.recurrence_rule && evento.recurrence_rule !== "none") {
      toast.error("Para mover eventos recorrentes, edite-o manualmente.");
      return;
    }
    const oldStart = parseISO(evento.start_time);
    const oldEnd = parseISO(evento.end_time);
    const durationMin = differenceInMinutes(oldEnd, oldStart);

    // Calcula novo tempo preservando duração
    const newEnd = new Date(newStart.getTime() + durationMin * 60000);

    updateMutation.mutate({
      id,
      start_time: newStart.toISOString(),
      end_time: newEnd.toISOString()
    });
    toast.success("Evento reagendado");
  }, [eventos, updateMutation]);

  const toggleCategory = useCallback((cat: string) => {
    setFilteredCategories((prev) => prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]);
  }, []);

  const navigateView = useCallback((direction: "prev" | "next") => {
    if (viewMode === "month") setCurrentMonth((m) => direction === "prev" ? subMonths(m, 1) : addMonths(m, 1));
    else if (viewMode === "week") setSelectedDate((d) => direction === "prev" ? subWeeks(d, 1) : addWeeks(d, 1));
    else setSelectedDate((d) => direction === "prev" ? addDays(d, -1) : addDays(d, 1));
  }, [viewMode]);

  // ─── KPIs & Calendar Local ───
  const now = useMemo(() => new Date(), []);
  const thisMonth = useMemo(() => eventos.filter((e) => isSameMonth(parseISO(e.start_time), now)), [eventos, now]);
  const thisWeek = useMemo(() => eventos.filter((e) => {
    const dt = parseISO(e.start_time);
    return isWithinInterval(dt, { start: startOfWeek(now, { locale: ptBR }), end: endOfWeek(now, { locale: ptBR }) });
  }), [eventos, now]);
  const audiencias = useMemo(() => thisMonth.filter((e) => e.category === "audiencia"), [thisMonth]);

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart, { locale: ptBR });
    const calEnd = endOfWeek(monthEnd, { locale: ptBR });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentMonth]);

  const eventsForDate = eventos.filter((e) => isSameDay(parseISO(e.start_time), selectedDate) && !filteredCategories.includes(e.category || ""));

  return (
    <div className="space-y-5">
      {/* ── Premium Header ── */}
      <div className="relative overflow-hidden rounded-2xl bg-primary p-7">
        <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/5" />
        <div className="absolute -right-4 top-12 h-24 w-24 rounded-full bg-white/5" />
        <div className="absolute right-20 -bottom-6 h-32 w-32 rounded-full bg-white/[0.03]" />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm ring-1 ring-white/20">
              <CalendarDays className="h-7 w-7 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-primary-foreground tracking-tight">Agenda & Prazos</h1>
              <p className="text-sm text-primary-foreground/60 mt-0.5">Gerencie compromissos com suporte nativo Drag & Drop</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" className="gap-1.5 text-xs bg-white/10 text-primary-foreground border-white/20 hover:bg-white/20" onClick={() => setSyncOpen(true)}>
              <Link2 className="h-3.5 w-3.5" /> Integrações
            </Button>
            <Button size="sm" className="gap-1.5 bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => openCreate()}>
              <Plus className="h-3.5 w-3.5" /> Novo Evento
            </Button>
          </div>
        </div>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {isLoading ? (
          <>
            <KPISkeleton />
            <KPISkeleton />
            <KPISkeleton />
            <KPISkeleton />
          </>
        ) : (
          <>
            <KPICard label="Eventos este mês" value={thisMonth.length} sub={format(now, "MMMM", { locale: ptBR })} icon={CalendarDays} color="from-blue-500/10 to-blue-500/5" />
            <KPICard label="Esta semana" value={thisWeek.length} sub="Todos os tipos" icon={Calendar} color="from-emerald-500/10 to-emerald-500/5" />
            <KPICard label="Audiências" value={audiencias.length} sub="Este mês" icon={Gavel} color="from-rose-500/10 to-rose-500/5" />
            <KPICard label="Próximos passos" value="Organize" sub="Arraste eventos para agendar" icon={AlertTriangle} color="from-amber-500/10 to-amber-500/5" />
          </>
        )}
      </div>

      {/* ── Prazos Fatais Banner ── */}
      <PrazosFataisBanner onSelectDate={setSelectedDate} />

      {/* ── View Controls ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigateView("prev")}><ChevronLeft className="h-4 w-4" /></Button>
          <h2 className="text-lg font-semibold capitalize min-w-[200px] text-center">
            {viewMode === "month" && format(currentMonth, "MMMM yyyy", { locale: ptBR })}
            {viewMode === "week" && `Semana de ${format(startOfWeek(selectedDate, { locale: ptBR }), "d MMM", { locale: ptBR })}`}
            {viewMode === "day" && format(selectedDate, "d 'de' MMMM", { locale: ptBR })}
            {viewMode === "list" && "Próximos Eventos"}
          </h2>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigateView("next")}><ChevronRight className="h-4 w-4" /></Button>
          <Button variant="outline" size="sm" className="text-xs ml-2" onClick={() => { setCurrentMonth(new Date()); setSelectedDate(new Date()); }}>Hoje</Button>
        </div>

        <div className="flex items-center gap-2">
          {/* Category filters */}
          <div className="flex items-center gap-1 mr-2 flex-wrap">
            <Filter className="h-3.5 w-3.5 text-muted-foreground mr-1" />
            {CATEGORIES.map((c) => (
              <button key={c.value} onClick={() => toggleCategory(c.value)} className={cn("flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium transition-all border", filteredCategories.includes(c.value) ? "border-border bg-muted/50 text-muted-foreground/40 line-through" : "border-border/60 bg-card text-foreground hover:border-accent/40")}>
                <div className={cn("h-1.5 w-1.5 rounded-full", c.dot, filteredCategories.includes(c.value) && "opacity-30")} />
                {c.label}
              </button>
            ))}
          </div>
          {/* View mode */}
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
            <TabsList className="h-9 p-0.5 bg-muted/50 border border-border/50">
              <TabsTrigger value="month" className="px-2.5 h-8 text-xs gap-1"><LayoutGrid className="h-3.5 w-3.5 hidden sm:block" />Mês</TabsTrigger>
              <TabsTrigger value="week" className="px-2.5 h-8 text-xs gap-1"><Calendar className="h-3.5 w-3.5 hidden sm:block" />Semana</TabsTrigger>
              <TabsTrigger value="day" className="px-2.5 h-8 text-xs gap-1"><Clock className="h-3.5 w-3.5 hidden sm:block" />Dia</TabsTrigger>
              <TabsTrigger value="list" className="px-2.5 h-8 text-xs gap-1"><List className="h-3.5 w-3.5 hidden sm:block" />Lista</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* ── Views ── */}
      {viewMode === "month" && (
        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          {/* Month Calendar */}
          <Card className="glass-card border-border/40 shadow-xl shadow-black/5 overflow-hidden rounded-2xl">
            <CardContent className="p-3">
              <div className="grid grid-cols-7 mb-1">
                {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
                  <div key={d} className="py-2 text-center text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-px rounded-lg border border-border overflow-hidden bg-border">
                {calendarDays.map((day) => {
                  const dayEvents = eventos.filter((e) => isSameDay(parseISO(e.start_time), day) && !filteredCategories.includes(e.category || ""));
                  const inMonth = isSameMonth(day, currentMonth);
                  const today = isToday(day);
                  const selected = isSameDay(day, selectedDate);

                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => setSelectedDate(day)}
                      onDoubleClick={() => openCreate(day)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const eventId = e.dataTransfer.getData("eventId");
                        if (eventId) {
                          // mantem a mesma hora que tinha
                          const evt = eventos.find(eve => eve.id === eventId);
                          if (evt) {
                            const oldStart = parseISO(evt.start_time);
                            const newDate = new Date(day);
                            newDate.setHours(oldStart.getHours(), oldStart.getMinutes(), 0, 0);
                            handleEventDrop(eventId, newDate);
                          }
                        }
                      }}
                      className={cn(
                        "flex min-h-[90px] flex-col bg-card p-1.5 text-left transition-all hover:bg-muted/30 relative",
                        !inMonth && "bg-muted/10",
                        selected && "ring-2 ring-inset ring-primary/30 z-10",
                      )}
                    >
                      <span className={cn("flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium", today && "bg-primary text-primary-foreground", !today && inMonth && "text-foreground", !today && !inMonth && "text-muted-foreground/40")}>
                        {format(day, "d")}
                      </span>
                      <div className="flex-1 mt-0.5 space-y-px overflow-hidden w-full">
                        {dayEvents.slice(0, 3).map((e) => {
                          const cat = getCategoryConfig(e.category);
                          return (
                            <div key={e.id} draggable onDragStart={(ev) => ev.dataTransfer.setData("eventId", e.id)} className={cn("flex items-center gap-1.5 px-1 py-1 text-[9px] leading-tight truncate rounded-md border", `bg-gradient-to-r ${cat.gradient} border-${cat.dot.replace('bg-', '')}/20`)}>
                              <div className={cn("h-1.5 w-1.5 rounded-full shrink-0", cat.dot)} />
                              <span className="truncate font-medium">{e.title}</span>
                            </div>
                          );
                        })}
                        {dayEvents.length > 3 && <p className="text-[9px] text-muted-foreground font-semibold px-1 mt-1">+{dayEvents.length - 3} itens</p>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Day detail panel */}
          <div className="space-y-4">
            <Card className="glass-card border-border/40 shadow-xl shadow-black/5 overflow-hidden rounded-2xl">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-base font-semibold capitalize">{format(selectedDate, "EEEE", { locale: ptBR })}</p>
                    <p className="text-xs text-muted-foreground">{format(selectedDate, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
                  </div>
                  {isToday(selectedDate) && <Badge variant="outline" className="text-[10px]">Hoje</Badge>}
                </div>
                {isLoading ? (
                  <div className="flex justify-center py-8"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
                ) : eventsForDate.length === 0 ? (
                  (!gcal.isConnected && !mscal.isConnected && !appleCal.isConnected) ? (
                    <CalendarEmptyState />
                  ) : (
                    <div className="flex flex-col items-center py-8 text-center">
                      <CalendarDays className="mb-2 h-8 w-8 text-muted-foreground/20" />
                      <p className="text-sm text-muted-foreground mb-3">Nenhum compromisso</p>
                      <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => openCreate()}>
                        <Plus className="h-3 w-3" /> Adicionar
                      </Button>
                    </div>
                  )
                ) : (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                    <AnimatePresence mode="popLayout">
                      {eventsForDate.map((e, idx) => {
                        const cat = getCategoryConfig(e.category);
                        const CatIcon = cat.icon;
                        return (
                          <motion.div key={e.id} draggable onDragStart={(ev) => (ev as unknown as React.DragEvent).dataTransfer.setData("eventId", e.id)} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ delay: idx * 0.04 }} className={cn("group rounded-lg border p-3 transition-all hover:shadow-sm cursor-grab", `bg-gradient-to-r ${cat.gradient} border-border/30`)} onClick={() => openEdit(e)}>
                            <div className="flex items-start gap-2.5">
                              <CatIcon className={cn("h-4 w-4 mt-0.5 shrink-0", cat.text)} />
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-foreground leading-tight flex items-center justify-between">
                                  {e.title}
                                  {e.recurrence_rule && e.recurrence_rule !== "none" && <span title="Recorrente" className="w-1.5 h-1.5 bg-blue-500 rounded-full" />}
                                </p>
                                {e.description && <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{e.description}</p>}
                                <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  {format(parseISO(e.start_time), "HH:mm")} – {format(parseISO(e.end_time), "HH:mm")}
                                </p>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                    <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs mt-2 border-dashed" onClick={() => openCreate()}>
                      <Plus className="h-3 w-3" /> Adicionar
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {viewMode === "week" && (
        <Card className="glass-card border-border/40 shadow-xl shadow-black/5 overflow-hidden rounded-2xl">
          <CardContent className="p-3">
            <WeekView eventos={eventos} selectedDate={selectedDate} onSelectDate={setSelectedDate} onEdit={openEdit} onEventDrop={handleEventDrop} filteredCategories={filteredCategories} />
          </CardContent>
        </Card>
      )}

      {viewMode === "day" && (
        <Card className="glass-card border-border/40 shadow-xl shadow-black/5 overflow-hidden rounded-2xl">
          <CardContent className="p-5">
            <DayView eventos={eventos} selectedDate={selectedDate} onEdit={openEdit} onEventDrop={handleEventDrop} filteredCategories={filteredCategories} />
          </CardContent>
        </Card>
      )}

      {viewMode === "list" && (
        <Card className="glass-card border-border/40 shadow-xl shadow-black/5 overflow-hidden rounded-2xl">
          <CardContent className="p-5">
            <ListView eventos={eventos} filteredCategories={filteredCategories} onEdit={openEdit} onDelete={(id) => setEventToDelete(id)} />
          </CardContent>
        </Card>
      )}

      {/* ── Create/Edit Dialog ── */}
      <EventDialog
        open={dialogOpen}
        onOpenChange={(open) => { if (!open) closeDialog(); else setDialogOpen(true); }}
        form={form}
        setForm={setForm}
        editingEvent={editingEvent}
        onSubmit={handleSubmit}
        onDeleteRequest={() => { if (editingEvent) { setEventToDelete(editingEvent.id); closeDialog(); } }}
        organizationId={organizationId || null}
        isPending={createMutation.isPending || updateMutation.isPending}
      />

      {/* ── Integrations Dialog ── */}
      <CalendarsIntegrationDialog open={syncOpen} onOpenChange={setSyncOpen} />
      {/* ── Alert Dialog for Deletion ── */}
      <AlertDialog open={!!eventToDelete} onOpenChange={(open) => !open && setEventToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Evento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este evento? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => eventToDelete && deleteMutation.mutate(eventToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}