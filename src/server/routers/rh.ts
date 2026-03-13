import { z } from "zod";
import { createTRPCRouter, tenantProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

export const rhRouter = createTRPCRouter({
    listColaboradores: tenantProcedure.query(async ({ ctx }) => {
        const { tenantId, db } = ctx;
        const { data, error } = await db
            .from("rh_colaboradores")
            .select("*")
            .eq("organization_id", tenantId as any)
            .eq("status", "active" as any) as any;

        if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao buscar colaboradores" });
        return data || [];
    }),
});
