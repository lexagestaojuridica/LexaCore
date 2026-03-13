import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/shared/ui/card";
import { cn } from "@/shared/lib/utils";
import { motion } from "framer-motion";

interface StatCardProps {
    icon: LucideIcon;
    label: string;
    value: string | number;
    color?: "blue" | "purple" | "amber" | "emerald" | "rose" | "violet" | "default";
    trend?: {
        value: string;
        positive: boolean;
    };
    className?: string;
    index?: number;
}

export function StatCard({
    icon: Icon,
    label,
    value,
    color = "default",
    className,
    trend,
    index = 0,
}: StatCardProps) {
    const colorStyles = {
        blue: "bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-800/50",
        purple: "bg-purple-500/10 text-purple-600 border-purple-200 dark:border-purple-800/50",
        amber: "bg-amber-500/10 text-amber-600 border-amber-200 dark:border-amber-800/50",
        emerald: "bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-800/50",
        rose: "bg-rose-500/10 text-rose-600 border-rose-200 dark:border-rose-800/50",
        violet: "bg-violet-500/10 text-violet-600 border-violet-200 dark:border-violet-800/50",
        default: "bg-slate-500/10 text-slate-600 border-slate-200 dark:border-slate-800/50",
    }[color];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
            whileHover={{ y: -4 }}
            className="h-full"
        >
            <Card className={cn("border-border/50 shadow-sm hover:shadow-md transition-all duration-300 h-full", className)}>
                <CardContent className="p-4 flex gap-4 items-center h-full">
                    <div className={cn("p-3 rounded-lg shrink-0", colorStyles)}>
                        <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{label}</p>
                        <div className="flex items-end justify-between gap-2">
                            <p className="text-xl font-bold tracking-tight">{value}</p>
                            {trend && (
                                <div className={cn("text-[10px] font-bold flex items-center gap-0.5 mb-0.5", trend.positive ? "text-emerald-500" : "text-rose-500")}>
                                    {trend.positive ? "↑" : "↓"} {trend.value}
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}
