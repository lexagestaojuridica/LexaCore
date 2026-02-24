// Supabase Edge Function: daily-ai-routine
// Scheduled daily via pg_cron or external scheduler (e.g., Supabase Cron)
// Performs background AI tasks:
//   1. Contract expiration alerts (30-day window)
//   2. Leave request auto-reminders
//   3. Performance review cycle notifications
//   4. Stale recruitment pipeline cleanup
// Deploy: supabase functions deploy daily-ai-routine

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface TaskResult {
    task: string;
    processed: number;
    errors: string[];
}

// ─── Task 1: Contract Expiration Alerts ──────────────────────
async function checkExpiringContracts(): Promise<TaskResult> {
    const result: TaskResult = { task: "contract_expiration_alerts", processed: 0, errors: [] };

    try {
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

        const { data: contracts, error } = await supabase
            .from("hr_contracts")
            .select("id, employee_id, organization_id, end_date, contract_type")
            .eq("status", "active")
            .lte("end_date", thirtyDaysFromNow.toISOString().split("T")[0])
            .gte("end_date", new Date().toISOString().split("T")[0]);

        if (error) {
            result.errors.push(error.message);
            return result;
        }

        for (const contract of contracts || []) {
            // Create a notification for each expiring contract
            await supabase.from("notifications").insert({
                organization_id: contract.organization_id,
                title: "Contrato próximo do vencimento",
                message: `O contrato ${contract.contract_type} (ID: ${contract.id}) vence em ${contract.end_date}. Verifique a renovação.`,
                type: "warning",
                module: "rh",
                reference_id: contract.id,
                reference_type: "hr_contract",
            });
            result.processed++;
        }
    } catch (err) {
        result.errors.push(String(err));
    }

    return result;
}

// ─── Task 2: Leave Request Reminders ─────────────────────────
async function checkPendingLeaveRequests(): Promise<TaskResult> {
    const result: TaskResult = { task: "pending_leave_reminders", processed: 0, errors: [] };

    try {
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

        const { data: requests, error } = await supabase
            .from("hr_leave_requests")
            .select("id, employee_id, organization_id, leave_type, start_date")
            .eq("status", "pending")
            .lte("created_at", threeDaysAgo.toISOString());

        if (error) {
            result.errors.push(error.message);
            return result;
        }

        for (const req of requests || []) {
            await supabase.from("notifications").insert({
                organization_id: req.organization_id,
                title: "Solicitação de férias/licença pendente",
                message: `A solicitação de ${req.leave_type} para ${req.start_date} está pendente há mais de 3 dias.`,
                type: "info",
                module: "rh",
                reference_id: req.id,
                reference_type: "hr_leave_request",
            });
            result.processed++;
        }
    } catch (err) {
        result.errors.push(String(err));
    }

    return result;
}

// ─── Task 3: Stale Recruitment Pipeline Cleanup ──────────────
async function cleanStaleCandidates(): Promise<TaskResult> {
    const result: TaskResult = { task: "stale_candidates_cleanup", processed: 0, errors: [] };

    try {
        const sixtyDaysAgo = new Date();
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

        // Archive candidates stuck in early stages for 60+ days
        const { data: stale, error } = await supabase
            .from("hr_candidates")
            .select("id, organization_id, full_name, status")
            .in("status", ["new", "screening"])
            .lte("updated_at", sixtyDaysAgo.toISOString());

        if (error) {
            result.errors.push(error.message);
            return result;
        }

        for (const candidate of stale || []) {
            await supabase
                .from("hr_candidates")
                .update({ status: "archived", notes: `Auto-arquivado por inatividade (60 dias sem movimentação). Status anterior: ${candidate.status}` })
                .eq("id", candidate.id);

            result.processed++;
        }
    } catch (err) {
        result.errors.push(String(err));
    }

    return result;
}

// ─── Main Handler ────────────────────────────────────────────
serve(async (req) => {
    try {
        // Optional: verify a shared secret for cron invocations
        const authHeader = req.headers.get("Authorization");
        const cronSecret = Deno.env.get("CRON_SECRET");
        if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
            return new Response("Unauthorized", { status: 401 });
        }

        console.log(`[daily-ai-routine] Starting at ${new Date().toISOString()}`);

        const results: TaskResult[] = await Promise.all([
            checkExpiringContracts(),
            checkPendingLeaveRequests(),
            cleanStaleCandidates(),
        ]);

        const summary = {
            executed_at: new Date().toISOString(),
            tasks: results,
            total_processed: results.reduce((sum, r) => sum + r.processed, 0),
            total_errors: results.reduce((sum, r) => sum + r.errors.length, 0),
        };

        console.log(`[daily-ai-routine] Completed:`, JSON.stringify(summary));

        return new Response(JSON.stringify(summary, null, 2), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch (err) {
        console.error(`[daily-ai-routine] Fatal error:`, err);
        return new Response(JSON.stringify({ error: String(err) }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
});
