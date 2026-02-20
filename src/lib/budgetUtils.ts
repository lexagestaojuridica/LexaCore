/**
 * budgetUtils.ts
 * Pure calculation functions for budget performance feature.
 * No React, no side effects — easy to unit test.
 */

export const EXPENSE_CATEGORIES = [
  "Honorários",
  "Custas Processuais",
  "Aluguel",
  "Salários",
  "Energia / Internet",
  "Marketing",
  "Impostos",
  "Outros",
];

export const REVENUE_CATEGORIES = [
  "Honorários Recebidos",
  "Acordos",
  "Consultorias",
  "Êxito",
  "Outros",
];

// ─── Types ────────────────────────────────────────────────────

export interface Orcamento {
  id: string;
  organization_id: string;
  category: string;
  type: "despesa" | "receita";
  amount: number;
  period_month: number;
  period_year: number;
  carry_forward: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface OrcamentoLog {
  id: string;
  orcamento_id: string;
  organization_id: string;
  changed_by: string | null;
  old_amount: number | null;
  new_amount: number | null;
  notes?: string;
  changed_at: string;
}

export interface ContaItem {
  amount: number;
  status: string;
  category?: string;
  due_date: string;
}

export interface CategoryRow {
  category: string;
  budgeted: number;
  realized: number;
  projected: number;
  variationAbs: number;
  variationPct: number | null;
  status: "ok" | "warning" | "exceeded" | "unbudgeted";
  carryForward: boolean;
}

// ─── Period helpers ───────────────────────────────────────────

export function getMonthLabel(month: number, year: number): string {
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

export function prevPeriod(month: number, year: number) {
  if (month === 1) return { month: 12, year: year - 1 };
  return { month: month - 1, year };
}

export function nextPeriod(month: number, year: number) {
  if (month === 12) return { month: 1, year: year + 1 };
  return { month: month + 1, year };
}

/** Returns the fraction of the current month elapsed (0–1). */
export function monthElapsedFraction(month: number, year: number): number {
  const today = new Date();
  const isCurrentMonth =
    today.getMonth() + 1 === month && today.getFullYear() === year;
  if (!isCurrentMonth) return 1;
  const daysInMonth = new Date(year, month, 0).getDate();
  return Math.min(today.getDate() / daysInMonth, 1);
}

// ─── Core calculations ────────────────────────────────────────

/**
 * From a list of contas (pagar or receber), filter those
 * belonging to a specific month/year and that are paid OR pending.
 */
export function filterByPeriod(
  contas: ContaItem[],
  month: number,
  year: number
): ContaItem[] {
  return contas.filter((c) => {
    const d = new Date(c.due_date + "T00:00:00");
    return (
      d.getMonth() + 1 === month &&
      d.getFullYear() === year &&
      (c.status === "pago" || c.status === "pendente")
    );
  });
}

/** Sum the `amount` where status === "pago". */
export function sumPaid(contas: ContaItem[]): number {
  return contas
    .filter((c) => c.status === "pago")
    .reduce((s, c) => s + Number(c.amount), 0);
}

/** Sum the `amount` regardless of status (pago + pendente). */
export function sumAll(contas: ContaItem[]): number {
  return contas.reduce((s, c) => s + Number(c.amount), 0);
}

/**
 * Build the per-category breakdown for the budget performance table.
 */
export function buildCategoryRows(
  orcamentos: Orcamento[],
  contas: ContaItem[],
  month: number,
  year: number,
  type: "despesa" | "receita",
  categories: string[]
): CategoryRow[] {
  const elapsed = monthElapsedFraction(month, year);

  // Build a map: category → paid amount (realized)
  const periodContas = filterByPeriod(contas, month, year);
  const realizedMap: Record<string, number> = {};
  for (const c of periodContas) {
    const cat = c.category || "Outros";
    realizedMap[cat] = (realizedMap[cat] ?? 0) + Number(c.amount);
  }

  // Build a map: category → budget
  const budgetMap: Record<string, { amount: number; carryForward: boolean }> =
    {};
  for (const o of orcamentos) {
    if (o.type === type) {
      budgetMap[o.category] = {
        amount: Number(o.amount),
        carryForward: o.carry_forward,
      };
    }
  }

  // Merge all known categories
  const allCats = new Set([...categories, ...Object.keys(realizedMap)]);

  const rows: CategoryRow[] = [];
  for (const category of allCats) {
    const budgeted = budgetMap[category]?.amount ?? 0;
    const carryForward = budgetMap[category]?.carryForward ?? false;
    const realized = realizedMap[category] ?? 0;

    // Projected value: realized ÷ elapsed
    const projected =
      elapsed > 0 && elapsed < 1 ? realized / elapsed : realized;

    const variationAbs = realized - budgeted;
    const variationPct = budgeted > 0 ? (realized / budgeted) * 100 : null;

    let status: CategoryRow["status"] = "ok";
    if (budgeted === 0 && realized > 0) {
      status = "unbudgeted";
    } else if (variationPct !== null && variationPct >= 100) {
      status = "exceeded";
    } else if (variationPct !== null && variationPct >= 80) {
      status = "warning";
    }

    rows.push({
      category,
      budgeted,
      realized,
      projected,
      variationAbs,
      variationPct,
      status,
      carryForward,
    });
  }

  return rows.sort((a, b) => Math.abs(b.variationAbs) - Math.abs(a.variationAbs));
}

// ─── KPI helpers ─────────────────────────────────────────────

export function globalExecutionRate(rows: CategoryRow[]): number {
  const totalBudgeted = rows.reduce((s, r) => s + r.budgeted, 0);
  const totalRealized = rows.reduce((s, r) => s + r.realized, 0);
  if (totalBudgeted === 0) return 0;
  return (totalRealized / totalBudgeted) * 100;
}

export function freeBudget(rows: CategoryRow[]): number {
  const totalBudgeted = rows.reduce((s, r) => s + r.budgeted, 0);
  const totalRealized = rows.reduce((s, r) => s + r.realized, 0);
  return totalBudgeted - totalRealized;
}

export function biggestDeviation(rows: CategoryRow[]): CategoryRow | null {
  if (rows.length === 0) return null;
  return rows.reduce((max, r) =>
    Math.abs(r.variationAbs) > Math.abs(max.variationAbs) ? r : max
  );
}

/**
 * Health score 0–100.
 * Penalises exceeded categories and rewards being on budget.
 */
export function healthScore(rows: CategoryRow[]): number {
  if (rows.length === 0) return 100;
  let score = 100;
  for (const r of rows) {
    if (r.status === "exceeded") score -= 15;
    else if (r.status === "warning") score -= 5;
    else if (r.status === "unbudgeted") score -= 8;
  }
  return Math.max(0, Math.round(score));
}

export function healthScoreLabel(score: number): {
  label: string;
  color: string;
} {
  if (score >= 85) return { label: "Excelente", color: "text-success" };
  if (score >= 65) return { label: "Bom", color: "text-yellow-500" };
  if (score >= 45) return { label: "Atenção", color: "text-orange-500" };
  return { label: "Crítico", color: "text-destructive" };
}

// ─── Formatting ───────────────────────────────────────────────

export const fmtCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(v);

export const fmtPct = (v: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(v / 100);
