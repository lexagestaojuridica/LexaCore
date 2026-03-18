import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    getMonthLabel,
    prevPeriod,
    nextPeriod,
    monthElapsedFraction,
    filterByPeriod,
    sumPaid,
    sumAll,
    ContaItem,
    healthScore,
    CategoryRow
} from './budgetUtils';

describe('budgetUtils', () => {
    it('getMonthLabel returns correctly formatted string', () => {
        expect(getMonthLabel(1, 2024).toLowerCase()).toBe('janeiro de 2024');
    });

    it('prevPeriod handles year boundary', () => {
        expect(prevPeriod(1, 2024)).toEqual({ month: 12, year: 2023 });
        expect(prevPeriod(2, 2024)).toEqual({ month: 1, year: 2024 });
    });

    it('nextPeriod handles year boundary', () => {
        expect(nextPeriod(12, 2024)).toEqual({ month: 1, year: 2025 });
        expect(nextPeriod(11, 2024)).toEqual({ month: 12, year: 2024 });
    });

    describe('monthElapsedFraction', () => {
        beforeEach(() => {
            vi.useFakeTimers();
        });
        afterEach(() => {
            vi.useRealTimers();
        });

        it('returns 1 for past dates', () => {
            vi.setSystemTime(new Date(2024, 1, 15)); // Feb 15
            expect(monthElapsedFraction(1, 2024)).toBe(1);
        });

        it('returns correct fraction for current month', () => {
            vi.setSystemTime(new Date(2024, 0, 15)); // Jan 15
            expect(monthElapsedFraction(1, 2024)).toBeCloseTo(15 / 31);
        });
    });

    describe('array aggregations', () => {
        const contas: ContaItem[] = [
            { amount: 100, status: 'pago', due_date: '2024-01-10' },
            { amount: 200, status: 'pendente', due_date: '2024-01-15' },
            { amount: 300, status: 'atrasado', due_date: '2024-01-20' },
            { amount: 400, status: 'pago', due_date: '2024-02-10' },
        ];

        it('filterByPeriod returns only pago or pendente for the specified month/year', () => {
            const filtered = filterByPeriod(contas, 1, 2024);
            expect(filtered).toHaveLength(2);
            expect(filtered.map(c => c.amount)).toEqual([100, 200]);
        });

        it('sumPaid sums only paid items', () => {
            expect(sumPaid(contas)).toBe(500);
        });

        it('sumAll sums all items', () => {
            expect(sumAll(contas)).toBe(1000);
        });
    });

    describe('healthScore', () => {
        it('returns 100 for empty rows', () => {
            expect(healthScore([])).toBe(100);
        });

        it('deducts according to rules', () => {
            const rows: CategoryRow[] = [
                { category: 'A', status: 'exceeded', budgeted: 100, realized: 200, variationAbs: 100, variationPct: 200, projected: 200, carryForward: false },
                { category: 'B', status: 'warning', budgeted: 100, realized: 90, variationAbs: -10, variationPct: 90, projected: 90, carryForward: false },
                { category: 'C', status: 'unbudgeted', budgeted: 0, realized: 50, variationAbs: 50, variationPct: null, projected: 50, carryForward: false },
            ];
            // 100 - 15 - 5 - 8 = 72
            expect(healthScore(rows)).toBe(72);
        });
    });
});
