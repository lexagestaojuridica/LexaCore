import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Bot, Plus, Zap, ArrowRight, Activity, Trash2, Edit2, Play, ToggleLeft, ToggleRight, X } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Switch } from "@/shared/ui/switch";
import { Badge } from "@/shared/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Separator } from "@/shared/ui/separator";
import LexaLoadingOverlay from "@/shared/components/LexaLoadingOverlay";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const TRIGGER_OPTIONS = [
    { value: "process_created", label: "Novo Processo Cadastrado", icon: "⚖️" },
    { value: "invoice_paid", label: "Fatura Paga (Pix/Boleto)", icon: "💸" },
    { value: "document_signed", label: "Documento Assinado (E-Sign)", icon: "✍️" },
];

const ACTION_OPTIONS = [
    { value: "send_whatsapp", label: "Enviar WhatsApp p/ Cliente" },
    { value: "create_task", label: "Criar Tarefa no Workflow" },
    { value: "move_kanban", label: "Mover Processo" },
];

export default function WorkflowAutomations() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [form, setForm] = useState({ name: "", description: "", trigger_type: "", action: "" });

    const { data: profile } = useQuery({
        queryKey: ["profile", user?.id],
        queryFn: async () => {
            const { data } = await supabase.from("profiles").select("organization_id").eq("user_id", user!.id).single();
            return data;
        },
        enabled: !!user,
    });

    const orgId = profile?.organization_id;

    const { data: automations = [], isLoading } = useQuery({
        queryKey: ["automations", orgId],
        queryFn: async () => {
            const { data } = await supabase.from("workflow_automations").select("*").eq("organization_id", orgId!).order("created_at", { ascending: false });
            return data ?? [];
        },
        enabled: !!orgId,
    });

    const createMutation = useMutation({
        mutationFn: async () => {
            // Mock nodes based on selected trigger and action
            const nodes = [
                { id: "trigger_1", type: "trigger", data: { label: form.trigger_type } },
                { id: "action_1", type: "action", data: { label: form.action } },
            ];
            const edges = [{ id: "e1-2", source: "trigger_1", target: "action_1" }];

            const { error } = await supabase.from("workflow_automations").insert({
                organization_id: orgId!,
                name: form.name,
                description: form.description,
                trigger_type: form.trigger_type,
                nodes: nodes,
                edges: edges,
                is_active: true,
            });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["automations"] });
            toast.success("Automação criada");
            setDialogOpen(false);
            setForm({ name: "", description: "", trigger_type: "", action: "" });
        },
        onError: () => toast.error("Erro ao criar automação"),
    });

    const toggleMutation = useMutation({
        mutationFn: async ({ id, is_active }: { id: string, is_active: boolean }) => {
            const { error } = await supabase.from("workflow_automations").update({ is_active }).eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["automations"] }),
        onError: () => toast.error("Erro ao alterar status da automação"),
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from("workflow_automations").delete().eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["automations"] });
            toast.success("Automação removida com sucesso");
        },
    });

    const getTriggerLabel = (val: string) => TRIGGER_OPTIONS.find(t => t.value === val)?.label || val;
    const getActionLabel = (val: string) => ACTION_OPTIONS.find(a => a.value === val)?.label || val;

    return (
        <div className="space-y-6">
            <LexaLoadingOverlay visible={createMutation.isPending} />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl border border-border bg-card shadow-sm">
                <div>
                    <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                        <Zap className="h-4 w-4 text-emerald-500" /> Motor de Automações
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">Crie gatilhos (Se/Então) para reduzir o trabalho manual do seu escritório.</p>
                </div>
                <Button onClick={() => setDialogOpen(true)} className="gap-2 shrink-0"><Plus className="h-4 w-4" /> Nova Automação</Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {isLoading ? (
                    [1, 2, 3].map(n => <div key={n} className="h-40 rounded-xl bg-muted/40 animate-pulse border border-border" />)
                ) : automations.length === 0 ? (
                    <div className="col-span-full flex flex-col items-center justify-center p-12 py-20 bg-muted/20 border border-dashed border-border rounded-xl">
                        <Bot className="h-12 w-12 text-muted-foreground/30 mb-4" />
                        <p className="text-sm text-center text-muted-foreground">Nenhuma automação configurada.<br />Clique em "Nova Automação" para começar.</p>
                    </div>
                ) : (
                    automations.map((auto: any) => {
                        const actionNode = Array.isArray(auto.nodes) ? auto.nodes.find((n: any) => n.type === "action") : null;
                        const actionStr = actionNode?.data?.label ? getActionLabel(actionNode.data.label) : "Ação customizada";

                        return (
                            <div key={auto.id} className={`relative flex flex-col p-4 rounded-xl border transition-all ${auto.is_active ? 'border-primary/30 bg-card shadow-sm' : 'border-border/50 bg-muted/30 opacity-70 grayscale-[20%]'}`}>
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <h4 className="font-semibold text-sm line-clamp-1">{auto.name}</h4>
                                        <p className="text-[10px] text-muted-foreground line-clamp-1">{auto.description || "Sem descrição"}</p>
                                    </div>
                                    <Switch
                                        checked={auto.is_active}
                                        onCheckedChange={(v) => toggleMutation.mutate({ id: auto.id, is_active: v })}
                                        className="data-[state=checked]:bg-emerald-500"
                                    />
                                </div>

                                <div className="flex-1 space-y-3">
                                    <div className="flex items-center gap-3">
                                        <div className="h-7 w-7 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                                            <Zap className="h-3.5 w-3.5" />
                                        </div>
                                        <p className="text-xs font-medium leading-tight">{getTriggerLabel(auto.trigger_type)}</p>
                                    </div>
                                    <div className="ml-3.5 border-l-2 border-border/60 pl-6 py-1 h-3" />
                                    <div className="flex items-center gap-3">
                                        <div className="h-7 w-7 rounded-full border border-border bg-background shadow-sm flex items-center justify-center shrink-0 text-primary">
                                            <Play className="h-3 w-3 fill-current" />
                                        </div>
                                        <p className="text-xs font-medium leading-tight">{actionStr}</p>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between mt-5 pt-3 border-t border-border">
                                    <span className="text-[10px] text-muted-foreground">{format(new Date(auto.created_at), "dd/MM/yy")}</span>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => deleteMutation.mutate(auto.id)}>
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Automations Create Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-xl p-0 overflow-hidden">
                    <div className="p-6 bg-muted/30 border-b border-border">
                        <DialogTitle className="text-lg">Construtor de Automação</DialogTitle>
                        <p className="text-xs text-muted-foreground mt-1">Defina a regra lógica de negócio (Se evento acontecer {'->'} Execute Ação).</p>
                    </div>

                    <div className="p-6 space-y-6">
                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">O que é este fluxo?</label>
                                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Avisar cliente por WhatsApp" />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Quando isso deve acontecer? (Gatilho)</label>
                                <Select value={form.trigger_type} onValueChange={(v) => setForm({ ...form, trigger_type: v })}>
                                    <SelectTrigger><SelectValue placeholder="Selecione o Gatilho" /></SelectTrigger>
                                    <SelectContent>
                                        {TRIGGER_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.icon} {opt.label}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex items-center justify-center p-2 opacity-30">
                                <ArrowRight className="h-5 w-5 rotate-90" />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">O que o sistema deve fazer? (Ação)</label>
                                <Select value={form.action} onValueChange={(v) => setForm({ ...form, action: v })}>
                                    <SelectTrigger><SelectValue placeholder="Selecione a Ação" /></SelectTrigger>
                                    <SelectContent>
                                        {ACTION_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="flex items-center justify-between p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                            <div className="flex items-center gap-3">
                                <Activity className="h-5 w-5 text-emerald-600" />
                                <p className="text-xs font-medium text-emerald-800 dark:text-emerald-400">A ativação será instantânea após salvar.</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 border-t border-border bg-muted/20 flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                        <Button disabled={!form.name || !form.trigger_type || !form.action || createMutation.isPending} onClick={() => createMutation.mutate()}>Salvar e Ativar</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
