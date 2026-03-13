import { cn } from "@/shared/lib/utils";

type SkeletonProps = React.HTMLAttributes<HTMLDivElement>;

export function Skeleton({ className, ...props }: SkeletonProps) {
    return (
        <div
            className={cn("animate-pulse rounded-md bg-muted/50", className)}
            {...props}
        />
    );
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
    return (
        <div className="w-full space-y-4">
            <div className="flex items-center space-x-4">
                <Skeleton className="h-10 w-full" />
            </div>
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                    {Array.from({ length: cols }).map((_, j) => (
                        <Skeleton key={j} className="h-12 w-full" />
                    ))}
                </div>
            ))}
        </div>
    );
}

export function CardSkeleton() {
    return (
        <div className="rounded-xl border border-border/50 bg-card p-4 space-y-3">
            <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-1/2" />
                </div>
            </div>
            <Skeleton className="h-20 w-full" />
        </div>
    );
}

export function KPISkeleton() {
    return (
        <div className="flex items-center gap-3 bg-card border border-border/50 rounded-xl p-3.5">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="space-y-2 flex-1">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-5 w-12" />
            </div>
        </div>
    );
}
