import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
    Building2, Plus, Search, Edit2, Trash2, MapPin, Phone, Mail, Crown,
    ToggleLeft, ToggleRight, Users, X, CheckCircle2, XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import FormField from "@/components/shared/FormField";
import LexaLoadingOverlay from "@/components/shared/LexaLoadingOverlay";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types ────────────────────────────────────────────────────

interface Unit {
    id: string;
    name: string;
    slug: string;
    address: string | null;
    city: string | null;
    state: string | null;
    phone: string | null;
    email: string | null;
    is_headquarters: boolean;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

const emptyForm = {
    name: "", slug: "", address: "", city: "", state: "", phone: "", email: "",
    is_headquarters: false, is_active: true,
};

// ─── UnidadesPage ─────────────────────────────────────────────

export default function UnidadesPage() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [search, setSearch] = useState("");
    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
    const [form, setForm] = useState(emptyForm);

    const { data: profile } = useQuery({
        queryKey: ["profile", user?.id],
        queryFn: async () => {
            const { data } = await supabase.from("profiles").select("organization_id").eq("user_id", user!.id).single();
            return data;
        },
        enabled: !!user,
    });
    const orgId = profile?.organization_id;

    const { data: units = [], isLoading } = useQuery({
        queryKey: ["units", orgId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("units")
                .select("*")
                .eq("organization_id", orgId!)
                .order("is_headquarters", { ascending: false })
                .order("name");
            if (error) throw error;
            return (data || []) as Unit[];
        },
        enabled: !!orgId,
    });

