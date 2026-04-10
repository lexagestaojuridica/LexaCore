"use client";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDays } from "lucide-react";
import { useUser } from "@clerk/nextjs";

export function MeuDiaBanner() {
    const { user } = useUser();
    const displayName = user?.firstName || "Advogado";
    const today = new Date();
    const hour = today.getHours();
    const greeting =
        hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";

    return (
        <div className="w-full rounded-xl border border-border bg-card px-7 py-5 flex items-center justify-between gap-4">
            <div>
                <h2 className="text-lg font-bold text-foreground tracking-tight">
                    {greeting}, <span className="text-primary">{displayName}</span>
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                    Aqui está um resumo do seu escritório hoje.
                </p>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground text-sm shrink-0">
                <CalendarDays className="h-4 w-4" />
                <span className="font-medium capitalize">
                    {format(today, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </span>
            </div>
        </div>
    );
}
