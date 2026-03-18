"use client";

import { PageHeader } from "@/shared/components/PageHeader";
import {
    FileEdit, Hand, Share2, Eye, Plus, LayoutGrid, FileText,
    Settings, BellRing, Sparkles, MoveRight, BarChart3, Scale, Globe
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/shared/ui/card";
import { motion } from "framer-motion";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";

// --- Mock Data ---
const SENTINELS = [
    { id: 1, name: "Alerta de Despesas Anormais", rule: "Se Despesa Semanal > R$ 10.000", action: "WhatsApp (Sócios)", status: "Ativo" },
    { id: 2, name: "Baixa Captação Mensal", rule: "Se Novos Processos < 5", action: "E-mail (Geral)", status: "Ativo" },
    { id: 3, name: "Estouro de Horas (Timesheet)", rule: "Se Advogado XPTO > 40h Semanais", action: "Slack (RH)", status: "Pausado" },
];

const RECENT_REPORTS = [
    { id: 101, name: "Fechamento Mensal - TechCorp", date: "Hoje, 09:30", type: "Magic Link (Interativo)", views: 12 },
    { id: 102, name: "Performance da Equipe (Q3)", date: "Ontem, 16:45", type: "PDF Estático", views: 4 },
    { id: 103, name: "Evolução Contencioso de Massa", date: "12 Mar, 10:00", type: "Magic Link (Interativo)", views: 35 },
];

export default function RelatoriosPage() {
    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700 pb-12">
            <PageHeader
                title="Central de Relatórios Épicos"
                subtitle="Crie boards interativos, configure sentinelas de anomalias e impressione seus clientes."
                icon={FileEdit}
                gradient="from-indigo-900 to-purple-900"
                actions={
                    <Button className="gap-2 bg-gradient-to-r from-primary to-indigo-500 hover:from-primary/90 hover:to-indigo-500/90 text-white border-0 shadow-lg shadow-primary/20">
                        <Plus className="w-4 h-4" />
                        Criar Novo Relatório
                    </Button>
                }
            />

            <Tabs defaultValue="builder" className="w-full">
                <TabsList className="grid w-full max-w-md grid-cols-3 mb-8 bg-card/60 backdrop-blur-md">
                    <TabsTrigger value="builder" className="gap-2"><LayoutGrid className="w-4 h-4" /> Report Builder</TabsTrigger>
                    <TabsTrigger value="recent" className="gap-2"><FileText className="w-4 h-4" /> Meus Relatórios</TabsTrigger>
                    <TabsTrigger value="sentinel" className="gap-2"><BellRing className="w-4 h-4" /> Sentinelas</TabsTrigger>
                </TabsList>

                <TabsContent value="builder" className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                        {/* Widgets Library (Drag Source) */}
                        <div className="lg:col-span-1 border border-dashed border-white/20 rounded-xl p-4 bg-card/30">
                            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Módulos (Arraste)</h3>
                            <div className="space-y-3">
                                {[
                                    { icon: Sparkles, name: "Resumo da Aruna IA", cat: "Inteligência" },
                                    { icon: BarChart3, name: "Faturamento Mensal", cat: "Financeiro" },
                                    { icon: Scale, name: "Processos Ativos", cat: "Operacional" },
                                    { icon: Globe, name: "Heatmap Nacional", cat: "Inteligência" },
                                ].map((widget, i) => (
                                    <div key={i} className="p-3 bg-card border border-white/5 rounded-lg flex items-center gap-3 cursor-grab hover:border-primary/50 transition-colors">
                                        <Hand className="w-4 h-4 text-muted-foreground" />
                                        <widget.icon className="w-5 h-5 text-primary" />
                                        <div>
                                            <p className="text-xs font-bold">{widget.name}</p>
                                            <p className="text-[10px] text-muted-foreground">{widget.cat}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Canvas Area */}
                        <div className="lg:col-span-3">
                            <Card className="h-full min-h-[500px] border-white/5 shadow-2xl bg-card/50 backdrop-blur-md flex flex-col items-center justify-center relative overflow-hidden group">
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:20px_20px]" />
                                <div className="z-10 text-center space-y-4 max-w-sm">
                                    <div className="p-4 rounded-full bg-primary/10 w-fit mx-auto ring-1 ring-primary/30">
                                        <LayoutGrid className="w-8 h-8 text-primary" />
                                    </div>
                                    <h3 className="text-xl font-bold">Canvas Vazio</h3>
                                    <p className="text-sm text-muted-foreground">Arraste os widgets do menu lateral para cá e construa um dashboard personalizado para o seu cliente.</p>
                                </div>
                            </Card>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="recent" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {RECENT_REPORTS.map((report, i) => (
                            <motion.div key={report.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.1 }}>
                                <Card className="border-white/5 bg-card/60 backdrop-blur-sm hover:border-white/20 transition-all cursor-pointer group">
                                    <CardHeader className="pb-3">
                                        <div className="flex justify-between items-start">
                                            <Badge variant={report.type.includes("Magic") ? "default" : "secondary"} className="mb-2">
                                                {report.type}
                                            </Badge>
                                            <div className="flex items-center text-xs text-muted-foreground gap-1">
                                                <Eye className="w-3 h-3" /> {report.views}
                                            </div>
                                        </div>
                                        <CardTitle className="text-base group-hover:text-primary transition-colors">{report.name}</CardTitle>
                                        <CardDescription>{report.date}</CardDescription>
                                    </CardHeader>
                                    <CardFooter className="pt-2 border-t border-white/5 flex gap-2">
                                        <Button variant="ghost" size="sm" className="flex-1 text-xs"><Eye className="w-3 h-3 mr-2" /> Visualizar</Button>
                                        <Button variant="ghost" size="sm" className="flex-1 text-xs"><Share2 className="w-3 h-3 mr-2" /> Magic Link</Button>
                                    </CardFooter>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                </TabsContent>

                <TabsContent value="sentinel" className="space-y-6">
                    <Card className="border-white/5 shadow-2xl bg-card/60 backdrop-blur-md">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><BellRing className="w-5 h-5 text-amber-500" /> Sentinelas de Anomalia</CardTitle>
                            <CardDescription>A Lexa monitora seus dados 24/7 e dispara relatórios automáticos quando regras são violadas.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {SENTINELS.map((sentinel, i) => (
                                    <motion.div key={sentinel.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                                        className="flex items-center justify-between p-4 bg-black/20 rounded-lg border border-white/5 hover:border-white/10 transition-colors">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-sm tracking-wide">{sentinel.name}</span>
                                                <Badge variant={sentinel.status === "Ativo" ? "default" : "secondary"} className={sentinel.status === "Ativo" ? "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20" : ""}>
                                                    {sentinel.status}
                                                </Badge>
                                            </div>
                                            <p className="text-xs font-mono text-muted-foreground">{sentinel.rule}</p>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="flex flex-col items-end">
                                                <span className="text-[10px] uppercase text-muted-foreground font-bold">Ação Automática</span>
                                                <span className="text-xs flex items-center gap-1 font-medium"><MoveRight className="w-3 h-3 text-primary" /> {sentinel.action}</span>
                                            </div>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground"><Settings className="w-4 h-4" /></Button>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
