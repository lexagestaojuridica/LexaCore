import { z } from "zod";
import { createTRPCRouter, tenantProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

export const documentoRouter = createTRPCRouter({
    create: tenantProcedure
        .input(
            z.object({
                file_name: z.string(),
                file_path: z.string(),
                file_type: z.string().nullable(),
                client_id: z.string().optional(),
                process_id: z.string().optional(),
                size: z.number().optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const { tenantId, userId, db } = ctx;
            const { error, data } = await db
                .from("documentos")
                .insert({
                    ...input,
                    organization_id: tenantId,
                    user_id: userId,
                } as any)
                .select()
                .single();

            if (error) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Erro ao registrar documento",
                    cause: error,
                });
            }

            return data;
        }),

    requestSignature: tenantProcedure
        .input(
            z.object({
                document_id: z.string(),
                client_id: z.string(),
                signer_name: z.string(),
                signer_email: z.string(),
                signer_document: z.string().nullable(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const { tenantId, db } = ctx;
            const token = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
            const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

            const { error } = await db.from("document_signatures").insert({
                document_id: input.document_id,
                client_id: input.client_id,
                organization_id: tenantId,
                signer_name: input.signer_name,
                signer_email: input.signer_email,
                signer_document: input.signer_document,
                token,
                status: "pendente",
                expires_at: expiresAt,
            } as any);

            if (error) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Erro ao criar solicitação de assinatura",
                    cause: error,
                });
            }

            return { token };
        }),

    getSignedUrl: tenantProcedure
        .input(z.string()) // file_path
        .mutation(async ({ ctx, input: filePath }) => {
            const { db } = ctx;
            const { data, error } = await db.storage
                .from("documentos")
                .createSignedUrl(filePath, 3600);

            if (error) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Erro ao gerar link do documento",
                    cause: error,
                });
            }

            return { signedUrl: data.signedUrl };
        }),
});
