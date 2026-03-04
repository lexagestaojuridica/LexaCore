import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
    icon: LucideIcon;
    label: string;
    value: string | number;
    color?: "blue" | "purple" | "amber" | "emerald" | "default";
    className?: string;
    description?: string;
}

export function StatCard({
    icon: Icon,
    label,
    value,
    color = "default",
    className,
    description,
}: StatCardProps) {
    const colorVariants = {
        blue: "bg-blue-500/10 text-blue-600",
        purple: "bg-purple-500/10 text-purple-600",
        amber: "bg-amber-500/10 text-amber-600",
        emerald: "bg-emerald-500/10 text-emerald-600",
        default: "bg-primary/10 text-primary",
    };

    return (
        <Card className={cn("border-border/50 shadow-sm", className)}>
            <CardContent className="p-4 flex gap-4 items-center">
                <div className={cn("p-3 rounded-lg", colorVariants[color])}>
                    <Icon className="h-5 w-5" />
                </div>
                <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase">{label}</p>
                    <p className="text-xl font-bold">{value}</p>
                    {description && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">{description}</p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
