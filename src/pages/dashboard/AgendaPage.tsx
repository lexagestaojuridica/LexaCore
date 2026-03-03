import { useState, useMemo, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useGoogleCalendar } from "@/hooks/useGoogleCalendar";
import { useMicrosoftCalendar } from "@/hooks/useMicrosoftCalendar";
import { useAppleCalendar } from "@/hooks/useAppleCalendar";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  format, isSameDay, parseISO, addMonths, subMonths, addWeeks, subWeeks, addDays,
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isToday, isPast, isSameMonth,
  differenceInHours, isAfter, differenceInMinutes, isWithinInterval, isValid
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ChevronLeft, ChevronRight, Gavel, Users, Timer, CheckCircle2, Loader2, Unplug, Scale,
  AlertTriangle, Flame, Calendar, LayoutGrid, List, Download, Upload,
  Filter, ExternalLink, Briefcase, ArrowRight, FileDown, Plus, Link2, CalendarDays,
  Clock, Edit, Trash2, Edit2, PlayCircle, Square, User, Bell
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { CalendarEmptyState } from "@/components/dashboard/CalendarEmptyState";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { AsyncProcessCombobox } from "@/components/dashboard/AsyncProcessCombobox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { KPISkeleton, CardSkeleton } from "@/components/shared/SkeletonLoaders";
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
  recurrence_rule: string | null;
}

// ─── Categories & Helpers ─────────────────────────────────────
const categories = [
  { value: "audiencia", label: "Audiência", icon: Gavel, dot: "bg-rose-500", gradient: "from-rose-500/15 to-rose-500/5", text: "text-rose-600" },
  { value: "reuniao", label: "Reunião", icon: Users, dot: "bg-blue-500", gradient: "from-blue-500/15 to-blue-500/5", text: "text-blue-600" },
  { value: "prazo", label: "Prazo Fixo", icon: Timer, dot: "bg-amber-500", gradient: "from-amber-500/15 to-amber-500/5", text: "text-amber-600" },
  { value: "compromisso", label: "Compromisso", icon: Calendar, dot: "bg-emerald-500", gradient: "from-emerald-500/15 to-emerald-500/5", text: "text-emerald-600" },
  { value: "lembrete", label: "Lembrete", icon: Bell, dot: "bg-violet-500", gradient: "from-violet-500/15 to-violet-500/5", text: "text-violet-600" },
];
const getCat = (cat: string | null) => categories.find((c) => c.value === cat) || categories[3];

const RECURRENCE_OPTIONS = [
  { value: "none", label: "Não se repete" },
  { value: "daily", label: "Diariamente" },
  { value: "weekly", label: "Semanalmente" },
  { value: "monthly", label: "Mensalmente" },
];

const emptyForm = {
  title: "", description: "", start_date: "", start_hour: "09:00", end_hour: "10:00",
  category: "compromisso", process_id: null as string | null, recurrence_rule: "none",
};

type ViewMode = "month" | "week" | "day" | "list";

