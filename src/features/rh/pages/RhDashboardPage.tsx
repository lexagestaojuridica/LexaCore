import { trpc } from "@/shared/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { Users, UserMinus, UserCheck, CalendarDays, TrendingUp, Briefcase, DollarSign, PieChart as PieChartIcon } from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import LexaLoadingOverlay from "@/shared/components/LexaLoadingOverlay";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/shared/components/PageHeader";

const COLORS = ["#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#6366f1"];

export default function RhDashboardPage() {
    const { t } = useTranslation();
    const { data: stats, isLoading } = trpc.rh.getDashboardStats.useQuery();

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
                                    {stats?.deptData?.map((entry: any, index: number) => (
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

