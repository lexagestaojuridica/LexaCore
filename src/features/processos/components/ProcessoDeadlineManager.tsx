import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Timer, Plus, Calendar, AlertCircle, CheckCircle2, Trash2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { calculateDeadline, isOverdue } from "@/lib/legalDates";
import { toast } from "sonner";

interface Deadline {
    id: string;
    title: string;
    deadline_type: 'useful_days' | 'calendar_days';
    start_date: string;
    days_count: number;
    fatal_date: string;
    status: 'pending' | 'completed' | 'overdue' | 'cancelled';
}

export function ProcessoDeadlineManager({ processId, orgId }: { processId: string; orgId: string }) {
    const queryClient = useQueryClient();
    const [isAdding, setIsAdding] = useState(false);
    const [newDeadline, setNewDeadline] = useState({
        title: "",
        days: 15,
        startDate: new Date().toISOString().split('T')[0],
        type: 'useful_days' as 'useful_days' | 'calendar_days'
    });

    const { data: deadlines = [], isLoading } = useQuery({
        queryKey: ["process-deadlines", processId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("processos_prazos")
                .select("*")
                .eq("process_id", processId)
                .order("fatal_date", { ascending: true });
            if (error) throw error;
            return (data || []) as Deadline[];
        },
    });

    const createMutation = useMutation({
        mutationFn: async (payload: any) => {
            const { error } = await supabase.from("processos_prazos").insert(payload);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["process-deadlines"] });
            setIsAdding(false);
            setNewDeadline({ title: "", days: 15, startDate: new Date().toISOString().split('T')[0], type: 'useful_days' });
            toast.success("Prazo cadastrado com sucesso!");
        },
    });

    const updateStatusMutation = useMutation({
        mutationFn: async ({ id, status }: { id: string; status: string }) => {
            const { error } = await supabase.from("processos_prazos").update({ status }).eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["process-deadlines"] }),
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from("processos_prazos").delete().eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["process-deadlines"] }),
    });

    const handleAdd = () => {
        if (!newDeadline.title) return toast.error("Título obrigatório");

        const fatalDate = calculateDeadline(new Date(newDeadline.startDate), newDeadline.days);

        createMutation.mutate({
            process_id: processId,
            organization_id: orgId,
            title: newDeadline.title,
            start_date: newDeadline.startDate,
            days_count: newDeadline.days,
            deadline_type: newDeadline.type,
            fatal_date: fatalDate.toISOString().split('T')[0],
            status: 'pending'
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                    <Timer className="h-4 w-4 text-primary" /> Contagem de Prazos (CPC/2015)
                </h3>
                {!isAdding && (
                    <Button variant="outline" size="sm" className="h-8 gap-2 font-bold text-xs border-primary/20" onClick={() => setIsAdding(true)}>
                        <Plus className="h-3.5 w-3.5" /> Novo Prazo
                    </Button>
                )}
            </div>

            {isAdding && (
                <div className="p-4 bg-muted/20 border border-primary/20 rounded-2xl space-y-4 animate-in fade-in zoom-in duration-200">
                    <Input
                        placeholder="Ex: Contestação, Recurso de Apelação..."
                        value={newDeadline.title}
                        onChange={(e) => setNewDeadline(prev => ({ ...prev, title: e.target.value }))}
                        className="bg-background border-border/40 font-semibold"
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[9px] font-bold text-muted-foreground uppercase">Início (Intimação)</label>
                            <Input
                                type="date"
                                value={newDeadline.startDate}
                                onChange={(e) => setNewDeadline(prev => ({ ...prev, startDate: e.target.value }))}
                                className="bg-background border-border/40"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-bold text-muted-foreground uppercase">Qtd. Dias</label>
                            <Input
                                type="number"
                                value={newDeadline.days}
                                onChange={(e) => setNewDeadline(prev => ({ ...prev, days: parseInt(e.target.value) }))}
                                className="bg-background border-border/40"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setIsAdding(false)}>Cancelar</Button>
                        <Button size="sm" className="font-bold px-6" onClick={handleAdd}>Salvar Prazo</Button>
                    </div>
                </div>
            )}

            <div className="space-y-3">
                {deadlines.length === 0 && !isLoading && !isAdding && (
                    <div className="text-center py-12 bg-muted/5 border-2 border-dashed border-border/40 rounded-2xl">
                        <Clock className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
                        <p className="text-xs text-muted-foreground font-medium">Nenhum prazo fatal cadastrado.</p>
                    </div>
                )}

                {deadlines.map((p) => {
                    const overdue = p.status === 'pending' && isOverdue(new Date(p.fatal_date));
                    return (
                        <div key={p.id} className="flex items-center justify-between p-4 rounded-2xl border border-border/50 bg-card hover:border-primary/30 transition-all group overflow-hidden relative">
                            {overdue && <div className="absolute left-0 top-0 bottom-0 w-1 bg-destructive" />}

                            <div className="flex items-center gap-4 flex-1">
                                <div className={`h-10 w-10 rounded-xl flex items-center justify-center transition-colors ${p.status === 'completed' ? 'bg-emerald-500/10 text-emerald-600' :
                                        overdue ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'
                                    }`}>
                                    {p.status === 'completed' ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                                </div>

                                <div className="min-w-0">
                                    <p className="text-sm font-bold truncate pr-2">{p.title}</p>
                                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                                        <Calendar className="h-3 w-3" />
                                        Vence em: <span className={overdue ? "text-destructive font-bold" : ""}>
                                            {format(new Date(p.fatal_date), "dd 'de' MMMM", { locale: ptBR })}
                                        </span>
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-1">
                                {p.status === 'pending' && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-emerald-500 hover:bg-emerald-500/10"
                                        onClick={() => updateStatusMutation.mutate({ id: p.id, status: 'completed' })}
                                    >
                                        <CheckCircle2 className="h-4 w-4" />
                                    </Button>
                                )}
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                    onClick={() => deleteMutation.mutate(p.id)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
