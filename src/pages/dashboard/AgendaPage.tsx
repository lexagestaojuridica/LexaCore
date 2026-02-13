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
import { CalendarDays, Plus, Clock, Trash2, Edit, MapPin } from "lucide-react";
import { format, isSameDay, parseISO, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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
  { value: "audiencia", label: "Audiência", color: "bg-red-100 text-red-700 border-red-200" },
  { value: "reuniao", label: "Reunião", color: "bg-blue-100 text-blue-700 border-blue-200" },
  { value: "prazo", label: "Prazo", color: "bg-amber-100 text-amber-700 border-amber-200" },
  { value: "compromisso", label: "Compromisso", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  { value: "lembrete", label: "Lembrete", color: "bg-purple-100 text-purple-700 border-purple-200" },
];

const getCategoryStyle = (cat: string | null) =>
  categories.find((c) => c.value === cat)?.color || "bg-muted text-muted-foreground";

const getCategoryLabel = (cat: string | null) =>
  categories.find((c) => c.value === cat)?.label || cat || "Compromisso";

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

  const eventsForDate = eventos.filter((e) =>
    isSameDay(parseISO(e.start_time), selectedDate)
  );

  const datesWithEvents = eventos.map((e) => startOfDay(parseISO(e.start_time)));

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
    setForm({
      ...emptyForm,
      start_date: format(selectedDate, "yyyy-MM-dd"),
    });
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
      const profile = user;
      createMutation.mutate({
        title: form.title,
        description: form.description || null,
        start_time,
        end_time,
        category: form.category,
        user_id: profile?.id,
        organization_id: undefined, // will need org context
      });
    }
  };

  // We need the org_id — let's fetch it
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

  const handleSubmitWithOrg = () => {
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl text-foreground">Agenda</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie seus compromissos e prazos
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" /> Novo Compromisso
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
        {/* Calendar */}
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
          </CardContent>
        </Card>

        {/* Events for selected date */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="h-4 w-4 text-primary" />
              {format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-10">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : eventsForDate.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-center">
                <CalendarDays className="mb-3 h-10 w-10 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">
                  Nenhum compromisso neste dia
                </p>
                <Button variant="outline" size="sm" className="mt-4" onClick={openCreate}>
                  Adicionar compromisso
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {eventsForDate.map((e) => (
                  <div
                    key={e.id}
                    className="group flex items-start gap-4 rounded-lg border border-border p-4 transition-colors hover:bg-muted/30"
                  >
                    <div className="flex flex-col items-center gap-0.5 pt-0.5 text-primary">
                      <Clock className="h-4 w-4" />
                      <span className="text-[11px] font-medium">
                        {format(parseISO(e.start_time), "HH:mm")}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground">{e.title}</p>
                        <Badge
                          variant="outline"
                          className={cn("text-[10px]", getCategoryStyle(e.category))}
                        >
                          {getCategoryLabel(e.category)}
                        </Badge>
                      </div>
                      {e.description && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {e.description}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-muted-foreground">
                        {format(parseISO(e.start_time), "HH:mm")} –{" "}
                        {format(parseISO(e.end_time), "HH:mm")}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => openEdit(e)}
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => deleteMutation.mutate(e.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingEvent ? "Editar Compromisso" : "Novo Compromisso"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Título *</label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Ex: Audiência Trabalhista"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Descrição</label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Detalhes do compromisso..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium">Data *</label>
                <Input
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Início</label>
                <Input
                  type="time"
                  value={form.start_hour}
                  onChange={(e) => setForm({ ...form, start_hour: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Fim</label>
                <Input
                  type="time"
                  value={form.end_hour}
                  onChange={(e) => setForm({ ...form, end_hour: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Categoria</label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm({ ...form, category: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmitWithOrg}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {editingEvent ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
