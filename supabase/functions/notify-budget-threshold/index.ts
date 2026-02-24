// Supabase Edge Function: notify-budget-threshold
// Triggered by a Database Webhook on INSERT/UPDATE of contas_pagar
// Sends an email via Resend when a category exceeds 90% of its budget
// Deploy: supabase functions deploy notify-budget-threshold

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts";

function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  const hmac = createHmac("sha256", secret);
  hmac.update(payload);
  const expected = hmac.digest("hex");
  return expected === signature;
}
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const WEBHOOK_SECRET = Deno.env.get("WEBHOOK_SECRET") ?? "";

const THRESHOLD = 0.9; // 90%

serve(async (req) => {
    try {
        // 0. Verify Webhook Signature
        const signature = req.headers.get("x-supabase-signature");
        if (!signature || !WEBHOOK_SECRET) {
            return new Response("Missing signature or secret", { status: 401 });
        }

        const payloadStr = await req.text();
        const isValid = verifyWebhookSignature(payloadStr, signature, WEBHOOK_SECRET);

        if (!isValid) {
            return new Response("Invalid signature", { status: 401 });
        }

        const payload = JSON.parse(payloadStr);
        // payload.record is the inserted/updated contas_pagar row
        const record = payload.record as {
            organization_id: string;
            category: string;
            amount: number;
            due_date: string;
            status: string;
        };

        if (!record?.organization_id || !record?.category) {
            return new Response("no-op", { status: 200 });
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

        const dueDate = new Date(record.due_date + "T00:00:00");
        const month = dueDate.getMonth() + 1;
        const year = dueDate.getFullYear();

        // 1. Get budget for this category in this period
        const { data: orcamento } = await supabase
            .from("orcamentos")
            .select("amount, id")
            .eq("organization_id", record.organization_id)
            .eq("category", record.category)
            .eq("type", "despesa")
            .eq("period_month", month)
            .eq("period_year", year)
            .maybeSingle();

        if (!orcamento || Number(orcamento.amount) === 0) {
            return new Response("no budget defined", { status: 200 });
        }

        // 2. Sum total realized for this category in this period
        const { data: contas } = await supabase
            .from("contas_pagar")
            .select("amount")
            .eq("organization_id", record.organization_id)
            .eq("category", record.category)
            .gte("due_date", `${year}-${String(month).padStart(2, "0")}-01`)
            .lte(
                "due_date",
                `${year}-${String(month).padStart(2, "0")}-${new Date(year, month, 0).getDate()}`
            )
            .in("status", ["pago", "pendente"]);

        const totalRealized = (contas ?? []).reduce(
            (s: number, c: { amount: number }) => s + Number(c.amount),
            0
        );

        const ratio = totalRealized / Number(orcamento.amount);

        if (ratio < THRESHOLD) {
            return new Response("below threshold", { status: 200 });
        }

        // 3. Get org admin email
        const { data: admin } = await supabase
            .from("profiles")
            .select("user_id, full_name")
            .eq("organization_id", record.organization_id)
            .limit(1)
            .maybeSingle();

        if (!admin) return new Response("no admin found", { status: 200 });

        const { data: authUser } = await supabase.auth.admin.getUserById(
            admin.user_id
        );
        const email = authUser?.user?.email;
        if (!email) return new Response("no email", { status: 200 });

        const monthName = new Date(year, month - 1, 1).toLocaleDateString(
            "pt-BR",
            { month: "long", year: "numeric" }
        );
        const pct = (ratio * 100).toFixed(1);

        // 4. Send email via Resend
        await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${RESEND_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                from: "LEXA Nova <notificacoes@lexanova.com.br>",
                to: [email],
                subject: `⚠️ Alerta Orçamentário: ${record.category} atingiu ${pct}%`,
                html: `
          <div style="font-family:sans-serif;max-width:480px;margin:auto">
            <h2 style="color:#1a1a1a">⚠️ Alerta de Orçamento</h2>
            <p>Olá, ${admin.full_name ?? "gestor"}!</p>
            <p>A categoria <strong>${record.category}</strong> atingiu <strong>${pct}%</strong> do orçamento definido para <strong>${monthName}</strong>.</p>
            <table style="width:100%;border-collapse:collapse;margin:16px 0">
              <tr style="background:#f5f5f5">
                <td style="padding:8px;border:1px solid #eee">Orçado</td>
                <td style="padding:8px;border:1px solid #eee;font-weight:bold">R$ ${Number(orcamento.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
              </tr>
              <tr>
                <td style="padding:8px;border:1px solid #eee">Realizado</td>
                <td style="padding:8px;border:1px solid #eee;font-weight:bold;color:${ratio >= 1 ? "#dc2626" : "#f59e0b"}">R$ ${totalRealized.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
              </tr>
            </table>
            <p style="color:#666;font-size:13px">Acesse o módulo Financeiro → Orçamento no LEXA Nova para mais detalhes.</p>
          </div>
        `,
            }),
        });

        return new Response("email sent", { status: 200 });
    } catch (err) {
        console.error(err);
        return new Response("error", { status: 500 });
    }
});
