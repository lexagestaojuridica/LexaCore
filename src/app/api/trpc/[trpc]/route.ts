import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { type NextRequest } from "next/server";
import { appRouter } from "@/server/routers";
import { createTRPCContext } from "@/server/context";

/**
 * Handler HTTP para as requisições tRPC.
 * Roda no Runtime Node.js padrão.
 */
const handler = (req: NextRequest) =>
    fetchRequestHandler({
        endpoint: "/api/trpc",
        req,
        router: appRouter,
        createContext: () => createTRPCContext({ req }),
    });

export { handler as GET, handler as POST };
