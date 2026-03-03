import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
    icon: LucideIcon;
    title: string;
    description: string;
    action?: ReactNode;
    className?: string;
    compact?: boolean;
}

export function EmptyState({
    icon: Icon,
    title,
    description,
    action,
    className,
    compact = false,
}: EmptyStateProps) {
    return (
        <div
            className={cn(
                "flex flex-col items-center justify-center rounded-xl border border-dashed border-border/50 bg-card/30 text-center animate-in fade-in-50",
                compact ? "p-6" : "p-8 md:p-12",
                className
            )}
        >
            <div
                className={cn(
                    "mb-4 flex items-center justify-center rounded-full bg-muted/50 ring-1 ring-border/50 backdrop-blur-sm",
                    compact ? "h-12 w-12" : "h-16 w-16"
                )}
            >
                <Icon className={cn("text-muted-foreground/60", compact ? "h-5 w-5" : "h-8 w-8")} />
            </div>

            <h3 className={cn("font-semibold text-foreground", compact ? "text-sm" : "text-lg")}>
                {title}
            </h3>

            <p
                className={cn(
                    "mt-1.5 text-muted-foreground",
                    compact ? "text-xs max-w-[200px]" : "text-sm max-w-sm"
                )}
            >
                {description}
            </p>

            {action && <div className={cn("mt-6", compact ? "mt-4" : "")}>{action}</div>}
        </div>
    );
}
