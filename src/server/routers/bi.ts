import { TRPCError } from "@trpc/server";
import { createTRPCRouter, tenantProcedure } from "../trpc";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

export const biRouter = createTRPCRouter({
    getDashboardStats: tenantProcedure.query(async ({ ctx }) => {
        const { tenantId, db } = ctx;

        const [
            { data: processos },
            { data: clientes },
            { data: receitas },
            { data: despesas },
            { data: eventos },
            { count: docCount },
        ] = await Promise.all([
            db.from("processos_juridicos").select("*").eq("organization_id", tenantId as any),
            db.from("clientes").select("id").eq("organization_id", tenantId as any),
            db.from("contas_receber").select("*").eq("organization_id", tenantId as any),
            db.from("contas_pagar").select("*").eq("organization_id", tenantId as any),
            db.from("eventos_agenda").select("*").eq("organization_id", tenantId as any),
            db.from("documentos").select("*", { count: "exact", head: true }).eq("organization_id", tenantId as any),
        ]);

        const procs = processos || [];
        const recs = receitas || [];
        const desps = despesas || [];
        const evts = eventos || [];
        const today = new Date();

        // Processos por status
        const statusMap: Record<string, number> = {};
        procs.forEach((p: any) => { const s = p.status || "ativo"; statusMap[s] = (statusMap[s] || 0) + 1; });
        const statusLabels: Record<string, string> = { ativo: "Ativo", arquivado: "Arquivado", suspenso: "Suspenso", encerrado: "Encerrado" };
        const processosPorStatus = Object.entries(statusMap).map(([k, v]) => ({ name: statusLabels[k] || k, value: v }));

        // Receitas por categoria
        const recCatMap: Record<string, number> = {};
        recs.forEach((r: any) => { const c = r.category || "Honorários"; recCatMap[c] = (recCatMap[c] || 0) + Number(r.amount); });
        const receitasPorCategoria = Object.entries(recCatMap).map(([k, v]) => ({ name: k, value: v }));

        // Despesas por categoria
        const despCatMap: Record<string, number> = {};
        desps.forEach((d: any) => { const c = d.category || "Operacional"; despCatMap[c] = (despCatMap[c] || 0) + Number(d.amount); });
        const despesasPorCategoria = Object.entries(despCatMap).map(([k, v]) => ({ name: k, value: v }));

        // Monthly data (12 months)
        const monthlyData: any[] = [];
        for (let i = 11; i >= 0; i--) {
            const d = subMonths(today, i);
            const mStart = startOfMonth(d);
            const mEnd = endOfMonth(d);
            const monthLabel = format(d, "MMM", { locale: ptBR });
            const monthFull = format(d, "MMMM/yy", { locale: ptBR });

            const monthRecs = recs.filter((r: any) => { const dd = new Date(r.due_date); return dd >= mStart && dd <= mEnd; });
            const monthDesps = desps.filter((r: any) => { const dd = new Date(r.due_date); return dd >= mStart && dd <= mEnd; });

            const receita = monthRecs.reduce((s: number, r: any) => s + Number(r.amount), 0);
            const despesa = monthDesps.reduce((s: number, r: any) => s + Number(r.amount), 0);
            const honorarios = monthRecs.filter((r: any) => (r.category || "").toLowerCase().includes("honor")).reduce((s: number, r: any) => s + Number(r.amount), 0);
            const honorariosPagos = monthRecs.filter((r: any) => (r.category || "").toLowerCase().includes("honor") && r.status === "pago").reduce((s: number, r: any) => s + Number(r.amount), 0);
            const honorariosPendentes = honorarios - honorariosPagos;

            monthlyData.push({
                month: monthLabel,
                monthFull,
                receita,
                despesa,
                lucro: receita - despesa,
                honorarios,
                honorariosPagos,
                honorariosPendentes,
                custoFixo: monthDesps.filter((d: any) => (d.category || "").toLowerCase().includes("fix")).reduce((s: number, r: any) => s + Number(r.amount), 0),
                custoVariavel: monthDesps.filter((d: any) => !(d.category || "").toLowerCase().includes("fix")).reduce((s: number, r: any) => s + Number(r.amount), 0),
            });
        }

        // Eventos por categoria
        const catMap: Record<string, number> = {};
        const catLabels: Record<string, string> = { audiencia: "Audiência", reuniao: "Reunião", prazo: "Prazo", compromisso: "Compromisso", lembrete: "Lembrete" };
        evts.forEach((e: any) => { const c = e.category || "compromisso"; catMap[c] = (catMap[c] || 0) + 1; });
        const eventosPorCategoria = Object.entries(catMap).map(([k, v]) => ({ name: catLabels[k] || k, value: v }));

        // Processos novos/encerrados por mês
        const processosRecentes: { month: string; novos: number; encerrados: number }[] = [];
        for (let i = 11; i >= 0; i--) {
            const d = subMonths(today, i);
            const mStart = startOfMonth(d);
            const mEnd = endOfMonth(d);
            const monthLabel = format(d, "MMM", { locale: ptBR });
            const novos = procs.filter((p: any) => { const dd = new Date(p.created_at); return dd >= mStart && dd <= mEnd; }).length;
            const encerrados = procs.filter((p: any) => { if (p.status !== "encerrado") return false; const dd = new Date(p.updated_at); return dd >= mStart && dd <= mEnd; }).length;
            processosRecentes.push({ month: monthLabel, novos, encerrados });
        }

        const totalReceitas = recs.reduce((s: number, r: any) => s + Number(r.amount), 0);
        const totalReceitasPagas = recs.filter((r: any) => r.status === "pago").reduce((s: number, r: any) => s + Number(r.amount), 0);
        const totalReceitasPendentes = recs.filter((r: any) => r.status === "pendente").reduce((s: number, r: any) => s + Number(r.amount), 0);
        const totalReceitasAtrasadas = recs.filter((r: any) => r.status === "pendente" && new Date(r.due_date) < today).reduce((s: number, r: any) => s + Number(r.amount), 0);
        const totalDespesas = desps.reduce((s: number, r: any) => s + Number(r.amount), 0);
        const totalDespesasPagas = desps.filter((r: any) => r.status === "pago").reduce((s: number, r: any) => s + Number(r.amount), 0);
        const totalDespesasPendentes = desps.filter((r: any) => r.status === "pendente").reduce((s: number, r: any) => s + Number(r.amount), 0);
        const totalDespesasAtrasadas = desps.filter((r: any) => r.status === "pendente" && new Date(r.due_date) < today).reduce((s: number, r: any) => s + Number(r.amount), 0);

        const processosComValor = procs.filter((p: any) => p.estimated_value && Number(p.estimated_value) > 0);
        const ticketMedioProcesso = processosComValor.length > 0 ? processosComValor.reduce((s: number, p: any) => s + Number(p.estimated_value || 0), 0) / processosComValor.length : 0;
        const valorEstimadoCarteira = procs.filter((p: any) => p.status === "ativo").reduce((s: number, p: any) => s + Number(p.estimated_value || 0), 0);

        return {
            totalProcessos: procs.length,
            processosAtivos: procs.filter((p: any) => p.status === "ativo").length,
            processosEncerrados: procs.filter((p: any) => p.status === "encerrado").length,
            processosSuspensos: procs.filter((p: any) => p.status === "suspenso").length,
            totalClientes: (clientes || []).length,
            totalReceitas, totalReceitasPagas, totalReceitasPendentes, totalReceitasAtrasadas,
            totalDespesas, totalDespesasPagas, totalDespesasPendentes, totalDespesasAtrasadas,
            totalEventos: evts.length,
            totalDocumentos: docCount || 0,
            processosPorStatus, monthlyData, eventosPorCategoria, processosRecentes,
            receitasPorCategoria, despesasPorCategoria,
            ticketMedioProcesso, valorEstimadoCarteira,
        };
    }),
});
