"use client";

import { PageHeader } from "@/shared/components/PageHeader";
import { BarChart3, TrendingUp, Users, Scale, DownloadCloud, Bot, BrainCircuit, Activity, Globe, MousePointerClick, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    LineChart, Line, PieChart, Pie, Cell, AreaChart, Area
} from "recharts";
import { motion } from "framer-motion";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";

// --- Mock Data ---
const performanceData = [
    { name: "Jan", processos: 400, previsaoGanho: 310 },
    { name: "Fev", processos: 300, previsaoGanho: 220 },
    { name: "Mar", processos: 200, previsaoGanho: 180 },
    { name: "Abr", processos: 278, previsaoGanho: 210 },
    { name: "Mai", processos: 189, previsaoGanho: 150 },
    { name: "Jun", processos: 239, previsaoGanho: 200 },
    { name: "Jul", processos: 349, previsaoGanho: 290 },
];

const riskData = [
    { name: "Baixo Risco", value: 60, color: "#10b981" }, // emerald
    { name: "Médio Risco", value: 25, color: "#f59e0b" }, // amber
    { name: "Alto Risco", value: 15, color: "#ef4444" },  // red
];

export default function BIPage() {
    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700 pb-12">
            <PageHeader
                title="Business Intelligence (B.I.)"
                subtitle="Painéis preditivos e analíticos com a precisão da Aruna IA."
                icon={BarChart3}
                gradient="from-slate-800 to-indigo-950"
                actions={
                    <Button variant="secondary" className="gap-2 bg-white/10 text-white hover:bg-white/20 border-white/10 backdrop-blur-md">
                        <DownloadCloud className="w-4 h-4" />
                        Exportar Board Deck (C-Level)
                    </Button>
                }
            />

            {/* Smart KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { title: "Probabilidade de Éxito Global", val: "78.2%", icon: BrainCircuit, color: "text-primary", desc: "Aruna IA: +3.4% esse semestre" },
                    { title: "Risco Financeiro Exposto", val: "R$ 4.2M", icon: Activity, color: "text-rose-500", desc: "Concentrado em 2 clientes chaves" },
                    { title: "Tempo Médio (Julgamento)", val: "14 Meses", icon: Clock, color: "text-blue-500", desc: "-45 dias vs. mercado judicial" },
                    { title: "Novas Jurisprudências", val: "12", icon: Scale, color: "text-emerald-500", desc: "Afetam seu portfólio diretamente" },
                ].map((kpi, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * i }}>
                        <Card className="border-white/5 shadow-xl bg-gradient-to-br from-card to-card/50 hover:border-primary/20 transition-all cursor-default group relative overflow-hidden">
                            <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <kpi.icon className="w-24 h-24" />
                            </div>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{kpi.title}</CardTitle>
                                <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                            </CardHeader>
                            <CardContent className="relative z-10">
                                <div className="text-2xl font-bold tracking-tight">{kpi.val}</div>
                                <p className="text-[10px] mt-1 text-muted-foreground font-medium flex items-center gap-1">
                                    {i === 0 && <Bot className="w-3 h-3 text-primary" />}
                                    {kpi.desc}
                                </p>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Evolution Graphic Area */}
                <motion.div className="lg:col-span-2" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 }}>
                    <Card className="h-full border-white/5 shadow-2xl bg-card/60 backdrop-blur-md">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <div>
                                <CardTitle className="text-lg">Previsão Jurídica vs. Carga Ativa</CardTitle>
                                <CardDescription>Modelo de regressão da Aruna IA simulando vitórias baseadas na tese</CardDescription>
                            </div>
                            <Badge variant="outline" className="border-primary/50 text-primary bg-primary/10">
                                <BrainCircuit className="w-3 h-3 mr-1" />
                                Modelagem Preditiva
                            </Badge>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[300px] w-full mt-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={performanceData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorGanho" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="colorProc" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#fff" opacity={0.05} vertical={false} />
                                        <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                        <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#fff" }} />
                                        <Area type="monotone" dataKey="processos" stroke="#3b82f6" fillOpacity={1} fill="url(#colorProc)" name="Processos Totais" />
                                        <Area type="monotone" dataKey="previsaoGanho" stroke="#10b981" fillOpacity={1} fill="url(#colorGanho)" name="Vitória Prevista" strokeWidth={2} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Risk Radar */}
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.6 }}>
                    <Card className="h-full border-white/5 shadow-2xl bg-card/60 backdrop-blur-md">
                        <CardHeader>
                            <CardTitle className="text-lg">Radar de Risco da Carteira</CardTitle>
                            <CardDescription>Classificação de risco de perda sentenciada</CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col items-center justify-center pt-2">
                            <div className="h-[220px] w-full relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={riskData} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={5} dataKey="value" stroke="none">
                                            {riskData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#fff" }} formatter={(value: number) => [`${value}%`, 'Processos']} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <span className="text-3xl font-bold">1.2k</span>
                                    <span className="text-xs text-muted-foreground uppercase tracking-widest">Processos</span>
                                </div>
                            </div>

                            <div className="w-full mt-6 space-y-3">
                                {riskData.map((item) => (
                                    <div key={item.name} className="flex items-center justify-between text-sm group cursor-pointer p-2 hover:bg-white/5 rounded-md transition-colors">
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: item.color }} />
                                            <span className="font-medium text-foreground/90">{item.name}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="font-bold">{item.value}%</span>
                                            <MousePointerClick className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                    </div>
                                ))}
                                <Button variant="link" className="w-full text-xs text-primary mt-2 h-auto py-1">Aprofundar Drill-down Diário →</Button>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>

            {/* Heatmap/Geographic Section Placeholder */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
                <Card className="border-white/5 shadow-2xl bg-gradient-to-r from-card to-card/40 overflow-hidden relative">
                    <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-primary/10 to-transparent pointer-events-none" />
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Globe className="w-5 h-5 text-primary" /> Heatmap de Contingência Nacional</CardTitle>
                        <CardDescription>Mapeamento de performance jurídica por Estado e Comarca.</CardDescription>
                    </CardHeader>
                    <CardContent className="py-12">
                        <div className="flex flex-col items-center justify-center text-center space-y-4">
                            <div className="p-4 rounded-full bg-primary/10 ring-1 ring-primary/20">
                                <Globe className="w-8 h-8 text-primary animate-pulse" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold">Renderização Geoespacial</h3>
                                <p className="text-sm text-muted-foreground max-w-md mx-auto mt-2">Clique sobre os estados no mapa interativo (Carregando módulo de mapas avançado) para extrair TJs locais.</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}
