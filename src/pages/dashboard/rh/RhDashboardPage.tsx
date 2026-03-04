import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, UserMinus, UserCheck, CalendarDays, TrendingUp, Briefcase, DollarSign, PieChart as PieChartIcon } from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import LexaLoadingOverlay from "@/components/shared/LexaLoadingOverlay";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/shared/PageHeader";

const COLORS = ["#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#6366f1"];

export default function RhDashboardPage() {
    const { t } = useTranslation();
    const { user } = useAuth();

    const { data: profile } = useQuery({
        queryKey: ["profile-rh", user?.id],
        queryFn: async () => {
            const { data } = await supabase.from("profiles").select("organization_id").eq("user_id", user!.id).single();
            return data;
        },
        enabled: !!user?.id,
    });
    const orgId = profile?.organization_id;

    const { data: stats, isLoading } = useQuery({
        queryKey: ["hr-dashboard-stats", orgId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("rh_colaboradores")
                .select("*")
                .eq("organization_id", orgId!);
            if (error) throw error;

            const active = data?.filter(e => e.status === 'active').length || 0;
            const onLeave = data?.filter(e => e.status === 'on_leave').length || 0;
            const terminated = data?.filter(e => e.status === 'terminated').length || 0;
            const total = active + onLeave;

            // Group by department for charts
            const deptMap: Record<string, number> = {};
            data?.forEach(e => {
                const dept = e.department || "Geral";
                deptMap[dept] = (deptMap[dept] || 0) + 1;
            });

            const deptData = Object.entries(deptMap).map(([name, value]) => ({ name, value }));

            // Build monthly admission data from real hire_date
            const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
            const year = new Date().getFullYear();
            const monthlyMap: Record<string, { admission: number; termination: number }> = {};
            months.forEach((m) => { monthlyMap[m] = { admission: 0, termination: 0 }; });
            data?.forEach(e => {
                if (e.admission_date) {
                    const d = new Date(e.admission_date);
                    if (d.getFullYear() === year) {
                        const m = months[d.getMonth()];
                        monthlyMap[m].admission += 1;
                    }
                }
            });
            const monthlyData = months.slice(0, new Date().getMonth() + 1).map(m => ({ month: m, ...monthlyMap[m] }));

            const totalPayroll = data?.filter(e => e.status === 'active').reduce((acc, curr) => acc + (Number(curr.base_salary) || 0), 0) || 0;

            return {
                total, active, onLeave, terminated,
                deptData, monthlyData, totalPayroll
            };
        },
        enabled: !!orgId,
    });

    if (isLoading) return <LexaLoadingOverlay visible />;

    return (
        <div className="flex-1 space-y-6 pt-2 bg-background/50">
            <PageHeader
                title="RH e Inteligência de DHO"
                subtitle="Gestão estratégica de capital humano e performance organizacional"
                icon={Users}
                gradient="from-emerald-600 to-teal-600"
            />

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Headcount Total</CardTitle>
                        <Users className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.total || 0}</div>
                        <div className="flex items-center gap-1 mt-1">
                            <TrendingUp className="h-3 w-3 text-emerald-500" />
                            <span className="text-[10px] text-emerald-500 font-medium">+2 este mês</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Folha de Pagamento</CardTitle>
                        <DollarSign className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {stats?.totalPayroll?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1 font-medium">Investimento mensal em talentos</p>
                    </CardContent>
                </Card>

                <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Vagas Abertas</CardTitle>
                        <Briefcase className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">3</div>
                        <p className="text-[10px] text-muted-foreground mt-1 font-medium">Processos seletivos em curso</p>
                    </CardContent>
                </Card>

                <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Turnover Anual</CardTitle>
                        <UserMinus className="h-4 w-4 text-destructive" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">4.2%</div>
                        <div className="flex items-center gap-1 mt-1 text-emerald-500">
                            <span className="text-[10px] font-medium">-1.5% vs ano anterior</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <Card className="border-border/50 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base font-semibold">
                            <PieChartIcon className="h-4 w-4 text-primary" />
                            Distribuição por Departamento
                        </CardTitle>
                        <CardDescription className="text-xs">Visualização do Headcount por área</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={stats?.deptData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {stats?.deptData?.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                                    itemStyle={{ fontSize: '12px' }}
                                />
                                <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '10px' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card className="border-border/50 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base font-semibold">
                            <TrendingUp className="h-4 w-4 text-primary" />
                            Fluxo de Talentos (Admissão vs Demissão)
                        </CardTitle>
                        <CardDescription className="text-xs">Movimentação nos últimos 6 meses</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats?.monthlyData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis
                                    dataKey="month"
                                    fontSize={10}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    fontSize={10}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <Tooltip
                                    cursor={{ fill: '#f1f5f9' }}
                                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                                />
                                <Legend verticalAlign="top" align="right" fontSize={10} wrapperStyle={{ paddingBottom: '20px', fontSize: '10px' }} />
                                <Bar dataKey="admission" name="Admissões" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                                <Bar dataKey="termination" name="Demissões" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

