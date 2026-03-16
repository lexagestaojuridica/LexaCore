import { z } from "zod";
import { createTRPCRouter, tenantProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

export const timesheetRouter = createTRPCRouter({
    listEntries: tenantProcedure.query(async ({ ctx }) => {
        const { tenantId, db } = ctx;
        const { data, error } = await db
            .from("timesheet_entries")
            .select("*")
            .eq("organization_id", tenantId as any)
            .order("started_at", { ascending: false }) as any;

        if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao buscar timesheet" });
        return data || [];
    }),

    listProcessos: tenantProcedure.query(async ({ ctx }) => {
        const { tenantId, db } = ctx;
        const { data, error } = await db
            .from("processos_juridicos")
            .select("id, title, number, client_id, clientes(id, name, asaas_customer_id)")
            .eq("organization_id", tenantId as any)
            .eq("status", "ativo" as any) as any;

        if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao buscar processos para timesheet" });
        return data || [];
    }),

    createEntry: tenantProcedure
        .input(z.any())
        .mutation(async ({ ctx, input }) => {
            const { tenantId, db, userId } = ctx;
            const { data, error } = await db
                .from("timesheet_entries")
                .insert({ ...input, organization_id: tenantId, user_id: userId })
                .select()
                .single() as any;

            if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao registrar entrada de timesheet" });
            return data;
        }),

    deleteEntry: tenantProcedure.input(z.string()).mutation(async ({ ctx, input }) => {
        const { tenantId, db } = ctx;
        const { error } = await db
            .from("timesheet_entries")
            .delete()
            .eq("id", input as any)
            .eq("organization_id", tenantId as any);

        if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao excluir entrada de timesheet" });
        return { success: true };
    }),

    // Billing logic from frontend moved to backend
    createBilling: tenantProcedure
        .input(z.object({
            entryId: z.string(),
            customerId: z.string().nullable(),
            clientId: z.string().nullable(),
            value: z.number(),
            description: z.string(),
            createOnlyLocal: z.boolean()
        }))
        .mutation(async ({ ctx, input }) => {
            const { tenantId, db, userId } = ctx;

            // Note: Since we are in Node.js, we can call Supabase Edge Functions via fetch
            // or even better, if we are porting AWAY from Edge, we should implement the 
            // 'billing-gateway' logic here. For now, we'll keep the proxy call to the function.

            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
            const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

            if (!supabaseUrl || !supabaseAnonKey) {
                throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Supabase config missing" });
            }

            const response = await fetch(`${supabaseUrl}/functions/v1/billing-gateway`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${supabaseAnonKey}`,
                    "x-client-info": "trpc-backend"
                },
                body: JSON.stringify({
                    action: "create-charge",
                    customerId: input.customerId,
                    clientId: input.clientId,
                    value: input.value,
                    description: input.description,
                    externalReference: input.entryId,
                    sourceType: "timesheet",
                    sourceId: input.entryId,
                    createOnlyLocal: input.createOnlyLocal,
                    organizationId: tenantId,
                    userId: userId
                })
            });

            const res = await response.json();
            if (res.error) throw new TRPCError({ code: "BAD_REQUEST", message: res.error });

            return res;
        }),
});
