"use client";

import { format } from "date-fns";
import { ptBR, enUS, es } from "date-fns/locale";
import { CalendarDays } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { useTranslation } from "react-i18next";

const localeMap: Record<string, any> = {
    "pt-BR": ptBR,
    en: enUS,
    es: es,
};

export function MeuDiaBanner() {
    const { user } = useUser();
    const { t, i18n } = useTranslation();
    const displayName = user?.firstName || "Advogado";
    const today = new Date();
    const hour = today.getHours();

    const currentLocale = localeMap[i18n.language] || ptBR;

    const greetingKey =
        hour < 12 ? "dashboard.greeting" : hour < 18 ? "dashboard.greetingAfternoon" : "dashboard.greetingEvening";

    return (
        <div className="w-full rounded-xl border border-border bg-card px-7 py-5 flex items-center justify-between gap-4">
            <div>
                <h2 className="text-lg font-bold text-foreground tracking-tight">
                    {t(greetingKey)}, <span className="text-primary">{displayName}</span>
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                    {t("dashboard.officeSummary")}
                </p>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground text-sm shrink-0">
                <CalendarDays className="h-4 w-4" />
                <span className="font-medium capitalize">
                    {format(today, t("common.dateFormat"), { locale: currentLocale })}
                </span>
            </div>
        </div>
    );
}