// ─── KPI Card ─────────────────────────────────────────────────
function KPICard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string | number; sub?: string; icon: any; color: string;
}) {
  return (
    <Card className="glass-card border-border/40 shadow-sm hover:translate-y-[-2px] transition-all duration-300">
      <CardContent className="p-4 flex gap-4 items-center">
        <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br shadow-sm ring-1 ring-white/20", color)}>
          <Icon className="h-5 w-5 text-foreground" />
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground/70 mb-0.5">{label}</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-bold text-foreground tracking-tight">{value}</h3>
            {sub && <span className="text-[10px] font-medium text-muted-foreground/60">{sub}</span>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Prazos Fatais Banner ─────────────────────────────────────
import { useUpcomingDeadlines } from "@/hooks/useUpcomingDeadlines";

function PrazosFataisBanner({ onSelectDate }: { onSelectDate: (d: Date) => void }) {
  const { deadlines, isLoading } = useUpcomingDeadlines();

  // Filter only the critical ones (within next 48h)
  const prazosCriticos = (deadlines || []).filter((e) => {
    const dt = new Date(e.start_time);
    const diff = differenceInHours(dt, new Date());
    return diff >= 0 && diff <= 48;
  }).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

  if (isLoading || prazosCriticos.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-xl glass-card border-amber-500/20 shadow-xl shadow-amber-500/5 p-4"
    >
      <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-amber-500 to-orange-600" />
      <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/20 text-amber-600 ring-1 ring-amber-500/30 shadow-inner">
            <Flame className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-amber-800 dark:text-amber-400">Prazos Fatais Iminentes</h3>
            <p className="text-xs text-amber-600/80 font-medium">{prazosCriticos.length} compromissos críticos nas próximas 48h</p>
          </div>
        </div>
        <div className="flex gap-2 min-w-0 overflow-x-auto pb-1 sm:pb-0 scrollbar-hide">
          {prazosCriticos.map((e) => (
            <button key={e.id} onClick={() => onSelectDate(new Date(e.start_time))} className="shrink-0 max-w-[220px] flex items-center justify-between gap-4 rounded-lg bg-white/40 dark:bg-black/20 border border-amber-500/10 px-3.5 py-2 text-xs hover:bg-amber-500/10 transition-all hover:scale-[1.02] shadow-sm">
              <span className="font-bold truncate text-foreground">{e.title}</span>
              <span className="text-amber-600 font-black shrink-0 tabular-nums">{format(new Date(e.start_time), "dd/MM HH:mm")}</span>
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Weekly View ──────────────────────────────────────────────
function WeekView({ eventos, selectedDate, onSelectDate, onEdit, onDelete, onEventDrop, filteredCategories }: {
  eventos: Evento[]; selectedDate: Date; onSelectDate: (d: Date) => void;
  onEdit: (e: Evento) => void; onDelete: (id: string) => void;
  onEventDrop: (id: string, newStart: Date) => void; filteredCategories: string[];
}) {
  const weekStart = startOfWeek(selectedDate, { locale: ptBR });
  const weekDays = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) });
  const hours = Array.from({ length: 14 }, (_, i) => i + 7); // 7am to 8pm

  const filtered = eventos.filter((e) => !filteredCategories.includes(e.category || ""));

  return (
    <div className="overflow-x-auto select-none">
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
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{format(day, "EEE", { locale: ptBR })}</p>
              <p className={cn("text-lg font-semibold mt-0.5", isToday(day) ? "text-primary" : "text-foreground")}>{format(day, "d")}</p>
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
                    className="relative border-l border-b border-border/50 h-14 p-0.5 hover:bg-muted/10 transition-colors"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const eventId = e.dataTransfer.getData("eventId");
                      if (eventId) {
                        const newDate = new Date(day);
                        newDate.setHours(hour, 0, 0, 0);
                        onEventDrop(eventId, newDate);
                      }
                    }}
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
                          draggable
                          onDragStart={(evt) => evt.dataTransfer.setData("eventId", e.id)}
                          className={cn(
                            "absolute left-0.5 right-0.5 rounded-md px-1.5 py-0.5 text-[10px] overflow-hidden cursor-pointer z-10 border transition-all hover:shadow-md hover:z-20",
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
// Helper to calculate overlapping groups
function calculateEventCollisions(events: Evento[]) {
  const sorted = [...events].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

  // Array of groups. Each group is an array of columns. Each column is an array of events
  const groups: Evento[][][] = [];
  let currentGroup: Evento[][] = [];
  let groupEnd = new Date(0);

  sorted.forEach(evt => {
    const start = parseISO(evt.start_time);
    const end = parseISO(evt.end_time);

    // If event starts after the current group ends, start a new group
    if (start >= groupEnd) {
      if (currentGroup.length > 0) groups.push(currentGroup);
      currentGroup = [[evt]];
      groupEnd = end;
    } else {
      // Find the first column where this event can fit
      let placed = false;
      for (let i = 0; i < currentGroup.length; i++) {
        const lastEvtInCol = currentGroup[i][currentGroup[i].length - 1];
        if (start >= parseISO(lastEvtInCol.end_time)) {
          currentGroup[i].push(evt);
          placed = true;
          break;
        }
      }

      // If it doesn't fit in any existing column, create a new one
      if (!placed) {
        currentGroup.push([evt]);
      }

      // Update the group's end time if this event ends later
      if (end > groupEnd) {
        groupEnd = end;
      }
    }
  });

  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  // Flatten and map to attach positioned logic
  const positionedEvents = new Map<string, { width: number; left: number }>();

  groups.forEach(group => {
    const columnsCount = group.length;
    const widthPercentage = 100 / columnsCount;

    group.forEach((column, colIndex) => {
      column.forEach(evt => {
        positionedEvents.set(evt.id, {
          width: widthPercentage,
          left: colIndex * widthPercentage
        });
      });
    });
  });

  return positionedEvents;
}

function DayView({ eventos, selectedDate, onEdit, onEventDrop, filteredCategories }: {
  eventos: Evento[]; selectedDate: Date; onEdit: (e: Evento) => void;
  onEventDrop: (id: string, newStart: Date) => void; filteredCategories: string[];
}) {
  const hours = Array.from({ length: 17 }, (_, i) => i + 6); // 6am to 10pm
  const dayEvents = eventos
    .filter((e) => isSameDay(parseISO(e.start_time), selectedDate) && !filteredCategories.includes(e.category || ""))
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

  const nowHour = new Date().getHours();
  const nowMinute = new Date().getMinutes();
  const showNowLine = isToday(selectedDate) && nowHour >= 6 && nowHour <= 22;

  // Calculate visual collisions for event layout
  const eventLayouts = useMemo(() => calculateEventCollisions(dayEvents), [dayEvents]);

  return (
    <div className="space-y-0">
      <div className="text-center pb-4">
        <p className="text-2xl font-bold capitalize">{format(selectedDate, "EEEE", { locale: ptBR })}</p>
        <p className="text-sm text-muted-foreground">{format(selectedDate, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
      </div>

      <div className="relative border-b border-border/40 pb-6" style={{ height: `${hours.length * 80}px` }}>
        {hours.map((hour, idx) => {
          const isNowHour = showNowLine && nowHour === hour;
          return (
            <div
              key={hour}
              className="absolute w-full flex border-t border-border/40 transition-colors"
              style={{ top: `${idx * 80}px`, height: '80px' }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const eventId = e.dataTransfer.getData("eventId");
                if (eventId) {
                  const newDate = new Date(selectedDate);
                  newDate.setHours(hour, 0, 0, 0);
                  onEventDrop(eventId, newDate);
                }
              }}
            >
              {/* Current time indicator */}
              {isNowHour && (
                <div
                  className="absolute left-14 right-0 z-20 flex items-center pointer-events-none"
                  style={{ top: `${(nowMinute / 60) * 80}px` }}
                >
                  <div className="h-2.5 w-2.5 rounded-full bg-red-500 -ml-1 shrink-0 shadow-sm" />
                  <div className="h-px flex-1 bg-red-500" />
                  <span className="text-[9px] font-bold text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded-full ml-1 shrink-0">
                    {`${nowHour.toString().padStart(2, "0")}:${nowMinute.toString().padStart(2, "0")}`}
                  </span>
                </div>
              )}

              <div className={cn(
                "w-16 shrink-0 pr-3 pt-1 text-right text-xs bg-background/50 z-10",
                isNowHour ? "text-red-500 font-bold" : "text-muted-foreground"
              )}>
                {`${hour.toString().padStart(2, "0")}:00`}
              </div>

              {/* Event Container Track */}
              <div className="flex-1 pl-3 border-l border-border/40 relative h-full">
                {/* Empty slot for drag and drop hover styling if needed */}
              </div>
            </div>
          );
        })}

        {/* Absolute Events Layer over the timeline */}
        <div className="absolute left-[76px] right-2 top-0 bottom-0 pointer-events-none">
          {dayEvents.map((e) => {
            const cat = getCat(e.category);
            const start = parseISO(e.start_time);
            const end = parseISO(e.end_time);

            // Calculate absolute Y position
            const startHour = start.getHours() + (start.getMinutes() / 60);
            const endHour = end.getHours() + (end.getMinutes() / 60);

            // Offset logic based on our start hour (6am)
            const minHour = hours[0];
            const topPx = Math.max(0, (startHour - minHour) * 80);
            const durationPx = Math.max(24, (endHour - startHour) * 80); // Min height of 24px

            // Layout dimensions
            const layout = eventLayouts.get(e.id) || { width: 100, left: 0 };

            const CatIcon = cat.icon;

            // If the event spans outside the visible hours block, we might trim it, but let's assume valid data for now
            if (startHour > hours[hours.length - 1] + 1 || endHour < minHour) return null;

            return (
              <motion.div
                key={e.id}
                draggable
                onDragStart={(evt: any) => evt.dataTransfer.setData("eventId", e.id)}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{
                  top: `${topPx}px`,
                  height: `${durationPx}px`,
                  left: `${layout.left}%`,
                  width: `calc(${layout.width}% - 4px)`, // Subtract 4px for a tiny gap between colliding cards
                }}
                className={cn(
                  "absolute group rounded-md px-3 py-2 cursor-pointer border transition-shadow hover:shadow-lg hover:z-30 z-20 pointer-events-auto overflow-hidden",
                  `bg-gradient-to-br ${cat.gradient} border-${cat.dot.replace('bg-', '')}/40`
                )}
                onClick={() => onEdit(e)}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5 truncate">
                    <CatIcon className={cn("h-3.5 w-3.5 shrink-0", cat.text)} />
                    <span className="text-sm font-semibold text-foreground truncate">{e.title}</span>
                  </div>
                  {e.recurrence_rule && e.recurrence_rule !== "none" && (
                    <Badge variant="outline" className="text-[8px] px-1 py-0 h-3.5 leading-none shrink-0 bg-background/50 border-blue-500/30">Recorrente</Badge>
                  )}
                </div>

                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-1">
                    <Clock className="h-2.5 w-2.5" />
                    {format(start, "HH:mm")} – {format(end, "HH:mm")}
                  </span>

                  {durationPx > 50 && e.process_id && (
                    <span className="text-[10px] font-medium text-primary flex items-center gap-1 mt-1 truncate">
                      <Briefcase className="h-2.5 w-2.5" />
                      Proc. {e.process_id.substring(0, 8)}...
                    </span>
                  )}
                  {durationPx > 70 && e.description && (
                    <span className="text-[10px] text-muted-foreground/80 italic truncate w-full mt-1">
                      {e.description}
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
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
              <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold", isToday(date) ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
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
                  <motion.div key={e.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className={cn("group flex items-center gap-3 rounded-lg border px-4 py-3 transition-all hover:shadow-md cursor-pointer", `bg-gradient-to-r ${cat.gradient} border-border/30`)} onClick={() => onEdit(e)}>
                    <CatIcon className={cn("h-4 w-4 shrink-0", cat.text)} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium flex items-center gap-1.5">{e.title} {e.recurrence_rule && e.recurrence_rule !== "none" && <span title="Evento Recorrente" className="h-1.5 w-1.5 rounded-full bg-blue-500" />}</p>
                      {e.description && <p className="text-xs text-muted-foreground truncate mt-0.5">{e.description}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-muted-foreground">{format(parseISO(e.start_time), "HH:mm")}–{format(parseISO(e.end_time), "HH:mm")}</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={(ev) => { ev.stopPropagation(); onDelete(e.id); }}><Trash2 className="h-3 w-3 text-destructive" /></Button>
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
  const { t } = useTranslation();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Evento | null>(null);
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [syncOpen, setSyncOpen] = useState(false);
  const [filteredCategories, setFilteredCategories] = useState<string[]>([]);
  const gcal = useGoogleCalendar();
  const mscal = useMicrosoftCalendar();
  const appleCal = useAppleCalendar();

  const { data: profileData } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("organization_id").eq("user_id", user!.id).single();
      return data;
    },
    enabled: !!user?.id,
  });

  // Fix TS issue by asserting the returned array
  const { data: rawEventos = [], isLoading } = useQuery({
    queryKey: ["eventos_agenda", profileData?.organization_id, currentMonth.getFullYear(), currentMonth.getMonth()],
    queryFn: async () => {
      const startWindow = subMonths(currentMonth, 2).toISOString();
      const endWindow = addMonths(currentMonth, 2).toISOString();
      const { data, error } = await supabase
        .from("eventos_agenda")
        .select("*")
        .eq("organization_id", profileData!.organization_id!)
        .gte("start_time", startWindow)
        .lte("start_time", endWindow)
        .order("start_time", { ascending: true });
      if (error) throw error;
      return data as unknown as Evento[];
    },
    enabled: !!profileData?.organization_id,
  });

  const eventos = useMemo(() => {
    return rawEventos.filter(e => e.start_time && e.end_time && isValid(parseISO(e.start_time)) && isValid(parseISO(e.end_time)));
  }, [rawEventos]);

  // ─── KPIs ───
  const now = useMemo(() => new Date(), []);
  const thisMonth = useMemo(() => eventos.filter((e) => isSameMonth(parseISO(e.start_time), now)), [eventos, now]);
  const thisWeek = useMemo(() => eventos.filter((e) => {
    const dt = parseISO(e.start_time);
    return isWithinInterval(dt, { start: startOfWeek(now, { locale: ptBR }), end: endOfWeek(now, { locale: ptBR }) });
  }), [eventos, now]);
  const audiencias = useMemo(() => thisMonth.filter((e) => e.category === "audiencia"), [thisMonth]);

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
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["eventos_agenda"] }); setEventToDelete(null); toast.success("Excluído"); closeDialog(); },
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
      recurrence_rule: e.recurrence_rule || "none",
    });
    setDialogOpen(true);
  }, []);

  const closeDialog = useCallback(() => { setDialogOpen(false); setEditingEvent(null); setForm(emptyForm); }, []);

  const handleSubmit = useCallback(() => {
    if (!form.title.trim() || !form.start_date) { toast.error("Preencha título e data"); return; }
    if (!profileData?.organization_id) { toast.error("Organização não encontrada"); return; }

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

    const payload: any = {
      title: form.title, description: form.description || null,
      start_time: start_time_iso, end_time: end_time_iso, category: form.category,
      process_id: form.process_id || null,
      recurrence_rule: form.recurrence_rule === "none" ? null : form.recurrence_rule,
    };
    if (editingEvent) {
      updateMutation.mutate({ id: editingEvent.id, ...payload });
    } else {
      createMutation.mutate({ ...payload, user_id: user!.id, organization_id: profileData.organization_id });
    }
  }, [form, profileData, editingEvent, user]);

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
  }, [eventos]);

  const toggleCategory = useCallback((cat: string) => {
    setFilteredCategories((prev) => prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]);
  }, []);

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
            {categories.map((c) => (
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
                          const cat = getCat(e.category);
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
                        const cat = getCat(e.category);
                        const CatIcon = cat.icon;
                        return (
                          <motion.div key={e.id} draggable onDragStart={(ev: any) => ev.dataTransfer.setData("eventId", e.id)} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ delay: idx * 0.04 }} className={cn("group rounded-lg border p-3 transition-all hover:shadow-sm cursor-grab", `bg-gradient-to-r ${cat.gradient} border-border/30`)} onClick={() => openEdit(e)}>
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
            <WeekView eventos={eventos} selectedDate={selectedDate} onSelectDate={setSelectedDate} onEdit={openEdit} onDelete={(id) => setEventToDelete(id)} onEventDrop={handleEventDrop} filteredCategories={filteredCategories} />
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
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingEvent ? "Editar Evento" : "Novo Evento"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Título *</label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex: Audiência Trabalhista" />
              </div>
              <div className="col-span-1">
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Categoria</label>
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
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground uppercase tracking-wider">Recorrência</label>
                <Select value={form.recurrence_rule} onValueChange={(v) => setForm({ ...form, recurrence_rule: v })} disabled={editingEvent?.recurrence_rule && !RECURRENCE_OPTIONS.some(o => o.value === editingEvent.recurrence_rule)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {RECURRENCE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {editingEvent?.recurrence_rule && !RECURRENCE_OPTIONS.some(o => o.value === editingEvent.recurrence_rule) && (
                  <p className="text-[10px] text-amber-500 mt-1">Regra avançada do provedor de origem.</p>
                )}
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground uppercase tracking-wider">Vincular Processo</label>
                <AsyncProcessCombobox
                  organizationId={profileData?.organization_id}
                  value={form.process_id}
                  onChange={(v) => setForm({ ...form, process_id: v })}
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground uppercase tracking-wider">Descrição Opcional</label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Detalhes adicionais, links da reunião..." rows={2} />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0 mt-2">
            {editingEvent && (
              <Button variant="outline" className="mr-auto text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => { setEventToDelete(editingEvent.id); closeDialog(); }}>
                Excluir
              </Button>
            )}
            <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
              {editingEvent ? "Salvar Alterações" : "Criar Evento"}
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
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground mb-2">Conecte sua agenda com outros serviços ou exporte seus eventos.</p>

            {/* Google Calendar */}
            <div className="rounded-lg border border-border p-4 bg-card shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
                  <CalendarDays className="h-5 w-5 text-blue-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Google Calendar</p>
                  <p className="text-xs text-muted-foreground">{gcal.isConnected ? "Conectado" : "Sincronize via OAuth"}</p>
                </div>
                {gcal.isConnected && <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-300 bg-emerald-500/10">Ativo</Badge>}
              </div>
              {gcal.isConnected ? (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs flex-1" onClick={() => gcal.importEvents()} disabled={gcal.importing}>
                      {gcal.importing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />} Importar
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs flex-1" onClick={() => gcal.exportEvents()} disabled={gcal.exporting}>
                      {gcal.exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />} Exportar
                    </Button>
                    <Button variant="ghost" size="sm" className="px-2 text-destructive hover:bg-destructive/10" onClick={() => gcal.disconnect()} title="Desconectar"><Unplug className="h-4 w-4" /></Button>
                  </div>
                  <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs border-destructive/30 text-destructive hover:bg-destructive/10" onClick={() => gcal.clearEvents()} disabled={gcal.clearing}>
                    {gcal.clearing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    Limpar Agenda Importada
                  </Button>
                </div>
              ) : (
                <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs border-blue-500/30 text-blue-600 hover:bg-blue-500/10" onClick={() => gcal.connect()} disabled={gcal.connecting}>
                  {gcal.connecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ExternalLink className="h-3.5 w-3.5" />}
                  Conectar Google Account
                </Button>
              )}
            </div>

            {/* Microsoft Calendar */}
            <div className="rounded-lg border border-border p-4 bg-card shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10">
                  <CalendarDays className="h-5 w-5 text-indigo-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Microsoft Calendar</p>
                  <p className="text-xs text-muted-foreground">{mscal.isConnected ? "Conectado" : "Microsoft 365 / Outlook"}</p>
                </div>
                {mscal.isConnected && <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-300 bg-emerald-500/10">Ativo</Badge>}
              </div>
              {mscal.isConnected ? (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs flex-1" onClick={() => mscal.importEvents()} disabled={mscal.importing}>
                      {mscal.importing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />} Importar
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs flex-1" onClick={() => mscal.exportEvents()} disabled={mscal.exporting}>
                      {mscal.exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />} Exportar
                    </Button>
                    <Button variant="ghost" size="sm" className="px-2 text-destructive hover:bg-destructive/10" onClick={() => mscal.disconnect()} title="Desconectar"><Unplug className="h-4 w-4" /></Button>
                  </div>
                  <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs border-destructive/30 text-destructive hover:bg-destructive/10" onClick={() => mscal.clearEvents()} disabled={mscal.clearing}>
                    {mscal.clearing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    Limpar Agenda Importada
                  </Button>
                </div>
              ) : (
                <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs border-indigo-500/30 text-indigo-600 hover:bg-indigo-500/10" onClick={() => mscal.connect()} disabled={mscal.connecting}>
                  {mscal.connecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ExternalLink className="h-3.5 w-3.5" />}
                  Conectar Microsoft 365
                </Button>
              )}
            </div>

            {/* Apple Calendar */}
            <div className="rounded-lg border border-border p-4 bg-card shadow-sm mb-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-200 dark:bg-neutral-800">
                  <CalendarDays className="h-5 w-5 text-neutral-800 dark:text-neutral-200" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Apple Calendar</p>
                  <p className="text-xs text-muted-foreground">{appleCal.isConnected ? "Conectado" : "Sincronize via CalDAV"}</p>
                </div>
                {appleCal.isConnected && <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-300 bg-emerald-500/10">Ativo</Badge>}
              </div>
              {appleCal.isConnected ? (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs flex-1" onClick={() => appleCal.importEvents()} disabled={appleCal.importing}>
                      {appleCal.importing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />} Importar
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs flex-1 border-dashed text-muted-foreground cursor-not-allowed" disabled title="Em Breve">
                      <Upload className="h-3.5 w-3.5" /> Exportar
                    </Button>
                    <Button variant="ghost" size="sm" className="px-2 text-destructive hover:bg-destructive/10" onClick={() => appleCal.disconnect()} title="Desconectar"><Unplug className="h-4 w-4" /></Button>
                  </div>
                  <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs border-destructive/30 text-destructive hover:bg-destructive/10" onClick={() => appleCal.clearEvents()} disabled={appleCal.clearing}>
                    {appleCal.clearing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    Limpar Agenda Importada
                  </Button>
                </div>
              ) : (
                <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs border-neutral-500/30 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-500/10 cursor-not-allowed" disabled>
                  Para conectar, use o novo menu inicial de integrações!
                </Button>
              )}
            </div>

          </div>
        </DialogContent>
      </Dialog>

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
