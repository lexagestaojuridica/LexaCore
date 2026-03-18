import { Newspaper, Clock, Hash, ExternalLink, ShieldAlert } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";

const NEWS_ITEMS = [
    {
        id: 1,
        title: "STF firma tese sobre a exclusão do ICMS da base de cálculo",
        source: "STF",
        category: "Tributário",
        time: "Há 12 min",
        content: "O plenário concluiu julgamento que impacta bilhões em arrecadação. Revisão sugerida nas petições.",
        urgent: true
    },
    {
        id: 2,
        title: "Nova regulamentação da ANPD sobre dosimetria em sanções da LGPD",
        source: "ANPD",
        category: "Digital",
        time: "Há 45 min",
        content: "A norma estabelece critérios para sanções administrativas com teto progressivo com base na gravidade.",
        urgent: false
    }
];

export function NewsletterWidget() {
    return (
        <div className="space-y-3 mt-6">
            <div className="flex items-center justify-between pl-1 shrink-0 mb-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <Newspaper className="h-3.5 w-3.5" /> Newsletter LEXA
                </h3>
                <Button variant="ghost" size="sm" className="h-6 text-[10px] font-bold uppercase tracking-widest text-primary/70 hover:text-primary transition-colors pr-0">
                    Feed Completo
                </Button>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {NEWS_ITEMS.map((news) => (
                    <Card key={news.id} className="flex flex-col border-white/10 shadow-md hover:shadow-lg transition-all bg-card/40 backdrop-blur-md">
                        <CardHeader className="pb-2 space-y-2 p-4">
                            <div className="flex justify-between items-start gap-2">
                                <Badge variant={news.category === "Tributário" ? "destructive" : "secondary"} className="text-[10px] h-5">
                                    <Hash className="w-2.5 h-2.5 mr-1" />
                                    {news.category}
                                </Badge>
                                {news.urgent && (
                                    <Badge variant="outline" className="text-[10px] h-5 text-amber-500 border-amber-500/30 bg-amber-500/10">
                                        <ShieldAlert className="w-2.5 h-2.5 mr-1" />
                                        Urgente
                                    </Badge>
                                )}
                            </div>
                            <h3 className="text-sm font-bold leading-tight group-hover:text-primary transition-colors line-clamp-2">
                                {news.title}
                            </h3>
                        </CardHeader>
                        <CardContent className="pt-0 p-4 pb-2">
                            <p className="text-xs text-foreground/80 line-clamp-2">
                                {news.content}
                            </p>
                        </CardContent>
                        <CardFooter className="flex justify-between items-center p-4 pt-2 border-t border-white/5">
                            <div className="flex flex-col space-y-0.5">
                                <span className="text-[10px] font-semibold text-muted-foreground">
                                    {news.source}
                                </span>
                                <div className="flex items-center text-[10px] text-muted-foreground/70">
                                    <Clock className="w-3 h-3 mr-1" />
                                    {news.time}
                                </div>
                            </div>
                        </CardFooter>
                    </Card>
                ))}
            </div>
        </div>
    );
}
