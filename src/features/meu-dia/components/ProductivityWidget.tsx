"use client";

import { useMemo } from "react";
import { cn } from "@/shared/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Progress } from "@/shared/ui/progress";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import type { TimesheetSummary } from "../types";

interface ProductivityWidgetProps {
    timesheetToday: TimesheetSummary | undefined;
}

export function ProductivityWidget({ timesheetToday }: ProductivityWidgetProps) {
    const navigate = useRouter();
    const { t } = useTranslation();

    const { totalHoursToday, totalMinsRemainder, progressPct } = useMemo(() => {
        const totalHoursToday = timesheetToday ? Math.floor(timesheetToday.totalMins / 60) : 0;
        const totalMinsRemainder = timesheetToday ? timesheetToday.totalMins % 60 : 0;
        const targetDailyMinutes = 8 * 60;
        const progressPct = timesheetToday ? Math.min(100, Math.round((timesheetToday.totalMins / targetDailyMinutes) * 100)) : 0;
        return { totalHoursToday, totalMinsRemainder, progressPct };
    }, [timesheetToday]);

    return (
        <Card className="bg-card/50 backdrop-blur-sm border-border/40 overflow-hidden rounded-xl h-full flex flex-col shadow-sm">
            <CardHeader className="p-5 pb-2 border-b-0 bg-transparent flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                    {t("dashboard.productivity")}
                </CardTitle>
                <Badge variant="outline" className="text-[10px] border-primary/20 bg-primary/5 text-primary">Aruna Insights</Badge>
            </CardHeader>
            <CardContent className="p-5 flex-1 flex flex-col space-y-6">
                <div className="space-y-3 mt-1">
                    <div className="flex items-end justify-between">
                        <div className="text-4xl font-black tracking-tighter text-foreground font-display">
                            {totalHoursToday}<span className="text-lg text-muted-foreground font-bold mx-0.5">h</span>
                            {totalMinsRemainder}<span className="text-lg text-muted-foreground font-bold ml-0.5">m</span>
                        </div>
                        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-muted/30 px-2 py-1 rounded-md">{progressPct}% META</div>
                    </div>
                    <div className="relative h-2 w-full bg-muted/50 rounded-full overflow-hidden">
                        <div
                            className={cn("absolute inset-0 transition-all duration-1000 ease-out", progressPct >= 100 ? "bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.4)]" : "bg-primary shadow-[0_0_12px_rgba(var(--primary),0.3)]")}
                            style={{ width: `${progressPct}%` }}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-6 border-t border-border/20">
                    <div className="space-y-1">
                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Entradas</p>
                        <p className="text-xl font-bold text-foreground font-display">{timesheetToday?.entries ?? 0}</p>
                    </div>
                    <div className="space-y-1 pl-3 border-l border-border/20">
                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Faturável</p>
                        <p className="text-xl font-bold text-emerald-500 font-display">{timesheetToday ? Math.floor(timesheetToday.billable / 60) : 0}h</p>
                    </div>
                </div>

                <div className="flex-1 min-h-[40px]" />

                <Button variant="outline" className="w-full h-9 text-[11px] font-bold uppercase tracking-widest border-border/60 hover:bg-primary/5 hover:text-primary transition-all rounded-lg" onClick={() => navigate.push("/dashboard/timesheet")}>
                    {t("dashboard.openTimesheet")}
                </Button>
            </CardContent>
        </Card>
    );
}
