import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserMinus, UserCheck, CalendarDays } from "lucide-react";

export default function RhDashboardPage() {
    const { data: stats } = useQuery({
        queryKey: ["hr-dashboard-stats"],
        queryFn: async () => {
            const { data, error } = await supabase.from("hr_employees").select("id, status");
            if (error) throw error;

            const active = data?.filter(e => e.status === 'active').length || 0;
            const onLeave = data?.filter(e => e.status === 'on_leave').length || 0;

            return { total: active + onLeave, active, onLeave };
        }
    });

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex flex-col gap-1 mb-6">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">RH e Gestão de Pessoas</h1>
                <p className="text-sm text-muted-foreground">Acompanhamento geral de Headcount e Turnover</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Headcount Total</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.total || 0}</div>
                        <p className="text-xs text-muted-foreground">Colaboradores ativos e afastados</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Equipe Ativa</CardTitle>
                        <UserCheck className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.active || 0}</div>
                        <p className="text-xs text-muted-foreground">Trabalhando atualmente</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Afastamentos / Férias</CardTitle>
                        <CalendarDays className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.onLeave || 0}</div>
                        <p className="text-xs text-muted-foreground">Colaboradores ausentes</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Turnover (Mês)</CardTitle>
                        <UserMinus className="h-4 w-4 text-destructive" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">0%</div>
                        <p className="text-xs text-muted-foreground">Taxa de rotatividade</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
