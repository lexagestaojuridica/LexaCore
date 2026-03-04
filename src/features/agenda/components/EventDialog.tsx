import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AsyncProcessCombobox } from "@/components/dashboard/AsyncProcessCombobox";
import { Evento, EventFormState } from "../types";
import { CATEGORIES, RECURRENCE_OPTIONS } from "../utils/categories";

interface EventDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    form: EventFormState;
    setForm: (form: EventFormState) => void;
    editingEvent: Evento | null;
    onSubmit: () => void;
    onDeleteRequest: () => void;
    organizationId: string | null;
    isPending: boolean;
}

export function EventDialog({
    open,
    onOpenChange,
    form,
    setForm,
    editingEvent,
    onSubmit,
    onDeleteRequest,
    organizationId,
    isPending
}: EventDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
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
                                    {CATEGORIES.map((c) => {
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
                            <Select value={form.recurrence_rule} onValueChange={(v) => setForm({ ...form, recurrence_rule: v })} disabled={!!(editingEvent?.recurrence_rule && !RECURRENCE_OPTIONS.some(o => o.value === editingEvent.recurrence_rule))}>
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
                                organizationId={organizationId || ""}
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
                        <Button variant="outline" className="mr-auto text-destructive border-destructive/30 hover:bg-destructive/10" onClick={onDeleteRequest}>
                            Excluir
                        </Button>
                    )}
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                    <Button onClick={onSubmit} disabled={isPending}>
                        {editingEvent ? "Salvar Alterações" : "Criar Evento"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
