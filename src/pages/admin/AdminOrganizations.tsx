import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Building2, Search, Trash2, Edit, Shield, MoreVertical, Ban, CheckCircle, Users, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/EmptyState";

export default function AdminOrganizations() {
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState("");

    // Impersonation States
    const [selectedOrgForMembers, setSelectedOrgForMembers] = useState<any>(null);
    const [isMembersDialogOpen, setIsMembersDialogOpen] = useState(false);
    const [impersonationLink, setImpersonationLink] = useState<string | null>(null);
    const [isGeneratingLink, setIsGeneratingLink] = useState(false);

    // Edit Name States
    const [isEditNameDialogOpen, setIsEditNameDialogOpen] = useState(false);
    const [selectedOrgForEdit, setSelectedOrgForEdit] = useState<any>(null);
    const [editOrgName, setEditOrgName] = useState("");

    // Subscription States
    const [isManageSubscriptionDialogOpen, setIsManageSubscriptionDialogOpen] = useState(false);
    const [selectedOrgForSubscription, setSelectedOrgForSubscription] = useState<any>(null);
    const [selectedPlanId, setSelectedPlanId] = useState("");

    // Fetch Active Plans
    const { data: plansList } = useQuery({
        queryKey: ["admin-subscription-plans-list"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("subscription_plans" as any)
                .select("id, name, slug")
                .eq("is_active", true)
                .order("sort_order", { ascending: true });
            if (error) throw error;
            return data;
        },
    });

    const { data: orgs, isLoading } = useQuery({
        queryKey: ["admin-organizations", searchTerm],
        queryFn: async () => {
            let query = supabase.from("organizations").select(`
                *,
                profiles:profiles(id, full_name, user_id),
                subscriptions:organization_subscriptions(
                    status,
                    plan:subscription_plans(name, slug)
                )
            `) as any;

            if (searchTerm) {
                query = query.ilike("name", `%${searchTerm}%`);
            }

            const { data, error } = await query.order('created_at', { ascending: false });
            if (error) throw error;
            return data;
        },
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, updates }: { id: string, updates: any }) => {
            const { error } = await supabase
                .from("organizations")
                .update(updates)
                .eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-organizations"] });
            toast.success("Atualizado com sucesso!");
        },
        onError: (err: any) => {
            toast.error(`Falha: ${err.message}`);
        }
    });

    const updateSubscriptionMutation = useMutation({
        mutationFn: async ({ orgId, planId }: { orgId: string, planId: string }) => {
            // First, deactivate existing
            await supabase
                .from('organization_subscriptions')
                .update({ status: 'canceled' })
                .eq('organization_id', orgId)
                .eq('status', 'active');

            // Generate end date 1 year from now
            const endDate = new Date();
            endDate.setFullYear(endDate.getFullYear() + 1);

            // Insert new one
            const { error } = await supabase
                .from('organization_subscriptions')
                .insert({
                    organization_id: orgId,
                    plan_id: planId,
                    status: 'active',
                    current_period_start: new Date().toISOString(),
                    current_period_end: endDate.toISOString(),
                });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-organizations"] });
            toast.success("Plano atualizado com sucesso!");
            setIsManageSubscriptionDialogOpen(false);
        },
        onError: (err: any) => {
            toast.error(`Falha ao atualizar plano: ${err.message}`);
        }
    });

    const handleEditNameSubmit = () => {
        if (!editOrgName.trim()) return;
        updateMutation.mutate({ id: selectedOrgForEdit.id, updates: { name: editOrgName } });
        setIsEditNameDialogOpen(false);
    };

    const generateImpersonationLink = async (userId: string) => {
        setIsGeneratingLink(true);
        setImpersonationLink(null);
        try {
            const { data, error } = await supabase.functions.invoke('admin-impersonate', {
                body: { target_user_id: userId }
            });
            if (error) throw new Error(error.message);
            if (data?.error) throw new Error(data.error);

            setImpersonationLink(data.action_link);
            toast.success("Link de acesso gerado com sucesso!");
        } catch (err: any) {
            toast.error(`Falha ao gerar link: ${err.message}`);
        } finally {
            setIsGeneratingLink(false);
        }
    };

    const copyToClipboard = () => {
        if (impersonationLink) {
            navigator.clipboard.writeText(impersonationLink);
            toast.success("Link copiado! Cole em uma aba anônima.");
        }
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
                <h2 className="text-2xl font-bold tracking-tight text-white mb-2 flex items-center gap-2">
                    <Building2 className="h-6 w-6 text-indigo-500" />
                    Escritórios & Clientes
                </h2>
                <p className="text-zinc-400 text-sm">
                    Gerenciamento global de inquilinos. Ative, suspenda ou ligue módulos específicos.
                </p>
            </div>

            <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-zinc-800">
                    <div>
                        <CardTitle className="text-white">Lista de Organizações</CardTitle>
                        <CardDescription className="text-zinc-500 mt-1">
                            Todos os escritórios e matrizes instalados na plataforma.
                        </CardDescription>
                    </div>
                    <div className="relative w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
                        <Input
                            type="text"
                            placeholder="Buscar escritório..."
                            className="pl-9 bg-zinc-950 border-zinc-700 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-indigo-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-zinc-950/50">
                            <TableRow className="border-zinc-800 hover:bg-transparent">
                                <TableHead className="text-zinc-400">Escritório</TableHead>
                                <TableHead className="text-zinc-400">Membros</TableHead>
                                <TableHead className="text-zinc-400">Plano Associado</TableHead>
                                <TableHead className="text-zinc-400">Criado em</TableHead>
                                <TableHead className="text-zinc-400">Integração Whats</TableHead>
                                <TableHead className="text-zinc-400 text-right">Integração API</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i} className="border-zinc-800">
                                        <TableCell><Skeleton className="h-4 w-[150px] bg-zinc-800" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-[50px] bg-zinc-800" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-[100px] bg-zinc-800" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-[80px] bg-zinc-800" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-[60px] bg-zinc-800" /></TableCell>
                                        <TableCell className="text-right"><Skeleton className="h-4 w-[40px] bg-zinc-800 ml-auto" /></TableCell>
                                        <TableCell></TableCell>
                                    </TableRow>
                                ))
                            ) : orgs?.length === 0 ? (
                                <TableRow className="border-zinc-800 hover:bg-transparent">
                                    <TableCell colSpan={7} className="h-64 p-6">
                                        <EmptyState
                                            icon={Building2}
                                            title="Nenhum escritório encontrado"
                                            description="Não localizamos inquilinos com os parâmetros informados."
                                        />
                                    </TableCell>
                                </TableRow>
                            ) : (
                                orgs?.map((org) => (
                                    <TableRow key={org.id} className="border-zinc-800 hover:bg-zinc-800/50 transition-colors">
                                        <TableCell className="font-medium text-zinc-200">
                                            {org.name}
                                        </TableCell>
                                        <TableCell className="text-zinc-400">
                                            {org.profiles?.length || 0} usuários
                                        </TableCell>
                                        <TableCell>
                                            {(() => {
                                                const sub = org.subscriptions && org.subscriptions.length > 0
                                                    ? org.subscriptions.find((s: any) => s.status === 'active') || org.subscriptions[0]
                                                    : null;

                                                if (!sub || !sub.plan) {
                                                    return (
                                                        <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 text-xs border border-zinc-700">
                                                            Sem Plano
                                                        </span>
                                                    );
                                                }

                                                const isPremium = sub.plan.slug === 'pro' || sub.plan.slug === 'enterprise';

                                                return (
                                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${isPremium
                                                        ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                                                        : 'bg-zinc-800 text-zinc-300 border-zinc-700'
                                                        }`}>
                                                        {sub.plan.name}
                                                    </span>
                                                );
                                            })()}
                                        </TableCell>
                                        <TableCell className="text-zinc-400">
                                            {new Date(org.created_at).toLocaleDateString('pt-BR')}
                                        </TableCell>
                                        <TableCell>
                                            {org.whatsapp_enabled ? (
                                                <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-medium">
                                                    <CheckCircle className="h-3 w-3" /> Conectado
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1.5 text-zinc-500 text-xs font-medium">
                                                    <Ban className="h-3 w-3" /> Desativado
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {(org.escavador_token || org.jusbrasil_token) ? (
                                                <span className="text-xs text-indigo-400 font-medium">Configurada</span>
                                            ) : (
                                                <span className="text-xs text-zinc-500">Pendente</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-700">
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-700 text-zinc-300">
                                                    <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                                    <DropdownMenuSeparator className="bg-zinc-800" />
                                                    <DropdownMenuItem
                                                        onClick={() => {
                                                            setSelectedOrgForMembers(org);
                                                            setIsMembersDialogOpen(true);
                                                            setImpersonationLink(null);
                                                        }}
                                                        className="gap-2 cursor-pointer hover:bg-zinc-800 hover:text-white focus:bg-zinc-800 focus:text-white"
                                                    >
                                                        <Users className="h-4 w-4 text-emerald-400" /> Membros & Impersonation
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onClick={() => {
                                                            setSelectedOrgForEdit(org);
                                                            setEditOrgName(org.name);
                                                            setIsEditNameDialogOpen(true);
                                                        }}
                                                        className="gap-2 cursor-pointer hover:bg-zinc-800 hover:text-white focus:bg-zinc-800 focus:text-white"
                                                    >
                                                        <Edit className="h-4 w-4 text-sky-400" /> Editar Nome
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onClick={() => {
                                                            setSelectedOrgForSubscription(org);
                                                            const sub = org.subscriptions?.find((s: any) => s.status === 'active');
                                                            setSelectedPlanId(sub?.plan?.id || "");
                                                            setIsManageSubscriptionDialogOpen(true);
                                                        }}
                                                        className="gap-2 cursor-pointer hover:bg-zinc-800 hover:text-white focus:bg-zinc-800 focus:text-white"
                                                    >
                                                        <Shield className="h-4 w-4 text-indigo-400" /> Gerenciar Assinaturas
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator className="bg-zinc-800" />
                                                    <DropdownMenuItem
                                                        onClick={() => {
                                                            updateMutation.mutate({ id: org.id, updates: { whatsapp_enabled: !org.whatsapp_enabled } });
                                                        }}
                                                        className="gap-2 cursor-pointer text-amber-400 hover:bg-amber-500/10 hover:text-amber-400 focus:bg-amber-500/10 focus:text-amber-400"
                                                    >
                                                        <Ban className="h-4 w-4" /> Toggle Whatsapp
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem className="gap-2 cursor-pointer text-rose-500 opacity-50 hover:bg-rose-500/10 hover:text-rose-400 focus:bg-rose-500/10 focus:text-rose-400" disabled>
                                                        <Trash2 className="h-4 w-4" /> Excluir Conta (Não Recomendado)
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Members & Impersonation Dialog */}
            <Dialog open={isMembersDialogOpen} onOpenChange={setIsMembersDialogOpen}>
                <DialogContent className="sm:max-w-xl bg-zinc-950 border-zinc-800 text-zinc-100">
                    <DialogHeader>
                        <DialogTitle className="text-xl">
                            Equipe do Escritório: <span className="text-emerald-400">{selectedOrgForMembers?.name}</span>
                        </DialogTitle>
                        <DialogDescription className="text-zinc-400">
                            Acesse as contas como administrador para fornecer suporte e depurar problemas relatados diretamente na sessão do cliente.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4 space-y-4">
                        {selectedOrgForMembers?.profiles && selectedOrgForMembers.profiles.length > 0 ? (
                            <div className="space-y-3">
                                {selectedOrgForMembers.profiles.map((profile: any) => (
                                    <div key={profile.id} className="flex items-center justify-between bg-zinc-900 border border-zinc-800 p-3 rounded-lg">
                                        <div className="flex flex-col">
                                            <span className="font-semibold text-zinc-200">{profile.full_name || "Usuário Sem Nome"}</span>
                                            <span className="text-xs text-zinc-500 font-mono">{profile.id}</span>
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="bg-indigo-600/10 text-indigo-400 border-indigo-500/20 hover:bg-indigo-600/20 hover:text-indigo-300"
                                            onClick={() => generateImpersonationLink(profile.user_id)}
                                            disabled={isGeneratingLink}
                                        >
                                            {isGeneratingLink ? 'Gerando...' : 'Logar Como'}
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center p-4 bg-zinc-900/50 rounded-lg text-zinc-500 text-sm">
                                Nenhum membro registrado para este escritório.
                            </div>
                        )}

                        {impersonationLink && (
                            <div className="mt-6 space-y-3 border-t border-zinc-800 pt-4">
                                <div className="flex items-center gap-2 text-rose-400 bg-rose-500/10 p-3 rounded-md text-sm border border-rose-500/20">
                                    <Shield className="h-5 w-5 shrink-0" />
                                    <p>
                                        <strong>Atenção:</strong> Abra o link em uma <b>janela anônima (Incógnito)</b> para não desconectar sua sessão atual de Administrador Master!
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <Input
                                        readOnly
                                        value={impersonationLink}
                                        className="bg-zinc-900 border-emerald-500/30 text-emerald-300 focus-visible:ring-emerald-500 font-mono text-xs"
                                    />
                                    <Button onClick={copyToClipboard} variant="secondary" className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 shrink-0">
                                        <Copy className="h-4 w-4 mr-2" /> Copiar URL
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Edit Name Dialog */}
            <Dialog open={isEditNameDialogOpen} onOpenChange={setIsEditNameDialogOpen}>
                <DialogContent className="sm:max-w-md bg-zinc-950 border-zinc-800 text-zinc-100">
                    <DialogHeader>
                        <DialogTitle className="text-xl">
                            Editar Nome do Inquilino
                        </DialogTitle>
                        <DialogDescription className="text-zinc-400">
                            Atualize a razão social ou nome fantasia desta organização.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <Input
                            value={editOrgName}
                            onChange={(e) => setEditOrgName(e.target.value)}
                            placeholder="Nome da Organização"
                            className="bg-zinc-900 border-zinc-700 text-zinc-100 focus-visible:ring-indigo-500"
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditNameDialogOpen(false)} className="bg-transparent border-zinc-700 text-zinc-300 hover:bg-zinc-800">Cancelar</Button>
                        <Button onClick={handleEditNameSubmit} className="bg-indigo-600 hover:bg-indigo-700 text-white" disabled={updateMutation.isPending || !editOrgName.trim()}>
                            {updateMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Manage Subscription Dialog */}
            <Dialog open={isManageSubscriptionDialogOpen} onOpenChange={setIsManageSubscriptionDialogOpen}>
                <DialogContent className="sm:max-w-md bg-zinc-950 border-zinc-800 text-zinc-100">
                    <DialogHeader>
                        <DialogTitle className="text-xl">
                            Gerenciar Plano
                        </DialogTitle>
                        <DialogDescription className="text-zinc-400">
                            Force uma atualização no plano de {selectedOrgForSubscription?.name}.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-2 space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                        {plansList?.map((plan: any) => (
                            <button
                                key={plan.id}
                                onClick={() => setSelectedPlanId(plan.id)}
                                className={`w-full flex items-center justify-between p-4 rounded-xl border text-left transition-all ${selectedPlanId === plan.id
                                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                        : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                                    }`}
                            >
                                <div>
                                    <div className="font-semibold">{plan.name}</div>
                                    <div className="text-xs opacity-70 mt-1 uppercase tracking-wider">{plan.slug}</div>
                                </div>
                                {selectedPlanId === plan.id && <CheckCircle className="h-5 w-5" />}
                            </button>
                        ))}
                    </div>
                    <DialogFooter className="mt-4">
                        <Button variant="outline" onClick={() => setIsManageSubscriptionDialogOpen(false)} className="bg-transparent border-zinc-700 text-zinc-300 hover:bg-zinc-800">Cancelar</Button>
                        <Button
                            onClick={() => {
                                if (selectedPlanId) {
                                    updateSubscriptionMutation.mutate({
                                        orgId: selectedOrgForSubscription?.id,
                                        planId: selectedPlanId
                                    });
                                }
                            }}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white"
                            disabled={updateSubscriptionMutation.isPending || !selectedPlanId}
                        >
                            {updateSubscriptionMutation.isPending ? 'Atualizando...' : 'Confirmar Plano'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
