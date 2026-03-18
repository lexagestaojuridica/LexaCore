import { z } from "zod";
import { createTRPCRouter, tenantProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

export const unidadesRouter = createTRPCRouter({
    list: tenantProcedure.query(async ({ ctx }) => {
        const { db, tenantId } = ctx;
        const { data, error } = await db
            .from("unidades")
            .select("*")
            .eq("organization_id", tenantId)
            .order("is_headquarters", { ascending: false })
            .order("name");

        if (error) {
            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: error.message,
            });
        }
        return data;
    }),

    create: tenantProcedure
        .input(
            z.object({
                name: z.string().min(1),
                slug: z.string().min(1),
                address: z.string().nullable().optional(),
                city: z.string().nullable().optional(),
                state: z.string().nullable().optional(),
                phone: z.string().nullable().optional(),
                email: z.string().nullable().optional(),
                is_headquarters: z.boolean().default(false),
                is_active: z.boolean().default(true),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const { db, tenantId } = ctx;
            const { error } = await db.from("unidades").insert({
                ...input,
                organization_id: tenantId,
            });

            if (error) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: error.message,
                });
            }
            return { success: true };
        }),

    update: tenantProcedure
        .input(
            z.object({
                id: z.string().uuid(),
                name: z.string().min(1).optional(),
                slug: z.string().min(1).optional(),
                address: z.string().nullable().optional(),
                city: z.string().nullable().optional(),
                state: z.string().nullable().optional(),
                phone: z.string().nullable().optional(),
                email: z.string().nullable().optional(),
                is_headquarters: z.boolean().optional(),
                is_active: z.boolean().optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const { db, tenantId } = ctx;
            const { id, ...updateData } = input;

            const { error } = await db
                .from("unidades")
                .update(updateData)
                .eq("id", id)
                .eq("organization_id", tenantId);

            if (error) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: error.message,
                });
            }
            return { success: true };
        }),

    delete: tenantProcedure
        .input(z.string().uuid())
        .mutation(async ({ ctx, input: id }) => {
            const { db, tenantId } = ctx;
            const { error } = await db
                .from("unidades")
                .delete()
                .eq("id", id)
                .eq("organization_id", tenantId);

            if (error) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: error.message,
                });
            }
            return { success: true };
        }),
});
