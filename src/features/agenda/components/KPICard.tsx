import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KPICardProps {
    label: string;
    value: string | number;
    sub?: string;
    icon: any;
    color: string;
}

export function KPICard({ label, value, sub, icon: Icon, color }: KPICardProps) {
    return (
        <Card className="glass-card border-border/40 shadow-sm hover:translate-y-[-2px] transition-all duration-300">
            <CardContent className="p-4 flex gap-4 items-center">
                <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br shadow-sm ring-1 ring-white/20", color)}>
                    <Icon className="h-5 w-5 text-foreground" />
                </div>
                <div>
                    <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground/70 mb-0.5">{label}</p>
                    <div className="flex items-baseline gap-2">
                        <h3 className="text-2xl font-bold text-foreground tracking-tight">{value}</h3>
                        {sub && <span className="text-[10px] font-medium text-muted-foreground/60">{sub}</span>}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