    const createMutation = useMutation({
        mutationFn: async (payload: any) => {
            const { error } = await supabase.from("units").insert(payload);
            if (error) throw error;
        },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["units"] }); toast.success("Unidade criada!"); closeDialog(); },
        onError: (e: any) => toast.error(e.message),
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, ...payload }: any) => {
            const { error } = await supabase.from("units").update(payload).eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["units"] }); toast.success("Unidade atualizada!"); closeDialog(); },
        onError: (e: any) => toast.error(e.message),
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from("units").delete().eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["units"] }); toast.success("Unidade excluída!"); setDeleteDialogOpen(false); setEditingUnit(null); },
        onError: (e: any) => toast.error(e.message),
    });

    const closeDialog = () => { setDialogOpen(false); setForm(emptyForm); setEditingUnit(null); };
    const openCreate = () => { setForm(emptyForm); setEditingUnit(null); setDialogOpen(true); };
    const openEdit = (u: Unit) => {
        setForm({
            name: u.name, slug: u.slug, address: u.address || "", city: u.city || "",
            state: u.state || "", phone: u.phone || "", email: u.email || "",
            is_headquarters: u.is_headquarters, is_active: u.is_active,
        });
        setEditingUnit(u);
        setDialogOpen(true);
    };

    const handleSubmit = () => {
        if (!form.name || !form.slug) { toast.error("Nome e slug são obrigatórios"); return; }
        const payload = {
            ...form,
            address: form.address || null, city: form.city || null, state: form.state || null,
            phone: form.phone || null, email: form.email || null,
            organization_id: orgId!,
        };
        if (editingUnit) {
            updateMutation.mutate({ id: editingUnit.id, ...payload });
        } else {
            createMutation.mutate(payload);
        }
    };

    const generateSlug = (name: string) => name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

    const filtered = units.filter((u) => {
        const q = search.toLowerCase();
        if (!q) return true;
        return u.name.toLowerCase().includes(q) || u.slug.includes(q) || (u.city || "").toLowerCase().includes(q);
    });

    const activeCount = units.filter((u) => u.is_active).length;
    const isSaving = createMutation.isPending || updateMutation.isPending;

    // Skeleton loader
    const SkeletonCards = () => (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((n) => (
                <div key={n} className="rounded-xl border border-border p-5 space-y-3 animate-pulse">
                    <div className="h-5 w-2/3 rounded bg-muted/60" />
                    <div className="h-3 w-1/2 rounded bg-muted/40" />
                    <div className="h-3 w-3/4 rounded bg-muted/40" />
                </div>
            ))}
        </div>
    );

    return (
        <div className="space-y-6">
            <LexaLoadingOverlay visible={isSaving} message="Salvando..." />

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-foreground">Unidades / Franquias</h1>
                    <p className="text-sm text-muted-foreground">{activeCount} unidade{activeCount !== 1 ? "s" : ""} ativa{activeCount !== 1 ? "s" : ""} de {units.length} total</p>
                </div>
                <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Nova Unidade</Button>
            </div>

            {/* Search */}
            <Card className="border-border bg-card">
                <CardContent className="flex items-center gap-3 p-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input placeholder="Buscar por nome, slug ou cidade..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
                    </div>
                </CardContent>
            </Card>

            {/* Grid */}
            {isLoading ? <SkeletonCards /> : filtered.length === 0 ? (
                <div className="flex flex-col items-center py-20 text-center">
                    <Building2 className="mb-4 h-12 w-12 text-muted-foreground/20" />
                    <p className="text-sm text-muted-foreground">{units.length === 0 ? "Nenhuma unidade cadastrada. Crie a primeira!" : "Nenhuma unidade encontrada."}</p>
                    {units.length === 0 && (
                        <Button variant="outline" size="sm" className="mt-3 gap-1.5" onClick={openCreate}>
                            <Plus className="h-3.5 w-3.5" /> Criar primeira unidade
                        </Button>
                    )}
                </div>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <AnimatePresence>
                        {filtered.map((u, i) => (
                            <motion.div
                                key={u.id}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                transition={{ delay: i * 0.03 }}
                                className={cn(
                                    "group rounded-xl border p-5 transition-all hover:shadow-md cursor-pointer",
                                    u.is_active ? "border-border/60 bg-card hover:border-primary/30" : "border-border/30 bg-muted/20 opacity-60",
                                    u.is_headquarters && "ring-1 ring-primary/20"
                                )}
                                onClick={() => openEdit(u)}
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", u.is_headquarters ? "bg-primary/10" : "bg-muted/40")}>
                                            <Building2 className={cn("h-5 w-5", u.is_headquarters ? "text-primary" : "text-muted-foreground")} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-1.5">
                                                <p className="text-sm font-semibold text-foreground">{u.name}</p>
                                                {u.is_headquarters && <Crown className="h-3 w-3 text-amber-500" />}
                                            </div>
                                            <p className="text-xs text-muted-foreground font-mono">{u.slug}</p>
                                        </div>
                                    </div>
                                    <Badge variant={u.is_active ? "default" : "secondary"} className="text-[10px]">
                                        {u.is_active ? "Ativa" : "Inativa"}
                                    </Badge>
                                </div>

                                <div className="space-y-1.5">
                                    {(u.city || u.state) && (
                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                            <MapPin className="h-3 w-3 shrink-0" />
                                            <span>{[u.city, u.state].filter(Boolean).join(" - ")}</span>
                                        </div>
                                    )}
                                    {u.phone && (
                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                            <Phone className="h-3 w-3 shrink-0" /> <span>{u.phone}</span>
                                        </div>
                                    )}
                                    {u.email && (
                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                            <Mail className="h-3 w-3 shrink-0" /> <span className="truncate">{u.email}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-1 mt-3 pt-2 border-t border-border/30 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); openEdit(u); }}>
                                        <Edit2 className="h-3 w-3" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); setEditingUnit(u); setDeleteDialogOpen(true); }}>
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}

            {/* Create/Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={(o) => !o && closeDialog()}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="font-semibold">{editingUnit ? "Editar Unidade" : "Nova Unidade"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="grid grid-cols-2 gap-3">
                            <FormField
                                label="Nome"
                                value={form.name}
                                onChange={(v) => { setForm({ ...form, name: v, slug: !editingUnit ? generateSlug(v) : form.slug }); }}
                                placeholder="Ex: Matriz São Paulo"
                                required
                            />
                            <FormField label="Slug" value={form.slug} onChange={(v) => setForm({ ...form, slug: v })} placeholder="ex: matriz-sp" required />
                        </div>
                        <FormField label="Endereço" value={form.address} onChange={(v) => setForm({ ...form, address: v })} placeholder="Rua, número, bairro" />
                        <div className="grid grid-cols-2 gap-3">
                            <FormField label="Cidade" value={form.city} onChange={(v) => setForm({ ...form, city: v })} placeholder="São Paulo" />
                            <FormField label="Estado" value={form.state} onChange={(v) => setForm({ ...form, state: v })} placeholder="SP" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <FormField label="Telefone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} placeholder="(11) 99999-9999" />
                            <FormField label="E-mail" value={form.email} onChange={(v) => setForm({ ...form, email: v })} placeholder="unidade@escritorio.com" />
                        </div>
                        <div className="flex items-center justify-between rounded-lg border border-border p-3">
                            <div>
                                <p className="text-sm font-medium">Matriz / Sede</p>
                                <p className="text-xs text-muted-foreground">Define esta como a unidade principal</p>
                            </div>
                            <Switch checked={form.is_headquarters} onCheckedChange={(v) => setForm({ ...form, is_headquarters: v })} />
                        </div>
                        <div className="flex items-center justify-between rounded-lg border border-border p-3">
                            <div>
                                <p className="text-sm font-medium">Status</p>
                                <p className="text-xs text-muted-foreground">{form.is_active ? "Unidade ativa" : "Unidade inativa"}</p>
                            </div>
                            <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
                        <Button onClick={handleSubmit} disabled={isSaving}>{editingUnit ? "Salvar" : "Criar"}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent className="max-w-sm">
                    <DialogHeader><DialogTitle className="font-semibold">Excluir Unidade</DialogTitle></DialogHeader>
                    <p className="text-sm text-muted-foreground">Tem certeza que deseja excluir <strong className="text-foreground">{editingUnit?.name}</strong>? Todos os dados vinculados serão perdidos.</p>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancelar</Button>
                        <Button variant="destructive" disabled={deleteMutation.isPending} onClick={() => editingUnit && deleteMutation.mutate(editingUnit.id)}>Excluir</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
