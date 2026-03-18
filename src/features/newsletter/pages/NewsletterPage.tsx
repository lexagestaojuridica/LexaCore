"use client";

import { PageHeader } from "@/shared/components/PageHeader";
import { Newspaper, Clock, Hash, ExternalLink, ShieldAlert, TrendingUp, TrendingDown, Landmark, Scale, BookOpen } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { motion } from "framer-motion";
import { Button } from "@/shared/ui/button";

// --- Mock Data ---

const ECONOMIC_INDICATORS = [
    { label: "Dólar (USD)", value: "R$ 5,02", trend: "down", change: "-0.5%" },
    { label: "Euro (EUR)", value: "R$ 5,45", trend: "up", change: "+0.2%" },
    { label: "Inflação (IPCA)", value: "4.50%", trend: "stable", change: "acum. 12m" },
    { label: "Taxa Selic", value: "10.50%", trend: "stable", change: "Meta COPOM" },
];

const LEGISLATIVE_RADAR = [
    {
        id: 101,
        law: "PL 2338/2023",
        status: "Em Votação",
        topic: "Marco Legal da Inteligência Artificial",
        impact: "Alto",
    },
    {
        id: 102,
        law: "MP 1202/2023",
        status: "Sancionada com Vetos",
        topic: "Reoneração da Folha de Pagamento",
        impact: "Crítico",
    },
    {
        id: 103,
        law: "PLP 68/2024",
        status: "Tramitação Especial",
        topic: "Regulamentação da Reforma Tributária (IBS/CBS)",
        impact: "Crítico",
    }
];

const NEWS_ITEMS = [
    {
        id: 1,
        title: "STF firma tese sobre a exclusão do ICMS da base de cálculo das contribuições ao PIS e COFINS",
        source: "Supremo Tribunal Federal",
        category: "Tributário",
        time: "Há 12 minutos",
        content: "O plenário do STF concluiu julgamento histórico que pode impactar bilhões em arrecadação. Advogados devem revisar petições focadas em teses tributárias similares e verificar a decadência.",
        urgent: true
    },
    {
        id: 2,
        title: "Nova regulamentação da ANPD sobre dosimetria em sanções da LGPD entra em vigor",
        source: "Autoridade Nacional de Proteção de Dados",
        category: "Direito Digital",
        time: "Há 45 minutos",
        content: "A norma estabelece os parâmetros e critérios que serão utilizados pela fiscalização para a aplicação de sanções administrativas. Multas agora possuem teto progressivo com base na gravidade do incidente.",
        urgent: false
    },
    {
        id: 3,
        title: "TST padroniza regras para trabalho remoto e híbrido pós-pandemia",
        source: "Tribunal Superior do Trabalho",
        category: "Trabalhista",
        time: "Há 5 horas",
        content: "A nova súmula afasta a necessidade de controle rígido de ponto para empregados exclusivamente home office, sob certas convenções coletivas. Revisão de contratos é recomendada.",
        urgent: false
    }
];

export default function NewsletterPage() {
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700 pb-12">
            <PageHeader
                title="Hub de Inteligência & Notícias"
                subtitle="Seu radar em tempo real: Mercado, Leis e Decisões dos Tribunais Superiores."
                icon={Newspaper}
                gradient="from-indigo-600 to-indigo-900"
            />

            {/* Economic Ticker */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {ECONOMIC_INDICATORS.map((ind, i) => (
                    <motion.div key={ind.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                        <Card className="border-white/5 bg-card/40 backdrop-blur-sm hover:bg-card/60 transition-colors">
                            <CardContent className="p-4 flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{ind.label}</p>
                                    <p className="text-lg font-bold mt-0.5">{ind.value}</p>
                                </div>
                                <div className="text-right">
                                    {ind.trend === "up" && <TrendingUp className="w-5 h-5 text-emerald-500 ml-auto" />}
                                    {ind.trend === "down" && <TrendingDown className="w-5 h-5 text-rose-500 ml-auto" />}
                                    {ind.trend === "stable" && <Landmark className="w-5 h-5 text-blue-500 ml-auto" />}
                                    <p className={`text-[10px] mt-1 font-semibold ${ind.trend === 'up' ? 'text-emerald-500' : ind.trend === 'down' ? 'text-rose-500' : 'text-blue-500'}`}>
                                        {ind.change}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-4">
                {/* Main News Feed */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center gap-2 border-b border-border/50 pb-2 mb-4">
                        <Scale className="w-5 h-5 text-primary" />
                        <h2 className="text-lg font-bold text-foreground">Giro Jurídico (Nível Brasil)</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {NEWS_ITEMS.map((news, index) => (
                            <motion.div key={news.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.15 }}>
                                <Card className="h-full flex flex-col border-white/10 shadow-lg hover:shadow-xl hover:border-white/20 transition-all duration-300 bg-card/60 backdrop-blur-md">
                                    <CardHeader className="pb-3 border-b border-white/5 space-y-3">
                                        <div className="flex justify-between items-start gap-2">
                                            <Badge variant={news.category === "Tributário" ? "destructive" : "secondary"}>
                                                <Hash className="w-3 h-3 mr-1" />
                                                {news.category}
                                            </Badge>
                                            {news.urgent && (
                                                <Badge variant="outline" className="text-amber-500 border-amber-500/30 bg-amber-500/10 animate-pulse">
                                                    <ShieldAlert className="w-3 h-3 mr-1" />
                                                    Urgente
                                                </Badge>
                                            )}
                                        </div>
                                        <h3 className="text-base font-bold leading-tight group-hover:text-primary transition-colors">
                                            {news.title}
                                        </h3>
                                    </CardHeader>

                                    <CardContent className="pt-4 flex-1">
                                        <p className="text-sm text-foreground/80 leading-relaxed">
                                            {news.content}
                                        </p>
                                    </CardContent>

                                    <CardFooter className="flex justify-between items-center pt-4 border-t border-white/5">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-semibold text-muted-foreground">
                                                Fonte: {news.source}
                                            </span>
                                            <div className="flex items-center text-[11px] text-muted-foreground/70 mt-1">
                                                <Clock className="w-3 h-3 mr-1" />
                                                {news.time}
                                            </div>
                                        </div>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-primary/20 hover:text-primary transition-colors">
                                            <ExternalLink className="w-4 h-4" />
                                        </Button>
                                    </CardFooter>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* Legislative Radar Side Column */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 border-b border-border/50 pb-2 mb-4">
                        <BookOpen className="w-5 h-5 text-amber-500" />
                        <h2 className="text-lg font-bold text-foreground">Radar Legislativo</h2>
                    </div>

                    <div className="flex flex-col gap-4">
                        {LEGISLATIVE_RADAR.map((item, i) => (
                            <motion.div key={item.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.2 }}>
                                <Card className="border-l-4 border-l-amber-500 border-white/5 bg-gradient-to-r from-amber-500/5 to-transparent">
                                    <CardContent className="p-4">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="font-bold text-amber-500">{item.law}</span>
                                            <Badge variant="outline" className="text-[10px] uppercase font-bold text-muted-foreground">
                                                {item.status}
                                            </Badge>
                                        </div>
                                        <p className="text-sm font-medium text-foreground mb-3">{item.topic}</p>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Impacto:</span>
                                            <Badge className={`text-[10px] h-5 ${item.impact === 'Crítico' ? 'bg-destructive hover:bg-destructive' : 'bg-amber-600 hover:bg-amber-600'}`}>
                                                {item.impact}
                                            </Badge>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
