import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import { type Context } from "./context";

/**
 * Inicialização do tRPC v11.
 */
const t = initTRPC.context<Context>().create({
    transformer: superjson,
    errorFormatter({ shape, error }) {
        return {
            ...shape,
            data: {
                ...shape.data,
                zodError:
                    error.cause instanceof ZodError ? error.cause.flatten() : null,
            },
        };
    },
});

/**
 * 1. Procedimento Público (Sem necessidade de Auth)
 */
export const publicProcedure = t.procedure;

/**
 * 2. Middleware de Autenticação
 */
const isAuthed = t.middleware(({ ctx, next }) => {
    if (!ctx.userId) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Necessário login." });
    }
    return next({
        ctx: {
            auth: ctx.auth,
            userId: ctx.userId,
        },
    });
});

/**
 * 3. Middleware de Tenant (Multitenancy)
 * Garante que o usuário pertence a uma organização (tenant).
 */
const isTenant = isAuthed.unstable_pipe(({ ctx, next }) => {
    if (!ctx.tenantId) {
        throw new TRPCError({
            code: "FORBIDDEN",
            message: "Usuário não está vinculado a uma organização (Tenant)."
        });
    }
    return next({
        ctx: {
            tenantId: ctx.tenantId,
        },
    });
});

/**
 * Procedimentos exportados
 */
export const createTRPCRouter = t.router;
export const protectedProcedure = t.procedure.use(isAuthed);
export const tenantProcedure = t.procedure.use(isTenant);
