import { useMemo } from "react";
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
        <Card className="bg-card border-border/40 overflow-hidden rounded-xl h-full flex flex-col">
            <CardHeader className="p-5 pb-0 border-b-0 bg-transparent flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                    {t("dashboard.productivity")}
                </CardTitle>
                {progressPct >= 100 && <Badge variant="default" className="bg-amber-500 text-amber-950 hover:bg-amber-500">Meta Atingida</Badge>}
            </CardHeader>
            <CardContent className="p-5 flex-1 flex flex-col space-y-6">
                <div className="space-y-2 mt-2">
                    <div className="flex items-end justify-between">
                        <div className="text-3xl font-bold tracking-tight text-foreground">
                            {totalHoursToday}<span className="text-xl text-muted-foreground font-medium mx-0.5">h</span>
                            {totalMinsRemainder}<span className="text-xl text-muted-foreground font-medium ml-0.5">m</span>
                        </div>
                        <div className="text-xs font-medium text-muted-foreground uppercase tracking-widest">{progressPct}% de 8h</div>
                    </div>
                    <Progress value={progressPct} className="h-2 w-full bg-muted" indicatorClassName={progressPct >= 100 ? "bg-amber-500" : "bg-primary"} />
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/30">
                    <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Entradas</p>
                        <p className="text-lg font-bold text-foreground">{timesheetToday?.entries ?? 0}</p>
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Faturável</p>
                        <p className="text-lg font-bold text-emerald-600">{timesheetToday ? Math.floor(timesheetToday.billable / 60) : 0}h</p>
                    </div>
                </div>

                <Button variant="outline" className="w-full mt-auto text-sm font-medium hover:bg-muted" onClick={() => navigate.push("/dashboard/timesheet")}>
                    {t("dashboard.openTimesheet")}
                </Button>
            </CardContent>
        </Card>
    );
}
