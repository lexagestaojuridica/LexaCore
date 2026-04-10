import { useState } from "react";
import { Plus, Edit2, Trash2, Users, Crown, UserPlus } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import FormField from "@/shared/components/FormField";
import { useWorkflow } from "@/features/workflow/contexts/WorkflowContext";
import { Sector } from "../types";

const COLOR_OPTIONS = [
    { value: "bg-blue-500", label: "Azul", preview: "bg-blue-500" },
    { value: "bg-emerald-500", label: "Verde", preview: "bg-emerald-500" },
    { value: "bg-red-500", label: "Vermelho", preview: "bg-red-500" },
    { value: "bg-amber-500", label: "Amarelo", preview: "bg-amber-500" },
    { value: "bg-violet-500", label: "Violeta", preview: "bg-violet-500" },
    { value: "bg-pink-500", label: "Rosa", preview: "bg-pink-500" },
    { value: "bg-orange-500", label: "Laranja", preview: "bg-orange-500" },
    { value: "bg-teal-500", label: "Teal", preview: "bg-teal-500" },
];

const EMOJI_OPTIONS = ["⚖️", "📜", "🔒", "💰", "🏢", "🏛️", "📋", "🔍", "🛡️", "⚡"];

export default function WorkflowSectors() {
    const { sectors, members, instances, addSector, updateSector, deleteSector, getMember } = useWorkflow();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState({ name: "", emoji: "⚖️", color: "bg-blue-500", coordinatorId: "", memberIds: [] as string[] });

    const openCreate = () => {
        setForm({ name: "", emoji: "⚖️", color: "bg-blue-500", coordinatorId: members[0]?.id || "", memberIds: [] });
        setEditingId(null); setDialogOpen(true);
    };

    const openEdit = (s: Sector) => {
        setForm({ name: s.name, emoji: s.emoji, color: s.color, coordinatorId: s.coordinatorId, memberIds: s.memberIds });
        setEditingId(s.id); setDialogOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name || !form.coordinatorId) return;
        if (editingId) {
            updateSector(editingId, form);
        } else {
            addSector(form);
        }
        setDialogOpen(false);
    };

    const toggleMember = (id: string) => {
        setForm((p) => ({
            ...p,
            memberIds: p.memberIds.includes(id) ? p.memberIds.filter((m) => m !== id) : [...p.memberIds, id],
        }));
    };

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-base font-semibold text-foreground">Setores do Escritório</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Gerencie departamentos, coordenadores e membros</p>
                </div>
                <Button className="gap-1.5 shadow-sm" onClick={openCreate}><Plus className="h-4 w-4" /> Novo Setor</Button>
            </div>

            {/* Sector Cards */}
            {sectors.length === 0 ? (
                <Card className="border-border/50">
                    <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-3"><Users className="h-7 w-7 text-muted-foreground/30" /></div>
                        <p className="text-sm font-medium text-muted-foreground">Nenhum setor cadastrado</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {sectors.map((s) => {
                        const coordinator = getMember(s.coordinatorId);
                        const sectorInstances = instances.filter((w) => w.sectorId === s.id);
                        const activeCount = sectorInstances.filter((w) => w.status === "em_andamento" || w.status === "pendente").length;

                        return (
                            <Card key={s.id} className="border-border/50 hover:shadow-md transition-all duration-200 group overflow-hidden">
                                <div className={`h-1.5 ${s.color}`} />
                                <CardContent className="p-4 space-y-3">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${s.color}/10 text-xl shrink-0`}>{s.emoji}</div>
                                            <div>
                                                <p className="text-sm font-semibold text-foreground">{s.name}</p>
                                                <Badge variant="outline" className="text-[9px] mt-0.5">{activeCount} workflows ativos</Badge>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(s)}><Edit2 className="h-3 w-3" /></Button>
                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setDeleteConfirm(s.id)}><Trash2 className="h-3 w-3" /></Button>
                                        </div>
                                    </div>

                                    {/* Coordinator */}
                                    {coordinator && (
                                        <div className="flex items-center gap-2 rounded-lg bg-amber-50/50 p-2.5">
                                            <Crown className="h-3.5 w-3.5 text-amber-500" />
                                            <div className="flex items-center gap-2">
                                                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[9px] font-bold text-primary">{coordinator.avatar}</div>
                                                <div>
                                                    <p className="text-[11px] font-medium">{coordinator.name}</p>
                                                    <p className="text-[9px] text-muted-foreground">Coordenador(a)</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Members */}
                                    <div className="space-y-1.5">
                                        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Membros ({s.memberIds.length})</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {s.memberIds.map((mId) => {
                                                const member = getMember(mId);
                                                return member ? (
                                                    <div key={mId} className="flex items-center gap-1.5 rounded-full bg-muted/50 px-2.5 py-1">
                                                        <div className="h-5 w-5 rounded-full bg-primary/8 flex items-center justify-center text-[8px] font-bold text-primary/70">{member.avatar}</div>
                                                        <span className="text-[10px] text-muted-foreground">{member.name.split(" ").slice(-1)[0]}</span>
                                                    </div>
                                                ) : null;
                                            })}
                                            {s.memberIds.length === 0 && <span className="text-[10px] text-muted-foreground/40">Nenhum membro</span>}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Create/Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
                    <DialogHeader><DialogTitle className="flex items-center gap-2">{editingId ? <Edit2 className="h-4 w-4" /> : <Plus className="h-4 w-4" />} {editingId ? "Editar Setor" : "Novo Setor"}</DialogTitle></DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                        <FormField label="Nome do Setor" value={form.name} onChange={(v) => setForm((p) => ({ ...p, name: v }))} placeholder="Ex: Trabalhista" required />

                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Ícone</label>
                            <div className="flex flex-wrap gap-1.5">
                                {EMOJI_OPTIONS.map((e) => (
                                    <button key={e} type="button" onClick={() => setForm((p) => ({ ...p, emoji: e }))}
                                        className={`h-9 w-9 rounded-lg border text-lg flex items-center justify-center transition-all ${form.emoji === e ? "border-primary bg-primary/5 scale-110 ring-1 ring-primary/30" : "border-border hover:border-border/80"}`}>
                                        {e}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Cor</label>
                            <div className="flex flex-wrap gap-2">
                                {COLOR_OPTIONS.map((c) => (
                                    <button key={c.value} type="button" onClick={() => setForm((p) => ({ ...p, color: c.value }))}
                                        className={`h-7 w-7 rounded-full ${c.preview} transition-all ${form.color === c.value ? "scale-125 ring-2 ring-offset-2 ring-primary" : "opacity-60 hover:opacity-90"}`} />
                                ))}
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1"><Crown className="h-3 w-3 text-amber-500" /> Coordenador</label>
                            <Select value={form.coordinatorId} onValueChange={(v) => setForm((p) => ({ ...p, coordinatorId: v }))}>
                                <SelectTrigger className="h-10 bg-background"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                <SelectContent>{members.map((m) => <SelectItem key={m.id} value={m.id}>{m.avatar} — {m.name} ({m.role})</SelectItem>)}</SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1"><UserPlus className="h-3 w-3" /> Membros</label>
                            <div className="grid grid-cols-1 gap-1.5 max-h-40 overflow-y-auto rounded-lg border border-border p-2">
                                {members.filter((m) => m.id !== form.coordinatorId).map((m) => (
                                    <button key={m.id} type="button" onClick={() => toggleMember(m.id)}
                                        className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-all ${form.memberIds.includes(m.id) ? "bg-primary/8 ring-1 ring-primary/20" : "hover:bg-muted/50"}`}>
                                        <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[9px] font-bold ${form.memberIds.includes(m.id) ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{m.avatar}</div>
                                        <div>
                                            <p className="text-xs font-medium">{m.name}</p>
                                            <p className="text-[9px] text-muted-foreground">{m.role}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                            <Button type="submit" className="gap-1.5">{editingId ? "Salvar" : <><Plus className="h-3.5 w-3.5" /> Criar</>}</Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirm */}
            <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
                <DialogContent className="max-w-sm">
                    <DialogHeader><DialogTitle>Excluir Setor</DialogTitle></DialogHeader>
                    <p className="text-sm text-muted-foreground">Tem certeza? Workflows vinculados a este setor não serão excluídos.</p>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
                        <Button variant="destructive" onClick={() => { if (deleteConfirm) deleteSector(deleteConfirm); setDeleteConfirm(null); }}>Excluir</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
