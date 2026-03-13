import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/shared/lib/utils";

interface PageHeaderProps {
    title: string;
    subtitle?: string;
    icon?: LucideIcon;
    actions?: ReactNode;
    className?: string;
    gradient?: string;
}

export function PageHeader({
    title,
    subtitle,
    icon: Icon,
    actions,
    className,
    gradient = "from-primary to-primary/80"
}: PageHeaderProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className={cn(
                "relative overflow-hidden rounded-2xl bg-gradient-to-br p-7 shadow-lg shadow-primary/5",
                gradient,
                className
            )}
        >
            {/* Decorative glass elements */}
            <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/5 blur-2xl" />
            <div className="absolute -right-4 top-12 h-24 w-24 rounded-full bg-white/5 blur-xl" />
            <div className="absolute right-20 -bottom-6 h-32 w-32 rounded-full bg-white/[0.03] blur-3xl" />

            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                    {Icon && (
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md ring-1 ring-white/20 shadow-inner">
                            <Icon className="h-7 w-7 text-primary-foreground" />
                        </div>
                    )}
                    <div>
                        <h1 className="text-2xl font-bold text-primary-foreground tracking-tight md:text-3xl">
                            {title}
                        </h1>
                        {subtitle && (
                            <p className="text-sm text-primary-foreground/70 mt-1 font-medium max-w-md">
                                {subtitle}
                            </p>
                        )}
                    </div>
                </div>

                {actions && (
                    <div className="flex items-center gap-3 shrink-0 animate-in fade-in slide-in-from-right-4 duration-500">
                        {actions}
                    </div>
                )}
            </div>
        </motion.div>
    );
}
