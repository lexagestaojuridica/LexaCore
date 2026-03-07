import { useState } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
    Building2, Plus, Search, Edit2, Trash2, MapPin, Phone, Mail, Crown,
    Network, ArrowRight, CheckCircle2, MoreVertical, X, LayoutGrid, AlertCircle, Users, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
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
    const debouncedSearch = useDebounce(search, 400);
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
    const isSuperAdmin = true; // Admin check via RLS

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
        mutationFn: async (payload: Omit<Unit, "id" | "created_at" | "updated_at"> & { organization_id: string }) => {
            const { error } = await supabase.from("units").insert(payload as Database["public"]["Tables"]["units"]["Insert"]);
            if (error) throw error;
        },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["units"] }); toast.success("Unidade criada!"); closeDialog(); },
        onError: (e: Error) => toast.error(`Erro ao criar unidade: ${e.message}`),
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, ...payload }: { id: string } & Partial<Unit>) => {
            const { organization_id, created_at, ...cleanPayload } = payload as Partial<Unit> & { organization_id?: string; created_at?: string };

            const { error } = await supabase.from("units").update(cleanPayload as Database["public"]["Tables"]["units"]["Update"]).eq("id", id).eq("organization_id", orgId!);
            if (error) throw error;
        },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["units"] }); toast.success("Unidade atualizada!"); closeDialog(); },
        onError: (e: Error) => toast.error(`Erro ao atualizar unidade: ${e.message}`),
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from("units").delete().eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["units"] }); toast.success("Unidade excluída permanentemente!"); setDeleteDialogOpen(false); setEditingUnit(null); },
        onError: (e: any) => toast.error(`Erro ao excluir unidade: ${e.message}`),
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
        if (!form.name || !form.slug) { toast.error("Nome e identificador (slug) são obrigatórios"); return; }
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
        const q = debouncedSearch.toLowerCase();
        if (!q) return true;
        return u.name.toLowerCase().includes(q) || u.slug.includes(q) || (u.city || "").toLowerCase().includes(q);
    });

    const isSaving = createMutation.isPending || updateMutation.isPending;

    // Skeleton loader
    const SkeletonCards = () => (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map((n) => (
                <div key={n} className="rounded-2xl border border-border/50 bg-card p-6 space-y-4 animate-pulse">
                    <div className="flex justify-between items-start mb-2">
                        <div className="flex gap-3">
                            <div className="h-12 w-12 rounded-xl bg-muted/60" />
                            <div className="space-y-2 mt-1">
                                <div className="h-4 w-32 rounded bg-muted/60" />
                                <div className="h-3 w-20 rounded bg-muted/40" />
                            </div>
                        </div>
                    </div>
                    <div className="space-y-2 pt-2">
                        <div className="h-3 w-full rounded bg-muted/40" />
                        <div className="h-3 w-4/5 rounded bg-muted/40" />
                    </div>
                </div>
            ))}
        </div>
    );

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto">
            <LexaLoadingOverlay visible={isSaving} message="Salvando dados da unidade..." />

            {/* Premium Header */}
            <div className="relative overflow-hidden rounded-3xl bg-slate-900 border border-border p-8 shadow-sm">
                <div className="absolute -right-12 -top-12 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl mix-blend-screen" />
                <div className="absolute right-20 -bottom-20 h-48 w-48 rounded-full bg-blue-500/10 blur-3xl mix-blend-screen" />

                <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between z-10">
                    <div className="flex items-center gap-5">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-inner">
                            <Network className="h-8 w-8 text-indigo-400" />
                        </div>
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <h1 className="text-3xl font-bold text-white tracking-tight">Rede de Franquias</h1>
                                <Badge variant="secondary" className="bg-indigo-500/20 text-indigo-300 border-none hover:bg-indigo-500/30">
                                    {units.length} Unidades
                                </Badge>
                            </div>
                            <p className="text-sm text-slate-400 max-w-lg">Gerenciamento centralizado de escritórios, matriz e filiais para controle cruzado multi-unidades.</p>
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-3">
                        <Button variant="outline" className="w-full sm:w-auto gap-2 bg-slate-800/50 text-slate-200 border-slate-700 hover:bg-slate-800 hover:text-white backdrop-blur-sm">
                            <LayoutGrid className="h-4 w-4" /> Relatório Consolidado
                        </Button>
                        {isSuperAdmin && (
                            <Button onClick={openCreate} className="w-full sm:w-auto gap-2 bg-indigo-500 hover:bg-indigo-600 text-white shadow-sm">
                                <Plus className="h-4 w-4" /> Nova Unidade
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="relative flex-1 w-full max-w-md">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input placeholder="Buscar por nome, slug ou cidade..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-card/50 border-border/60" />
                </div>
                {!isSuperAdmin && (
                    <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-500/10 px-4 py-2 rounded-xl border border-amber-500/20">
                        <AlertCircle className="h-4 w-4" />
                        Apenas Administradores podem criar novas unidades.
                    </div>
                )}
            </div>

            {/* Grid */}
            {isLoading ? <SkeletonCards /> : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed rounded-3xl bg-card/30">
                    <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mb-4"><Building2 className="h-8 w-8 text-muted-foreground/50" /></div>
                    <p className="text-lg font-semibold text-foreground">Nenhuma unidade encontrada</p>
                    <p className="text-sm text-muted-foreground mt-1 max-w-sm mb-6">A rede não possui filiais registradas com os filtros atuais.</p>
                    {isSuperAdmin && (
                        <Button variant="default" className="gap-2 shadow-sm" onClick={openCreate}>
                            <Plus className="h-4 w-4" /> Adicionar Primeira Unidade
                        </Button>
                    )}
                </div>
            ) : (
                <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                    <AnimatePresence>
                        {filtered.map((u, i) => (
                            <motion.div
                                key={u.id}
                                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ delay: i * 0.04, type: "spring", stiffness: 300, damping: 24 }}
                                className={cn(
                                    "group relative rounded-3xl border p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 overflow-hidden flex flex-col",
                                    u.is_active ? "border-border/60 bg-card hover:border-indigo-500/30" : "border-border/30 bg-muted/10 grayscale-[0.5]",
                                    u.is_headquarters && "ring-1 ring-amber-500/30 shadow-sm"
                                )}
                            >
                                {/* Active subtle indicator */}
                                {u.is_active && <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl pointer-events-none rounded-full translate-x-1/2 -translate-y-1/2" />}

                                <div className="flex items-start justify-between mb-5 relative z-10">
                                    <div className="flex items-center gap-4">
                                        <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-sm border", u.is_headquarters ? "bg-amber-500/10 border-amber-500/20 text-amber-600" : "bg-primary/5 border-primary/10 text-primary")}>
                                            <Building2 className={cn("h-6 w-6", u.is_headquarters ? "text-amber-500" : "text-primary")} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="text-base font-bold text-foreground leading-tight">{u.name}</p>
                                                {u.is_headquarters && <Crown className="h-3.5 w-3.5 text-amber-500" aria-label="Matriz / Sede" />}
                                            </div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <Badge variant="outline" className="text-[10px] uppercase font-mono bg-muted/50 border-border/50">{u.slug}</Badge>
                                                <div className="flex items-center gap-1">
                                                    <span className={cn("relative flex h-1.5 w-1.5")}>
                                                        {u.is_active && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
                                                        <span className={cn("relative inline-flex rounded-full h-1.5 w-1.5", u.is_active ? "bg-emerald-500" : "bg-muted-foreground")}></span>
                                                    </span>
                                                    <span className="text-[10px] font-medium text-muted-foreground">{u.is_active ? "Ativa" : "Inativa"}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {isSuperAdmin && (
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground -mr-2"><MoreVertical className="h-4 w-4" /></Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-48">
                                                <DropdownMenuItem onClick={() => openEdit(u)}><Edit2 className="h-4 w-4 mr-2" /> Editar Configurações</DropdownMenuItem>
                                                <DropdownMenuItem className="text-muted-foreground"><Users className="h-4 w-4 mr-2" /> Gerenciar Membros</DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem onClick={() => { setEditingUnit(u); setDeleteDialogOpen(true); }} className="text-destructive focus:text-destructive focus:bg-destructive/10"><Trash2 className="h-4 w-4 mr-2" /> Encerrar Franquia</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    )}
                                </div>

                                <div className="space-y-2.5 flex-1 relative z-10">
                                    <div className="flex items-center gap-3 text-sm text-muted-foreground bg-muted/30 p-2 rounded-lg border border-border/30">
                                        <MapPin className="h-4 w-4 shrink-0 text-muted-foreground/60" />
                                        <span className="truncate">{[u.city, u.state].filter(Boolean).join(" - ") || "Sem local"}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-muted-foreground bg-muted/30 p-2 rounded-lg border border-border/30">
                                        <Phone className="h-4 w-4 shrink-0 text-muted-foreground/60" />
                                        <span>{u.phone || "Nenhum telefone"}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-muted-foreground bg-muted/30 p-2 rounded-lg border border-border/30">
                                        <Mail className="h-4 w-4 shrink-0 text-muted-foreground/60" />
                                        <span className="truncate">{u.email || "Nenhum e-mail"}</span>
                                    </div>
                                </div>

                                <div className="mt-5 pt-4 border-t border-border/50 relative z-10 flex gap-2">
                                    <Button variant="secondary" className="w-full gap-2 bg-primary/5 text-primary hover:bg-primary/10 transition-colors">
                                        Dashboard <ArrowRight className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}

            {/* Create/Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={(o) => !o && closeDialog()}>
                <DialogContent className="sm:max-w-xl rounded-2xl p-0 overflow-hidden">
                    <div className="bg-muted/30 p-6 border-b border-border/40">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-bold flex items-center gap-2">
                                <Building2 className="h-5 w-5 text-primary" />
                                {editingUnit ? "Editar Configurações da Unidade" : "Registrar Nova Franquia/Unidade"}
                            </DialogTitle>
                            <DialogDescription className="text-sm mt-1">Preencha os dados operacionais da filial para ativar o acesso à rede.</DialogDescription>
                        </DialogHeader>
                    </div>

                    <div className="p-6 space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormField
                                label="Nome Fantasia *"
                                value={form.name}
                                onChange={(v) => { setForm({ ...form, name: v, slug: !editingUnit ? generateSlug(v) : form.slug }); }}
                                placeholder="Ex: Lexa Nova (Faria Lima)"
                                required
                            />
                            <FormField label="Identificador Único (Slug) *" value={form.slug} onChange={(v) => setForm({ ...form, slug: v })} placeholder="ex: lexa-faria-lima" required />
                        </div>

                        <div className="p-4 rounded-xl border border-border/50 bg-muted/10 space-y-4">
                            <div className="font-semibold text-sm uppercase tracking-wider text-muted-foreground border-b border-border/50 pb-2">Contato & Localização</div>
                            <FormField label="Endereço Completo" value={form.address} onChange={(v) => setForm({ ...form, address: v })} placeholder="Av. Faria Lima, 1000, 5º andar" />
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <FormField label="Cidade" value={form.city} onChange={(v) => setForm({ ...form, city: v })} placeholder="São Paulo" />
                                <FormField label="Estado (UF)" value={form.state} onChange={(v) => setForm({ ...form, state: v })} placeholder="SP" />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <FormField label="Telefone Comercial" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} placeholder="(11) 99999-9999" />
                                <FormField label="E-mail Administrativo" value={form.email} onChange={(v) => setForm({ ...form, email: v })} placeholder="faria.lima@lexanova.com.br" />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between rounded-xl border border-border/50 bg-card p-4 shadow-sm hover:border-primary/20 transition-colors">
                                <div className="space-y-0.5">
                                    <p className="text-sm font-bold text-foreground">Sede Operacional (Matriz)</p>
                                    <p className="text-xs text-muted-foreground">Define esta unidade como o "Hub" principal da organização.</p>
                                </div>
                                <Switch checked={form.is_headquarters} onCheckedChange={(v) => setForm({ ...form, is_headquarters: v })} />
                            </div>
                            <div className="flex items-center justify-between rounded-xl border border-border/50 bg-card p-4 shadow-sm hover:border-primary/20 transition-colors">
                                <div className="space-y-0.5">
                                    <p className="text-sm font-bold text-foreground">Status / Acesso</p>
                                    <p className="text-xs text-muted-foreground">Unidades inativas bloqueiam o login local dos membros vinculados.</p>
                                </div>
                                <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                            </div>
                        </div>
                    </div>

                    <div className="bg-muted/20 p-4 border-t border-border/40 flex justify-end gap-2">
                        <Button variant="ghost" onClick={closeDialog}>Cancelar</Button>
                        <Button onClick={handleSubmit} disabled={isSaving} className="shadow-sm pl-4 pr-6">
                            {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                            {editingUnit ? "Salvar Alterações" : "Ativar Nova Unidade"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Delete Dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent className="max-w-md rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="font-bold flex items-center gap-2 text-destructive"><Trash2 className="h-5 w-5" /> Excluir Unidade Permanentemente</DialogTitle>
                    </DialogHeader>
                    <div className="py-2 space-y-3">
                        <p className="text-sm text-foreground">Tem certeza que deseja encerrar a filial <strong className="bg-destructive/10 text-destructive px-1.5 py-0.5 rounded">{editingUnit?.name}</strong>?</p>
                        <p className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg border border-border/50">Todos os membros vinculados perderão o acesso. Os processos administrativos relacionados ficarão órfãos e precisão ser realocados manualmente via banco. <strong>Esta ação é irreversível.</strong></p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Manter Unidade</Button>
                        <Button variant="destructive" className="shadow-sm" disabled={deleteMutation.isPending} onClick={() => editingUnit && deleteMutation.mutate(editingUnit.id)}>Excluir Definitivamente</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
