import { z } from "zod";
import { createTRPCRouter, tenantProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

export const rhRouter = createTRPCRouter({
    listColaboradores: tenantProcedure.query(async ({ ctx }) => {
        const { tenantId, db } = ctx;
        const { data, error } = await db
            .from("employees")
            .select("*")
            .eq("organization_id", tenantId as any)
            .eq("status", "active" as any) as any;

        if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao buscar colaboradores" });
        return data || [];
    }),

    getDashboardStats: tenantProcedure.query(async ({ ctx }) => {
        const { tenantId, db } = ctx;
        const { data, error } = await db
            .from("employees")
            .select("*")
            .eq("organization_id", tenantId as any) as any;

        if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao carregar estatísticas de RH" });

        const active = data?.filter((e: any) => e.status === 'active').length || 0;
        const onLeave = data?.filter((e: any) => e.status === 'on_leave').length || 0;
        const terminated = data?.filter((e: any) => e.status === 'terminated').length || 0;
        const total = active + onLeave;

        // Group by department
        const deptMap: Record<string, number> = {};
        data?.forEach((e: any) => {
            const dept = e.department || "Geral";
            deptMap[dept] = (deptMap[dept] || 0) + 1;
        });
        const deptData = Object.entries(deptMap).map(([name, value]) => ({ name, value }));

        // Monthly trends (Admission)
        const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
        const year = new Date().getFullYear();
        const monthlyMap: Record<string, { admission: number; termination: number }> = {};
        months.forEach((m) => { monthlyMap[m] = { admission: 0, termination: 0 }; });

        data?.forEach((e: any) => {
            if (e.admission_date) {
                const d = new Date(e.admission_date);
                if (d.getFullYear() === year) {
                    const m = months[d.getMonth()];
                    monthlyMap[m].admission += 1;
                }
            }
        });
        const monthlyData = months.slice(0, new Date().getMonth() + 1).map(m => ({ month: m, ...monthlyMap[m] }));

        const totalPayroll = data?.filter((e: any) => e.status === 'active').reduce((acc: number, curr: any) => acc + (Number(curr.base_salary) || 0), 0) || 0;

        return {
            total,
            active,
            onLeave,
            terminated,
            deptData,
            monthlyData,
            totalPayroll
        };
    }),
});
