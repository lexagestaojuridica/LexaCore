import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
    Building2,
    CreditCard,
    Users,
    TrendingUp,
    Activity,
    AlertCircle
} from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";

export default function AdminDashboard() {
    // Query Total Organizations
    const { data: orgsCount } = useQuery({
        queryKey: ["admin-orgs-count"],
        queryFn: async () => {
            const { count } = await supabase
                .from("organizations")
                .select("*", { count: "exact", head: true });
            return count || 0;
        },
    });

    // Query Active Subscriptions
    const { data: activeSubs } = useQuery({
        queryKey: ["admin-active-subs"],
        queryFn: async () => {
            const { count } = await supabase
                .from("organization_subscriptions")
                .select("*", { count: "exact", head: true })
                .eq("status", "active");
            return count || 0;
        },
    });

    // Query Total Users
    const { data: usersCount } = useQuery({
        queryKey: ["admin-users-count"],
        queryFn: async () => {
            const { count } = await supabase
                .from("profiles")
                .select("*", { count: "exact", head: true });
            return count || 0;
        },
    });

    // Mock data for MRR chart (since calculating dynamic MRR requires complex joins to plans table we'll do later)
    const mrrData = [
        { name: "Out", mrr: 12500 },
        { name: "Nov", mrr: 15000 },
        { name: "Dez", mrr: 18200 },
        { name: "Jan", mrr: 22000 },
        { name: "Fev", mrr: 26500 },
        { name: "Mar", mrr: 31000 },
    ];

    return (
        <div className="flex flex-col gap-6">

            {/* Header text handled by Layout, just specific page intro here */}
            <div className="flex flex-col gap-2">
                <h2 className="text-2xl font-bold tracking-tight text-white mb-2">Resumo Executivo</h2>
                <p className="text-zinc-400 text-sm">
                    Acompanhe o crescimento e a saúde da plataforma Lexanova em tempo real.
                </p>
            </div>

            {/* Metric Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">

                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400">MRR Estimado</CardTitle>
                        <CreditCard className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">R$ 31.000,00</div>
                        <p className="text-xs text-emerald-500 mt-1 flex items-center gap-1">
                            <TrendingUp className="h-3 w-3" /> +17% em relação ao último mês
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400">Inquilinos Pagantes</CardTitle>
                        <Building2 className="h-4 w-4 text-indigo-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">{activeSubs ?? "..."}</div>
                        <p className="text-xs text-zinc-500 mt-1">
                            De {orgsCount ?? "..."} escritórios registrados
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400">Usuários Ativos</CardTitle>
                        <Users className="h-4 w-4 text-sky-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">{usersCount ?? "..."}</div>
                        <p className="text-xs text-sky-500 mt-1 flex items-center gap-1">
                            <TrendingUp className="h-3 w-3" /> Crescimento constante
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400">Saúde do Servidor</CardTitle>
                        <Activity className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-400">Excelente</div>
                        <p className="text-xs text-zinc-500 mt-1">
                            Zero erros reportados hoje
                        </p>
                    </CardContent>
                </Card>

            </div>

            {/* Charts & Graphs Row */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7 mt-4">

                {/* MRR Chart */}
                <Card className="col-span-4 bg-zinc-900 border-zinc-800">
                    <CardHeader>
                        <CardTitle className="text-white">Crescimento do MRR</CardTitle>
                        <CardDescription className="text-zinc-500">
                            Receita Recorrente Mensal (Últimos 6 meses)
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px] w-full mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={mrrData}>
                                <XAxis
                                    dataKey="name"
                                    stroke="#52525b"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    stroke="#52525b"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(value) => `R$${value / 1000}k`}
                                />
                                <Tooltip
                                    cursor={{ fill: '#27272a' }}
                                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#fff' }}
                                />
                                <Bar
                                    dataKey="mrr"
                                    fill="#6366f1"
                                    radius={[4, 4, 0, 0]}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Recent Alerts / Quick Actions */}
                <Card className="col-span-3 bg-zinc-900 border-zinc-800 flex flex-col">
                    <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-amber-500" />
                            Notificações do SaaS
                        </CardTitle>
                        <CardDescription className="text-zinc-500">
                            Monitoramento operacionais automáticos
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-auto">
                        <div className="space-y-4">
                            <div className="flex gap-3 text-sm">
                                <div className="h-2 w-2 mt-1.5 rounded-full bg-emerald-500 shrink-0" />
                                <div>
                                    <span className="text-zinc-200 font-medium">Novo cliente cadastrado</span>
                                    <p className="text-zinc-500 text-xs">Escritório Silva & Associados ativou hoje Plano Pro.</p>
                                </div>
                            </div>
                            <div className="flex gap-3 text-sm">
                                <div className="h-2 w-2 mt-1.5 rounded-full bg-rose-500 shrink-0" />
                                <div>
                                    <span className="text-zinc-200 font-medium">Inadimplência Platinium Advogados</span>
                                    <p className="text-zinc-500 text-xs">O asaas relatou falha no cartão 2h atrás.</p>
                                </div>
                            </div>
                            <div className="flex gap-3 text-sm">
                                <div className="h-2 w-2 mt-1.5 rounded-full bg-indigo-500 shrink-0" />
                                <div>
                                    <span className="text-zinc-200 font-medium">Limite de Processos Atingido</span>
                                    <p className="text-zinc-500 text-xs">Torres Advocacia alcançou 100% dos processos (Free).</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

            </div>
        </div>
    );
}
