import { useState, useMemo, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useGoogleCalendar } from "@/hooks/useGoogleCalendar";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  CalendarDays, Plus, Clock, Trash2, Edit, Bell, Link2,
  ChevronLeft, ChevronRight, Gavel, Users, Timer, CheckCircle2, Loader2, Unplug,
  AlertTriangle, Flame, Calendar, LayoutGrid, List, Download, Upload,
  Filter, ExternalLink, Briefcase, ArrowRight, FileDown,
} from "lucide-react";
import {
  format, isSameDay, parseISO, addMonths, subMonths, addWeeks, subWeeks, addDays,
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isToday, isPast, isSameMonth,
  differenceInHours, differenceInMinutes, eachHourOfInterval, startOfDay, endOfDay,
  isWithinInterval, isBefore, isAfter,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";

// ─── Types ────────────────────────────────────────────────────
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

// ─── Categories & Helpers ─────────────────────────────────────
const categories = [
  { value: "audiencia", label: "Audiência", icon: Gavel, dot: "bg-rose-500", gradient: "from-rose-500/15 to-rose-500/5", text: "text-rose-600" },
  { value: "reuniao", label: "Reunião", icon: Users, dot: "bg-blue-500", gradient: "from-blue-500/15 to-blue-500/5", text: "text-blue-600" },
  { value: "prazo", label: "Prazo", icon: Timer, dot: "bg-amber-500", gradient: "from-amber-500/15 to-amber-500/5", text: "text-amber-600" },
  { value: "compromisso", label: "Compromisso", icon: CheckCircle2, dot: "bg-emerald-500", gradient: "from-emerald-500/15 to-emerald-500/5", text: "text-emerald-600" },
  { value: "lembrete", label: "Lembrete", icon: Bell, dot: "bg-violet-500", gradient: "from-violet-500/15 to-violet-500/5", text: "text-violet-600" },
];

const getCat = (cat: string | null) => categories.find((c) => c.value === cat) || categories[3];

const emptyForm = {
  title: "", description: "", start_date: "", start_hour: "09:00", end_hour: "10:00",
  category: "compromisso", process_id: null as string | null,
};

type ViewMode = "month" | "week" | "day" | "list";

// ─── KPI Card ─────────────────────────────────────────────────
function KPICard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string | number; sub?: string; icon: any; color: string;
}) {
  return (
    <div className={`rounded-xl bg-gradient-to-br ${color} border border-border/30 p-4`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{label}</p>
          <p className="text-2xl font-bold text-foreground mt-0.5">{value}</p>
          {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-background/60">
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
      </div>
    </div>
  );
}

// ─── Prazos Fatais Banner ─────────────────────────────────────
function PrazosFataisBanner({ eventos, onSelectDate }: { eventos: Evento[]; onSelectDate: (d: Date) => void }) {
  const now = new Date();
  const critical = eventos
    .filter((e) => {
      const dt = parseISO(e.start_time);
      const hoursUntil = differenceInHours(dt, now);
      return hoursUntil <= 48;
    })
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
    .slice(0, 5);

  if (critical.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-xl border border-destructive/30 bg-destructive/5"
    >
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-destructive animate-pulse" />
      <div className="px-4 py-3 pl-5">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="h-4 w-4 text-destructive animate-pulse" />
          <span className="text-sm font-bold text-destructive">
            {critical.length} Prazo{critical.length > 1 ? "s" : ""} Urgente{critical.length > 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {critical.map((e) => {
            const dt = parseISO(e.start_time);
            const hours = differenceInHours(dt, now);
            const isOverdue = hours < 0;
            return (
              <button
                key={e.id}
                onClick={() => onSelectDate(dt)}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs transition-all hover:scale-[1.02]",
                  isOverdue
                    ? "border-destructive/50 bg-destructive/10 text-destructive"
                    : "border-amber-500/40 bg-amber-500/5 text-amber-700"
                )}
              >
                <Flame className={cn("h-3 w-3 shrink-0", isOverdue ? "text-destructive" : "text-amber-500")} />
                <span className="font-medium truncate max-w-[180px]">{e.title}</span>
                <span className="text-[10px] opacity-70 shrink-0">
                  {isOverdue ? `${Math.abs(hours)}h atrasado` : hours === 0 ? "Agora!" : `${hours}h restantes`}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Weekly View ──────────────────────────────────────────────
function WeekView({ eventos, selectedDate, onSelectDate, onEdit, onDelete, filteredCategories }: {
  eventos: Evento[]; selectedDate: Date; onSelectDate: (d: Date) => void;
  onEdit: (e: Evento) => void; onDelete: (id: string) => void; filteredCategories: string[];
}) {
  const weekStart = startOfWeek(selectedDate, { locale: ptBR });
  const weekDays = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) });
  const hours = Array.from({ length: 14 }, (_, i) => i + 7); // 7am to 8pm

  const filtered = eventos.filter((e) => !filteredCategories.includes(e.category || ""));

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[700px]">
        {/* Day headers */}
        <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border">
          <div className="p-2" />
          {weekDays.map((day) => (
            <button
              key={day.toISOString()}
              onClick={() => onSelectDate(day)}
              className={cn(
                "p-2 text-center border-l border-border transition-colors hover:bg-muted/30",
                isToday(day) && "bg-primary/5",
                isSameDay(day, selectedDate) && "bg-primary/10"
              )}
            >
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {format(day, "EEE", { locale: ptBR })}
              </p>
              <p className={cn(
                "text-lg font-semibold mt-0.5",
                isToday(day) ? "text-primary" : "text-foreground"
              )}>
                {format(day, "d")}
              </p>
            </button>
          ))}
        </div>

        {/* Time grid */}
        <div className="grid grid-cols-[60px_repeat(7,1fr)]">
          {hours.map((hour) => (
            <div key={hour} className="contents">
              <div className="p-1.5 text-right text-[10px] text-muted-foreground border-b border-border/50 h-14 flex items-start justify-end pr-2">
                {`${hour}:00`}
              </div>
              {weekDays.map((day) => {
                const dayHourEvents = filtered.filter((e) => {
                  const start = parseISO(e.start_time);
                  return isSameDay(start, day) && start.getHours() === hour;
                });
                return (
                  <div
                    key={`${day.toISOString()}-${hour}`}
                    className="relative border-l border-b border-border/50 h-14 p-0.5"
                  >
                    {dayHourEvents.map((e) => {
                      const cat = getCat(e.category);
                      const start = parseISO(e.start_time);
                      const end = parseISO(e.end_time);
                      const durationMin = differenceInMinutes(end, start);
                      const heightPx = Math.max(20, (durationMin / 60) * 56);
                      return (
                        <div
                          key={e.id}
                          className={cn(
                            "absolute left-0.5 right-0.5 rounded-md px-1.5 py-0.5 text-[10px] overflow-hidden cursor-pointer z-10 border transition-all hover:shadow-md",
                            `bg-gradient-to-r ${cat.gradient} border-border/30`
                          )}
                          style={{ height: `${Math.min(heightPx, 100)}px`, top: `${(start.getMinutes() / 60) * 56}px` }}
                          onClick={() => onEdit(e)}
                        >
                          <p className={cn("font-medium truncate", cat.text)}>{e.title}</p>
                          <p className="text-muted-foreground truncate">{format(start, "HH:mm")}–{format(end, "HH:mm")}</p>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Day View ─────────────────────────────────────────────────
function DayView({ eventos, selectedDate, onEdit, filteredCategories }: {
  eventos: Evento[]; selectedDate: Date; onEdit: (e: Evento) => void; filteredCategories: string[];
}) {
  const hours = Array.from({ length: 16 }, (_, i) => i + 6); // 6am to 9pm
  const dayEvents = eventos
    .filter((e) => isSameDay(parseISO(e.start_time), selectedDate) && !filteredCategories.includes(e.category || ""))
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

  return (
    <div className="space-y-0">
      {/* Day header */}
      <div className="text-center pb-4">
        <p className="text-2xl font-bold capitalize">
          {format(selectedDate, "EEEE", { locale: ptBR })}
        </p>
        <p className="text-sm text-muted-foreground">
          {format(selectedDate, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </p>
      </div>

      {/* Timeline */}
      <div className="relative">
        {hours.map((hour) => {
          const hourEvents = dayEvents.filter((e) => parseISO(e.start_time).getHours() === hour);
          return (
            <div key={hour} className="flex min-h-[60px] border-t border-border/40">
              <div className="w-16 shrink-0 pr-3 pt-1 text-right text-xs text-muted-foreground">
                {`${hour.toString().padStart(2, "0")}:00`}
              </div>
              <div className="flex-1 pl-3 border-l border-border/40 py-1 space-y-1">
                {hourEvents.map((e) => {
                  const cat = getCat(e.category);
                  const start = parseISO(e.start_time);
                  const end = parseISO(e.end_time);
                  const CatIcon = cat.icon;
                  return (
                    <motion.div
                      key={e.id}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={cn(
                        "group rounded-lg px-3 py-2.5 cursor-pointer border transition-all hover:shadow-md",
                        `bg-gradient-to-r ${cat.gradient} border-border/30`
                      )}
                      onClick={() => onEdit(e)}
                    >
                      <div className="flex items-center gap-2">
                        <CatIcon className={cn("h-3.5 w-3.5 shrink-0", cat.text)} />
                        <span className="text-sm font-medium text-foreground">{e.title}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(start, "HH:mm")} – {format(end, "HH:mm")}
                        </span>
                        {e.description && (
                          <span className="text-xs text-muted-foreground truncate">{e.description}</span>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── List View ────────────────────────────────────────────────
function ListView({ eventos, filteredCategories, onEdit, onDelete }: {
  eventos: Evento[]; filteredCategories: string[];
  onEdit: (e: Evento) => void; onDelete: (id: string) => void;
}) {
  const now = new Date();
  const upcoming = eventos
    .filter((e) => !filteredCategories.includes(e.category || "") && isAfter(parseISO(e.start_time), addDays(now, -1)))
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
    .slice(0, 30);

  // Group by date
  const grouped = upcoming.reduce((acc, e) => {
    const key = format(parseISO(e.start_time), "yyyy-MM-dd");
    if (!acc[key]) acc[key] = [];
    acc[key].push(e);
    return acc;
  }, {} as Record<string, Evento[]>);

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([dateKey, events]) => {
        const date = parseISO(dateKey);
        return (
          <div key={dateKey}>
            <div className="flex items-center gap-3 mb-3">
              <div className={cn(
                "flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold",
                isToday(date) ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}>
                {format(date, "d")}
              </div>
              <div>
                <p className="text-sm font-semibold capitalize">{format(date, "EEEE", { locale: ptBR })}</p>
                <p className="text-xs text-muted-foreground">{format(date, "d 'de' MMMM", { locale: ptBR })}</p>
              </div>
              {isToday(date) && <Badge variant="outline" className="text-[10px]">Hoje</Badge>}
            </div>
            <div className="space-y-2 ml-[52px]">
              {events.map((e) => {
                const cat = getCat(e.category);
                const CatIcon = cat.icon;
                return (
                  <motion.div
                    key={e.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "group flex items-center gap-3 rounded-lg border px-4 py-3 transition-all hover:shadow-md cursor-pointer",
                      `bg-gradient-to-r ${cat.gradient} border-border/30`
                    )}
                    onClick={() => onEdit(e)}
                  >
                    <CatIcon className={cn("h-4 w-4 shrink-0", cat.text)} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{e.title}</p>
                      {e.description && <p className="text-xs text-muted-foreground truncate mt-0.5">{e.description}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-muted-foreground">
                        {format(parseISO(e.start_time), "HH:mm")}–{format(parseISO(e.end_time), "HH:mm")}
                      </span>
                      <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={(ev) => { ev.stopPropagation(); onDelete(e.id); }}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        );
      })}
      {upcoming.length === 0 && (
        <div className="flex flex-col items-center py-12 text-center">
          <CalendarDays className="mb-3 h-10 w-10 text-muted-foreground/20" />
          <p className="text-sm text-muted-foreground">Nenhum evento próximo</p>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────
export default function AgendaPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Evento | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [syncOpen, setSyncOpen] = useState(false);
  const [filteredCategories, setFilteredCategories] = useState<string[]>([]);
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

  const { data: processos = [] } = useQuery({
    queryKey: ["processos_select"],
    queryFn: async () => {
      const { data } = await supabase.from("processos_juridicos").select("id, title, number").order("title");
      return data || [];
    },
  });

  // ─── KPIs ───
  const now = new Date();
  const thisMonth = eventos.filter((e) => isSameMonth(parseISO(e.start_time), now));
  const thisWeek = eventos.filter((e) => {
    const dt = parseISO(e.start_time);
    return isWithinInterval(dt, { start: startOfWeek(now, { locale: ptBR }), end: endOfWeek(now, { locale: ptBR }) });
  });
  const audiencias = thisMonth.filter((e) => e.category === "audiencia");
  const prazosUrgentes = eventos.filter((e) => {
    const dt = parseISO(e.start_time);
    const hours = differenceInHours(dt, now);
    return hours >= 0 && hours <= 72 && e.category === "prazo";
  });

  // ─── Calendar ───
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart, { locale: ptBR });
    const calEnd = endOfWeek(monthEnd, { locale: ptBR });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentMonth]);

  const eventsForDate = eventos.filter((e) => isSameDay(parseISO(e.start_time), selectedDate) && !filteredCategories.includes(e.category || ""));

  // ─── Mutations ───
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
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["eventos_agenda"] }); toast.success("Excluído"); },
    onError: (err: any) => toast.error(err.message),
  });

  // ─── Handlers ───
  const openCreate = useCallback((date?: Date) => {
    setEditingEvent(null);
    setForm({ ...emptyForm, start_date: format(date || selectedDate, "yyyy-MM-dd") });
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
    });
    setDialogOpen(true);
  }, []);

  const closeDialog = useCallback(() => { setDialogOpen(false); setEditingEvent(null); setForm(emptyForm); }, []);

  const handleSubmit = useCallback(() => {
    if (!form.title.trim() || !form.start_date) { toast.error("Preencha título e data"); return; }
    if (!profileData?.organization_id) { toast.error("Organização não encontrada"); return; }
    const start_time = `${form.start_date}T${form.start_hour}:00`;
    const end_time = `${form.start_date}T${form.end_hour}:00`;
    const payload: any = {
      title: form.title, description: form.description || null,
      start_time, end_time, category: form.category,
      process_id: form.process_id || null,
    };
    if (editingEvent) {
      updateMutation.mutate({ id: editingEvent.id, ...payload });
    } else {
      createMutation.mutate({ ...payload, user_id: user!.id, organization_id: profileData.organization_id });
    }
  }, [form, profileData, editingEvent, user]);

  const toggleCategory = useCallback((cat: string) => {
    setFilteredCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  }, []);

  // ─── iCal Export ───
  const exportICal = useCallback(() => {
    const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//LEXA Nova//Agenda//PT-BR"];
    eventos.forEach((e) => {
      const start = parseISO(e.start_time);
      const end = parseISO(e.end_time);
      const fmt = (d: Date) => format(d, "yyyyMMdd'T'HHmmss");
      lines.push("BEGIN:VEVENT", `DTSTART:${fmt(start)}`, `DTEND:${fmt(end)}`, `SUMMARY:${e.title}`,
        `DESCRIPTION:${e.description || ""}`, `CATEGORIES:${e.category || ""}`, "END:VEVENT");
    });
    lines.push("END:VCALENDAR");
    const blob = new Blob([lines.join("\r\n")], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "lexa-agenda.ics"; a.click();
    URL.revokeObjectURL(url);
    toast.success("Arquivo .ics exportado");
  }, [eventos]);

  const weekDayHeaders = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  const navigateView = useCallback((direction: "prev" | "next") => {
    if (viewMode === "month") setCurrentMonth((m) => direction === "prev" ? subMonths(m, 1) : addMonths(m, 1));
    else if (viewMode === "week") setSelectedDate((d) => direction === "prev" ? subWeeks(d, 1) : addWeeks(d, 1));
    else setSelectedDate((d) => direction === "prev" ? addDays(d, -1) : addDays(d, 1));
  }, [viewMode]);

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
              <p className="text-sm text-primary-foreground/60 mt-0.5">
                Gerencie compromissos, audiências e prazos processuais
              </p>
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
        <KPICard label="Eventos este mês" value={thisMonth.length} sub={format(now, "MMMM", { locale: ptBR })} icon={CalendarDays} color="from-blue-500/10 to-blue-500/5" />
        <KPICard label="Esta semana" value={thisWeek.length} sub="Todos os tipos" icon={Calendar} color="from-emerald-500/10 to-emerald-500/5" />
        <KPICard label="Audiências" value={audiencias.length} sub="Este mês" icon={Gavel} color="from-rose-500/10 to-rose-500/5" />
        <KPICard label="Prazos urgentes" value={prazosUrgentes.length} sub="Próximas 72h" icon={AlertTriangle} color="from-amber-500/10 to-amber-500/5" />
      </div>

      {/* ── Prazos Fatais Banner ── */}
      <PrazosFataisBanner eventos={eventos} onSelectDate={setSelectedDate} />

      {/* ── View Controls ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigateView("prev")}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold capitalize min-w-[180px] text-center">
            {viewMode === "month" && format(currentMonth, "MMMM yyyy", { locale: ptBR })}
            {viewMode === "week" && `Semana de ${format(startOfWeek(selectedDate, { locale: ptBR }), "d MMM", { locale: ptBR })}`}
            {viewMode === "day" && format(selectedDate, "d 'de' MMMM", { locale: ptBR })}
            {viewMode === "list" && "Próximos Eventos"}
          </h2>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigateView("next")}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" className="text-xs ml-2" onClick={() => { setCurrentMonth(new Date()); setSelectedDate(new Date()); }}>
            Hoje
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {/* Category filters */}
          <div className="flex items-center gap-1 mr-2">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            {categories.map((c) => (
              <button
                key={c.value}
                onClick={() => toggleCategory(c.value)}
                className={cn(
                  "flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium transition-all border",
                  filteredCategories.includes(c.value)
                    ? "border-border bg-muted/50 text-muted-foreground/40 line-through"
                    : "border-border/60 bg-card text-foreground hover:border-accent/40"
                )}
              >
                <div className={cn("h-1.5 w-1.5 rounded-full", c.dot, filteredCategories.includes(c.value) && "opacity-30")} />
                {c.label}
              </button>
            ))}
          </div>

          {/* View mode */}
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
            <TabsList className="h-9 p-0.5 bg-muted/50 border border-border/50">
              <TabsTrigger value="month" className="px-2.5 h-8 text-xs gap-1"><LayoutGrid className="h-3.5 w-3.5" />Mês</TabsTrigger>
              <TabsTrigger value="week" className="px-2.5 h-8 text-xs gap-1"><Calendar className="h-3.5 w-3.5" />Semana</TabsTrigger>
              <TabsTrigger value="day" className="px-2.5 h-8 text-xs gap-1"><Clock className="h-3.5 w-3.5" />Dia</TabsTrigger>
              <TabsTrigger value="list" className="px-2.5 h-8 text-xs gap-1"><List className="h-3.5 w-3.5" />Lista</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* ── Views ── */}
      {viewMode === "month" && (
        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          {/* Month Calendar */}
          <Card className="border-border/50">
            <CardContent className="p-3">
              <div className="grid grid-cols-7 mb-1">
                {weekDayHeaders.map((d) => (
                  <div key={d} className="py-2 text-center text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-px rounded-lg border border-border overflow-hidden">
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
                      className={cn(
                        "flex min-h-[80px] flex-col bg-card p-1.5 text-left transition-all hover:bg-muted/30 relative",
                        !inMonth && "bg-muted/10",
                        selected && "ring-2 ring-inset ring-primary/30 bg-primary/5",
                      )}
                    >
                      <span className={cn(
                        "flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                        today && "bg-primary text-primary-foreground",
                        !today && inMonth && "text-foreground",
                        !today && !inMonth && "text-muted-foreground/40",
                      )}>
                        {format(day, "d")}
                      </span>
                      <div className="flex-1 mt-0.5 space-y-px overflow-hidden">
                        {dayEvents.slice(0, 2).map((e) => {
                          const cat = getCat(e.category);
                          return (
                            <div key={e.id} className="flex items-center gap-1 px-1 py-px text-[10px] leading-tight truncate rounded">
                              <div className={cn("h-1.5 w-1.5 rounded-full shrink-0", cat.dot)} />
                              <span className="truncate text-foreground/70">{e.title}</span>
                            </div>
                          );
                        })}
                        {dayEvents.length > 2 && (
                          <p className="text-[9px] text-muted-foreground px-1">+{dayEvents.length - 2}</p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Day detail panel */}
          <div className="space-y-4">
            <Card className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-base font-semibold capitalize">{format(selectedDate, "EEEE", { locale: ptBR })}</p>
                    <p className="text-xs text-muted-foreground">{format(selectedDate, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
                  </div>
                  {isToday(selectedDate) && <Badge variant="outline" className="text-[10px]">Hoje</Badge>}
                </div>
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
                            className={cn("group rounded-lg border p-3 transition-all hover:shadow-sm cursor-pointer", `bg-gradient-to-r ${cat.gradient} border-border/30`)}
                            onClick={() => openEdit(e)}
                          >
                            <div className="flex items-start gap-2.5">
                              <CatIcon className={cn("h-4 w-4 mt-0.5 shrink-0", cat.text)} />
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-foreground leading-tight">{e.title}</p>
                                {e.description && <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{e.description}</p>}
                                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  {format(parseISO(e.start_time), "HH:mm")} – {format(parseISO(e.end_time), "HH:mm")}
                                </p>
                              </div>
                              <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(ev) => { ev.stopPropagation(); openEdit(e); }}><Edit className="h-3 w-3" /></Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={(ev) => { ev.stopPropagation(); deleteMutation.mutate(e.id); }}><Trash2 className="h-3 w-3" /></Button>
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

            {/* Mini upcoming */}
            <Card className="border-border/50">
              <CardContent className="p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Próximos Eventos</p>
                <div className="space-y-2">
                  {eventos
                    .filter((e) => isAfter(parseISO(e.start_time), now) && !filteredCategories.includes(e.category || ""))
                    .slice(0, 5)
                    .map((e) => {
                      const cat = getCat(e.category);
                      return (
                        <button key={e.id} onClick={() => { setSelectedDate(parseISO(e.start_time)); }} className="flex items-center gap-2 w-full text-left rounded-md px-2 py-1.5 hover:bg-muted/30 transition-colors">
                          <div className={cn("h-1.5 w-1.5 rounded-full shrink-0", cat.dot)} />
                          <span className="text-xs font-medium truncate flex-1">{e.title}</span>
                          <span className="text-[10px] text-muted-foreground shrink-0">{format(parseISO(e.start_time), "dd/MM HH:mm")}</span>
                        </button>
                      );
                    })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {viewMode === "week" && (
        <Card className="border-border/50">
          <CardContent className="p-3">
            <WeekView eventos={eventos} selectedDate={selectedDate} onSelectDate={setSelectedDate} onEdit={openEdit} onDelete={(id) => deleteMutation.mutate(id)} filteredCategories={filteredCategories} />
          </CardContent>
        </Card>
      )}

      {viewMode === "day" && (
        <Card className="border-border/50">
          <CardContent className="p-5">
            <DayView eventos={eventos} selectedDate={selectedDate} onEdit={openEdit} filteredCategories={filteredCategories} />
          </CardContent>
        </Card>
      )}

      {viewMode === "list" && (
        <Card className="border-border/50">
          <CardContent className="p-5">
            <ListView eventos={eventos} filteredCategories={filteredCategories} onEdit={openEdit} onDelete={(id) => deleteMutation.mutate(id)} />
          </CardContent>
        </Card>
      )}

      {/* ── Create/Edit Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-semibold">{editingEvent ? "Editar Evento" : "Novo Evento"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground uppercase tracking-wider">Título *</label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex: Audiência Trabalhista" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground uppercase tracking-wider">Descrição</label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Detalhes..." rows={2} />
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
            <div className="grid grid-cols-2 gap-3">
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
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground uppercase tracking-wider">Processo</label>
                <Select value={form.process_id ?? "none"} onValueChange={(v) => setForm({ ...form, process_id: v === "none" ? null : v })}>
                  <SelectTrigger><SelectValue placeholder="Vincular" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {processos.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>
                        <span className="flex items-center gap-1.5">
                          <Briefcase className="h-3 w-3 text-muted-foreground" />
                          {p.title} {p.number && <span className="text-muted-foreground">({p.number})</span>}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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

      {/* ── Integrations Dialog ── */}
      <Dialog open={syncOpen} onOpenChange={setSyncOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-semibold">Integrações de Calendário</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <p className="text-sm text-muted-foreground">
              Conecte sua agenda com outros serviços ou exporte seus eventos.
            </p>

            {/* Google Calendar */}
            <div className="rounded-lg border border-border p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10">
                  <CalendarDays className="h-5 w-5 text-red-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Google Calendar</p>
                  <p className="text-xs text-muted-foreground">
                    {gcal.isConnected ? "Conectado" : "Sincronize via OAuth"}
                  </p>
                </div>
                {gcal.isConnected && <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-300">Ativo</Badge>}
              </div>
              {gcal.isConnected ? (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs flex-1" onClick={() => gcal.importEvents()} disabled={gcal.importing}>
                    {gcal.importing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />} Importar
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs flex-1" onClick={() => gcal.exportEvents()} disabled={gcal.exporting}>
                    {gcal.exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />} Exportar
                  </Button>
                  <Button variant="ghost" size="sm" className="text-xs text-destructive" onClick={() => gcal.disconnect()}>
                    <Unplug className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs" onClick={() => gcal.connect()} disabled={gcal.connecting}>
                  {gcal.connecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ExternalLink className="h-3.5 w-3.5" />}
                  Conectar Google Calendar
                </Button>
              )}
            </div>

            {/* Outlook */}
            <div className="rounded-lg border border-border p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
                  <Calendar className="h-5 w-5 text-blue-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Microsoft Outlook</p>
                  <p className="text-xs text-muted-foreground">Sincronize com Outlook/Microsoft 365</p>
                </div>
                <Badge variant="outline" className="text-[10px]">Em breve</Badge>
              </div>
              <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs" disabled>
                <ExternalLink className="h-3.5 w-3.5" /> Conectar Outlook
              </Button>
            </div>

            {/* Apple Calendar (iCal) */}
            <div className="rounded-lg border border-border p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-500/10">
                  <CalendarDays className="h-5 w-5 text-gray-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Apple Calendar / iCal</p>
                  <p className="text-xs text-muted-foreground">Exporte como arquivo .ics</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs" onClick={exportICal}>
                <FileDown className="h-3.5 w-3.5" /> Exportar .ics
              </Button>
            </div>

            {/* Zapier/Webhooks */}
            <div className="rounded-lg border border-border p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10">
                  <ArrowRight className="h-5 w-5 text-orange-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Zapier / Webhooks</p>
                  <p className="text-xs text-muted-foreground">Automatize com APIs externas</p>
                </div>
                <Badge variant="outline" className="text-[10px]">Em breve</Badge>
              </div>
              <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs" disabled>
                <ExternalLink className="h-3.5 w-3.5" /> Configurar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
