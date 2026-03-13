import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Headset, Search, MailQuestion, Building, User, Info, CheckCircle2, Clock, MoreVertical, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/shared/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/shared/ui/dropdown-menu";
import { Skeleton } from "@/shared/ui/skeleton";
import { EmptyState } from "@/shared/components/EmptyState";
import { Badge } from "@/shared/ui/badge";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/shared/ui/dialog";

export default function AdminSupport() {
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState("");

    // Dialog states for viewing full message
    const [isMessageDialogOpen, setIsMessageDialogOpen] = useState(false);
    const [selectedMessage, setSelectedMessage] = useState<{ subject: string, message: string, org: string } | null>(null);

    const { data: tickets, isLoading } = useQuery({
        queryKey: ["admin-support-tickets", searchTerm],
        queryFn: async () => {
            let query = supabase.from("support_tickets").select(`
                *,
                profiles:user_id(full_name, email),
                organizations:organization_id(name)
            `).order("created_at", { ascending: false });

            if (searchTerm) {
                query = query.ilike("subject", `%${searchTerm}%`);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data;
        },
    });

    const updateTicketMutation = useMutation({
        mutationFn: async ({ id, status }: { id: string, status: string }) => {
            const { error } = await supabase
                .from("support_tickets")
                .update({ status })
                .eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-support-tickets"] });
            toast.success("Status do chamado atualizado.");
        },
        onError: (err: any) => {
            toast.error(`Falha: ${err.message}`);
        }
    });

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "open":
                return <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20"><AlertTriangle className="h-3 w-3 mr-1" /> Aberto</Badge>;
            case "in_progress":
                return <Badge variant="outline" className="bg-sky-500/10 text-sky-400 border-sky-500/20"><Clock className="h-3 w-3 mr-1" /> Em Andamento</Badge>;
            case "resolved":
                return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20"><CheckCircle2 className="h-3 w-3 mr-1" /> Resolvido</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case "urgent": return "text-rose-500 font-bold";
            case "high": return "text-orange-400 font-bold";
            case "medium": return "text-sky-400 font-medium";
            case "low": return "text-zinc-500";
            default: return "text-zinc-400";
        }
    };

    return (
        <div className="flex flex-col gap-6 w-full">
            <div className="flex flex-col gap-2">
                <h2 className="text-2xl font-bold tracking-tight text-white mb-2 flex items-center gap-2">
                    <Headset className="h-6 w-6 text-indigo-500" />
                    Central de Chamados Master
                </h2>
                <p className="text-zinc-400 text-sm">
                    Caixa de entrada centralizada para tickets e suporte técnico requisitado pelas organizações.
                </p>
            </div>

            <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
                    <div>
                        <CardTitle className="text-white">Gerenciamento de Tickets</CardTitle>
                        <CardDescription className="text-zinc-500 mt-1">
                            Acompanhe chamados de clientes (B2B) e resolva bugs reportados.
                        </CardDescription>
                    </div>
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
                        <Input
                            type="text"
                            placeholder="Buscar por assunto..."
                            className="pl-9 bg-zinc-950 border-zinc-700 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-indigo-500 w-full"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-zinc-950/50">
                            <TableRow className="border-zinc-800 hover:bg-transparent">
                                <TableHead className="text-zinc-400">Status</TableHead>
                                <TableHead className="text-zinc-400">Assunto</TableHead>
                                <TableHead className="text-zinc-400">Solicitante</TableHead>
                                <TableHead className="text-zinc-400">Inquilino</TableHead>
                                <TableHead className="text-zinc-400">Prioridade</TableHead>
                                <TableHead className="text-zinc-400">Data Criação</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i} className="border-zinc-800">
                                        <TableCell><Skeleton className="h-6 w-[80px] bg-zinc-800 rounded-full" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-[200px] bg-zinc-800" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-[100px] bg-zinc-800" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-[130px] bg-zinc-800" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-[60px] bg-zinc-800" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-[80px] bg-zinc-800" /></TableCell>
                                        <TableCell></TableCell>
                                    </TableRow>
                                ))
                            ) : tickets?.length === 0 ? (
                                <TableRow className="border-zinc-800 hover:bg-transparent">
                                    <TableCell colSpan={7} className="h-64 p-6">
                                        <EmptyState
                                            icon={MailQuestion}
                                            title="Caixa de entrada vazia"
                                            description="Não há tickets de suporte abertos ou não encontramos o termo buscado."
                                        />
                                    </TableCell>
                                </TableRow>
                            ) : (
                                tickets?.map((ticket: any) => (
                                    <TableRow key={ticket.id} className="border-zinc-800 hover:bg-zinc-800/50 transition-colors">
                                        <TableCell>
                                            {getStatusBadge(ticket.status || 'open')}
                                        </TableCell>
                                        <TableCell className="font-medium text-zinc-100 max-w-[200px] truncate">
                                            {ticket.subject}
                                        </TableCell>
                                        <TableCell className="text-zinc-300">
                                            <div className="flex items-center gap-1.5 text-xs">
                                                <User className="h-3 w-3 text-zinc-500" />
                                                <span className="truncate max-w-[120px]">{ticket.profiles?.full_name || ticket.profiles?.email || 'N/A'}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-zinc-300">
                                            <div className="flex items-center gap-1.5 text-xs">
                                                <Building className="h-3 w-3 text-zinc-500" />
                                                <span className="truncate max-w-[150px]">{ticket.organizations?.name || 'N/A'}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className={`text-xs uppercase tracking-wider ${getPriorityColor(ticket.priority)}`}>
                                                {ticket.priority || 'low'}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-zinc-400 text-xs">
                                            {new Date(ticket.created_at).toLocaleDateString('pt-BR')}  {new Date(ticket.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-700">
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-700 text-zinc-300 w-48">
                                                    <DropdownMenuLabel>Ticket de Suporte</DropdownMenuLabel>
                                                    <DropdownMenuSeparator className="bg-zinc-800" />
                                                    <DropdownMenuItem
                                                        onClick={() => {
                                                            setSelectedMessage({
                                                                subject: ticket.subject,
                                                                message: ticket.message,
                                                                org: ticket.organizations?.name || 'Desconhecida'
                                                            });
                                                            setIsMessageDialogOpen(true);
                                                        }}
                                                        className="gap-2 cursor-pointer text-sky-400 hover:bg-sky-500/10 focus:bg-sky-500/10 focus:text-sky-400"
                                                    >
                                                        <Info className="h-4 w-4" /> Visualizar Mensagem
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator className="bg-zinc-800" />
                                                    <DropdownMenuItem
                                                        onClick={() => updateTicketMutation.mutate({ id: ticket.id, status: 'open' })}
                                                        disabled={ticket.status === 'open' || updateTicketMutation.isPending}
                                                        className="gap-2 cursor-pointer text-amber-500 hover:bg-amber-500/10 focus:bg-amber-500/10"
                                                    >
                                                        <AlertTriangle className="h-4 w-4" /> Marcar como Aberto
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onClick={() => updateTicketMutation.mutate({ id: ticket.id, status: 'in_progress' })}
                                                        disabled={ticket.status === 'in_progress' || updateTicketMutation.isPending}
                                                        className="gap-2 cursor-pointer text-sky-400 hover:bg-sky-500/10 focus:bg-sky-500/10"
                                                    >
                                                        <Clock className="h-4 w-4" /> Mover p/ Progresso
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onClick={() => updateTicketMutation.mutate({ id: ticket.id, status: 'resolved' })}
                                                        disabled={ticket.status === 'resolved' || updateTicketMutation.isPending}
                                                        className="gap-2 cursor-pointer text-emerald-400 hover:bg-emerald-500/10 focus:bg-emerald-500/10"
                                                    >
                                                        <CheckCircle2 className="h-4 w-4" /> Finalizar (Resolvido)
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

            <Dialog open={isMessageDialogOpen} onOpenChange={setIsMessageDialogOpen}>
                <DialogContent className="sm:max-w-xl bg-zinc-950 border-zinc-800 text-zinc-100">
                    <DialogHeader>
                        <DialogTitle className="text-xl pr-6 font-semibold border-b border-zinc-800 pb-2">
                            {selectedMessage?.subject}
                        </DialogTitle>
                        <DialogDescription className="text-zinc-500 pt-1">
                            Mensagem original do usuário. (Tenant: <span className="text-indigo-400">{selectedMessage?.org}</span>)
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl text-sm leading-relaxed text-zinc-300 whitespace-pre-wrap">
                            {selectedMessage?.message}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

        </div>
    );
}
