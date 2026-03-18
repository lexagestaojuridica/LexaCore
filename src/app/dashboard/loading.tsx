"use client";

import { Loader2 } from "lucide-react";

export default function DashboardLoading() {
    return (
        <div className="flex h-[70vh] w-full flex-col items-center justify-center space-y-4 animate-in fade-in duration-500">
            <div className="relative flex items-center justify-center">
                {/* Outer glow ring */}
                <div className="absolute h-16 w-16 rounded-full bg-primary/20 blur-xl animate-pulse-glow" />

                {/* Core spinner */}
                <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-black/20 backdrop-blur-sm shadow-xl">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </div>

            <div className="flex flex-col items-center space-y-1">
                <h3 className="text-lg font-medium text-foreground tracking-tight">
                    Sincronizando...
                </h3>
                <p className="text-sm text-muted-foreground animate-pulse">
                    Preparando os dados, um momento.
                </p>
            </div>
        </div>
    );
}
