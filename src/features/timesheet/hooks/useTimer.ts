import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { db as supabase } from "@/integrations/supabase/db";
import { toast } from "sonner";

export function useTimer(orgId: string | undefined, userId: string | undefined) {
    const queryClient = useQueryClient();
    const [activeTimer, setActiveTimer] = useState<{
        processId: string | null;
        description: string;
        startedAt: Date;
        hourlyRate: string;
        isPaused: boolean;
        pausedElapsed: number;
    } | null>(null);
    const [timerDescription, setTimerDescription] = useState("");
    const [timerProcess, setTimerProcess] = useState("none");
    const [timerRate, setTimerRate] = useState("");
    const [elapsed, setElapsed] = useState(0);

    // Timer tick
    useEffect(() => {
        if (!activeTimer || activeTimer.isPaused) return;
        const interval = setInterval(() => {
            const rawElapsed = Math.floor((Date.now() - activeTimer.startedAt.getTime()) / 1000);
            setElapsed(rawElapsed + activeTimer.pausedElapsed);
        }, 1000);
        return () => clearInterval(interval);
    }, [activeTimer]);

    const logTimerAction = async (entryId: string, action: string) => {
        const { error } = await supabase.from("timesheet_timer_logs").insert({
            timesheet_entry_id: entryId,
            action,
            logged_at: new Date().toISOString(),
        });
        if (error) {
            console.error("Erro ao logar ação do timer:", error);
        }
    };

    const startTimer = () => {
        if (!timerDescription.trim()) { toast.error("Descreva a atividade"); return; }
        setActiveTimer({
            processId: timerProcess === "none" ? null : timerProcess,
            description: timerDescription,
            startedAt: new Date(),
            hourlyRate: timerRate,
            isPaused: false,
            pausedElapsed: 0,
        });
        setElapsed(0);
        toast.success("Timer iniciado!");
    };

    const pauseTimer = () => {
        if (!activeTimer || activeTimer.isPaused) return;
        setActiveTimer({ ...activeTimer, isPaused: true, pausedElapsed: elapsed });
        toast("Timer pausado", { icon: "⏸️" });
    };

    const resumeTimer = () => {
        if (!activeTimer || !activeTimer.isPaused) return;
        setActiveTimer({
            ...activeTimer,
            isPaused: false,
            startedAt: new Date(),
        });
        toast("Timer retomado", { icon: "▶️" });
    };

    const stopTimer = async () => {
        if (!activeTimer || !orgId || !userId) return;
        const endedAt = new Date();
        const durationMinutes = Math.max(1, Math.floor(elapsed / 60));

        const startedIso = new Date(endedAt.getTime() - elapsed * 1000).toISOString();

        const { data: inserted, error } = await supabase.from("timesheet_entries").insert({
            organization_id: orgId,
            user_id: userId,
            process_id: activeTimer.processId,
            description: activeTimer.description,
            started_at: startedIso,
            ended_at: endedAt.toISOString(),
            duration_minutes: durationMinutes,
            hourly_rate: activeTimer.hourlyRate ? Number(activeTimer.hourlyRate) : null,
            billing_status: "pendente",
        }).select("id").single();

        if (error) {
            toast.error(`Erro ao salvar: ${error.message}`);
            return;
        }

        if (inserted?.id) {
            await logTimerAction(inserted.id, "stop");
        }

        queryClient.invalidateQueries({ queryKey: ["timesheet"] });
        toast.success("Lançamento registrado!");

        setActiveTimer(null);
        setTimerDescription("");
        setTimerProcess("none");
        setTimerRate("");
        setElapsed(0);
    };

    return {
        activeTimer,
        timerDescription,
        setTimerDescription,
        timerProcess,
        setTimerProcess,
        timerRate,
        setTimerRate,
        elapsed,
        startTimer,
        pauseTimer,
        resumeTimer,
        stopTimer,
    };
}
