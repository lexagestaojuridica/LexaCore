"use client";

import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/shared/lib/utils";

interface StatsCardProps {
    title: string;
    value: string | number;
    subValue?: string;
    icon: LucideIcon;
    iconClassName?: string;
    className?: string;
    trend?: {
        value: string;
        direction: "up" | "down" | "neutral";
    };
}

export function StatsCard({
    title,
    value,
    subValue,
    icon: Icon,
    iconClassName,
    className,
    trend,
}: StatsCardProps) {
    const TrendIcon =
        trend?.direction === "up"
            ? TrendingUp
            : trend?.direction === "down"
                ? TrendingDown
                : Minus;

    const trendColor =
        trend?.direction === "up"
            ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400"
            : trend?.direction === "down"
                ? "text-rose-600 bg-rose-50 dark:bg-rose-500/10 dark:text-rose-400"
                : "text-slate-500 bg-slate-100 dark:bg-slate-700 dark:text-slate-400";

    return (
        <div className={cn(
            "bg-card rounded-xl border border-border p-5 flex flex-col justify-between h-full transition-shadow hover:shadow-md",
            className
        )}>
            <div className="flex items-start justify-between mb-4">
                <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                    iconClassName ?? "bg-primary/10 text-primary"
                )}>
                    <Icon className="w-5 h-5" />
                </div>
                {trend && (
                    <span className={cn(
                        "inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full",
                        trendColor
                    )}>
                        <TrendIcon className="w-3 h-3" />
                        {trend.value}
                    </span>
                )}
            </div>
            <div>
                <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground block mb-1">
                    {title}
                </span>
                <span className="text-2xl font-bold text-foreground tracking-tight block">
                    {value}
                </span>
                {subValue && (
                    <span className="text-xs text-muted-foreground mt-1 block">
                        {subValue}
                    </span>
                )}
            </div>
        </div>
    );
}
