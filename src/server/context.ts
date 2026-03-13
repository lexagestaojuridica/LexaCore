import { getAuth } from "@clerk/nextjs/server";
import { type NextRequest } from "next/server";
import { supabase } from "@/integrations/supabase/client";

/**
 * Cria o contexto para cada requisição tRPC.
 * Aqui extraímos o usuário autenticado do Clerk e preparamos o cliente do banco.
 */
export const createTRPCContext = async (opts: { req: NextRequest }) => {
    const auth = getAuth(opts.req);
    const { userId, orgId } = auth;

    return {
        db: supabase,
        auth,
        userId,
        tenantId: orgId, // O organizationId do Clerk é o nosso tenant_id
    };
};

export type Context = Awaited<ReturnType<typeof createTRPCContext>>;
