import { createTRPCReact } from "@trpc/react-query";
import { type AppRouter } from "@/server/routers";

/**
 * Cliente React para o tRPC (Hooks).
 */
export const trpc = createTRPCReact<AppRouter>();
