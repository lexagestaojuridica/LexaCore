import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { ShieldAlert, Search, Activity, User, Building, Clock, FileJson } from "lucide-react";
import { db as supabase } from "@/integrations/supabase/db";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/shared/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/shared/ui/table";
import { Skeleton } from "@/shared/ui/skeleton";
import { EmptyState } from "@/shared/components/EmptyState";
import { Badge } from "@/shared/ui/badge";

interface AuditLogEntry {
    id: string;
    action: string;
    created_at: string;
    details: any;
    profiles: {
        full_name: string | null;
        email: string | null;
    } | null;
    organizations: {
        name: string | null;
    } | null;
}

export default function AdminAudit() {
    const [searchTerm, setSearchTerm] = useState("");

    const { data: logs, isLoading } = useQuery({
        queryKey: ["admin-audit-logs", searchTerm],
        queryFn: async () => {
            let query = supabase.from("universal_audit_logs").select(`
                *,
                profiles:user_id(full_name, email),
                organizations:organization_id(name)
            `).order("created_at", { ascending: false }).limit(100);

            if (searchTerm) {
                query = query.ilike("action", `%${searchTerm}%`);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data as unknown as AuditLogEntry[];
        },
    });

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
                <h2 className="text-2xl font-bold tracking-tight text-white mb-2 flex items-center gap-2">
                    <ShieldAlert className="h-6 w-6 text-indigo-500" />
                    Auditoria & Logs Globais
                </h2>
                <p className="text-zinc-400 text-sm">
                    Rastreamento de todas as principais transações e acessos administrativos na plataforma.
                </p>
            </div>

            <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
                    <div>
                        <CardTitle className="text-white">Últimos Eventos</CardTitle>
                        <CardDescription className="text-zinc-500 mt-1">
                            Mostrando os últimos 100 registros.
                        </CardDescription>
                    </div>
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
                        <Input
                            type="text"
                            placeholder="Buscar ação..."
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
                                <TableHead className="text-zinc-400">Ação / Evento</TableHead>
                                <TableHead className="text-zinc-400">Usuário</TableHead>
                                <TableHead className="text-zinc-400">Inquilino</TableHead>
                                <TableHead className="text-zinc-400">Timestamp</TableHead>
                                <TableHead className="text-zinc-400 text-right">Detalhes</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i} className="border-zinc-800">
                                        <TableCell><Skeleton className="h-4 w-[120px] bg-zinc-800" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-[100px] bg-zinc-800" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-[130px] bg-zinc-800" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-[100px] bg-zinc-800" /></TableCell>
                                        <TableCell className="text-right"><Skeleton className="h-4 w-[40px] bg-zinc-800 ml-auto" /></TableCell>
                                    </TableRow>
                                ))
                            ) : logs?.length === 0 ? (
                                <TableRow className="border-zinc-800 hover:bg-transparent">
                                    <TableCell colSpan={5} className="h-64 p-6">
                                        <EmptyState
                                            icon={Activity}
                                            title="Nenhum log encontrado"
                                            description="O sistema não registrou atividades correspondentes à sua busca."
                                        />
                                    </TableCell>
                                </TableRow>
                            ) : (
                                logs?.map((log) => (
                                    <TableRow key={log.id} className="border-zinc-800 hover:bg-zinc-800/50 transition-colors">
                                        <TableCell className="font-medium">
                                            <Badge variant="outline" className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20 font-mono text-xs">
                                                {log.action}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-zinc-300 flex items-center gap-2">
                                            <User className="h-3.5 w-3.5 text-zinc-500" />
                                            {log.profiles?.full_name || log.profiles?.email || <span className="text-zinc-600">Sistema</span>}
                                        </TableCell>
                                        <TableCell className="text-zinc-300">
                                            <div className="flex items-center gap-2">
                                                <Building className="h-3.5 w-3.5 text-zinc-500" />
                                                {log.organizations?.name || <span className="text-zinc-600">N/A</span>}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-zinc-400 text-sm">
                                            <div className="flex items-center gap-2">
                                                <Clock className="h-3.5 w-3.5" />
                                                {new Date(log.created_at).toLocaleString('pt-BR')}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {log.details ? (
                                                <div className="group relative inline-block">
                                                    <FileJson className="h-4 w-4 text-emerald-400 cursor-help" />
                                                    <div className="absolute right-0 top-6 hidden group-hover:block z-50 w-64 p-3 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl shrink-0 overflow-hidden break-words text-left">
                                                        <pre className="text-[10px] text-zinc-300 whitespace-pre-wrap font-mono">
                                                            {JSON.stringify(log.details, null, 2)}
                                                        </pre>
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-zinc-600 text-xs">—</span>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
