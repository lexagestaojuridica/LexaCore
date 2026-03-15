import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/shared/ui/card";
import { CreditCard, Edit, Check, X, Shield, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Skeleton } from "@/shared/ui/skeleton";

export default function AdminPlans() {
    const { data: plans, isLoading } = useQuery({
        queryKey: ["admin-plans"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("plans")
                .select("*")
                .order("price_cents", { ascending: true });
            if (error) throw error;
            return data;
        },
    });

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex flex-col gap-2">
                    <h2 className="text-2xl font-bold tracking-tight text-white mb-2 flex items-center gap-2">
                        <CreditCard className="h-6 w-6 text-emerald-500" />
                        Planos & Assinaturas (Tiers)
                    </h2>
                    <p className="text-zinc-400 text-sm">Configure limites do sistema e valores das assinaturas para novos clientes.</p>
                </div>
                <Button
                    className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
                    onClick={() => toast.info("Funcionalidade de criação de plano será implementada em breve.")}
                >
                    <Plus className="h-4 w-4" /> Criar Novo Plano
                </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                        <Card key={i} className="bg-zinc-900 border-zinc-800 flex flex-col overflow-hidden">
                            <CardHeader className="gap-2">
                                <Skeleton className="h-6 w-1/2 bg-zinc-800" />
                                <Skeleton className="h-4 w-20 bg-emerald-500/10" />
                            </CardHeader>
                            <CardContent className="flex-1 flex flex-col gap-4">
                                <Skeleton className="h-10 w-32 bg-zinc-800" />
                                <div className="flex gap-2">
                                    <Skeleton className="h-6 w-24 bg-zinc-800 rounded-full" />
                                    <Skeleton className="h-6 w-24 bg-zinc-800 rounded-full" />
                                </div>
                            </CardContent>
                            <CardFooter className="pt-4 mt-auto border-t border-zinc-800">
                                <Skeleton className="h-10 w-full bg-zinc-800/50" />
                            </CardFooter>
                        </Card>
                    ))
                ) : plans?.length === 0 ? (
                    <div className="col-span-full p-12 text-center text-zinc-500 border border-dashed border-zinc-800 rounded-lg">
                        Nenhum plano configurado no sistema.
                    </div>
                ) : (
                    plans?.map((plan) => {
                        const features = Array.isArray(plan.features) ? plan.features : [];
                        const priceMonthly = (plan.price_cents / 100).toFixed(2);
                        return (
                            <Card key={plan.id} className="bg-zinc-900 border-zinc-800 flex flex-col relative overflow-hidden group">
                                <CardHeader>
                                    <CardTitle className="text-xl text-white flex items-center justify-between">
                                        {plan.name}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="flex-1 flex flex-col gap-4">
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-3xl font-bold text-white">R$ {priceMonthly}</span>
                                        <span className="text-sm font-medium text-zinc-500">/mês</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <Badge variant="outline" className="bg-zinc-950 text-indigo-400 border-indigo-500/20">
                                            {plan.max_users >= 999 ? 'Users: Ilimitado' : `Users: ${plan.max_users}`}
                                        </Badge>
                                        <Badge variant="outline" className="bg-zinc-950 text-sky-400 border-sky-500/20">
                                            {(plan.max_processes ?? 0) >= 9999 ? 'Proc: Ilimitado' : `Proc: ${plan.max_processes ?? 0}`}
                                        </Badge>
                                    </div>
                                    <div className="mt-2 space-y-2">
                                        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Features do Plano</p>
                                        <ul className="flex flex-col gap-2">
                                            {features.map((feature: any, idx: number) => (
                                                <li key={idx} className="flex items-start gap-2 text-sm text-zinc-300">
                                                    <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                                                    <span>{String(feature)}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </CardContent>
                                <CardFooter className="border-t border-zinc-800 pt-4 mt-auto">
                                    <Button
                                        variant="outline"
                                        className="w-full bg-zinc-950 border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                                        onClick={() => toast.info(`Edição do plano "${plan.name}" será implementada em breve.`)}
                                    >
                                        <Edit className="h-4 w-4 mr-2" /> Editar {plan.name}
                                    </Button>
                                </CardFooter>
                            </Card>
                        );
                    })
                )}
            </div>
        </div>
    );
}
