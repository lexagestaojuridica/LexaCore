import { createTRPCRouter, publicProcedure } from "../trpc";
import { processoRouter } from "./processo";
import { clienteRouter } from "./cliente";
import { documentoRouter } from "./documento";
import { financeiroRouter } from "./financeiro";
import { meuDiaRouter } from "./meuDia";
import { crmRouter } from "./crm";
import { agendaRouter } from "./agenda";
import { workflowRouter } from "./workflow";
import { timesheetRouter } from "./timesheet";
import { rhRouter } from "./rh";
import { iaRouter } from "./ia";
import { minutasRouter } from "./minutas";

/**
 * Roteador Raiz do tRPC.
 * Agrega todos os sub-routers da aplicação.
 */
export const appRouter = createTRPCRouter({
    healthcheck: publicProcedure.query(() => {
        return {
            status: "ok",
            timestamp: Date.now(),
            service: "LEXANOVA Backend (Node.js)",
        };
    }),
    processo: processoRouter,
    cliente: clienteRouter,
    documento: documentoRouter,
    financeiro: financeiroRouter,
    meuDia: meuDiaRouter,
    crm: crmRouter,
    agenda: agendaRouter,
    workflow: workflowRouter,
    timesheet: timesheetRouter,
    rh: rhRouter,
    ia: iaRouter,
    minutas: minutasRouter,
});

export type AppRouter = typeof appRouter;
