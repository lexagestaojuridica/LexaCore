import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { Building2, Search, Trash2, Edit, Shield, MoreVertical, Ban, CheckCircle, Users } from "lucide-react";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/shared/ui/dropdown-menu";
import { Skeleton } from "@/shared/ui/skeleton";
import { EmptyState } from "@/shared/components/EmptyState";

// FSD Imports
import { useAdminOrganizations } from "@/features/backoffice/hooks/useAdminOrganizations";
import { MembersDialog } from "@/features/backoffice/components/MembersDialog";
import { EditNameDialog } from "@/features/backoffice/components/EditNameDialog";
import { ManageSubscriptionDialog } from "@/features/backoffice/components/ManageSubscriptionDialog";
import type { Organization } from "@/features/backoffice/types";

export default function AdminOrganizations() {
    const [searchTerm, setSearchTerm] = useState("");

    // Dialog States
    const [selectedOrgForMembers, setSelectedOrgForMembers] = useState<Organization | null>(null);
    const [isMembersDialogOpen, setIsMembersDialogOpen] = useState(false);
    const [isEditNameDialogOpen, setIsEditNameDialogOpen] = useState(false);
    const [selectedOrgForEdit, setSelectedOrgForEdit] = useState<Organization | null>(null);
    const [editOrgName, setEditOrgName] = useState("");
    const [isManageSubscriptionDialogOpen, setIsManageSubscriptionDialogOpen] = useState(false);
    const [selectedOrgForSubscription, setSelectedOrgForSubscription] = useState<Organization | null>(null);
    const [selectedPlanId, setSelectedPlanId] = useState("");

    const { orgs, isLoading, plansList, updateMutation, updateSubscriptionMutation, generateImpersonationLink } =
        useAdminOrganizations(searchTerm);

    const handleEditNameSubmit = () => {
        if (!editOrgName.trim() || !selectedOrgForEdit) return;
        updateMutation.mutate({ id: selectedOrgForEdit.id, updates: { name: editOrgName } });
        setIsEditNameDialogOpen(false);
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
                                        <EmptyState icon={Building2} title="Nenhum escritório encontrado" description="Não localizamos inquilinos com os parâmetros informados." />
                                    </TableCell>
                                </TableRow>
                            ) : (
                                orgs?.map((org) => {
                                    const sub = org.subscriptions?.find((s) => s.status === "active") || org.subscriptions?.[0];
                                    const isPremium = sub?.plan?.slug === "pro" || sub?.plan?.slug === "enterprise";

                                    return (
                                        <TableRow key={org.id} className="border-zinc-800 hover:bg-zinc-800/50 transition-colors">
                                            <TableCell className="font-medium text-zinc-200">{org.name}</TableCell>
                                            <TableCell className="text-zinc-400">{org.profiles?.length || 0} usuários</TableCell>
                                            <TableCell>
                                                {!sub?.plan ? (
                                                    <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 text-xs border border-zinc-700">Sem Plano</span>
                                                ) : (
                                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${isPremium ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" : "bg-zinc-800 text-zinc-300 border-zinc-700"}`}>
                                                        {sub.plan.name}
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-zinc-400">
                                                {new Date(org.created_at).toLocaleDateString("pt-BR")}
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
                                                            onClick={() => { setSelectedOrgForMembers(org); setIsMembersDialogOpen(true); }}
                                                            className="gap-2 cursor-pointer hover:bg-zinc-800 hover:text-white focus:bg-zinc-800 focus:text-white"
                                                        >
                                                            <Users className="h-4 w-4 text-emerald-400" /> Membros & Impersonation
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() => { setSelectedOrgForEdit(org); setEditOrgName(org.name); setIsEditNameDialogOpen(true); }}
                                                            className="gap-2 cursor-pointer hover:bg-zinc-800 hover:text-white focus:bg-zinc-800 focus:text-white"
                                                        >
                                                            <Edit className="h-4 w-4 text-sky-400" /> Editar Nome
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() => {
                                                                setSelectedOrgForSubscription(org);
                                                                const activeSub = org.subscriptions?.find((s) => s.status === "active");
                                                                setSelectedPlanId(activeSub?.plan?.id || "");
                                                                setIsManageSubscriptionDialogOpen(true);
                                                            }}
                                                            className="gap-2 cursor-pointer hover:bg-zinc-800 hover:text-white focus:bg-zinc-800 focus:text-white"
                                                        >
                                                            <Shield className="h-4 w-4 text-indigo-400" /> Gerenciar Assinaturas
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator className="bg-zinc-800" />
                                                        <DropdownMenuItem
                                                            onClick={() => updateMutation.mutate({ id: org.id, updates: { whatsapp_enabled: !org.whatsapp_enabled } })}
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
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* ── Dialogs (FSD Components) ── */}
            <MembersDialog
                open={isMembersDialogOpen}
                onOpenChange={setIsMembersDialogOpen}
                org={selectedOrgForMembers}
                onGenerateLink={generateImpersonationLink}
            />

            <EditNameDialog
                open={isEditNameDialogOpen}
                onOpenChange={setIsEditNameDialogOpen}
                orgName={editOrgName}
                onNameChange={setEditOrgName}
                onSubmit={handleEditNameSubmit}
                isPending={updateMutation.isPending}
            />

            <ManageSubscriptionDialog
                open={isManageSubscriptionDialogOpen}
                onOpenChange={setIsManageSubscriptionDialogOpen}
                org={selectedOrgForSubscription}
                plansList={plansList}
                selectedPlanId={selectedPlanId}
                onSelectPlan={setSelectedPlanId}
                onConfirm={() => {
                    if (selectedPlanId && selectedOrgForSubscription) {
                        updateSubscriptionMutation.mutate({
                            orgId: selectedOrgForSubscription.id,
                            planId: selectedPlanId,
                        });
                        setIsManageSubscriptionDialogOpen(false);
                    }
                }}
                isPending={updateSubscriptionMutation.isPending}
            />
        </div>
    );
}
