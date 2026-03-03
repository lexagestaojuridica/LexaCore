import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { CreditCard, Edit, Check, X, Shield, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminPlans() {
    const { data: plans, isLoading } = useQuery({
        queryKey: ["admin-subscription-plans"],
        queryFn: async () => {
            // @ts-ignore - bypassing typed supabase client for table that was manually created via migration lately
            const { data, error } = await supabase
                .from("subscription_plans" as any)
                .select("*")
                .order("sort_order", { ascending: true });
            if (error) throw error;
            return data as any[];
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
                    <p className="text-zinc-400 text-sm">
                        Configure limites do sistema e valores das assinaturas para novos clientes.
                    </p>
                </div>
                <Button className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
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
                                <div className="space-y-2 mt-2">
                                    <Skeleton className="h-4 w-full bg-zinc-800" />
                                    <Skeleton className="h-4 w-3/4 bg-zinc-800" />
                                    <Skeleton className="h-4 w-5/6 bg-zinc-800" />
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
                        return (
                            <Card key={plan.id} className="bg-zinc-900 border-zinc-800 flex flex-col relative overflow-hidden group">
                                {!plan.is_active && (
                                    <div className="absolute top-0 right-0 bg-rose-500/20 text-rose-400 text-[10px] font-bold px-3 py-1 rounded-bl-lg">
                                        INATIVO
                                    </div>
                                )}
                                <CardHeader>
                                    <CardTitle className="text-xl text-white flex items-center justify-between">
                                        {plan.name}
                                        {plan.slug === 'enterprise' && <Shield className="h-4 w-4 text-emerald-500" />}
                                    </CardTitle>
                                    <CardDescription className="text-zinc-500">
                                        Slug: <code className="text-emerald-400/80 bg-emerald-400/10 px-1 py-0.5 rounded">{plan.slug}</code>
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="flex-1 flex flex-col gap-4">

                                    <div className="flex items-baseline gap-1">
                                        <span className="text-3xl font-bold text-white">R$ {plan.price_monthly}</span>
                                        <span className="text-sm font-medium text-zinc-500">/mês</span>
                                    </div>

                                    <div className="flex gap-2">
                                        <Badge variant="outline" className="bg-zinc-950 text-indigo-400 border-indigo-500/20">
                                            {plan.max_users >= 999 ? 'Users: Ilimitado' : `Users: ${plan.max_users}`}
                                        </Badge>
                                        <Badge variant="outline" className="bg-zinc-950 text-sky-400 border-sky-500/20">
                                            {plan.max_processes >= 9999 ? 'Proc: Ilimitado' : `Proc: ${plan.max_processes}`}
                                        </Badge>
                                    </div>

                                    <div className="mt-2 space-y-2">
                                        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Features do Plano</p>
                                        <ul className="flex flex-col gap-2">
                                            {features.map((feature: any, idx: number) => (
                                                <li key={idx} className="flex items-start gap-2 text-sm text-zinc-300">
                                                    <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                                                    <span>{feature}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                </CardContent>
                                <CardFooter className="border-t border-zinc-800 pt-4 mt-auto">
                                    <Button variant="outline" className="w-full bg-zinc-950 border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white">
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
